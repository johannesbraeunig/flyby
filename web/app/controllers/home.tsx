import type { BuildAction } from 'remix/fetch-router'

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

    // Enrich with route info when we have a plane. The route lookup is
    // cached aggressively (1h per callsign) so this is usually a Map
    // hit; on a cold callsign it adds ~300 ms over OpenSky, which is
    // acceptable for the home render.
    let route = null
    if ((result.kind === 'ok' || result.kind === 'ok-stale') && result.plane.callsign) {
      route = await getRoute(result.plane.callsign)
    }

    let headers = new Headers({ 'Cache-Control': 'no-store' })
    // Persist a cookie when the location came from an explicit URL grant.
    if (location.source === 'url') {
      headers.append('Set-Cookie', locationCookieValue(location))
    }

    return render(<HomePage location={location} result={result} route={route} />, { headers })
  },
}

interface HomePageProps {
  location: ResolvedLocation
  result: Awaited<ReturnType<typeof getNearestAircraft>>
  route: Awaited<ReturnType<typeof getRoute>>
}

function HomePage() {
  return ({ location, result, route }: HomePageProps) => {
    let pollUrl =
      `/api/nearest?lat=${location.lat}` +
      `&lon=${location.lon}` +
      `&radius=${location.radiusKm}`
    return (
      <Layout title="FlyBy — nearest plane">
        {location.fallbackReason === 'denied' ? (
          <div class="banner banner-warn">
            Location permission denied. Showing flights over <strong>Hamburg</strong> as a fallback.
            Unblock location for this site in your browser (click the icon in the address bar →
            Location → Allow), then <a href="/">try again</a>.
          </div>
        ) : null}

        <div
          id="plane-card"
          data-fly-poll={pollUrl}
          data-fly-interval={String(location.refreshSec)}
        >
          <PlaneCard result={result} route={route} />
        </div>

        <details class="settings">
          <summary>Settings</summary>
          <form method="GET" action="/" class="settings-form">
            <label>
              Latitude
              <input type="number" step="0.0001" name="lat" value={location.lat.toFixed(4)} required />
            </label>
            <label>
              Longitude
              <input type="number" step="0.0001" name="lon" value={location.lon.toFixed(4)} required />
            </label>
            <label>
              Radius (km)
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
              Refresh
              <select name="refresh">
                {REFRESH_OPTIONS.map((sec) => (
                  <option value={String(sec)} selected={sec === location.refreshSec}>
                    {sec === 0 ? 'Off' : `${sec} s`}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit">Apply</button>
          </form>
          <p class="settings-meta">
            Source: <code>{location.source}</code>
            {location.source === 'fallback' ? ` (${location.fallbackReason})` : ''}
          </p>
        </details>

        <script src="/flyby.js" defer></script>
      </Layout>
    )
  }
}

function LocatingPage() {
  return () => (
    <Layout title="FlyBy — locating you">
      <div class="locating">
        <div class="panel" data-fly-state="locating">
          <div class="panel-line panel-line-1" style="color: #F9BA00">
            FlyBy
          </div>
          <div class="panel-line panel-line-2">Locating you...</div>
          <div class="panel-line panel-line-3">Allow location access</div>
        </div>
        <p class="locating-help">
          FlyBy uses your browser's location to find aircraft overhead. We never store
          your coordinates anywhere — they only travel between your browser and OpenSky
          (via this server) for the duration of a request.
        </p>
        <p class="locating-help">
          If you'd rather not share location,{' '}
          <a
            href={`/?lat=${HAMBURG.lat}&lon=${HAMBURG.lon}&radius=${DEFAULT_RADIUS_KM}`}
          >
            use Hamburg as a default
          </a>
          .
        </p>
        <script src="/flyby.js" defer></script>
      </div>
    </Layout>
  )
}
