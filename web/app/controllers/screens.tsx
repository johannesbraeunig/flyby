import type { BuildAction } from 'remix/fetch-router'

import { getAircraft } from '../data/aircraft.ts'
import { lookupAirline } from '../data/airlines.ts'
import type { EnrichedPlane, BoardRow, RadarBlip } from '../data/enriched.ts'
import { bearingDeg, elevationDeg } from '../data/geo.ts'
import { resolveLocation, type ResolvedLocation } from '../data/location.ts'
import { getAllNearbyAircraft, getNearestAircraft, type Plane } from '../data/opensky.ts'
import { getRoute, verifyRouteAgainstTrack } from '../data/routes.ts'
import { getTrackStart } from '../data/tracks.ts'
import {
  compass8,
  formatFlightLevel,
  formatSpeedCompact,
} from '../utils/format.ts'
import { routes } from '../routes.ts'
import { ScreenLayout } from '../ui/screen-layout.tsx'
import { Landing } from '../ui/screens/landing.tsx'
import { Overhead } from '../ui/screens/overhead.tsx'
import { Board } from '../ui/screens/board.tsx'
import { Radar } from '../ui/screens/radar.tsx'
import { Detail } from '../ui/screens/detail.tsx'
import { Empty } from '../ui/screens/empty.tsx'
import { render } from '../utils/render.tsx'

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const OVERHEAD_THRESHOLD_KM = 2

// Enrich a single plane with route, aircraft type, airline, bearing, etc.
async function enrichPlane(
  plane: Plane,
  obsLat: number,
  obsLon: number,
): Promise<EnrichedPlane> {
  let [r, a, t] = await Promise.all([
    plane.callsign ? getRoute(plane.callsign) : Promise.resolve(null),
    getAircraft(plane.icao24),
    getTrackStart(plane.icao24),
  ])
  let route = verifyRouteAgainstTrack(r, t)
  let aircraft = a
  let airline = lookupAirline(plane.callsign)
  let bearing = bearingDeg(obsLat, obsLon, plane.lat, plane.lon)
  let elevation = plane.altMeters !== null
    ? elevationDeg(plane.altMeters, plane.distanceKm)
    : 0
  let compassDir = compass8(bearing)
  return { plane, route, aircraft, airline, bearing, elevation, compassDir }
}

// Build a board row from an enriched plane.
function toBoardRow(ep: EnrichedPlane, isHot: boolean): BoardRow {
  let p = ep.plane
  let cs = p.callsign || p.icao24.toUpperCase()

  // Route string: "MUC → HAM · E190" or just aircraft type or empty
  let rtParts: string[] = []
  if (ep.route) {
    rtParts.push(`${ep.route.originIata} → ${ep.route.destinationIata}`)
  }
  if (ep.aircraft) {
    rtParts.push(ep.aircraft.icaoType)
  }
  let rt = rtParts.join(' · ')
  if (!rt && ep.airline) rt = ep.airline.name

  let alt = formatFlightLevel(p.altMeters)
  let spd = formatSpeedCompact(p.velocityMps)
  let dst = p.distanceKm < 10 ? p.distanceKm.toFixed(1) : String(Math.round(p.distanceKm))
  let bearingStr = `${Math.round(ep.bearing)}° ${ep.compassDir}`
  let eta = bearingStr

  return { cs, rt, alt, spd, dst, eta, hot: isHot }
}

// Build a radar blip from a plane.
function toRadarBlip(
  plane: Plane,
  obsLat: number,
  obsLon: number,
  radiusKm: number,
): RadarBlip {
  let bearing = bearingDeg(obsLat, obsLon, plane.lat, plane.lon)
  let bearingRad = (bearing * Math.PI) / 180
  let ratio = Math.min(plane.distanceKm / radiusKm, 1)

  // Convert polar to x,y percentage (0-100). Center is 50,50.
  // Bearing 0=N (up), 90=E (right), etc.
  let x = 50 + ratio * 45 * Math.sin(bearingRad)
  let y = 50 - ratio * 45 * Math.cos(bearingRad)

  let cs = plane.callsign || plane.icao24.toUpperCase()
  let isHot = plane.distanceKm <= OVERHEAD_THRESHOLD_KM

  // Symbol based on speed/altitude heuristic
  let sym = '▲' // default: fixed wing jet
  if (plane.velocityMps !== null && plane.velocityMps < 80) {
    sym = '✚' // slow → likely helicopter
  } else if (plane.velocityMps !== null && plane.velocityMps < 150 && plane.altMeters !== null && plane.altMeters < 5000) {
    sym = '◆' // prop/turboprop
  }

  return { cs, sym, x: Math.round(x), y: Math.round(y), hot: isHot }
}

