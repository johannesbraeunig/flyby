import * as assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import { router } from '../app/router.ts'
import { __resetAircraftCacheForTests } from '../app/data/aircraft.ts'
import { __resetCacheForTests } from '../app/data/opensky.ts'
import { __resetOpenskyAuthForTests } from '../app/data/opensky-auth.ts'
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

// Build a track body with a fresh startTime so the route
// verification's "track age > 60 min" escape hatch doesn't
// accidentally kick in during tests.
function buildTrackBody(lat: number, lon: number, ageSec = 60): string {
  let now = Math.floor(Date.now() / 1000)
  let startTime = now - ageSec
  return JSON.stringify({
    icao24: 'abc123',
    callsign: 'DLH441  ',
    startTime,
    endTime: now,
    path: [[startTime, lat, lon, 300, 0, false]],
  })
}

// Default: track starts near Houston (IAH) and is 60 s old —
// matches adsbdb's DLH441 origin, so the cross-check passes
// and the route renders.
const OPENSKY_TRACK_BODY_DEFAULT = () => buildTrackBody(29.99, -95.34)

// Overridable per-test. Default is "trajectory matches adsbdb origin".
let trackBody = OPENSKY_TRACK_BODY_DEFAULT()

beforeEach(() => {
  originalFetch = globalThis.fetch
  lastUrl = null
  trackBody = OPENSKY_TRACK_BODY_DEFAULT()
  __resetCacheForTests()
  __resetRouteCacheForTests()
  __resetAircraftCacheForTests()
  __resetTrackCacheForTests()
  __resetRateLimitForTests()
  __resetOpenskyAuthForTests()
  // Router tests run without OpenSky credentials so we exercise
  // the anonymous path. The opensky-auth helper bails out
  // immediately when these are unset and sends no token request.
  delete process.env.OPENSKY_CLIENT_ID
  delete process.env.OPENSKY_CLIENT_SECRET
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
  __resetOpenskyAuthForTests()
  // Router tests run without OpenSky credentials so we exercise
  // the anonymous path. The opensky-auth helper bails out
  // immediately when these are unset and sends no token request.
  delete process.env.OPENSKY_CLIENT_ID
  delete process.env.OPENSKY_CLIENT_SECRET
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

  it('drops a stale adsbdb route when a fresh track starts far from adsbdb origin', async () => {
    // Regression for IBE07YW: adsbdb returned IAH→FRA but today
    // the plane was actually flying HAM→MAD. With a fresh
    // (60 s old) track starting at Hamburg — ~8000 km from
    // IAH and ~750 km from FRA, both beyond the 150 km
    // threshold — the cross-check must drop the route so we
    // don't show wrong info.
    trackBody = buildTrackBody(53.6304, 9.9882, 60) // HAM, 60 s old
    let res = await router.fetch('http://localhost/?lat=53.5511&lon=9.9937')
    assert.equal(res.status, 200)
    let html = await res.text()
    assert.match(html, /DLH441/)
    assert.doesNotMatch(html, /stat-label[^>]*>ROUTE</)
    assert.doesNotMatch(html, /stat-value[^>]*>IAH</)
  })

  it('keeps the route when the track has been running > 60 minutes (gapped long-haul)', async () => {
    // Regression: long-haul transatlantic picked up over Greenland
    // after the Atlantic coverage gap. Track start is far from
    // both IAH (adsbdb origin) and FRA (adsbdb destination), but
    // the track is 90 minutes old — the age escape hatch should
    // keep the route instead of dropping it.
    trackBody = buildTrackBody(70, -40, 90 * 60) // Greenland, 90 min old
    let res = await router.fetch('http://localhost/?lat=53.5511&lon=9.9937')
    let html = await res.text()
    assert.match(html, /DLH441/)
    assert.match(html, /stat-label[^>]*>ROUTE</)
    assert.match(html, /IAH/)
  })

  it('keeps the route when the track start is near the DESTINATION (coverage gap recovery)', async () => {
    // Simulated JFK→FRA with a track that only starts 100 km
    // west of FRA (ADS-B picks up the plane during European
    // descent). Track start is far from IAH but close enough
    // to FRA that the destination escape hatch should fire.
    // Using the existing DLH441 IAH→FRA stub from the fixtures.
    trackBody = buildTrackBody(50.1, 7.2, 20 * 60) // near FRA, 20 min old
    let res = await router.fetch('http://localhost/?lat=53.5511&lon=9.9937')
    let html = await res.text()
    assert.match(html, /DLH441/)
    assert.match(html, /stat-label[^>]*>ROUTE</)
    assert.match(html, /IAH/)
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
