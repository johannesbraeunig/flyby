import * as assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import { router } from '../app/router.ts'
import { __resetCacheForTests } from '../app/data/opensky.ts'

// Stub the global fetch so we don't actually hit OpenSky during tests.
let originalFetch: typeof fetch
let lastUrl: string | null = null

beforeEach(() => {
  originalFetch = globalThis.fetch
  lastUrl = null
  __resetCacheForTests()
  globalThis.fetch = (async (input: Request | URL | string) => {
    lastUrl = typeof input === 'string' ? input : input.toString()
    let body = JSON.stringify({
      time: 1700000000,
      states: [
        // [icao24, callsign, country, ts, ts, lon, lat, baro_alt, on_ground, vel, track, vrate, sensors, geo_alt, squawk, spi, src]
        ['abc123', 'DLH441  ', 'Germany', 1700000000, 1700000000, 9.9937, 53.5511, 11000, false, 240, 180, 0, null, 11000, null, false, 0],
      ],
    })
    return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } })
  }) as typeof fetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
  __resetCacheForTests()
})

describe('router', () => {
  it('GET / with no params renders the locating page (no OpenSky call)', async () => {
    let res = await router.fetch('http://localhost/')
    assert.equal(res.status, 200)
    let html = await res.text()
    assert.match(html, /Locating you/)
    assert.equal(lastUrl, null) // never hit OpenSky
  })

  it('GET /?lat=53.5511&lon=9.9937 renders a plane card with brand color', async () => {
    let res = await router.fetch('http://localhost/?lat=53.5511&lon=9.9937')
    assert.equal(res.status, 200)
    let html = await res.text()
    assert.match(html, /Lufthansa/)
    assert.match(html, /#F9BA00/i)
    assert.match(html, /DLH441/)
    assert.ok(lastUrl?.startsWith('https://opensky-network.org/api/states/all'))
  })

  it('GET /?denied=1 renders the denied banner with Hamburg fallback', async () => {
    let res = await router.fetch('http://localhost/?denied=1')
    assert.equal(res.status, 200)
    let html = await res.text()
    assert.match(html, /Location permission denied/)
    assert.match(html, /Hamburg/)
  })

  it('GET /api/nearest returns the panel fragment', async () => {
    let res = await router.fetch('http://localhost/api/nearest?lat=53.5511&lon=9.9937')
    assert.equal(res.status, 200)
    assert.match(res.headers.get('content-type') ?? '', /text\/html/)
    let html = await res.text()
    assert.match(html, /panel/)
    assert.match(html, /DLH441/)
    // Should NOT include the page chrome — fragment only.
    assert.doesNotMatch(html, /<html/)
  })

  it('GET /api/nearest with no params returns 400', async () => {
    let res = await router.fetch('http://localhost/api/nearest')
    assert.equal(res.status, 400)
  })

  it('GET / with cookie restores location', async () => {
    let res = await router.fetch(
      new Request('http://localhost/', {
        headers: { cookie: 'flyby_loc=53.5511,9.9937,40' },
      }),
    )
    assert.equal(res.status, 200)
    let html = await res.text()
    assert.match(html, /Lufthansa/)
  })

  it('GET / with URL params sets the location cookie', async () => {
    let res = await router.fetch('http://localhost/?lat=52.52&lon=13.405')
    let setCookie = res.headers.get('set-cookie')
    assert.ok(setCookie)
    assert.match(setCookie!, /flyby_loc=/)
  })

  it('handles empty OpenSky results gracefully', async () => {
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ time: 1, states: [] }), { status: 200 })
    }) as typeof fetch
    let res = await router.fetch('http://localhost/?lat=0&lon=0')
    assert.equal(res.status, 200)
    let html = await res.text()
    assert.match(html, /No aircraft/)
  })

  it('handles 429 rate limit gracefully', async () => {
    globalThis.fetch = (async () => {
      return new Response('rate limited', { status: 429, headers: { 'retry-after': '15' } })
    }) as typeof fetch
    let res = await router.fetch('http://localhost/?lat=0&lon=0')
    assert.equal(res.status, 200)
    let html = await res.text()
    assert.match(html, /Rate limited/)
    assert.match(html, /15s/)
  })
})
