import type { NearestResult, Plane } from '../data/opensky.ts'
import type { RouteInfo } from '../data/routes.ts'
import { lookupAirline } from '../data/airlines.ts'
import { formatDistance, formatFlightLevel, formatSpeed, splitCallsign } from '../utils/format.ts'

export interface PlaneCardProps {
  result: NearestResult
  route: RouteInfo | null
}

// Render the LED-style 3-line panel for any NearestResult variant.
// Sized as a 16:8 (matches the firmware's 64×32) panel scaled up.
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
      return <PanelMessage line1="No aircraft" line2="overhead right now" line3={`within ${result.observed.radiusKm} km`} color="#888" />
    }
    if (result.kind === 'rate-limited') {
      let retryIn = result.retryAfterSec ?? 10
      return <PanelMessage line1="Rate limited" line2="OpenSky says wait" line3={`retry in ${retryIn}s`} color="#FFCC00" />
    }
    return <PanelMessage line1="OpenSky error" line2={result.message.slice(0, 24)} line3="will retry on next refresh" color="#E81932" />
  }
}

// Live-map deep link. OpenSky's own map (map.opensky-network.org)
// is gated behind a human-verification SPA and doesn't accept URL
// params for a specific aircraft, so we point at ADS-B Exchange's
// globe view, which reliably deep-links by icao24 hex.
function liveMapUrl(icao24: string): string {
  return `https://globe.adsbexchange.com/?icao=${encodeURIComponent(icao24.toLowerCase())}`
}

// Format the second LED line: "DLH441 FRA→JFK" when we know the route,
// otherwise just the callsign. We use IATA airport codes because they
// fit (3 chars each) and the firmware reference (`DLH441 FRA->JFK`)
// uses them too.
function formatRouteLine(flight: string, route: RouteInfo | null): string {
  if (!route) return flight
  return `${flight} ${route.originIata}→${route.destinationIata}`
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
    let displayName = airline?.name ?? (plane.originCountry || icao || 'Aircraft')
    let color = airline?.hex ?? '#FFFFFF'
    let line1 = displayName.slice(0, 16)
    let flight = `${icao}${number}`.slice(0, 8)
    let line2 = formatRouteLine(flight, route)
    let line3 = `${formatFlightLevel(plane.altMeters)}  ${formatSpeed(plane.velocityMps).padStart(5)}  ${formatDistance(plane.distanceKm)}`
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
            Track {plane.icao24.toUpperCase()} on live map ↗
          </a>
        </p>
      </>
    )
  }
}

function PanelMessage() {
  return ({ line1, line2, line3, color }: { line1: string; line2: string; line3: string; color: string }) => (
    <div class="panel" data-fly-state="message">
      <div class="panel-line panel-line-1" style={`color: ${color}`}>
        {line1}
      </div>
      <div class="panel-line panel-line-2">{line2}</div>
      <div class="panel-line panel-line-3">{line3}</div>
    </div>
  )
}
