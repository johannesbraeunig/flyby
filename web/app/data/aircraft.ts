// FlyBy aircraft lookup — enrich an icao24 hex with aircraft type
// (e.g. "A333", "B738") so the panel can show it on its own line.
//
// Uses adsbdb.com's /v0/aircraft/<icao24> endpoint as primary and
// hexdb.io's /api/v1/aircraft/<hex> as fallback. adsbdb has the
// best coverage but occasional gaps (especially on Scandinavian
// and some European fleets); hexdb fills those in. Same negative-
// caching rules as the route lookup.

import { fetchBoundedJson } from '../utils/fetch-json.ts'

const ADSBDB_URL = 'https://api.adsbdb.com/v0/aircraft/'
const HEXDB_URL = 'https://hexdb.io/api/v1/aircraft/'
const FETCH_TIMEOUT_MS = 3_000
const CACHE_TTL_MS = 24 * 60 * 60 * 1_000 // 24 hours
const CACHE_MAX_ENTRIES = 500
// Aircraft payloads are a few hundred bytes; 16 KB is huge headroom.
const MAX_BODY_BYTES = 16 * 1024

export interface AircraftInfo {
  icaoType: string // 4-char ICAO type designator, e.g. "A333"
  typeName: string // Human-readable, e.g. "Airbus A330-300"
  registration: string // e.g. "D-ABYS"
  owner: string // registered owner / operator
}

interface CacheEntry {
  value: AircraftInfo | null
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

// Pure: extract an AircraftInfo from an adsbdb response. Returns
// null if the response shape isn't what we expect, including the
// "unknown aircraft" string response for icao24s adsbdb doesn't
// have a record for.
//
// adsbdb payload shape:
// {
//   response: {
//     aircraft: {
//       type:             "Airbus A330-300",
//       icao_type:        "A333",
//       manufacturer:     "Airbus",
//       mode_s:           "3C6BA0",
//       registration:     "D-ABYS",
//       registered_owner: "Lufthansa",
//       ...
//     }
//   }
// }
// or for unknowns: { response: "unknown aircraft" }
export function parseAdsbdbAircraft(json: unknown): AircraftInfo | null {
  if (typeof json !== 'object' || json === null) return null
  let response = (json as { response?: unknown }).response
  // "unknown aircraft" and similar string responses.
  if (typeof response !== 'object' || response === null) return null
  let ac = (response as { aircraft?: unknown }).aircraft
  if (typeof ac !== 'object' || ac === null) return null

  let icaoType = (ac as { icao_type?: unknown }).icao_type
  let typeName = (ac as { type?: unknown }).type
  let registration = (ac as { registration?: unknown }).registration
  let owner = (ac as { registered_owner?: unknown }).registered_owner

  if (typeof icaoType !== 'string' || icaoType.length === 0) return null

  return {
    icaoType: icaoType.toUpperCase(),
    typeName: typeof typeName === 'string' ? typeName : '',
    registration: typeof registration === 'string' ? registration : '',
    owner: typeof owner === 'string' ? owner : '',
  }
}

// hexdb.io payload shape:
// {
//   "ModeS": "4ACA73",
//   "Registration": "SE-RSS",
//   "Manufacturer": "Embraer",
//   "ICAOTypeCode": "E195",
//   "Type": "EMB-195 LR",
//   "RegisteredOwners": "SAS Link",
//   "OperatorFlagCode": "SVS"
// }
export function parseHexdbAircraft(json: unknown): AircraftInfo | null {
  if (typeof json !== 'object' || json === null) return null
  let icaoType = (json as { ICAOTypeCode?: unknown }).ICAOTypeCode
  if (typeof icaoType !== 'string' || icaoType.length === 0) return null
  let typeName = (json as { Type?: unknown }).Type
  let registration = (json as { Registration?: unknown }).Registration
  let owner = (json as { RegisteredOwners?: unknown }).RegisteredOwners
  return {
    icaoType: icaoType.toUpperCase(),
    typeName: typeof typeName === 'string' ? typeName : '',
    registration: typeof registration === 'string' ? registration : '',
    owner: typeof owner === 'string' ? owner : '',
  }
}

// Small wrapper: bounded fetch + parse from one source, with its
// own timeout. Returns null on any failure (HTTP, network, timeout,
// too-large, parse).
async function tryFetch(
  url: string,
  parse: (json: unknown) => AircraftInfo | null,
): Promise<AircraftInfo | null> {
  let controller = new AbortController()
  let timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    let result = await fetchBoundedJson(url, {
      signal: controller.signal,
      maxBytes: MAX_BODY_BYTES,
    })
    if (!result.ok) return null
    return parse(result.json)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// Look up aircraft by icao24. Tries adsbdb.com first, falls back
// to hexdb.io if adsbdb doesn't know the hex. Never throws —
// returns null on any failure. Unknowns are negatively cached so
// we don't re-ask on every 30 s tick.
export async function getAircraft(icao24: string): Promise<AircraftInfo | null> {
  let key = normaliseIcao24(icao24)
  if (key.length < 3) return null

  let hit = cache.get(key)
  if (hit && hit.expires > Date.now()) return hit.value

  let fromAdsbdb = await tryFetch(ADSBDB_URL + encodeURIComponent(key), parseAdsbdbAircraft)
  let result = fromAdsbdb
  if (!result) {
    result = await tryFetch(HEXDB_URL + encodeURIComponent(key), parseHexdbAircraft)
  }

  // Cache positive and negative results alike so GA blips don't
  // re-hit both APIs on every 30 s tick.
  cache.delete(key)
  cache.set(key, { value: result, expires: Date.now() + CACHE_TTL_MS })
  evictIfFull()
  return result
}

export function __resetAircraftCacheForTests() {
  cache.clear()
}
