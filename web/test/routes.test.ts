import * as assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import {
  __resetRouteCacheForTests,
  getRoute,
  parseAdsbdbRoute,
  verifyRouteAgainstTrack,
  type RouteInfo,
} from '../app/data/routes.ts'

describe('parseAdsbdbRoute', () => {
  it('extracts iata/icao/name/latlon from a real adsbdb response shape', () => {
    let json = {
      response: {
        flightroute: {
          callsign: 'DLH441',
          origin: {
            iata_code: 'iah',
            icao_code: 'kiah',
            name: 'George Bush Intercontinental',
            latitude: 29.9844,
            longitude: -95.3414,
          },
          destination: {
            iata_code: 'fra',
            icao_code: 'eddf',
            name: 'Frankfurt am Main',
            latitude: 50.0379,
            longitude: 8.5622,
          },
        },
      },
    }
    let r = parseAdsbdbRoute(json)
    assert.ok(r)
    assert.equal(r!.originIata, 'IAH')
    assert.equal(r!.originIcao, 'KIAH')
    assert.equal(r!.originName, 'George Bush Intercontinental')
    assert.equal(r!.originLat, 29.9844)
    assert.equal(r!.originLon, -95.3414)
    assert.equal(r!.destinationIata, 'FRA')
    assert.equal(r!.destinationIcao, 'EDDF')
    assert.equal(r!.destinationLat, 50.0379)
    assert.equal(r!.destinationLon, 8.5622)
  })

  it('stores originLat/Lon + destinationLat/Lon as null when adsbdb omits them', () => {
    let json = {
      response: {
        flightroute: {
          origin: { iata_code: 'AAA', icao_code: 'AAAA' },
          destination: { iata_code: 'BBB', icao_code: 'BBBB' },
        },
      },
    }
    let r = parseAdsbdbRoute(json)
    assert.equal(r?.originLat, null)
    assert.equal(r?.originLon, null)
    assert.equal(r?.destinationLat, null)
    assert.equal(r?.destinationLon, null)
  })

  it('returns null on missing fields', () => {
    assert.equal(parseAdsbdbRoute(null), null)
    assert.equal(parseAdsbdbRoute({}), null)
    assert.equal(parseAdsbdbRoute({ response: {} }), null)
    assert.equal(parseAdsbdbRoute({ response: { flightroute: {} } }), null)
    assert.equal(
      parseAdsbdbRoute({
        response: { flightroute: { origin: {}, destination: {} } },
      }),
      null,
    )
  })
})

