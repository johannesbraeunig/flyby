// Resolve the observer location from a request: URL params, then
// cookie, then Hamburg fallback.

export const HAMBURG = { lat: 53.5511, lon: 9.9937 } // matches firmware default
export const DEFAULT_RADIUS_KM = 50
export const MIN_RADIUS_KM = 5
export const MAX_RADIUS_KM = 250
export const LOCATION_COOKIE = 'flyby_loc'
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30

export interface ResolvedLocation {
  lat: number
  lon: number
  radiusKm: number
  source: 'url' | 'cookie' | 'fallback'
  fallbackReason?: 'no-params' | 'denied' | 'invalid'
}

function clampRadius(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_RADIUS_KM
  if (n < MIN_RADIUS_KM) return MIN_RADIUS_KM
  if (n > MAX_RADIUS_KM) return MAX_RADIUS_KM
  return n
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

function parseCookieValue(raw: string | undefined): { lat: number; lon: number; radiusKm: number } | null {
  if (!raw) return null
  let parts = raw.split(',').map((s) => Number.parseFloat(s))
  if (parts.length < 2) return null
  let [lat, lon, radius] = parts
  if (lat === undefined || lon === undefined || !isValidLat(lat) || !isValidLon(lon)) return null
  return { lat, lon, radiusKm: clampRadius(radius ?? DEFAULT_RADIUS_KM) }
}

export function resolveLocation(url: URL, cookieHeader: string | null): ResolvedLocation {
  let qLat = url.searchParams.get('lat')
  let qLon = url.searchParams.get('lon')
  let qRadius = url.searchParams.get('radius')
  let denied = url.searchParams.get('denied') === '1'

  if (qLat !== null && qLon !== null) {
    let lat = Number.parseFloat(qLat)
    let lon = Number.parseFloat(qLon)
    if (isValidLat(lat) && isValidLon(lon)) {
      let radius = qRadius !== null ? clampRadius(Number.parseFloat(qRadius)) : DEFAULT_RADIUS_KM
      return { lat, lon, radiusKm: radius, source: 'url' }
    }
  }

  let cookies = parseCookieHeader(cookieHeader)
  let fromCookie = parseCookieValue(cookies.get(LOCATION_COOKIE))
  if (fromCookie) {
    return { ...fromCookie, source: 'cookie' }
  }

  return {
    ...HAMBURG,
    radiusKm: DEFAULT_RADIUS_KM,
    source: 'fallback',
    fallbackReason: denied ? 'denied' : 'no-params',
  }
}

export function locationCookieValue(loc: { lat: number; lon: number; radiusKm: number }): string {
  let value = `${loc.lat.toFixed(4)},${loc.lon.toFixed(4)},${Math.round(loc.radiusKm)}`
  return `${LOCATION_COOKIE}=${encodeURIComponent(value)}; Max-Age=${COOKIE_MAX_AGE_SEC}; Path=/; SameSite=Lax`
}
