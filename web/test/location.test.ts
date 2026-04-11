import * as assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  DEFAULT_RADIUS_KM,
  DEFAULT_REFRESH_SEC,
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
    assert.equal(r.refreshSec, DEFAULT_REFRESH_SEC)
  })

  it('accepts a refresh URL param and snaps to an allowed option', () => {
    let exact = resolveLocation(url('/?lat=0&lon=0&refresh=60'), null)
    assert.equal(exact.refreshSec, 60)
    let snapped = resolveLocation(url('/?lat=0&lon=0&refresh=45'), null)
    assert.equal(snapped.refreshSec, 30) // 45 is closer to 30 than 60
    let off = resolveLocation(url('/?lat=0&lon=0&refresh=0'), null)
    assert.equal(off.refreshSec, 0)
  })

  it('clamps out-of-range radius', () => {
    let big = resolveLocation(url('/?lat=0&lon=0&radius=9999'), null)
    assert.equal(big.radiusKm, 250)
    let tiny = resolveLocation(url('/?lat=0&lon=0&radius=0.1'), null)
    assert.equal(tiny.radiusKm, 5)
  })

  it('falls back to cookie when URL has no lat/lon (legacy 3-field cookie)', () => {
    let r = resolveLocation(url('/'), `${LOCATION_COOKIE}=51.5074,-0.1278,40`)
    assert.equal(r.source, 'cookie')
    assert.equal(r.lat, 51.5074)
    assert.equal(r.lon, -0.1278)
    assert.equal(r.radiusKm, 40)
    assert.equal(r.refreshSec, DEFAULT_REFRESH_SEC)
  })

  it('reads refresh from a 4-field cookie', () => {
    let r = resolveLocation(url('/'), `${LOCATION_COOKIE}=51.5,0,30,60`)
    assert.equal(r.refreshSec, 60)
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
    let v = locationCookieValue({ lat: 52.5, lon: 13.4, radiusKm: 60, refreshSec: 30 })
    assert.match(v, /^flyby_loc=/)
    assert.match(v, /SameSite=Lax/)
    assert.match(v, /Max-Age=/)
    assert.match(v, /52\.5000/)
  })

  it('includes the refresh interval as the 4th field', () => {
    let v = locationCookieValue({ lat: 0, lon: 0, radiusKm: 50, refreshSec: 60 })
    assert.match(v, /flyby_loc=.*%2C60/) // trailing ,60 URL-encoded
  })
})