describe('verifyRouteAgainstTrack', () => {
  // MAD → VIE route with real airport coordinates.
  function mkRoute(
    overrides: Partial<Pick<RouteInfo, 'originLat' | 'originLon' | 'destinationLat' | 'destinationLon'>> = {},
  ): RouteInfo {
    return {
      originIata: 'MAD',
      originIcao: 'LEMD',
      originName: 'Madrid',
      originLat: 40.471926,
      originLon: -3.56264,
      destinationIata: 'VIE',
      destinationIcao: 'LOWW',
      destinationName: 'Vienna',
      destinationLat: 48.110298,
      destinationLon: 16.5697,
      ...overrides,
    }
  }

  // nowMs = 1_700_000_000_000 (seconds: 1_700_000_000). Tests pass
  // this in so trackAgeSec is deterministic regardless of wall clock.
  const NOW_MS = 1_700_000_000_000
  const NOW_S = 1_700_000_000

  it('passes the route through when origin matches the track start', () => {
    // Track starts 3 km from MAD.
    let route = mkRoute()
    let track = { lat: 40.5, lon: -3.58, startTime: NOW_S - 60 }
    assert.equal(verifyRouteAgainstTrack(route, track, NOW_MS), route)
  })

  it('drops the route on the IBE07YW case (short track, far from both endpoints)', () => {
    // MAD → VIE, but track starts at HAM and is only 1 min old.
    let route = mkRoute()
    let track = { lat: 53.6304, lon: 9.9882, startTime: NOW_S - 60 }
    assert.equal(verifyRouteAgainstTrack(route, track, NOW_MS), null)
  })

  it('keeps the route when track start is near the DESTINATION (gapped long-haul)', () => {
    // JFK → FRA route, but ADS-B coverage only picks up 100 km
    // west of Frankfurt after the transatlantic crossing. We
    // should still trust the route.
    let route: RouteInfo = {
      originIata: 'JFK',
      originIcao: 'KJFK',
      originName: 'John F Kennedy',
      originLat: 40.6398,
      originLon: -73.7789,
      destinationIata: 'FRA',
      destinationIcao: 'EDDF',
      destinationName: 'Frankfurt',
      destinationLat: 50.0379,
      destinationLon: 8.5622,
    }
    // Track start ~ 100 km west of FRA, short track (20 min old).
    let track = { lat: 50.1, lon: 7.2, startTime: NOW_S - 20 * 60 }
    assert.equal(verifyRouteAgainstTrack(route, track, NOW_MS), route)
  })

  it('keeps the route when the track has been running > 60 minutes (coverage gap, mid-Atlantic)', () => {
    // DLH transatlantic picked up 90 minutes into the flight
    // somewhere over Greenland — nowhere near JFK or FRA, but
    // the track is old enough that we should trust adsbdb.
    let route: RouteInfo = {
      originIata: 'JFK',
      originIcao: 'KJFK',
      originName: 'John F Kennedy',
      originLat: 40.6398,
      originLon: -73.7789,
      destinationIata: 'FRA',
      destinationIcao: 'EDDF',
      destinationName: 'Frankfurt',
      destinationLat: 50.0379,
      destinationLon: 8.5622,
    }
    // Track start at Greenland, 90 min old — way outside 150 km
    // of either endpoint, but the age escape hatch kicks in.
    let track = { lat: 70, lon: -40, startTime: NOW_S - 90 * 60 }
    assert.equal(verifyRouteAgainstTrack(route, track, NOW_MS), route)
  })

  it('drops the route when short-track AND far from destination AND destination coords are known', () => {
    let route = mkRoute()
    let track = { lat: 0, lon: 0, startTime: NOW_S - 60 } // mid-Atlantic, 1 min
    assert.equal(verifyRouteAgainstTrack(route, track, NOW_MS), null)
  })

  it('passes through when no track data is available (graceful fallback)', () => {
    let route = mkRoute()
    assert.equal(verifyRouteAgainstTrack(route, null, NOW_MS), route)
  })

  it('passes through when adsbdb did not return origin coordinates', () => {
    let route = mkRoute({ originLat: null, originLon: null })
    let track = { lat: 53.6304, lon: 9.9882, startTime: NOW_S - 60 }
    assert.equal(verifyRouteAgainstTrack(route, track, NOW_MS), route)
  })

  it('returns null when no route was found (nothing to verify)', () => {
    let track = { lat: 40.5, lon: -3.58, startTime: NOW_S }
    assert.equal(verifyRouteAgainstTrack(null, track, NOW_MS), null)
  })
})

describe('getRoute', () => {
  let originalFetch: typeof fetch
  let calls = 0

  beforeEach(() => {
    originalFetch = globalThis.fetch
    calls = 0
    __resetRouteCacheForTests()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    __resetRouteCacheForTests()
  })

  it('caches successful lookups by normalised callsign', async () => {
    globalThis.fetch = (async () => {
      calls++
      return new Response(
        JSON.stringify({
          response: {
            flightroute: {
              origin: { iata_code: 'FRA', icao_code: 'EDDF', name: 'Frankfurt' },
              destination: { iata_code: 'JFK', icao_code: 'KJFK', name: 'JFK' },
            },
          },
        }),
        { status: 200 },
      )
    }) as typeof fetch

    let r1 = await getRoute('DLH441  ')
    let r2 = await getRoute('dlh441') // different case/whitespace, same key
    assert.equal(r1?.originIata, 'FRA')
    assert.equal(r2?.originIata, 'FRA')
    assert.equal(calls, 1, 'second lookup should come from cache')
  })

  it('caches misses so general-aviation callsigns do not re-fetch', async () => {
    globalThis.fetch = (async () => {
      calls++
      return new Response('not found', { status: 404 })
    }) as typeof fetch

    let r1 = await getRoute('N45DP')
    let r2 = await getRoute('N45DP')
    assert.equal(r1, null)
    assert.equal(r2, null)
    assert.equal(calls, 1)
  })

  it('does not cache network errors so they retry next tick', async () => {
    let fail = true
    globalThis.fetch = (async () => {
      calls++
      if (fail) throw new Error('boom')
      return new Response(
        JSON.stringify({
          response: {
            flightroute: {
              origin: { iata_code: 'LHR', icao_code: 'EGLL', name: 'Heathrow' },
              destination: { iata_code: 'DXB', icao_code: 'OMDB', name: 'Dubai' },
            },
          },
        }),
        { status: 200 },
      )
    }) as typeof fetch

    let r1 = await getRoute('BAW101')
    assert.equal(r1, null)
    fail = false
    let r2 = await getRoute('BAW101')
    assert.equal(r2?.originIata, 'LHR')
    assert.equal(calls, 2)
  })

  it('returns null for short callsigns without touching the network', async () => {
    globalThis.fetch = (async () => {
      calls++
      return new Response('', { status: 200 })
    }) as typeof fetch
    assert.equal(await getRoute('AB'), null)
    assert.equal(calls, 0)
  })
})
