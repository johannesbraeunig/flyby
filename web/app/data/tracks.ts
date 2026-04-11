// FlyBy OpenSky /tracks/all client.
//
// Queries OpenSky Network's /api/tracks/all endpoint to get an
// aircraft's *actual* trajectory (from real ADS-B data, not from
// published schedules). We only care about the FIRST waypoint —
// that's where the plane was first picked up by the receiver
// network, almost always the departure airport.
//
// Used to cross-check adsbdb's schedule-based route data against
// ground truth: if adsbdb claims origin=MAD but the trajectory
// starts at Hamburg, adsbdb's DB is stale for today and we should
// not show the wrong route to the user.
//
// Anonymous access: OpenSky's /tracks/* endpoints are open to
// unauthenticated clients with a daily rate limit (~400/day).
// Combined with per-icao24 caching (track startTime doesn't change
// while the flight is in progress), this is comfortably within
// budget for FlyBy's 30 s polling cadence.

const TRACKS_URL = 'https://opensky-network.org/api/tracks/all'
const FETCH_TIMEOUT_MS = 4_000
const CACHE_TTL_MS = 60 * 1_000 // 60 s — tracks extend but the start doesn't move
const CACHE_MAX_ENTRIES = 200

export interface TrackStart {
  lat: number
  lon: number
  /** Unix seconds when the track began (i.e. first ADS-B contact). */
  startTime: number
}

interface CacheEntry {
  value: TrackStart | null
  expires: number
}

const cache = new Map<string, CacheEntry>()

function normaliseIcao24(icao24: string): string {
  return icao24.trim().toLowerCase()
}

function evictIfFull() {
  if (cache.size <= CACHE_MAX_ENTRIES) return
  let oldest = cache.keys().next().value
  if (oldest !== undefined) cache.delete(oldest)
}

// Pure: extract the first waypoint and startTime from a /tracks/all
// response. The payload shape is:
// {
//   icao24: "80166c",
//   callsign: "AIC2029 ",
//   startTime: 1.775892809E9,
//   endTime: 1.775930616E9,
//   path: [
//     [time, lat, lon, alt_m, track_deg, on_ground],
//     ...
//   ]
// }
export function parseOpenSkyTrack(json: unknown): TrackStart | null {
  if (typeof json !== 'object' || json === null) return null
  let startTime = (json as { startTime?: unknown }).startTime
  let path = (json as { path?: unknown }).path
  if (typeof startTime !== 'number' || !Array.isArray(path) || path.length === 0) {
    return null
  }
  let first = path[0]
  if (!Array.isArray(first) || first.length < 3) return null
  let lat = first[1]
  let lon = first[2]
  if (typeof lat !== 'number' || typeof lon !== 'number') return null
  return { lat, lon, startTime }
}

// Look up the starting point of an aircraft's current track. Never
// throws — returns null on any failure so the caller can degrade
// gracefully (falling back to "trust adsbdb as-is"). Negatively
// cached so a failed / unknown track doesn't hammer OpenSky's
// daily quota on every 30 s poll.
export async function getTrackStart(icao24: string): Promise<TrackStart | null> {
  let key = normaliseIcao24(icao24)
  if (key.length < 3) return null

  let hit = cache.get(key)
  if (hit && hit.expires > Date.now()) return hit.value

  let controller = new AbortController()
  let timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    let url = new URL(TRACKS_URL)
    url.searchParams.set('icao24', key)
    url.searchParams.set('time', '0')
    let res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'flyby-web/0.1 (https://github.com/johannesbraeunig/flyby)',
      },
    })
    if (!res.ok) {
      // Includes 404 ("no track for this aircraft"), 429 (rate
      // limited), 5xx. Cache null so we don't retry immediately.
      cache.delete(key)
      cache.set(key, { value: null, expires: Date.now() + CACHE_TTL_MS })
      evictIfFull()
      return null
    }
    let json = await res.json()
    let track = parseOpenSkyTrack(json)
    cache.delete(key)
    cache.set(key, { value: track, expires: Date.now() + CACHE_TTL_MS })
    evictIfFull()
    return track
  } catch {
    // Timeout / network / parse — don't cache so we retry next tick.
    return null
  } finally {
    clearTimeout(timer)
  }
}

export function __resetTrackCacheForTests() {
  cache.clear()
}
