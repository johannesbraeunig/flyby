import * as assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import { router } from '../app/router.ts'
import { __resetAircraftCacheForTests } from '../app/data/aircraft.ts'
import { __resetCacheForTests } from '../app/data/opensky.ts'
import { __resetRouteCacheForTests } from '../app/data/routes.ts'
import { __resetTrackCacheForTests } from '../app/data/tracks.ts'
import { __resetRateLimitForTests } from '../app/utils/rate-limit.ts'

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
      origin: {
        iata_code: 'IAH',
        icao_code: 'KIAH',
        name: 'George Bush Intercontinental',
        latitude: 29.9844,
        longitude: -95.3414,
      },
      destination: {
        iata_code: 'FRA',
        icao_code: 'EDDF',
        name: 'Frankfurt am Main',
        latitude: 50.0379,
        longitude: 8.5622,
      },
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

// Default track start near Houston (IAH) — matches adsbdb's DLH441
// origin above, so the cross-check passes and the route renders.
const OPENSKY_TRACK_BODY = JSON.stringify({
  icao24: 'abc123',
  callsign: 'DLH441  ',
  startTime: 1700000000,
  endTime: 1700001000,
  path: [[1700000000, 29.99, -95.34, 300, 0, false]],
})

// Overridable per-test. Default is "trajectory matches adsbdb origin".
let trackBody = OPENSKY_TRACK_BODY

beforeEach(() => {
  originalFetch = globalThis.fetch
  lastUrl = null
  trackBody = OPENSKY_TRACK_BODY
  __resetCacheForTests()
  __resetRouteCacheForTests()
  __resetAircraftCacheForTests()
  __resetTrackCacheForTests()
  __resetRateLimitForTests()
  globalThis.fetch = (async (input: Request | URL | string) => {
    let urlStr = typeof input === 'string' ? input : input.toString()
    lastUrl = urlStr
    if (urlStr.includes('opensky-network.org/api/tracks/all')) {
      return new Response(trackBody, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (urlStr.includes('opensky-network.org')) {
      return new Response(OPENSKY_BODY, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
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
  __resetTrackCacheForTests()
  __resetRateLimitForTests()
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

  it('drops a stale adsbdb route when the OpenSky track starts far from adsbdb origin', async () => {
    // Regression for IBE07YW: adsbdb returned MAD→VIE but today
    // the plane was actually flying HAM→MAD. With the track
    // starting near Hamburg (~8000 km from IAH), the cross-check
    // must drop the route so we don't show wrong info.
    trackBody = JSON.stringify({
      icao24: 'abc123',
      callsign: 'DLH441  ',
      startTime: 1700000000,
      endTime: 1700001000,
      path: [[1700000000, 53.6304, 9.9882, 300, 0, false]], // HAM
    })
    let res = await router.fetch('http://localhost/?lat=53.5511&lon=9.9937')
    assert.equal(res.status, 200)
    let html = await res.text()
    // FLIGHT still renders — we have a callsign.
    assert.match(html, /DLH441/)
    // ROUTE stat is gone because adsbdb's origin (IAH) doesn't
    // match the track start (HAM).
    assert.doesNotMatch(html, /stat-label[^>]*>ROUTE</)
    // No adsbdb airport codes should appear in the panel.
    assert.doesNotMatch(html, /stat-value[^>]*>IAH</)
  })

  it('keeps the route when OpenSky /tracks is unreachable (graceful fallback)', async () => {
    // If the tracks endpoint errors out we should degrade to
    // "trust adsbdb as-is", not lose the route entirely.
    trackBody = 'nope' // will fail JSON parse → null track → pass-through
    let res = await router.fetch('http://localhost/?lat=53.5511&lon=9.9937')
    let html = await res.text()
    assert.match(html, /DLH441/)
    assert.match(html, /stat-label[^>]*>ROUTE</)
    assert.match(html, /IAH/)
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

  it('GET / ignores any cookie (URL is the only source of truth)', async () => {
    // Even with a flyby_loc cookie, a bare URL should render the
    // locating page, not restore from the cookie.
    let res = await router.fetch(
      new Request('http://localhost/', {
        headers: { cookie: 'flyby_loc=53.5511,9.9937,40' },
      }),
    )
    assert.equal(res.status, 200)
    let html = await res.text()
    assert.match(html, /PICK A/)
    assert.doesNotMatch(html, /Lufthansa/)
  })

  it('GET / with URL params does NOT emit a Set-Cookie header', async () => {
    let res = await router.fetch('http://localhost/?lat=52.52&lon=13.405')
    assert.equal(res.headers.get('set-cookie'), null)
  })

  it('rate-limits /api/nearest after the burst', async () => {
    // Default bucket = 6 req burst. 7th request from the same
    // client key should come back as 429.
    let req = (n: number) =>
      router.fetch(
        new Request(`http://localhost/api/nearest?lat=53.5511&lon=9.9937&n=${n}`, {
          headers: { 'fly-client-ip': '10.0.0.1' },
        }),
      )
    for (let i = 0; i < 6; i++) {
      let r = await req(i)
      assert.equal(r.status, 200, `burst slot ${i + 1} should pass`)
    }
    let blocked = await req(99)
    assert.equal(blocked.status, 429, 'burst exhausted → 429')
    assert.equal(blocked.headers.get('retry-after'), '10')
  })

  it('rate-limits separately per client IP', async () => {
    let hitOnce = (ip: string) =>
      router.fetch(
        new Request('http://localhost/api/nearest?lat=53.5511&lon=9.9937', {
          headers: { 'fly-client-ip': ip },
        }),
      )
    // Exhaust ip-1's bucket
    for (let i = 0; i < 6; i++) await hitOnce('10.0.0.2')
    let blocked = await hitOnce('10.0.0.2')
    assert.equal(blocked.status, 429)
    // ip-3 should still have its full burst
    let ok = await hitOnce('10.0.0.3')
    assert.equal(ok.status, 200)
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
