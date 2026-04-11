// FlyBy geo — great-circle distance + bbox helpers.
//
// Ported from src/geo.cpp so the web app and the firmware
// agree on what "nearest" means.

const EARTH_RADIUS_KM = 6371.0088 // WGS-84 mean radius
const KM_PER_DEG_LAT = 111.32
const DEG_TO_RAD = Math.PI / 180

export interface BBox {
  lamin: number
  lomin: number
  lamax: number
  lomax: number
}

// Great-circle distance between two (lat, lon) points in kilometers.
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  let dLat = (lat2 - lat1) * DEG_TO_RAD
  let dLon = (lon2 - lon1) * DEG_TO_RAD
  let s1 = Math.sin(dLat / 2)
  let s2 = Math.sin(dLon / 2)
  let a =
    s1 * s1 +
    Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * s2 * s2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

// Approximate lat/lon bounding box around (lat, lon) covering the given
// radius. The box is over-inclusive (a square in lat/lon space, not a
// true circle), which is what OpenSky's bbox query expects.
//
// Latitude is clamped to [-90, 90] and longitude to [-180, 180] at the
// edges — at the poles or near the antimeridian, a naïve bbox would
// spill out of valid coordinate space and OpenSky would reject it.
// Clamping gives a truncated (but valid) box; good enough for a display
// that realistically isn't used from inside the Arctic Circle.
export function bboxFor(lat: number, lon: number, radiusKm: number): BBox {
  let dLat = radiusKm / KM_PER_DEG_LAT
  let cosLat = Math.cos(lat * DEG_TO_RAD)
  let dLon = cosLat > 1e-9 ? radiusKm / (KM_PER_DEG_LAT * cosLat) : 180
  return {
    lamin: Math.max(-90, lat - dLat),
    lomin: Math.max(-180, lon - dLon),
    lamax: Math.min(90, lat + dLat),
    lomax: Math.min(180, lon + dLon),
  }
}
