import * as assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  DEFAULT_RADIUS_KM,
  HAMBURG,
  LOCATION_COOKIE,
  locationCookieValue,
  resolveLocation,
} from '../app/data/location.ts'

function url(path: string): URL {
  return new URL(`http://localhost${path}`)
}

describe('resolveLocation', () => {
  it('uses URL params when present and valid', () => {
    let r = resolveLocation(url('/?lat=52.52&lon=13.405&radius=75'), null)
    assert.equal(r.source, 'url')
    assert.equal(r.lat, 52.52)
    assert.equal(r.lon, 13.405)
    assert.equal(r.radiusKm, 75)
  })

  it('clamps out-of-range radius', () => {
    let big = resolveLocation(url('/?lat=0&lon=0&radius=9999'), null)
    assert.equal(big.radiusKm, 250)
    let tiny = resolveLocation(url('/?lat=0&lon=0&radius=0.1'), null)
    assert.equal(tiny.radiusKm, 5)
  })

  it('falls back to cookie when URL has no lat/lon', () => {
    let r = resolveLocation(url('/'), `${LOCATION_COOKIE}=51.5074,-0.1278,40`)
    assert.equal(r.source, 'cookie')
    assert.equal(r.lat, 51.5074)
    assert.equal(r.lon, -0.1278)
    assert.equal(r.radiusKm, 40)
  })

  it('falls back to Hamburg with no params and no cookie', () => {
    let r = resolveLocation(url('/'), null)
    assert.equal(r.source, 'fallback')
    assert.equal(r.fallbackReason, 'no-params')
    assert.equal(r.lat, HAMBURG.lat)
    assert.equal(r.lon, HAMBURG.lon)
    assert.equal(r.radiusKm, DEFAULT_RADIUS_KM)
  })

  it('marks fallback as denied when ?denied=1 is set', () => {
    let r = resolveLocation(url('/?denied=1'), null)
    assert.equal(r.source, 'fallback')
    assert.equal(r.fallbackReason, 'denied')
  })

  it('rejects invalid URL coordinates and falls back', () => {
    let r = resolveLocation(url('/?lat=abc&lon=xyz'), null)
    assert.equal(r.source, 'fallback')
  })

  it('ignores garbage cookie', () => {
    let r = resolveLocation(url('/'), `${LOCATION_COOKIE}=not,a,coord`)
    assert.equal(r.source, 'fallback')
  })
})

describe('locationCookieValue', () => {
  it('serialises with the cookie name and SameSite=Lax', () => {
    let v = locationCookieValue({ lat: 52.5, lon: 13.4, radiusKm: 60 })
    assert.match(v, /^flyby_loc=/)
    assert.match(v, /SameSite=Lax/)
    assert.match(v, /Max-Age=/)
    assert.match(v, /52\.5000/)
  })
})
