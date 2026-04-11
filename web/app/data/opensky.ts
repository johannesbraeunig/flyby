// FlyBy OpenSky client — fetch nearby aircraft and pick the nearest.
//
// OpenSky Network exposes /api/states/all with a positional-array
// response. We hit it with a bbox derived from (lat, lon, radius_km),
// filter on-ground / no-position rows, then sort by haversine distance.
//
// Anonymous requests are rate-limited (~10s minimum). We add a small
// in-memory cache keyed by *rounded* bbox so multiple users in the
// same area share results, plus stale-on-429 to keep the page useful
// when the API briefly hates us.

import { fetchBoundedJson } from '../utils/fetch-json.ts'
import { bboxFor, haversineKm, type BBox } from './geo.ts'
import { invalidateToken, openskyAuthHeader } from './opensky-auth.ts'

const OPENSKY_URL = 'https://opensky-network.org/api/states/all'
const FETCH_TIMEOUT_MS = 8_000
const CACHE_TTL_MS = 15_000
const CACHE_MAX_ENTRIES = 100
const BBOX_ROUND_DEG = 0.1 // ~11 km granularity for cache keys
// /states/all for a continent-sized bbox is typically ~500 KB.
// Allow 4 MB to tolerate busy airspace (Europe / US East Coast).
const MAX_BODY_BYTES = 4 * 1024 * 1024

// One aircraft as we care about it. `distanceKm` is computed per-call
// against the observer that asked for it; do not store baked distances
// in the cache.
export interface Plane {
  icao24: string
  callsign: string
  lat: number
  lon: number
  altMeters: number | null
  velocityMps: number | null
  trackDeg: number | null
  /** Vertical rate in m/s. Positive = climbing, negative = descending,
   * null = unknown. Used to show an up/down arrow next to altitude. */
  verticalRateMps: number | null
  onGround: boolean
  originCountry: string
  distanceKm: number
}

// Same fields without the observer-dependent distance, for storage.
type PlanePosition = Omit<Plane, 'distanceKm'>

// Outcome of a nearest-aircraft query.
export type NearestResult =
  | { kind: 'ok'; plane: Plane; observed: { lat: number; lon: number; radiusKm: number }; fetchedAt: number; stale: false }
  | { kind: 'ok-stale'; plane: Plane; observed: { lat: number; lon: number; radiusKm: number }; fetchedAt: number; stale: true; reason: string }
  | { kind: 'empty'; observed: { lat: number; lon: number; radiusKm: number }; fetchedAt: number }
  | { kind: 'rate-limited'; observed: { lat: number; lon: number; radiusKm: number }; retryAfterSec: number | null }
  | { kind: 'error'; observed: { lat: number; lon: number; radiusKm: number }; message: string }

// Cache entry: raw airborne positions, no per-observer distance baked in.
// Each call recomputes distance against its own observer so two users in
// the same rounded bbox get correct results from each other's cache hits.
interface CacheEntry {
  bbox: BBox
  positions: PlanePosition[]
  fetchedAt: number
}

const cache = new Map<string, CacheEntry>()

function cacheKey(bbox: BBox): string {
  let r = (n: number) => Math.round(n / BBOX_ROUND_DEG) * BBOX_ROUND_DEG
  return [r(bbox.lamin), r(bbox.lomin), r(bbox.lamax), r(bbox.lomax)]
    .map((n) => n.toFixed(2))
    .join(',')
}

function evictIfFull() {
  if (cache.size <= CACHE_MAX_ENTRIES) return
  // FIFO: insertion order is preserved by Map.
  let oldest = cache.keys().next().value
  if (oldest !== undefined) cache.delete(oldest)
}

