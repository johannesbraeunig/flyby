// Display formatters that mirror the firmware's LED layout.

const MPS_TO_KNOTS = 1.94384
const M_TO_FT = 3.28084

export function formatFlightLevel(altMeters: number | null): string {
  if (altMeters === null || !Number.isFinite(altMeters)) return '?'
  let ft = altMeters * M_TO_FT
  let fl = Math.round(ft / 100)
  return `FL${fl.toString().padStart(3, '0')}`
}

export function formatSpeed(velMps: number | null): string {
  if (velMps === null || !Number.isFinite(velMps)) return '?kt'
  let kt = Math.round(velMps * MPS_TO_KNOTS)
  return `${kt}kt`
}

// Just the knots number (no "kt" suffix) for tight LED layouts.
export function formatSpeedCompact(velMps: number | null): string {
  if (velMps === null || !Number.isFinite(velMps)) return '?'
  return String(Math.round(velMps * MPS_TO_KNOTS))
}

// Metric altitude: "8230M" or "?" when altitude is missing. Used as
// secondary context on the ALT label alongside the primary FL value.
export function formatAltMeters(altMeters: number | null): string {
  if (altMeters === null || !Number.isFinite(altMeters)) return '?'
  return `${Math.round(altMeters)}M`
}

// Metric ground speed: "900KM/H" or "?". Used as secondary context on
// the SPD label alongside the primary knots value.
export function formatSpeedKmh(velMps: number | null): string {
  if (velMps === null || !Number.isFinite(velMps)) return '?'
  return `${Math.round(velMps * 3.6)}KM/H`
}

export function formatDistance(km: number): string {
  if (!Number.isFinite(km)) return '?'
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}

// Compact form: "3.1KM", "42KM" — no space, uppercase, for the LED panel.
export function formatDistanceCompact(km: number): string {
  if (!Number.isFinite(km)) return '?'
  if (km < 10) return `${km.toFixed(1)}KM`
  return `${Math.round(km)}KM`
}

// Take a callsign like "DLH441 " and split into prefix + flight number.
export function splitCallsign(callsign: string): { icao: string; number: string } {
  let trimmed = callsign.trim().toUpperCase()
  let m = /^([A-Z]{3})(.*)$/.exec(trimmed)
  if (!m) return { icao: '', number: trimmed }
  return { icao: m[1] ?? '', number: m[2] ?? '' }
}
