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
}

// Render the LED-style 3-line panel for any NearestResult variant.
// Shape mirrors the firmware's HUB75 layout: line 1 airline in the
// airline brand color, lines 2/3 in amber.
export function PlaneCard() {
  return ({ result, route }: PlaneCardProps) => {
    if (result.kind === 'ok' || result.kind === 'ok-stale') {
      return (
        <PanelOk
          plane={result.plane}
          route={route}
          stale={result.kind === 'ok-stale'}
          note={result.kind === 'ok-stale' ? result.reason : null}
        />
      )
    }
    if (result.kind === 'empty') {
      return (
        <PanelMessage
          line1="NO PLANES"
          line2="OVERHEAD"
          line3={`< ${result.observed.radiusKm} KM`}
          color="#ffaa00"
        />
      )
    }
    if (result.kind === 'rate-limited') {
      let retryIn = result.retryAfterSec ?? 10
      return (
        <PanelMessage
          line1="RATE LIMITED"
          line2="OPENSKY WAIT"
          line3={`RETRY ${retryIn}S`}
          color="#ffcc00"
        />
      )
    }
    return (
      <PanelMessage
        line1="OPENSKY ERR"
        line2={result.message.slice(0, 14).toUpperCase()}
        line3="RETRY SOON"
        color="#ff5522"
      />
    )
  }
}

// Live-map deep link. OpenSky's own map is gated behind a human-
// verification SPA with no URL-param deep-linking; ADS-B Exchange's
// globe view reliably deep-links by icao24 hex.
function liveMapUrl(icao24: string): string {
  return `https://globe.adsbexchange.com/?icao=${encodeURIComponent(icao24.toLowerCase())}`
}

// Format line 2 to match the reference photo: "CALLSIGN  DEST".
// We display the *destination* airport code only (not origin→dest)
// because the dot-matrix grid in the photo has room for ~12 chars
// and "DLH441  JFK" reads at a glance. Origin still shows in the
// aria-label.
function formatLine2(flight: string, route: RouteInfo | null): string {
  if (!route) return flight
  return `${flight}  ${route.destinationIata}`
}

// Format line 3: "FL361  465  3.1KM" — altitude, speed (kt), distance,
// compressed to fit the ~14-char dot-matrix width.
function formatLine3(plane: Plane): string {
  let fl = formatFlightLevel(plane.altMeters)
  let kt = formatSpeedCompact(plane.velocityMps).padStart(3)
  let km = formatDistanceCompact(plane.distanceKm)
  return `${fl}  ${kt}  ${km}`
}

function PanelOk() {
  return ({
    plane,
    route,
    stale,
    note,
  }: {
    plane: Plane
    route: RouteInfo | null
    stale: boolean
    note: string | null
  }) => {
    let { icao, number } = splitCallsign(plane.callsign)
    let airline = lookupAirline(plane.callsign)
    let displayName = airline?.name ?? (plane.originCountry || icao || 'AIRCRAFT')
    let color = airline?.hex ?? '#ffaa00'
    let line1 = displayName.toUpperCase().slice(0, 14)
    let flight = `${icao}${number}`.slice(0, 8)
    let line2 = formatLine2(flight, route).toUpperCase()
    let line3 = formatLine3(plane)
    let routeAria = route
      ? `, ${route.originName || route.originIata} to ${route.destinationName || route.destinationIata}`
      : ''
    let aria = `${displayName} flight ${flight}${routeAria}, ${formatFlightLevel(plane.altMeters)}, ${formatSpeed(plane.velocityMps)}, ${formatDistance(plane.distanceKm)} away`
    return (
      <>
        <div
          class="panel"
          data-fly-state={stale ? 'stale' : 'ok'}
          role="status"
          aria-live="polite"
          aria-label={aria}
        >
          <div class="panel-line panel-line-1" style={`color: ${color}`} aria-hidden="true">
            {line1}
          </div>
          <div class="panel-line panel-line-2" aria-hidden="true">
            {line2}
          </div>
          <div class="panel-line panel-line-3" aria-hidden="true">
            {line3}
          </div>
          {stale && note ? <div class="panel-stale-banner">{note}</div> : null}
        </div>
        <p class="panel-links">
          <a href={liveMapUrl(plane.icao24)} target="_blank" rel="noreferrer">
            Track {plane.icao24.toUpperCase()} ↗
          </a>
        </p>
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
