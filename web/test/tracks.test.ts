import * as assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import {
  __resetTrackCacheForTests,
  getTrackStart,
  parseOpenSkyTrack,
} from '../app/data/tracks.ts'

describe('parseOpenSkyTrack', () => {
  it('extracts lat/lon + startTime from the first path waypoint', () => {
    let json = {
      icao24: '80166c',
      callsign: 'AIC2029 ',
      startTime: 1775892809,
      endTime: 1775930616,
      path: [
        [1775892809, 28.5501, 77.0687, 304, 283, false],
        [1775892828, 28.5543, 77.049, 304, 283, false],
        [1775892832, 28.5552, 77.0446, 609, 282, false],
      ],
    }
    let t = parseOpenSkyTrack(json)
    assert.ok(t)
    assert.equal(t!.lat, 28.5501)
    assert.equal(t!.lon, 77.0687)
    assert.equal(t!.startTime, 1775892809)
  })

  it('handles OpenSky scientific-notation startTime', () => {
    // OpenSky serializes large timestamps as 1.775892809E9
    let json = {
      startTime: 1.775892809e9,
      endTime: 1.775930616e9,
      path: [[1, 50.5, 10.3, 0, 0, false]],
    }
    let t = parseOpenSkyTrack(json)
    assert.equal(t?.startTime, 1775892809)
    assert.equal(t?.lat, 50.5)
    assert.equal(t?.lon, 10.3)
  })

  it('returns null on missing fields', () => {
    assert.equal(parseOpenSkyTrack(null), null)
    assert.equal(parseOpenSkyTrack({}), null)
    assert.equal(parseOpenSkyTrack({ startTime: 1, path: [] }), null)
    assert.equal(parseOpenSkyTrack({ startTime: 1, path: [[1]] }), null)
    assert.equal(
      parseOpenSkyTrack({ startTime: 1, path: [[1, 'bad', 'bad']] }),
      null,
    )
  })
})

describe('getTrackStart', () => {
  let originalFetch: typeof fetch
  let calls = 0

  beforeEach(() => {
    originalFetch = globalThis.fetch
    calls = 0
    __resetTrackCacheForTests()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    __resetTrackCacheForTests()
  })

  it('caches successful lookups by normalised icao24', async () => {
    globalThis.fetch = (async () => {
      calls++
      return new Response(
        JSON.stringify({
          icao24: '80166c',
          startTime: 1775892809,
          endTime: 1775930616,
          path: [[1775892809, 28.55, 77.07, 300, 0, false]],
        }),
        { status: 200 },
      )
    }) as typeof fetch

    let t1 = await getTrackStart('80166C')
    let t2 = await getTrackStart('  80166c ')
    assert.equal(t1?.lat, 28.55)
    assert.equal(t2?.lat, 28.55)
    assert.equal(calls, 1, 'second lookup served from cache')
  })

  it('caches 404 ("no track") so unknown icao24s do not re-fetch', async () => {
    globalThis.fetch = (async () => {
      calls++
      return new Response('no track', { status: 404 })
    }) as typeof fetch

    let t1 = await getTrackStart('abcdef')
    let t2 = await getTrackStart('abcdef')
    assert.equal(t1, null)
    assert.equal(t2, null)
    assert.equal(calls, 1)
  })

  it('caches 429 (rate-limited) so we respect OpenSky quotas', async () => {
    globalThis.fetch = (async () => {
      calls++
      return new Response('rate limited', { status: 429 })
    }) as typeof fetch

    await getTrackStart('abc123')
    await getTrackStart('abc123')
    assert.equal(calls, 1)
  })

  it('does not cache network errors', async () => {
    let fail = true
    globalThis.fetch = (async () => {
      calls++
      if (fail) throw new Error('boom')
      return new Response(
        JSON.stringify({ startTime: 1, endTime: 2, path: [[1, 10, 20, 0, 0, false]] }),
        { status: 200 },
      )
    }) as typeof fetch

    let t1 = await getTrackStart('abc123')
    assert.equal(t1, null)
    fail = false
    let t2 = await getTrackStart('abc123')
    assert.equal(t2?.lat, 10)
    assert.equal(calls, 2)
  })
})
