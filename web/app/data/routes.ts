// FlyBy route lookup — enrich an ADS-B callsign with departure and
// destination airports.
//
// OpenSky's /api/states/all doesn't include route info, so we query
// a secondary API keyed by callsign. adsbdb.com is free, no auth,
// and has the best coverage in our spot-check (4/4 on DLH/BAW/AFR/KLM
// vs 3/4 on hexdb.io). The response is cached by normalised callsign
// because routes don't change mid-flight.

const ADSBDB_URL = 'https://api.adsbdb.com/v0/callsign/'
const FETCH_TIMEOUT_MS = 3_000
const CACHE_TTL_MS = 60 * 60 * 1_000 // 1 hour
const CACHE_MAX_ENTRIES = 500

export interface RouteInfo {
  originIata: string
  originIcao: string
  originName: string
  destinationIata: string
  destinationIcao: string
  destinationName: string
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
  let dIata = (destination as { iata_code?: unknown }).iata_code
  let dIcao = (destination as { icao_code?: unknown }).icao_code
  let dName = (destination as { name?: unknown }).name

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
    destinationIata: dIata.toUpperCase(),
    destinationIcao: dIcao.toUpperCase(),
    destinationName: typeof dName === 'string' ? dName : '',
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

export function __resetRouteCacheForTests() {
  cache.clear()
}