// Pure: parse OpenSky's positional-array response into PlanePosition[].
// Skips:
//   - on-ground rows (`on_ground: true`)
//   - rows with no lat/lon
//   - rows with no altitude data at all (neither baro nor geo altitude):
//     these are usually ground-radar blips or surface vehicles that
//     slipped past the on_ground flag, and we can't show a useful
//     "FL???" for them.
//
// Distance is not computed here — that happens later, against the
// requesting observer.
//
// OpenSky array layout (index → field):
//   0 icao24, 1 callsign, 2 origin_country, 3 time_position, 4 last_contact,
//   5 longitude, 6 latitude, 7 baro_altitude, 8 on_ground, 9 velocity,
//   10 true_track, 11 vertical_rate, 12 sensors, 13 geo_altitude,
//   14 squawk, 15 spi, 16 position_source
export function parseStates(json: unknown): PlanePosition[] {
  if (typeof json !== 'object' || json === null) return []
  let states = (json as { states?: unknown }).states
  if (!Array.isArray(states)) return []

  let out: PlanePosition[] = []
  for (let row of states) {
    if (!Array.isArray(row)) continue
    let onGround = row[8] === true
    if (onGround) continue
    let lon = typeof row[5] === 'number' ? row[5] : null
    let lat = typeof row[6] === 'number' ? row[6] : null
    if (lat === null || lon === null) continue

    let altMeters =
      typeof row[7] === 'number' ? row[7] : typeof row[13] === 'number' ? row[13] : null
    // No altitude at all → treat as ground / unknown; skip.
    if (altMeters === null) continue

    let icao24 = typeof row[0] === 'string' ? row[0] : ''
    let callsignRaw = typeof row[1] === 'string' ? row[1] : ''
    let callsign = callsignRaw.trim()
    if (icao24 === '') continue

    out.push({
      icao24,
      callsign,
      lat,
      lon,
      altMeters,
      velocityMps: typeof row[9] === 'number' ? row[9] : null,
      trackDeg: typeof row[10] === 'number' ? row[10] : null,
      verticalRateMps: typeof row[11] === 'number' ? row[11] : null,
      onGround: false,
      originCountry: typeof row[2] === 'string' ? row[2] : '',
    })
  }
  return out
}

// Sort + tag positions with per-observer distance. Pure helper.
export function rankByDistance(
  positions: ReadonlyArray<PlanePosition>,
  obsLat: number,
  obsLon: number,
): Plane[] {
  let out: Plane[] = positions.map((p) => ({
    ...p,
    distanceKm: haversineKm(obsLat, obsLon, p.lat, p.lon),
  }))
  out.sort((a, b) => a.distanceKm - b.distanceKm)
  return out
}

// Fetch states from OpenSky for the given bbox. Throws on network error
// or non-2xx HTTP; the caller's try/catch handles all failure modes.
// Transparently retries once if a cached OAuth2 token was rejected
// (401) — that usually means the server-side token lifetime ended
// slightly before our safety margin expected.
async function fetchStates(bbox: BBox, signal: AbortSignal): Promise<unknown> {
  let url = new URL(OPENSKY_URL)
  url.searchParams.set('lamin', bbox.lamin.toFixed(4))
  url.searchParams.set('lomin', bbox.lomin.toFixed(4))
  url.searchParams.set('lamax', bbox.lamax.toFixed(4))
  url.searchParams.set('lomax', bbox.lomax.toFixed(4))

  let doFetch = async () => {
    let authHeaders = await openskyAuthHeader()
    return fetchBoundedJson(url.toString(), {
      signal,
      maxBytes: MAX_BODY_BYTES,
      headers: authHeaders,
    })
  }

  let result = await doFetch()

  // If our cached token was rejected, invalidate and retry once.
  if (result.status === 401) {
    invalidateToken()
    result = await doFetch()
  }

  if (result.ok) return result.json

  if (result.status === 429) {
    let retryAfter = result.headers.get('retry-after')
    let err = new Error('rate-limited') as Error & {
      rateLimited: true
      retryAfterSec: number | null
    }
    err.rateLimited = true
    err.retryAfterSec = retryAfter ? Number.parseInt(retryAfter, 10) || null : null
    throw err
  }
  if (result.reason === 'too-large') {
    throw new Error(`OpenSky response exceeded ${MAX_BODY_BYTES} byte cap`)
  }
  if (result.reason === 'parse') {
    throw new Error('OpenSky response parse error')
  }
  throw new Error(`OpenSky HTTP ${result.status}`)
}

