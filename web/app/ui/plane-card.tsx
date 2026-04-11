import type { RemixNode } from 'remix/component'

import type { AircraftInfo } from '../data/aircraft.ts'
import { bearingDeg, elevationDeg } from '../data/geo.ts'
import type { NearestResult, Plane } from '../data/opensky.ts'
import type { RouteInfo } from '../data/routes.ts'
import { lookupAirline } from '../data/airlines.ts'
import {
  compass8,
  formatAltMeters,
  formatDistance,
  formatDistanceCompact,
  formatFlightLevel,
  formatSpeed,
  formatSpeedCompact,
  formatSpeedKmh,
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
    // `track` is set only when we have a concrete plane. `icao24`
    // drives the map deep-link URL (adsbexchange expects the hex);
    // `label` is what we render in the link — prefer the flight
    // callsign (e.g. "EWG34D") because that's what the user just
    // read on line 2. Fall back to the icao24 hex when the plane
    // has no callsign.
    let track: { icao24: string; label: string } | null = null

    if (result.kind === 'ok' || result.kind === 'ok-stale') {
      let icao24 = result.plane.icao24
      let callsign = result.plane.callsign?.trim() ?? ''
      track = {
        icao24,
        label: callsign.length > 0 ? callsign.toUpperCase() : icao24.toUpperCase(),
      }
      panelNode = (
        <PanelOk
          plane={result.plane}
          observer={result.observed}
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
          <label for="settings-toggle" class="panel-link settings-inline-link">
            Settings
          </label>
          <span class="panel-link-sep" aria-hidden="true">
            |
          </span>
          <button type="button" id="fullscreen-btn" class="panel-link panel-link-btn">
            Fullscreen
          </button>
          {track ? (
            <>
              <span class="panel-link-sep" aria-hidden="true">
                |
              </span>
              <a
                class="panel-link"
                href={liveMapUrl(track.icao24)}
                target="_blank"
                rel="noreferrer"
              >
                Track {track.label} ↗
              </a>
            </>
          ) : null}
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

// Compact 5×7 dot-matrix up/down arrow for vertical-rate indication
// next to the altitude readout. Same pixel-perfect style as the
// horizontal route arrow — fills with currentColor and picks up the
// amber drop-shadow.
//
// col:   0 1 2 3 4
//   row 0: . . X . .   ← tip (up arrow)
//   row 1: . X X X .
//   row 2: X X X X X
//   row 3: . . X . .
//   row 4: . . X . .
//   row 5: . . X . .
//   row 6: . . X . .   ← bottom of shaft
function PixelVerticalArrow() {
  return ({ dir }: { dir: 'up' | 'down' }) => {
    let flip = dir === 'down' ? 'rotate(180 2.5 3.5)' : undefined
    return (
      <svg
        class="pixel-arrow pixel-arrow-vert"
        viewBox="0 0 5 7"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g transform={flip}>
          <rect x="2" y="0" width="1" height="1" />
          <rect x="1" y="1" width="3" height="1" />
          <rect x="0" y="2" width="5" height="1" />
          <rect x="2" y="3" width="1" height="1" />
          <rect x="2" y="4" width="1" height="1" />
          <rect x="2" y="5" width="1" height="1" />
          <rect x="2" y="6" width="1" height="1" />
        </g>
      </svg>
    )
  }
}

// 5×5 dot-matrix degree glyph — a ring with cut corners so it reads
// as round at a glance instead of as a solid square. Jersey 10 has
// no `°` character so a bare `°` renders from a serify fallback
// font; this SVG keeps the elevation angle reading in the pixel
// aesthetic.
//
//   row 0: . X X X .   ← top arc
//   row 1: X . . . X
//   row 2: X . . . X
//   row 3: X . . . X
//   row 4: . X X X .   ← bottom arc
function PixelDegree() {
  return () => (
    <svg
      class="pixel-arrow pixel-degree"
      viewBox="0 0 5 5"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="1" y="0" width="3" height="1" />
      <rect x="0" y="1" width="1" height="3" />
      <rect x="4" y="1" width="1" height="3" />
      <rect x="1" y="4" width="3" height="1" />
    </svg>
  )
}

// Vertical-rate threshold: OpenSky reports noisy values near zero
// for planes in level flight. Anything under 1 m/s (~200 fpm) is
// treated as "level" and gets no arrow.
const VERTICAL_RATE_LEVEL_THRESHOLD_MPS = 1

function PanelOk() {
  return ({
    plane,
    observer,
    route,
    aircraft,
    stale,
    note,
  }: {
    plane: Plane
    observer: { lat: number; lon: number }
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
    // Metric secondary-context values on the ALT / SPD labels,
    // e.g. "ALT (8230M)" alongside the primary "FL270".
    let altMetric = formatAltMeters(plane.altMeters)
    let spdMetric = formatSpeedKmh(plane.velocityMps)
    // Vertical-rate direction: climbing, descending, or level.
    let vertDir: 'up' | 'down' | null =
      plane.verticalRateMps !== null &&
      Math.abs(plane.verticalRateMps) >= VERTICAL_RATE_LEVEL_THRESHOLD_MPS
        ? plane.verticalRateMps > 0
          ? 'up'
          : 'down'
        : null
    // Bearing (compass direction from observer to plane) and
    // elevation angle above the horizon — the "where do I look?"
    // pieces. Elevation uses a flat-earth approximation; under
    // 250 km the curvature error is < 1°.
    let bearing = bearingDeg(observer.lat, observer.lon, plane.lat, plane.lon)
    let elevation = plane.altMeters !== null ? elevationDeg(plane.altMeters, plane.distanceKm) : null
    // No space between compass direction and elevation — on the
    // dot-matrix panel it reads as a single compact token like
    // "SW34°" without being ambiguous (compass codes are always
    // 1–2 uppercase letters, elevation is 1–2 digits).
    let lookText =
      elevation !== null
        ? `${compass8(bearing)}${Math.round(elevation)}`
        : compass8(bearing)
    let routeAria = route
      ? `, ${route.originName || route.originIata} to ${route.destinationName || route.destinationIata}`
      : ''
    let aircraftAria = aircraft ? `, ${aircraft.typeName || aircraft.icaoType}` : ''
    let lookAria =
      elevation !== null
        ? `, look ${compass8(bearing)} at ${Math.round(elevation)} degrees elevation`
        : ''
    let aria = `${displayName} flight ${flight}${routeAria}${aircraftAria}, ${formatFlightLevel(plane.altMeters)}, ${formatSpeed(plane.velocityMps)}, ${formatDistance(plane.distanceKm)} away${lookAria}`
    return (
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
            <span class="stat-label">ALT ({altMetric})</span>
            <span class="stat-value">
              {altStr}
              {vertDir ? <PixelVerticalArrow dir={vertDir} /> : null}
            </span>
          </span>
          <span class="stat">
            <span class="stat-label">SPD ({spdMetric})</span>
            <span class="stat-value">{kt}</span>
          </span>
          <span class="stat">
            <span class="stat-label">DIST</span>
            <span class="stat-value">{km}</span>
          </span>
          <span class="stat">
            <span class="stat-label">LOOK</span>
            <span class="stat-value">
              {lookText}
              {elevation !== null ? <PixelDegree /> : null}
            </span>
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
