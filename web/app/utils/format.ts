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

export function formatDistance(km: number): string {
  if (!Number.isFinite(km)) return '?'
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}

// Take a callsign like "DLH441 " and split into prefix + flight number.
export function splitCallsign(callsign: string): { icao: string; number: string } {
  let trimmed = callsign.trim().toUpperCase()
  let m = /^([A-Z]{3})(.*)$/.exec(trimmed)
  if (!m) return { icao: '', number: trimmed }
  return { icao: m[1] ?? '', number: m[2] ?? '' }
}
