// Resolve the observer location from a request's URL search params.
//
// The URL is the single source of truth — no cookies, no session
// state. If ?lat=&lon= are present and valid, we use them; otherwise
// the caller (the home controller) renders the locating page where
// the user explicitly picks their location. The ?denied=1 flag is a
// special case that falls through to Hamburg with a banner.

export const HAMBURG = { lat: 53.5511, lon: 9.9937 } // matches firmware default
export const DEFAULT_RADIUS_KM = 50
export const MIN_RADIUS_KM = 5
export const MAX_RADIUS_KM = 250
export const DEFAULT_REFRESH_SEC = 30 // matches firmware cadence
export const REFRESH_OPTIONS = [0, 10, 30, 60, 120] as const // 0 = off

export interface ResolvedLocation {
  lat: number
  lon: number
  radiusKm: number
  refreshSec: number
  source: 'url' | 'fallback'
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

export function resolveLocation(url: URL): ResolvedLocation {
  let qLat = url.searchParams.get('lat')
  let qLon = url.searchParams.get('lon')
  let qRadius = url.searchParams.get('radius')
  let qRefresh = url.searchParams.get('refresh')
  let denied = url.searchParams.get('denied') === '1'

  if (qLat !== null && qLon !== null) {
    let lat = Number.parseFloat(qLat)
    let lon = Number.parseFloat(qLon)
    if (isValidLat(lat) && isValidLon(lon)) {
      let radius = qRadius !== null ? clampRadius(Number.parseFloat(qRadius)) : DEFAULT_RADIUS_KM
      let refresh =
        qRefresh !== null ? clampRefresh(Number.parseFloat(qRefresh)) : DEFAULT_REFRESH_SEC
      return { lat, lon, radiusKm: radius, refreshSec: refresh, source: 'url' }
    }
  }

  return {
    ...HAMBURG,
    radiusKm: DEFAULT_RADIUS_KM,
    refreshSec: DEFAULT_REFRESH_SEC,
    source: 'fallback',
    fallbackReason: denied ? 'denied' : 'no-params',
  }
}
