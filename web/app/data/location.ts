// Resolve the observer location from a request: URL params, then
// cookie, then Hamburg fallback.

export const HAMBURG = { lat: 53.5511, lon: 9.9937 } // matches firmware default
export const DEFAULT_RADIUS_KM = 50
export const MIN_RADIUS_KM = 5
export const MAX_RADIUS_KM = 250
export const DEFAULT_REFRESH_SEC = 30 // matches firmware cadence
export const REFRESH_OPTIONS = [0, 10, 30, 60, 120] as const // 0 = off
export const LOCATION_COOKIE = 'flyby_loc'
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30

export interface ResolvedLocation {
  lat: number
  lon: number
  radiusKm: number
  refreshSec: number
  source: 'url' | 'cookie' | 'fallback'
  fallbackReason?: 'no-params' | 'denied' | 'invalid'
}

function clampRadius(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_RADIUS_KM
  if (n < MIN_RADIUS_KM) return MIN_RADIUS_KM
  if (n > MAX_RADIUS_KM) return MAX_RADIUS_KM
  return n
}

function clampRefresh(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_REFRESH_SEC
  // Snap to the nearest allowed option so the client can't
  // spam us with arbitrary poll cadences.
  let best = REFRESH_OPTIONS[0] as number
  let bestDelta = Infinity
  for (let opt of REFRESH_OPTIONS) {
    let d = Math.abs(opt - n)
    if (d < bestDelta) {
      best = opt
      bestDelta = d
    }
  }
  return best
}

function isValidLat(n: number): boolean {
  return Number.isFinite(n) && n >= -90 && n <= 90
}

function isValidLon(n: number): boolean {
  return Number.isFinite(n) && n >= -180 && n <= 180
}

function parseCookieHeader(header: string | null): Map<string, string> {
  let out = new Map<string, string>()
  if (!header) return out
  for (let part of header.split(/;\s*/)) {
    let eq = part.indexOf('=')
    if (eq <= 0) continue
    let name = part.slice(0, eq).trim()
    let value = decodeURIComponent(part.slice(eq + 1).trim())
    out.set(name, value)
  }
  return out
}

// Cookie format: "lat,lon,radius[,refreshSec]". The 4th field is
// optional so old 3-field cookies keep working.
function parseCookieValue(
  raw: string | undefined,
): { lat: number; lon: number; radiusKm: number; refreshSec: number } | null {
  if (!raw) return null
  let parts = raw.split(',').map((s) => Number.parseFloat(s))
  if (parts.length < 2) return null
  let [lat, lon, radius, refresh] = parts
  if (lat === undefined || lon === undefined || !isValidLat(lat) || !isValidLon(lon)) return null
  return {
    lat,
    lon,
    radiusKm: clampRadius(radius ?? DEFAULT_RADIUS_KM),
    refreshSec: clampRefresh(refresh ?? DEFAULT_REFRESH_SEC),
  }
}

export function resolveLocation(url: URL, cookieHeader: string | null): ResolvedLocation {
  let qLat = url.searchParams.get('lat')
  let qLon = url.searchParams.get('lon')
  let qRadius = url.searchParams.get('radius')
  let qRefresh = url.searchParams.get('refresh')
  let denied = url.searchParams.get('denied') === '1'

  let cookies = parseCookieHeader(cookieHeader)
  let fromCookie = parseCookieValue(cookies.get(LOCATION_COOKIE))

  if (qLat !== null && qLon !== null) {
    let lat = Number.parseFloat(qLat)
    let lon = Number.parseFloat(qLon)
    if (isValidLat(lat) && isValidLon(lon)) {
      let radius = qRadius !== null ? clampRadius(Number.parseFloat(qRadius)) : DEFAULT_RADIUS_KM
      // Prefer URL-provided refresh, then cookie, then default. This
      // keeps a user's chosen cadence across geolocation re-grants.
      let refresh =
        qRefresh !== null
          ? clampRefresh(Number.parseFloat(qRefresh))
          : fromCookie?.refreshSec ?? DEFAULT_REFRESH_SEC
      return { lat, lon, radiusKm: radius, refreshSec: refresh, source: 'url' }
    }
  }

  if (fromCookie) {
    return { ...fromCookie, source: 'cookie' }
  }

  return {
    ...HAMBURG,
    radiusKm: DEFAULT_RADIUS_KM,
    refreshSec: DEFAULT_REFRESH_SEC,
    source: 'fallback',
    fallbackReason: denied ? 'denied' : 'no-params',
  }
}

export function locationCookieValue(loc: {
  lat: number
  lon: number
  radiusKm: number
  refreshSec: number
}): string {
  let value = `${loc.lat.toFixed(4)},${loc.lon.toFixed(4)},${Math.round(loc.radiusKm)},${Math.round(loc.refreshSec)}`
  return `${LOCATION_COOKIE}=${encodeURIComponent(value)}; Max-Age=${COOKIE_MAX_AGE_SEC}; Path=/; SameSite=Lax`
}
