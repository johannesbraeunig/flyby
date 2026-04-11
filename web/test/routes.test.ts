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
  })

  it('stores originLat/Lon as null when adsbdb omits them', () => {
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
  function mkRoute(lat: number | null, lon: number | null): RouteInfo {
    return {
      originIata: 'MAD',
      originIcao: 'LEMD',
      originName: 'Madrid',
      originLat: lat,
      originLon: lon,
      destinationIata: 'VIE',
      destinationIcao: 'LOWW',
      destinationName: 'Vienna',
    }
  }

  it('passes through the route when origin matches the track start (< 150 km)', () => {
    // Both near Madrid airport — 3 km apart.
    let route = mkRoute(40.471926, -3.56264)
    let track = { lat: 40.5, lon: -3.58, startTime: 1 }
    assert.equal(verifyRouteAgainstTrack(route, track), route)
  })

  it('drops the route when origin and track start are far apart (IBE07YW bug)', () => {
    // adsbdb says MAD; actual track started at HAM (~1500 km away).
    let route = mkRoute(40.471926, -3.56264)
    let track = { lat: 53.6304, lon: 9.9882, startTime: 1 } // HAM
    assert.equal(verifyRouteAgainstTrack(route, track), null)
  })

  it('passes through when no track data is available (graceful fallback)', () => {
    let route = mkRoute(40.471926, -3.56264)
    assert.equal(verifyRouteAgainstTrack(route, null), route)
  })

  it('passes through when adsbdb did not return origin coordinates', () => {
    let route = mkRoute(null, null)
    let track = { lat: 53.6304, lon: 9.9882, startTime: 1 }
    assert.equal(verifyRouteAgainstTrack(route, track), route)
  })

  it('returns null when no route was found (nothing to verify)', () => {
    let track = { lat: 40.5, lon: -3.58, startTime: 1 }
    assert.equal(verifyRouteAgainstTrack(null, track), null)
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
