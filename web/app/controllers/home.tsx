import type { BuildAction } from 'remix/fetch-router'

import { getAircraft } from '../data/aircraft.ts'
import { getNearestAircraft } from '../data/opensky.ts'
import { getRoute } from '../data/routes.ts'
import {
  DEFAULT_RADIUS_KM,
  HAMBURG,
  MAX_RADIUS_KM,
  MIN_RADIUS_KM,
  REFRESH_OPTIONS,
  locationCookieValue,
  resolveLocation,
  type ResolvedLocation,
} from '../data/location.ts'
import { routes } from '../routes.ts'
import { Layout } from '../ui/layout.tsx'
import { PlaneCard } from '../ui/plane-card.tsx'
import { render } from '../utils/render.tsx'

export let home: BuildAction<'GET', typeof routes.home> = {
  async handler({ request, url }) {
    let location = resolveLocation(url, request.headers.get('cookie'))

    // First-visit landing page when geolocation hasn't been resolved yet:
    // we render the locating screen (no OpenSky call) and ship a tiny
    // bootstrap script that calls navigator.geolocation and redirects.
    if (location.source === 'fallback' && location.fallbackReason === 'no-params') {
      return render(<LocatingPage />, {
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    let result = await getNearestAircraft(location.lat, location.lon, location.radiusKm)

    // Enrich with route + aircraft-type info when we have a plane.
    // Fetched in parallel via Promise.all so the extra lookup is
    // free latency-wise (both cache aggressively — usually Map hits).
    let route = null
    let aircraft = null
    if (result.kind === 'ok' || result.kind === 'ok-stale') {
      let [r, a] = await Promise.all([
        result.plane.callsign ? getRoute(result.plane.callsign) : Promise.resolve(null),
        getAircraft(result.plane.icao24),
      ])
      route = r
      aircraft = a
    }

    let headers = new Headers({ 'Cache-Control': 'no-store' })
    // Persist a cookie when the location came from an explicit URL grant.
    if (location.source === 'url') {
      headers.append('Set-Cookie', locationCookieValue(location))
    }

    return render(
      <HomePage location={location} result={result} route={route} aircraft={aircraft} />,
      { headers },
    )
  },
}

interface HomePageProps {
  location: ResolvedLocation
  result: Awaited<ReturnType<typeof getNearestAircraft>>
  route: Awaited<ReturnType<typeof getRoute>>
  aircraft: Awaited<ReturnType<typeof getAircraft>>
}

const REPO_URL = 'https://github.com/johannesbraeunig/flyby'

function HomePage() {
  return ({ location, result, route, aircraft }: HomePageProps) => {
    let pollUrl =
      `/api/nearest?lat=${location.lat}` +
      `&lon=${location.lon}` +
      `&radius=${location.radiusKm}`
    return (
      <Layout title="FlyBy — nearest plane">
        <main class="stage">
          <div
            id="plane-card"
            class="plane-card"
            data-fly-poll={pollUrl}
            data-fly-interval={String(location.refreshSec)}
          >
            <PlaneCard result={result} route={route} aircraft={aircraft} />
          </div>
        </main>

        {location.fallbackReason === 'denied' ? (
          <div class="banner banner-warn" role="alert">
            Location permission denied. Showing flights over <strong>Hamburg</strong>. Unblock
            location for this site in your browser, then <a href="/">try again</a>.
          </div>
        ) : null}

        {/* Settings overlay: a hidden checkbox toggles a centered
            modal. Opened by the inline "Settings" link inside the
            plane-card (label for=settings-toggle). Closed by the
            backdrop label or the × button inside the panel. Pure
            CSS, no JS. The checkbox + panel live OUTSIDE #plane-card
            so they survive the 30 s innerHTML poll. */}
        <input type="checkbox" id="settings-toggle" class="settings-toggle-input" />
        <label
          for="settings-toggle"
          class="settings-backdrop"
          aria-hidden="true"
        ></label>
        <div class="settings-panel" role="dialog" aria-label="Settings">
          <div class="settings-panel-header">
            <h2 class="settings-heading">Settings</h2>
            <label
              for="settings-toggle"
              class="settings-close"
              aria-label="Close settings"
            >
              <span aria-hidden="true">×</span>
            </label>
          </div>
            <form method="GET" action="/" class="settings-form">
              <label>
                <span>Latitude</span>
                <input
                  type="number"
                  step="0.0001"
                  name="lat"
                  value={location.lat.toFixed(4)}
                  required
                />
              </label>
              <label>
                <span>Longitude</span>
                <input
                  type="number"
                  step="0.0001"
                  name="lon"
                  value={location.lon.toFixed(4)}
                  required
                />
              </label>
              <label>
                <span>Radius (km)</span>
                <input
                  type="number"
                  step="1"
                  min={MIN_RADIUS_KM}
                  max={MAX_RADIUS_KM}
                  name="radius"
                  value={String(location.radiusKm)}
                  required
                />
              </label>
              <label>
                <span>Refresh</span>
                <select name="refresh">
                  {REFRESH_OPTIONS.map((sec) => (
                    <option value={String(sec)} selected={sec === location.refreshSec}>
                      {sec === 0 ? 'Off' : `${sec} s`}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" class="settings-apply">
                Apply
              </button>
            </form>
            <button type="button" id="fullscreen-btn" class="settings-secondary">
              Fullscreen
            </button>
          <p class="settings-meta">
            Data from{' '}
            <a href="https://opensky-network.org" rel="noreferrer">
              OpenSky
            </a>
            {' · routes from '}
            <a href="https://adsbdb.com" rel="noreferrer">
              adsbdb
            </a>
            <br />
            <a href={REPO_URL} rel="noreferrer">
              Source on GitHub
            </a>
          </p>
        </div>

        <script src="/flyby.js" defer></script>
      </Layout>
    )
  }
}

function LocatingPage() {
  return () => (
    <Layout title="FlyBy — choose location">
      <main class="stage">
        <div class="plane-card">
          <div class="panel" data-fly-state="locating">
            <div class="panel-line panel-line-1">FLYBY</div>
            <div class="panel-line panel-line-2">PICK A</div>
            <div class="panel-line panel-line-3">LOCATION</div>
          </div>
          <div class="locating-choices">
            <button id="allow-location-btn" type="button" class="btn-primary">
              Use my location
            </button>
            <a
              class="btn-secondary"
              href={`/?lat=${HAMBURG.lat}&lon=${HAMBURG.lon}&radius=${DEFAULT_RADIUS_KM}`}
            >
              Use Hamburg
            </a>
          </div>
          <p class="locating-help">
            We don't store your coordinates — they only travel between your browser and
            OpenSky for the duration of a request.
          </p>
        </div>
      </main>
      <script src="/flyby.js" defer></script>
    </Layout>
  )
}
