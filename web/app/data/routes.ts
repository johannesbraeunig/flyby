// FlyBy route lookup — enrich an ADS-B callsign with departure and
// destination airports.
//
// OpenSky's /api/states/all doesn't include route info, so we query
// a secondary API keyed by callsign. adsbdb.com is free, no auth,
// and has the best coverage in our spot-check (4/4 on DLH/BAW/AFR/KLM
// vs 3/4 on hexdb.io). The response is cached by normalised callsign
// because routes don't change mid-flight.

import { haversineKm } from './geo.ts'
import type { TrackStart } from './tracks.ts'

const ADSBDB_URL = 'https://api.adsbdb.com/v0/callsign/'
const FETCH_TIMEOUT_MS = 3_000
const CACHE_TTL_MS = 60 * 60 * 1_000 // 1 hour
const CACHE_MAX_ENTRIES = 500

// Cross-check threshold between adsbdb's claimed route endpoints
// and the first waypoint of OpenSky's /tracks/all trajectory. Big
// enough to absorb taxi + initial climb + airport-to-centroid
// variance (typically < 50 km), small enough to catch "wrong route
// entirely" drift (typically 500+ km when adsbdb's schedule is
// stale).
const ROUTE_MISMATCH_THRESHOLD_KM = 150

// If the track has been running longer than this, we can't
// meaningfully compare its first waypoint to the origin airport —
// ADS-B coverage gaps (especially over oceans) mean the "first
// contact" point can be well inside the flight path rather than
// at the real origin. In that case we trust adsbdb's route as-is
// rather than risk dropping a correct one.
const TRACK_SHORT_SECONDS = 60 * 60 // 1 hour

export interface RouteInfo {
  originIata: string
  originIcao: string
  originName: string
  /** Lat of the origin airport (from adsbdb). Used to cross-check
   * the route against OpenSky's /tracks/all trajectory data. */
  originLat: number | null
  originLon: number | null
  destinationIata: string
  destinationIcao: string
  destinationName: string
  destinationLat: number | null
  destinationLon: number | null
}

interface CacheEntry {
  // `null` means "we asked and there was no route" — so we don't
  // re-ask on every tick for general-aviation callsigns.
  value: RouteInfo | null
  expires: number
}

const cache = new Map<string, CacheEntry>()

function normaliseCallsign(callsign: string): string {
  return callsign.trim().toUpperCase()
}

function evictIfFull() {
  if (cache.size <= CACHE_MAX_ENTRIES) return
  let oldest = cache.keys().next().value
  if (oldest !== undefined) cache.delete(oldest)
}

// Pure: extract a RouteInfo from an adsbdb.com response. Returns null
// if the response shape isn't what we expect (including explicit
// "unknown callsign" 404 bodies).
//
// adsbdb payload shape (subset we use):
// {
//   response: {
//     flightroute: {
//       origin:      { iata_code, icao_code, name, ... },
//       destination: { iata_code, icao_code, name, ... },
//     }
//   }
// }
export function parseAdsbdbRoute(json: unknown): RouteInfo | null {
  if (typeof json !== 'object' || json === null) return null
  let response = (json as { response?: unknown }).response
  if (typeof response !== 'object' || response === null) return null
  let fr = (response as { flightroute?: unknown }).flightroute
  if (typeof fr !== 'object' || fr === null) return null
  let origin = (fr as { origin?: unknown }).origin
  let destination = (fr as { destination?: unknown }).destination
  if (typeof origin !== 'object' || origin === null) return null
  if (typeof destination !== 'object' || destination === null) return null

  let oIata = (origin as { iata_code?: unknown }).iata_code
  let oIcao = (origin as { icao_code?: unknown }).icao_code
  let oName = (origin as { name?: unknown }).name
  let oLat = (origin as { latitude?: unknown }).latitude
  let oLon = (origin as { longitude?: unknown }).longitude
  let dIata = (destination as { iata_code?: unknown }).iata_code
  let dIcao = (destination as { icao_code?: unknown }).icao_code
  let dName = (destination as { name?: unknown }).name
  let dLat = (destination as { latitude?: unknown }).latitude
  let dLon = (destination as { longitude?: unknown }).longitude

  if (
    typeof oIata !== 'string' ||
    typeof oIcao !== 'string' ||
    typeof dIata !== 'string' ||
    typeof dIcao !== 'string'
  ) {
    return null
  }

  return {
    originIata: oIata.toUpperCase(),
    originIcao: oIcao.toUpperCase(),
    originName: typeof oName === 'string' ? oName : '',
    originLat: typeof oLat === 'number' ? oLat : null,
    originLon: typeof oLon === 'number' ? oLon : null,
    destinationIata: dIata.toUpperCase(),
    destinationIcao: dIcao.toUpperCase(),
    destinationName: typeof dName === 'string' ? dName : '',
    destinationLat: typeof dLat === 'number' ? dLat : null,
    destinationLon: typeof dLon === 'number' ? dLon : null,
  }
}

