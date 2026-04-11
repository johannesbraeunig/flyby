import type { RemixNode } from 'remix/component'

import type { AircraftInfo } from '../data/aircraft.ts'
import type { NearestResult, Plane } from '../data/opensky.ts'
import type { RouteInfo } from '../data/routes.ts'
import { lookupAirline } from '../data/airlines.ts'
import {
  formatDistance,
  formatDistanceCompact,
  formatFlightLevel,
  formatSpeed,
  formatSpeedCompact,
  splitCallsign,
} from '../utils/format.ts'

export interface PlaneCardProps {
  result: NearestResult
  route: RouteInfo | null
  aircraft: AircraftInfo | null
}

// Render the LED-style panel for any NearestResult variant, plus
// a persistent footer row with the Settings link (and a Track link
// when we have a plane). Keeping the links at the PlaneCard level
// means the Settings link never disappears just because there are
// no planes overhead — users can always get to settings.
export function PlaneCard() {
  return ({ result, route, aircraft }: PlaneCardProps) => {
    let panelNode: RemixNode
    let trackIcao24: string | null = null

    if (result.kind === 'ok' || result.kind === 'ok-stale') {
      trackIcao24 = result.plane.icao24
      panelNode = (
        <PanelOk
          plane={result.plane}
          route={route}
          aircraft={aircraft}
          stale={result.kind === 'ok-stale'}
          note={result.kind === 'ok-stale' ? result.reason : null}
        />
      )
    } else if (result.kind === 'empty') {
      panelNode = (
        <PanelMessage
          line1="NO PLANES"
          line2="OVERHEAD"
          line3={`< ${result.observed.radiusKm} KM`}
          color="#ffaa00"
        />
      )
    } else if (result.kind === 'rate-limited') {
      let retryIn = result.retryAfterSec ?? 10
      panelNode = (
        <PanelMessage
          line1="RATE LIMITED"
          line2="OPENSKY WAIT"
          line3={`RETRY ${retryIn}S`}
          color="#ffcc00"
        />
      )
    } else {
      panelNode = (
        <PanelMessage
          line1="OPENSKY ERR"
          line2={result.message.slice(0, 14).toUpperCase()}
          line3="RETRY SOON"
          color="#ff5522"
        />
      )
    }

    return (
      <>
        {panelNode}
        <p class="panel-links">
          {trackIcao24 ? (
            <>
              <a
                class="panel-link"
                href={liveMapUrl(trackIcao24)}
                target="_blank"
                rel="noreferrer"
              >
                Track {trackIcao24.toUpperCase()} ↗
              </a>
              <span class="panel-link-sep" aria-hidden="true">
                {' · '}
              </span>
            </>
          ) : null}
          <label for="settings-toggle" class="panel-link settings-inline-link">
            Settings
          </label>
        </p>
      </>
    )
  }
}

// Live-map deep link. OpenSky's own map is gated behind a human-
// verification SPA with no URL-param deep-linking; ADS-B Exchange's
// globe view reliably deep-links by icao24 hex.
function liveMapUrl(icao24: string): string {
  return `https://globe.adsbexchange.com/?icao=${encodeURIComponent(icao24.toLowerCase())}`
}

// Pixel-style right arrow for the FROM→TO route line. Jersey 10
// doesn't ship a glyph for U+2192, so a fallback font was rendering
// the arrow as a smooth serif character — very out of place next to
// the LED text. This is a 9×5 dot-matrix arrow: a single-row shaft
// spanning the full width, topped and tailed by a 3-row wedge that
// narrows to the point. Using `currentColor` + `filter: drop-shadow`
// so it inherits the amber glow.
//
//  col: 0 1 2 3 4 5 6 7 8
//  row 0:              X
//  row 1:              X X
//  row 2: X X X X X X X X X
//  row 3:              X X
//  row 4:              X
function PixelArrow() {
  return () => (
    <svg
      class="pixel-arrow"
      viewBox="0 0 9 5"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="6" y="0" width="1" height="1" />
      <rect x="6" y="1" width="2" height="1" />
      <rect x="0" y="2" width="9" height="1" />
      <rect x="6" y="3" width="2" height="1" />
      <rect x="6" y="4" width="1" height="1" />
    </svg>
  )
}

function PanelOk() {
  return ({
    plane,
    route,
    aircraft,
    stale,
    note,
  }: {
    plane: Plane
    route: RouteInfo | null
    aircraft: AircraftInfo | null
    stale: boolean
    note: string | null
  }) => {
    let { icao, number } = splitCallsign(plane.callsign)
    let airline = lookupAirline(plane.callsign)
    let displayName = airline?.name ?? (plane.originCountry || icao || 'AIRCRAFT')
    let line1 = displayName.toUpperCase().slice(0, 14)
    let flight = `${icao}${number}`.slice(0, 8).toUpperCase()
    let altStr = formatFlightLevel(plane.altMeters)
    let kt = `${formatSpeedCompact(plane.velocityMps)}KT`
    let km = formatDistanceCompact(plane.distanceKm)
    let routeAria = route
      ? `, ${route.originName || route.originIata} to ${route.destinationName || route.destinationIata}`
      : ''
    let aircraftAria = aircraft ? `, ${aircraft.typeName || aircraft.icaoType}` : ''
    let aria = `${displayName} flight ${flight}${routeAria}${aircraftAria}, ${formatFlightLevel(plane.altMeters)}, ${formatSpeed(plane.velocityMps)}, ${formatDistance(plane.distanceKm)} away`
    return (
      <>
        <div
          class="panel"
          data-fly-state={stale ? 'stale' : 'ok'}
          role="status"
          aria-live="polite"
          aria-label={aria}
        >
          {/* Line 1 stays in the standard LED amber regardless of
              airline — the brand-color version was noisy. */}
          <div class="panel-line panel-line-1" aria-hidden="true">
            {line1}
          </div>
          <div class="panel-line panel-line-2 panel-stats" aria-hidden="true">
            <span class="stat">
              <span class="stat-label">FLIGHT</span>
              <span class="stat-value">{flight}</span>
            </span>
            {route ? (
              <span class="stat">
                <span class="stat-label">ROUTE</span>
                <span class="stat-value">
                  {route.originIata}
                  <PixelArrow />
                  {route.destinationIata}
                </span>
              </span>
            ) : null}
          </div>
          <div class="panel-line panel-line-3 panel-stats" aria-hidden="true">
            <span class="stat">
              <span class="stat-label">ALT</span>
              <span class="stat-value">{altStr}</span>
            </span>
            <span class="stat">
              <span class="stat-label">SPD</span>
              <span class="stat-value">{kt}</span>
            </span>
            <span class="stat">
              <span class="stat-label">DIST</span>
              <span class="stat-value">{km}</span>
            </span>
          </div>
          {aircraft?.icaoType ? (
            <div class="panel-line panel-line-type panel-stats" aria-hidden="true">
              <span class="stat">
                <span class="stat-label">TYPE</span>
                <span class="stat-value">{aircraft.icaoType}</span>
              </span>
            </div>
          ) : null}
          {stale && note ? <div class="panel-stale-banner">{note}</div> : null}
        </div>
      </>
    )
  }
}

function PanelMessage() {
  return ({
    line1,
    line2,
    line3,
    color,
  }: {
    line1: string
    line2: string
    line3: string
    color: string
  }) => (
    <div class="panel" data-fly-state="message">
      <div class="panel-line panel-line-1" style={`color: ${color}`}>
        {line1}
      </div>
      <div class="panel-line panel-line-2">{line2}</div>
      <div class="panel-line panel-line-3">{line3}</div>
    </div>
  )
}
