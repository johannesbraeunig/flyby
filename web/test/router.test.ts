import * as assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import { router } from '../app/router.ts'
import { __resetAircraftCacheForTests } from '../app/data/aircraft.ts'
import { __resetCacheForTests } from '../app/data/opensky.ts'
import { __resetRouteCacheForTests } from '../app/data/routes.ts'

// Stub the global fetch so we don't actually hit OpenSky or adsbdb
// during tests. Routes requests by URL host.
let originalFetch: typeof fetch
let lastUrl: string | null = null

const OPENSKY_BODY = JSON.stringify({
  time: 1700000000,
  states: [
    // [icao24, callsign, country, ts, ts, lon, lat, baro_alt, on_ground, vel, track, vrate, sensors, geo_alt, squawk, spi, src]
    ['abc123', 'DLH441  ', 'Germany', 1700000000, 1700000000, 9.9937, 53.5511, 11000, false, 240, 180, 0, null, 11000, null, false, 0],
  ],
})

const ADSBDB_CALLSIGN_BODY = JSON.stringify({
  response: {
    flightroute: {
      callsign: 'DLH441',
      origin: { iata_code: 'IAH', icao_code: 'KIAH', name: 'George Bush Intercontinental' },
      destination: { iata_code: 'FRA', icao_code: 'EDDF', name: 'Frankfurt am Main' },
    },
  },
})

const ADSBDB_AIRCRAFT_BODY = JSON.stringify({
  response: {
    aircraft: {
      type: 'Airbus A330-300',
      icao_type: 'A333',
      manufacturer: 'Airbus',
      mode_s: 'ABC123',
      registration: 'D-ABYS',
      registered_owner: 'Lufthansa',
    },
  },
})

beforeEach(() => {
  originalFetch = globalThis.fetch
  lastUrl = null
  __resetCacheForTests()
  __resetRouteCacheForTests()
  __resetAircraftCacheForTests()
  globalThis.fetch = (async (input: Request | URL | string) => {
    let urlStr = typeof input === 'string' ? input : input.toString()
    lastUrl = urlStr
    if (urlStr.includes('opensky-network.org')) {
      return new Response(OPENSKY_BODY, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    // Route two different adsbdb endpoints: /v0/callsign/* and /v0/aircraft/*
    if (urlStr.includes('adsbdb.com/v0/callsign/')) {
      return new Response(ADSBDB_CALLSIGN_BODY, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (urlStr.includes('adsbdb.com/v0/aircraft/')) {
      return new Response(ADSBDB_AIRCRAFT_BODY, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    return new Response('not stubbed: ' + urlStr, { status: 500 })
  }) as typeof fetch
})

afterEach(() => {
  globalThis.fetch = originalFetch
  __resetCacheForTests()
  __resetRouteCacheForTests()
  __resetAircraftCacheForTests()
})

describe('router', () => {
  it('GET / with no params renders the locating page (no OpenSky call)', async () => {
    let res = await router.fetch('http://localhost/')
    assert.equal(res.status, 200)
    let html = await res.text()
    // The locating page offers an explicit choice (no auto-prompt).
    assert.match(html, /PICK A/)
    assert.match(html, /id="allow-location-btn"/)
    assert.match(html, /Use my location/)
    assert.match(html, /Use Hamburg/)
    assert.equal(lastUrl, null) // never hit OpenSky
  })

  it('GET /?lat=53.5511&lon=9.9937 renders airline name, FROM→TO route, and labelled stats', async () => {
    let res = await router.fetch('http://localhost/?lat=53.5511&lon=9.9937')
    assert.equal(res.status, 200)
    let html = await res.text()
    // Line 1: airline name, uppercased, no brand-color style applied.
    assert.match(html, /LUFTHANSA/)
    assert.doesNotMatch(html, /panel-line-1[^>]*style="color/)
    // Line 2: callsign + origin airport + pixel arrow SVG + destination.
    assert.match(html, /DLH441/)
    assert.match(html, /IAH/)
    assert.match(html, /class="pixel-arrow"/)
    assert.match(html, /FRA/)
    // TYPE line (aircraft type from the adsbdb /aircraft/ endpoint).
    assert.match(html, /stat-label[^>]*>TYPE</)
    assert.match(html, /A333/)
    // Stats line: labelled ALT / SPD / DIST.
    assert.match(html, /stat-label[^>]*>ALT</)
    assert.match(html, /stat-label[^>]*>SPD</)
    assert.match(html, /stat-label[^>]*>DIST</)
    // Inline Settings link next to the Track link.
    assert.match(html, /class="panel-link settings-inline-link"/)
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
    assert.match(html, /NO PLANES/)
  })

  it('handles 429 rate limit gracefully', async () => {
    globalThis.fetch = (async () => {
      return new Response('rate limited', { status: 429, headers: { 'retry-after': '15' } })
    }) as typeof fetch
    let res = await router.fetch('http://localhost/?lat=0&lon=0')
    assert.equal(res.status, 200)
    let html = await res.text()
    assert.match(html, /RATE LIMITED/)
    assert.match(html, /RETRY 15S/)
  })
})