// Public entrypoint: get the nearest airborne aircraft to (lat, lon)
// within radiusKm. Always returns a NearestResult — never throws.
export async function getNearestAircraft(
  lat: number,
  lon: number,
  radiusKm: number,
): Promise<NearestResult> {
  let observed = { lat, lon, radiusKm }
  let bbox = bboxFor(lat, lon, radiusKm)
  let key = cacheKey(bbox)
  let now = Date.now()

  let cached = cache.get(key)
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return pickFromCached(cached, observed)
  }

  let controller = new AbortController()
  let timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    let json = await fetchStates(bbox, controller.signal)
    let positions = parseStates(json)
    let entry: CacheEntry = { bbox, positions, fetchedAt: Date.now() }
    cache.delete(key) // re-insert so FIFO order updates
    cache.set(key, entry)
    evictIfFull()
    return pickFromCached(entry, observed)
  } catch (raw) {
    let err = raw as Error & { rateLimited?: boolean; retryAfterSec?: number | null; name?: string }
    // 429: serve stale if we have any.
    if (err.rateLimited) {
      console.warn(
        `[opensky] 429 rate-limited (retry in ${err.retryAfterSec ?? '~10'}s) for ` +
          `${observed.lat.toFixed(2)},${observed.lon.toFixed(2)} r=${observed.radiusKm}`,
      )
      if (cached) {
        return staleFromCached(cached, observed, `rate limited; retry in ${err.retryAfterSec ?? '~10'}s`)
      }
      return { kind: 'rate-limited', observed, retryAfterSec: err.retryAfterSec ?? null }
    }
    // Timeout / network: serve stale if we have any.
    let reason = err.name === 'AbortError' ? 'OpenSky timeout' : err.message || 'OpenSky error'
    console.warn(
      `[opensky] ${reason} for ${observed.lat.toFixed(2)},${observed.lon.toFixed(2)} ` +
        `r=${observed.radiusKm}${cached ? ' (serving stale)' : ''}`,
    )
    if (cached) {
      return staleFromCached(cached, observed, reason)
    }
    return { kind: 'error', observed, message: err.message || String(err) }
  } finally {
    clearTimeout(timer)
  }
}

// Pick a "best" plane from a distance-ranked candidate list. We prefer
// commercial airliners over general-aviation aircraft.
//
// "Commercial-looking" = callsign that starts with 3 uppercase ASCII
// letters followed by at least one digit (e.g. DLH441, BAW117, EXS74XC,
// BTI233). This catches essentially every scheduled airline regardless
// of whether the ICAO prefix is in our hand-rolled 40-entry airline
// brand-color table. General-aviation callsigns like N118MX, DMMXC,
// D-EABC, HB-JCI, G-HUEW don't match this pattern (either they start
// with a digit, or they have more/fewer letters before the digit, or
// they contain a dash). They fall through to the "nearest overall"
// fallback only when no airline-style flight is in range.
const COMMERCIAL_CALLSIGN_PATTERN = /^[A-Z]{3}\d/

export function selectNearestPreferringCommercial(ranked: ReadonlyArray<Plane>): Plane | null {
  if (ranked.length === 0) return null
  for (let p of ranked) {
    if (COMMERCIAL_CALLSIGN_PATTERN.test(p.callsign)) return p
  }
  return ranked[0] ?? null
}

// Build a NearestResult from a cache entry + observer position.
// Shared between the fresh-cache path and the stale-on-429 path;
// the `stale` argument flips the result variant.
function buildResult(
  entry: CacheEntry,
  observed: { lat: number; lon: number; radiusKm: number },
  stale: false | { reason: string },
): NearestResult {
  let ranked = rankByDistance(entry.positions, observed.lat, observed.lon)
  let candidates = ranked.filter((p) => p.distanceKm <= observed.radiusKm)
  let pick = selectNearestPreferringCommercial(candidates)
  if (!pick) {
    return { kind: 'empty', observed, fetchedAt: entry.fetchedAt }
  }
  if (stale) {
    return {
      kind: 'ok-stale',
      plane: pick,
      observed,
      fetchedAt: entry.fetchedAt,
      stale: true,
      reason: stale.reason,
    }
  }
  return { kind: 'ok', plane: pick, observed, fetchedAt: entry.fetchedAt, stale: false }
}

function pickFromCached(
  entry: CacheEntry,
  observed: { lat: number; lon: number; radiusKm: number },
): NearestResult {
  return buildResult(entry, observed, false)
}

function staleFromCached(
  entry: CacheEntry,
  observed: { lat: number; lon: number; radiusKm: number },
  reason: string,
): NearestResult {
  return buildResult(entry, observed, { reason })
}

// Test hook: clear the in-memory cache between tests.
export function __resetCacheForTests() {
  cache.clear()
}