// Look up a route. Never throws — returns null on any failure so the
// caller can degrade gracefully (display falls back to just the
// callsign). General-aviation callsigns (e.g. "N45DP") will also
// return null and get cached as null so we don't re-ask.
export async function getRoute(callsign: string): Promise<RouteInfo | null> {
  let key = normaliseCallsign(callsign)
  if (key.length < 4) return null

  let hit = cache.get(key)
  if (hit && hit.expires > Date.now()) return hit.value

  let controller = new AbortController()
  let timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    let res = await fetch(ADSBDB_URL + encodeURIComponent(key), {
      signal: controller.signal,
      headers: { 'User-Agent': 'flyby-web/0.1 (https://github.com/johannesbraeunig/flyby)' },
    })
    if (!res.ok) {
      cache.delete(key)
      cache.set(key, { value: null, expires: Date.now() + CACHE_TTL_MS })
      evictIfFull()
      return null
    }
    let json = await res.json()
    let route = parseAdsbdbRoute(json)
    cache.delete(key)
    cache.set(key, { value: route, expires: Date.now() + CACHE_TTL_MS })
    evictIfFull()
    return route
  } catch {
    // Timeout / network / parse — don't cache so we retry next tick.
    return null
  } finally {
    clearTimeout(timer)
  }
}

// Cross-check a route from adsbdb against OpenSky's actual ADS-B
// trajectory. adsbdb's DB is schedule-based, so when an airline
// reuses a callsign for a different route today, adsbdb happily
// returns yesterday's schedule. We use OpenSky's /tracks/all as
// ground truth.
//
// The naïve check — "track start near origin?" — produces false
// positives for long-haul flights where ADS-B coverage has gaps
// (especially over oceans). A JFK→FRA flight might legitimately
// have its first /tracks/all waypoint 300 km west of FRA where
// the European receiver network picks it up again. That's not
// evidence of a stale route.
//
// So we only drop the route when ALL of the following hold:
//   1. Track start is far (> 150 km) from the claimed origin
//   2. Track start is also far from the claimed destination
//      (so it's not a "plane approaching destination after gap")
//   3. The track has been running < 60 minutes (so the first
//      waypoint plausibly represents the real departure region)
//
// If any escape hatch catches (track runs long, or track start is
// near either endpoint), trust adsbdb. If any required field is
// missing (no track, no coordinates on either endpoint), trust
// adsbdb and move on.
export function verifyRouteAgainstTrack(
  route: RouteInfo | null,
  track: TrackStart | null,
  nowMs: number = Date.now(),
): RouteInfo | null {
  if (!route) return route
  if (!track) return route
  if (route.originLat === null || route.originLon === null) return route

  let originDistance = haversineKm(
    route.originLat,
    route.originLon,
    track.lat,
    track.lon,
  )
  if (originDistance <= ROUTE_MISMATCH_THRESHOLD_KM) return route

  // Escape hatch 1: track start is near the destination. ADS-B
  // coverage almost certainly resumed mid-flight and we've been
  // tracking only the final leg — the origin isn't wrong.
  if (route.destinationLat !== null && route.destinationLon !== null) {
    let destDistance = haversineKm(
      route.destinationLat,
      route.destinationLon,
      track.lat,
      track.lon,
    )
    if (destDistance <= ROUTE_MISMATCH_THRESHOLD_KM) return route
  }

  // Escape hatch 2: track has been running long enough that its
  // first waypoint is old data, not "where the plane departed".
  // Trust adsbdb absent stronger evidence.
  let trackAgeSec = nowMs / 1000 - track.startTime
  if (trackAgeSec > TRACK_SHORT_SECONDS) return route

  // Short track, far from both endpoints. Classic stale-adsbdb
  // case (the IBE07YW bug). Drop the route.
  return null
}

export function __resetRouteCacheForTests() {
  cache.clear()
}
