import * as assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import { router } from '../app/router.ts'
import { __resetAircraftCacheForTests } from '../app/data/aircraft.ts'
import { __resetCacheForTests } from '../app/data/opensky.ts'
import { __resetOpenskyAuthForTests } from '../app/data/opensky-auth.ts'
import { __resetRouteCacheForTests } from '../app/data/routes.ts'
import { __resetTrackCacheForTests } from '../app/data/tracks.ts'
import { __resetRateLimitForTests } from '../app/utils/rate-limit.ts'

let originalFetch: typeof fetch

const OPENSKY_STATES = JSON.stringify({
  time: 1700000000,
  states: [
    // 3 planes at different distances from Hamburg (53.5511, 9.9937)
    ['abc123', 'DLH441  ', 'Germany', 1700000000, 1700000000, 9.9937, 53.5511, 11000, false, 240, 180, 5, null, 11000, null, false, 0],
    ['def456', 'BAW976  ', 'United Kingdom', 1700000000, 1700000000, 10.05, 53.60, 5500, false, 160, 90, -3, null, 5500, null, false, 0],
    ['ghi789', 'EZY8PH  ', 'Switzerland', 1700000000, 1700000000, 10.2, 53.7, 12000, false, 230, 270, 0, null, 12000, null, false, 0],
  ],
})

const OPENSKY_EMPTY = JSON.stringify({
  time: 1700000000,
  states: [],
})

const ADSBDB_CALLSIGN_BODY = JSON.stringify({
  response: {
    flightroute: {
      callsign: 'DLH441',
      origin: {
        iata_code: 'FRA',
        icao_code: 'EDDF',
        name: 'Frankfurt am Main',
        latitude: 50.0379,
        longitude: 8.5622,
      },
      destination: {
        iata_code: 'HAM',
        icao_code: 'EDDH',
        name: 'Hamburg',
        latitude: 53.6304,
        longitude: 9.9882,
      },
    },
  },
})

const ADSBDB_AIRCRAFT_BODY = JSON.stringify({
  response: {
    aircraft: {
      type: 'Airbus A320-200',
      icao_type: 'A320',
      manufacturer: 'Airbus',
      mode_s: 'ABC123',
      registration: 'D-AIZY',
      registered_owner: 'Lufthansa',
    },
  },
})

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

let openskyBody = OPENSKY_STATES

