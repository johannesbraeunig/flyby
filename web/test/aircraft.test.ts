import * as assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import {
  __resetAircraftCacheForTests,
  getAircraft,
  parseAdsbdbAircraft,
  parseHexdbAircraft,
} from '../app/data/aircraft.ts'

describe('parseAdsbdbAircraft', () => {
  it('extracts icao_type and typeName from a real adsbdb response', () => {
    let json = {
      response: {
        aircraft: {
          type: 'Airbus A330-300',
          icao_type: 'a333',
          manufacturer: 'Airbus',
          mode_s: '3C6BA0',
          registration: 'D-ABYS',
          registered_owner: 'Lufthansa',
        },
      },
    }
    let a = parseAdsbdbAircraft(json)
    assert.ok(a)
    assert.equal(a!.icaoType, 'A333')
    assert.equal(a!.typeName, 'Airbus A330-300')
    assert.equal(a!.registration, 'D-ABYS')
    assert.equal(a!.owner, 'Lufthansa')
  })

  it('returns null when adsbdb replies "unknown aircraft"', () => {
    assert.equal(parseAdsbdbAircraft({ response: 'unknown aircraft' }), null)
  })

  it('returns null on missing fields', () => {
    assert.equal(parseAdsbdbAircraft(null), null)
    assert.equal(parseAdsbdbAircraft({}), null)
    assert.equal(parseAdsbdbAircraft({ response: {} }), null)
    assert.equal(parseAdsbdbAircraft({ response: { aircraft: {} } }), null)
    assert.equal(
      parseAdsbdbAircraft({ response: { aircraft: { icao_type: '' } } }),
      null,
    )
  })
})

describe('parseHexdbAircraft', () => {
  it('extracts ICAOTypeCode from a hexdb.io response', () => {
    let json = {
      ModeS: '4ACA73',
      Registration: 'SE-RSS',
      Manufacturer: 'Embraer',
      ICAOTypeCode: 'e195',
      Type: 'EMB-195 LR',
      RegisteredOwners: 'SAS Link',
    }
    let a = parseHexdbAircraft(json)
    assert.ok(a)
    assert.equal(a!.icaoType, 'E195')
    assert.equal(a!.typeName, 'EMB-195 LR')
    assert.equal(a!.registration, 'SE-RSS')
    assert.equal(a!.owner, 'SAS Link')
  })

  it('returns null on missing ICAOTypeCode', () => {
    assert.equal(parseHexdbAircraft(null), null)
    assert.equal(parseHexdbAircraft({}), null)
    assert.equal(parseHexdbAircraft({ ICAOTypeCode: '' }), null)
  })
})

describe('getAircraft', () => {
  let originalFetch: typeof fetch
  let calls = 0

  beforeEach(() => {
    originalFetch = globalThis.fetch
    calls = 0
    __resetAircraftCacheForTests()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    __resetAircraftCacheForTests()
  })

  it('caches successful adsbdb lookups by normalised icao24', async () => {
    globalThis.fetch = (async (input: Request | URL | string) => {
      calls++
      let urlStr = typeof input === 'string' ? input : input.toString()
      if (urlStr.includes('adsbdb.com')) {
        return new Response(
          JSON.stringify({
            response: {
              aircraft: {
                icao_type: 'B738',
                type: 'Boeing 737-800',
                registration: 'D-ABKA',
                registered_owner: 'Lufthansa',
              },
            },
          }),
          { status: 200 },
        )
      }
      return new Response('{}', { status: 404 })
    }) as typeof fetch

    let r1 = await getAircraft('3C6BA0')
    let r2 = await getAircraft('  3c6ba0 ')
    assert.equal(r1?.icaoType, 'B738')
    assert.equal(r2?.icaoType, 'B738')
    assert.equal(calls, 1, 'second lookup should come from cache')
  })

  it('falls back to hexdb.io when adsbdb returns "unknown aircraft"', async () => {
    globalThis.fetch = (async (input: Request | URL | string) => {
      calls++
      let urlStr = typeof input === 'string' ? input : input.toString()
      if (urlStr.includes('adsbdb.com')) {
        return new Response(JSON.stringify({ response: 'unknown aircraft' }), { status: 200 })
      }
      if (urlStr.includes('hexdb.io')) {
        return new Response(
          JSON.stringify({
            ModeS: '4ACA73',
            Registration: 'SE-RSS',
            Manufacturer: 'Embraer',
            ICAOTypeCode: 'E195',
            Type: 'EMB-195 LR',
            RegisteredOwners: 'SAS Link',
          }),
          { status: 200 },
        )
      }
      return new Response('{}', { status: 404 })
    }) as typeof fetch

    let r = await getAircraft('4aca73')
    assert.equal(r?.icaoType, 'E195')
    assert.equal(r?.typeName, 'EMB-195 LR')
    assert.equal(r?.owner, 'SAS Link')
    assert.equal(calls, 2, 'adsbdb + hexdb = 2 calls on cold cache')
  })

  it('caches negative lookups (both sources failed) so GA blips do not re-ask', async () => {
    globalThis.fetch = (async () => {
      calls++
      return new Response(JSON.stringify({ response: 'unknown aircraft' }), { status: 200 })
    }) as typeof fetch

    let r1 = await getAircraft('abcdef')
    let r2 = await getAircraft('abcdef')
    assert.equal(r1, null)
    assert.equal(r2, null)
    // 2 calls on the first lookup (adsbdb + hexdb), 0 on the second (cached)
    assert.equal(calls, 2)
  })
})
