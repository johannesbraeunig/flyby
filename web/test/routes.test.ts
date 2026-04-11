import * as assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import {
  __resetRouteCacheForTests,
  getRoute,
  parseAdsbdbRoute,
} from '../app/data/routes.ts'

describe('parseAdsbdbRoute', () => {
  it('extracts iata/icao/name from a real adsbdb response shape', () => {
    let json = {
      response: {
        flightroute: {
          callsign: 'DLH441',
          origin: {
            iata_code: 'iah',
            icao_code: 'kiah',
            name: 'George Bush Intercontinental',
          },
          destination: {
            iata_code: 'fra',
            icao_code: 'eddf',
            name: 'Frankfurt am Main',
          },
        },
      },
    }
    let r = parseAdsbdbRoute(json)
    assert.ok(r)
    assert.equal(r!.originIata, 'IAH')
    assert.equal(r!.originIcao, 'KIAH')
    assert.equal(r!.originName, 'George Bush Intercontinental')
    assert.equal(r!.destinationIata, 'FRA')
    assert.equal(r!.destinationIcao, 'EDDF')
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