function stubFetch() {
  globalThis.fetch = (async (input: Request | URL | string) => {
    let urlStr = typeof input === 'string' ? input : input.toString()
    if (urlStr.includes('opensky-network.org/api/tracks/all')) {
      return new Response(buildTrackBody(50.04, 8.56), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    if (urlStr.includes('opensky-network.org')) {
      return new Response(openskyBody, {
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
}

function resetAll() {
  __resetCacheForTests()
  __resetRouteCacheForTests()
  __resetAircraftCacheForTests()
  __resetTrackCacheForTests()
  __resetRateLimitForTests()
  __resetOpenskyAuthForTests()
  delete process.env.OPENSKY_CLIENT_ID
  delete process.env.OPENSKY_CLIENT_SECRET
}

beforeEach(() => {
  originalFetch = globalThis.fetch
  openskyBody = OPENSKY_STATES
  resetAll()
  stubFetch()
})

afterEach(() => {
  globalThis.fetch = originalFetch
  resetAll()
})

describe('screens', () => {
  // ---- Landing ----
  it('GET /screens/landing renders without location params', async () => {
    let res = await router.fetch('http://localhost/screens/landing')
    assert.equal(res.status, 200)
    let html = await res.text()
    assert.match(html, /flyby/)
    assert.match(html, /Pick your location/)
  })

  it('GET /screens/landing with lat/lon shows real stats', async () => {
    let res = await router.fetch('http://localhost/screens/landing?lat=53.5511&lon=9.9937&radius=50')
    assert.equal(res.status, 200)
    let html = await res.text()
    assert.match(html, /flyby/)
    // Should show real count (3 planes in our stub)
    assert.match(html, /03/)
  })

  // ---- Board ----
  it('GET /screens/board with lat/lon renders real aircraft rows', async () => {
    let res = await router.fetch('http://localhost/screens/board?lat=53.5511&lon=9.9937&radius=50')
    assert.equal(res.status, 200)
    let html = await res.text()
    assert.match(html, /DLH441/)
    assert.match(html, /BAW976/)
    assert.match(html, /EZY8PH/)
    assert.match(html, /3 CONTACTS/)
    // Should have route info for DLH441
    assert.match(html, /FRA/)
  })

  it('GET /screens/board without params redirects to landing', async () => {
    let res = await router.fetch('http://localhost/screens/board', { redirect: 'manual' })
    assert.equal(res.status, 302)
    assert.match(res.headers.get('location') ?? '', /\/screens\/landing/)
  })

  it('GET /screens/board with no aircraft redirects to empty', async () => {
    openskyBody = OPENSKY_EMPTY
    __resetCacheForTests()
    let res = await router.fetch('http://localhost/screens/board?lat=53.5511&lon=9.9937&radius=50', { redirect: 'manual' })
    assert.equal(res.status, 302)
    assert.match(res.headers.get('location') ?? '', /\/screens\/empty/)
  })

  // ---- Radar ----
  it('GET /screens/radar with lat/lon renders blips', async () => {
    let res = await router.fetch('http://localhost/screens/radar?lat=53.5511&lon=9.9937&radius=50')
    assert.equal(res.status, 200)
    let html = await res.text()
    assert.match(html, /DLH441/)
    assert.match(html, /RADAR SCOPE/)
    assert.match(html, /class="blip/)
  })

  it('GET /screens/radar without params redirects to landing', async () => {
    let res = await router.fetch('http://localhost/screens/radar', { redirect: 'manual' })
    assert.equal(res.status, 302)
    assert.match(res.headers.get('location') ?? '', /\/screens\/landing/)
  })

  // ---- Overhead ----
  it('GET /screens/overhead with lat/lon renders nearest aircraft', async () => {
    let res = await router.fetch('http://localhost/screens/overhead?lat=53.5511&lon=9.9937&radius=50')
    assert.equal(res.status, 200)
    let html = await res.text()
    assert.match(html, /DLH441/)
    assert.match(html, /OVERHEAD NOW/)
    assert.match(html, /Germany/)
    // Route enrichment
    assert.match(html, /FRA/)
    assert.match(html, /HAM/)
    // Aircraft enrichment
    assert.match(html, /A320/)
  })

  it('GET /screens/overhead without params redirects to landing', async () => {
    let res = await router.fetch('http://localhost/screens/overhead', { redirect: 'manual' })
    assert.equal(res.status, 302)
    assert.match(res.headers.get('location') ?? '', /\/screens\/landing/)
  })

  it('GET /screens/overhead with no aircraft redirects to empty', async () => {
    openskyBody = OPENSKY_EMPTY
    __resetCacheForTests()
    let res = await router.fetch('http://localhost/screens/overhead?lat=53.5511&lon=9.9937&radius=50', { redirect: 'manual' })
    assert.equal(res.status, 302)
    assert.match(res.headers.get('location') ?? '', /\/screens\/empty/)
  })

  // ---- Detail ----
  it('GET /screens/detail with lat/lon renders flight detail', async () => {
    let res = await router.fetch('http://localhost/screens/detail?lat=53.5511&lon=9.9937&radius=50')
    assert.equal(res.status, 200)
    let html = await res.text()
    assert.match(html, /DLH441/)
    assert.match(html, /FLIGHT/)
    // Route info
    assert.match(html, /FRA/)
    assert.match(html, /HAM/)
    // Aircraft info
    assert.match(html, /A320/)
  })

  it('GET /screens/detail without params redirects to landing', async () => {
    let res = await router.fetch('http://localhost/screens/detail', { redirect: 'manual' })
    assert.equal(res.status, 302)
    assert.match(res.headers.get('location') ?? '', /\/screens\/landing/)
  })

  // ---- Empty ----
  it('GET /screens/empty renders the empty sky message', async () => {
    let res = await router.fetch('http://localhost/screens/empty?lat=53.5511&lon=9.9937&radius=50')
    assert.equal(res.status, 200)
    let html = await res.text()
    assert.match(html, /the sky/)
    assert.match(html, /is empty/)
    assert.match(html, /50 km/)
  })

  it('GET /screens/empty without params still renders (fallback location)', async () => {
    let res = await router.fetch('http://localhost/screens/empty')
    assert.equal(res.status, 200)
    let html = await res.text()
    assert.match(html, /is empty/)
  })
})