// Format UTC time as HH:MM:SS
function utcTimeStr(ms: number): string {
  let d = new Date(ms)
  let h = String(d.getUTCHours()).padStart(2, '0')
  let m = String(d.getUTCMinutes()).padStart(2, '0')
  let s = String(d.getUTCSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

// ---------------------------------------------------------------------------
// Screen: Landing
// ---------------------------------------------------------------------------

export let screenLanding: BuildAction<'GET', typeof routes.screenLanding> = {
  async handler({ url }) {
    let parsedUrl = new URL(url)
    let origin = parsedUrl.origin
    let location = resolveLocation(parsedUrl)

    // If we have a location, fetch real stats
    let totalCount = 0
    let inRangeCount = 0
    let overheadCount = 0

    if (location.source === 'url') {
      let result = await getAllNearbyAircraft(location.lat, location.lon, location.radiusKm)
      if (result.kind === 'ok' || result.kind === 'ok-stale') {
        inRangeCount = result.planes.length
        overheadCount = result.planes.filter((p) => p.distanceKm <= OVERHEAD_THRESHOLD_KM).length
        // Total tracked is a rough estimate — the bbox fetch includes all planes
        // in the bounding box (before radius filter)
        totalCount = result.planes.length
      }
    }

    return render(
      <ScreenLandingPage
        origin={origin}
        totalCount={totalCount}
        inRangeCount={inRangeCount}
        overheadCount={overheadCount}
        location={location}
      />,
      { headers: { 'Cache-Control': 'no-store' } },
    )
  },
}

// ---------------------------------------------------------------------------
// Screen: Overhead
// ---------------------------------------------------------------------------

export let screenOverhead: BuildAction<'GET', typeof routes.screenOverhead> = {
  async handler({ url }) {
    let parsedUrl = new URL(url)
    let origin = parsedUrl.origin
    let location = resolveLocation(parsedUrl)

    if (location.source === 'fallback' && location.fallbackReason === 'no-params') {
      return Response.redirect(`${origin}/screens/landing`, 302)
    }

    let result = await getNearestAircraft(location.lat, location.lon, location.radiusKm)

    if (result.kind === 'empty' || result.kind === 'rate-limited' || result.kind === 'error') {
      let qs = `?lat=${location.lat}&lon=${location.lon}&radius=${location.radiusKm}`
      return Response.redirect(`${origin}/screens/empty${qs}`, 302)
    }

    let enriched = await enrichPlane(result.plane, location.lat, location.lon)

    // Get up-next planes (the next few closest after the nearest)
    let allResult = await getAllNearbyAircraft(location.lat, location.lon, location.radiusKm)
    let upNext: Array<{ cs: string; dst: string }> = []
    if (allResult.kind === 'ok' || allResult.kind === 'ok-stale') {
      upNext = allResult.planes
        .filter((p) => p.icao24 !== result.plane.icao24)
        .slice(0, 3)
        .map((p) => ({
          cs: p.callsign || p.icao24.toUpperCase(),
          dst: p.distanceKm < 10 ? p.distanceKm.toFixed(1) : String(Math.round(p.distanceKm)),
        }))
    }

    return render(
      <ScreenOverheadPage
        origin={origin}
        enriched={enriched}
        location={location}
        upNext={upNext}
        fetchedAt={result.fetchedAt}
      />,
      { headers: { 'Cache-Control': 'no-store' } },
    )
  },
}

// ---------------------------------------------------------------------------
// Screen: Board
// ---------------------------------------------------------------------------

export let screenBoard: BuildAction<'GET', typeof routes.screenBoard> = {
  async handler({ url }) {
    let parsedUrl = new URL(url)
    let origin = parsedUrl.origin
    let location = resolveLocation(parsedUrl)

    if (location.source === 'fallback' && location.fallbackReason === 'no-params') {
      return Response.redirect(`${origin}/screens/landing`, 302)
    }

    let result = await getAllNearbyAircraft(location.lat, location.lon, location.radiusKm)

    if (result.kind === 'empty' || result.kind === 'rate-limited' || result.kind === 'error') {
      let qs = `?lat=${location.lat}&lon=${location.lon}&radius=${location.radiusKm}`
      return Response.redirect(`${origin}/screens/empty${qs}`, 302)
    }

    let planes = result.planes.slice(0, 20) // cap at 20 rows

    // Enrich all planes in parallel
    let enrichedPlanes = await Promise.all(
      planes.map((p) => enrichPlane(p, location.lat, location.lon)),
    )

    let rows: BoardRow[] = enrichedPlanes.map((ep) =>
      toBoardRow(ep, ep.plane.distanceKm <= OVERHEAD_THRESHOLD_KM),
    )

    return render(
      <ScreenBoardPage
        origin={origin}
        rows={rows}
        location={location}
        contactCount={result.planes.length}
        fetchedAt={result.fetchedAt}
      />,
      { headers: { 'Cache-Control': 'no-store' } },
    )
  },
}

// ---------------------------------------------------------------------------
// Screen: Radar
// ---------------------------------------------------------------------------

export let screenRadar: BuildAction<'GET', typeof routes.screenRadar> = {
  async handler({ url }) {
    let parsedUrl = new URL(url)
    let origin = parsedUrl.origin
    let location = resolveLocation(parsedUrl)

    if (location.source === 'fallback' && location.fallbackReason === 'no-params') {
      return Response.redirect(`${origin}/screens/landing`, 302)
    }

    let result = await getAllNearbyAircraft(location.lat, location.lon, location.radiusKm)

    if (result.kind === 'empty' || result.kind === 'rate-limited' || result.kind === 'error') {
      let qs = `?lat=${location.lat}&lon=${location.lon}&radius=${location.radiusKm}`
      return Response.redirect(`${origin}/screens/empty${qs}`, 302)
    }

    let blips = result.planes.map((p) =>
      toRadarBlip(p, location.lat, location.lon, location.radiusKm),
    )

    // Closest contact info
    let closest = result.planes[0]!
    let closestBearing = bearingDeg(location.lat, location.lon, closest.lat, closest.lon)
    let closestCompass = compass8(closestBearing)

    // Sweep log: top 8 planes with route info (lightweight enrichment)
    let sweepPlanes = result.planes.slice(0, 8)
    let sweepRoutes = await Promise.all(
      sweepPlanes.map((p) =>
        p.callsign ? getRoute(p.callsign) : Promise.resolve(null),
      ),
    )
    let sweepLog = sweepPlanes.map((p, i) => {
      let r = sweepRoutes[i]
      let cs = p.callsign || p.icao24.toUpperCase()
      let rt = r ? `${r.originIata} → ${r.destinationIata}` : ''
      let dst = p.distanceKm < 10 ? p.distanceKm.toFixed(1) : String(Math.round(p.distanceKm))
      return { cs, rt, dst }
    })

    return render(
      <ScreenRadarPage
        origin={origin}
        blips={blips}
        closestCs={closest.callsign || closest.icao24.toUpperCase()}
        closestDst={closest.distanceKm < 10 ? closest.distanceKm.toFixed(1) : String(Math.round(closest.distanceKm))}
        closestDir={`${Math.round(closestBearing)}° ${closestCompass}`}
        sweepLog={sweepLog}
        location={location}
        radiusKm={location.radiusKm}
      />,
      { headers: { 'Cache-Control': 'no-store' } },
    )
  },
}

// ---------------------------------------------------------------------------
// Screen: Detail
// ---------------------------------------------------------------------------

export let screenDetail: BuildAction<'GET', typeof routes.screenDetail> = {
  async handler({ url }) {
    let parsedUrl = new URL(url)
    let origin = parsedUrl.origin
    let location = resolveLocation(parsedUrl)

    if (location.source === 'fallback' && location.fallbackReason === 'no-params') {
      return Response.redirect(`${origin}/screens/landing`, 302)
    }

    // Use the nearest aircraft as the detail subject
    let result = await getNearestAircraft(location.lat, location.lon, location.radiusKm)

    if (result.kind === 'empty' || result.kind === 'rate-limited' || result.kind === 'error') {
      let qs = `?lat=${location.lat}&lon=${location.lon}&radius=${location.radiusKm}`
      return Response.redirect(`${origin}/screens/empty${qs}`, 302)
    }

    let enriched = await enrichPlane(result.plane, location.lat, location.lon)

    return render(
      <ScreenDetailPage
        origin={origin}
        enriched={enriched}
        location={location}
        fetchedAt={result.fetchedAt}
      />,
      { headers: { 'Cache-Control': 'no-store' } },
    )
  },
}

// ---------------------------------------------------------------------------
// Screen: Empty
// ---------------------------------------------------------------------------

export let screenEmpty: BuildAction<'GET', typeof routes.screenEmpty> = {
  async handler({ url }) {
    let parsedUrl = new URL(url)
    let origin = parsedUrl.origin
    let location = resolveLocation(parsedUrl)

    return render(
      <ScreenEmptyPage origin={origin} location={location} />,
      { headers: { 'Cache-Control': 'no-store' } },
    )
  },
}

// ---------------------------------------------------------------------------
// Page components — thin wrappers that pass data to screen UI components
// ---------------------------------------------------------------------------

interface LandingPageProps {
  origin: string
  totalCount: number
  inRangeCount: number
  overheadCount: number
  location: ResolvedLocation
}

function ScreenLandingPage() {
  return ({ origin, totalCount, inRangeCount, overheadCount, location }: LandingPageProps) => (
    <ScreenLayout title="FlyBy — Landing" origin={origin}>
      <Landing
        origin={origin}
        totalCount={totalCount}
        inRangeCount={inRangeCount}
        overheadCount={overheadCount}
        location={location}
      />
    </ScreenLayout>
  )
}

interface OverheadPageProps {
  origin: string
  enriched: EnrichedPlane
  location: ResolvedLocation
  upNext: Array<{ cs: string; dst: string }>
  fetchedAt: number
}

function ScreenOverheadPage() {
  return ({ origin, enriched, location, upNext, fetchedAt }: OverheadPageProps) => (
    <ScreenLayout title="FlyBy — Overhead" origin={origin}>
      <Overhead
        origin={origin}
        enriched={enriched}
        location={location}
        upNext={upNext}
        fetchedAt={fetchedAt}
      />
    </ScreenLayout>
  )
}

interface BoardPageProps {
  origin: string
  rows: BoardRow[]
  location: ResolvedLocation
  contactCount: number
  fetchedAt: number
}

function ScreenBoardPage() {
  return ({ origin, rows, location, contactCount, fetchedAt }: BoardPageProps) => (
    <ScreenLayout title="FlyBy — Board" origin={origin}>
      <Board
        origin={origin}
        rows={rows}
        location={location}
        contactCount={contactCount}
        fetchedAt={fetchedAt}
      />
    </ScreenLayout>
  )
}

interface RadarPageProps {
  origin: string
  blips: RadarBlip[]
  closestCs: string
  closestDst: string
  closestDir: string
  sweepLog: Array<{ cs: string; rt: string; dst: string }>
  location: ResolvedLocation
  radiusKm: number
}

function ScreenRadarPage() {
  return ({ origin, blips, closestCs, closestDst, closestDir, sweepLog, location, radiusKm }: RadarPageProps) => (
    <ScreenLayout title="FlyBy — Radar" origin={origin}>
      <Radar
        origin={origin}
        blips={blips}
        closestCs={closestCs}
        closestDst={closestDst}
        closestDir={closestDir}
        sweepLog={sweepLog}
        location={location}
        radiusKm={radiusKm}
      />
    </ScreenLayout>
  )
}

interface DetailPageProps {
  origin: string
  enriched: EnrichedPlane
  location: ResolvedLocation
  fetchedAt: number
}

function ScreenDetailPage() {
  return ({ origin, enriched, location, fetchedAt }: DetailPageProps) => (
    <ScreenLayout title="FlyBy — Flight Detail" origin={origin}>
      <Detail
        origin={origin}
        enriched={enriched}
        location={location}
        fetchedAt={fetchedAt}
      />
    </ScreenLayout>
  )
}

interface EmptyPageProps {
  origin: string
  location: ResolvedLocation
}

function ScreenEmptyPage() {
  return ({ origin, location }: EmptyPageProps) => (
    <ScreenLayout title="FlyBy — Empty Sky" origin={origin}>
      <Empty origin={origin} location={location} />
    </ScreenLayout>
  )
}
