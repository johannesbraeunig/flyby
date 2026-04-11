import * as assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  DEFAULT_RADIUS_KM,
  DEFAULT_REFRESH_SEC,
  HAMBURG,
  resolveLocation,
} from '../app/data/location.ts'

function url(path: string): URL {
  return new URL(`http://localhost${path}`)
}

describe('resolveLocation', () => {
  it('uses URL params when present and valid', () => {
    let r = resolveLocation(url('/?lat=52.52&lon=13.405&radius=75'))
    assert.equal(r.source, 'url')
    assert.equal(r.lat, 52.52)
    assert.equal(r.lon, 13.405)
    assert.equal(r.radiusKm, 75)
    assert.equal(r.refreshSec, DEFAULT_REFRESH_SEC)
  })

  it('accepts a refresh URL param and snaps to an allowed option', () => {
    let exact = resolveLocation(url('/?lat=0&lon=0&refresh=60'))
    assert.equal(exact.refreshSec, 60)
    let snapped = resolveLocation(url('/?lat=0&lon=0&refresh=45'))
    assert.equal(snapped.refreshSec, 30) // 45 is closer to 30 than 60
    let off = resolveLocation(url('/?lat=0&lon=0&refresh=0'))
    assert.equal(off.refreshSec, 0)
  })

  it('clamps out-of-range radius', () => {
    let big = resolveLocation(url('/?lat=0&lon=0&radius=9999'))
    assert.equal(big.radiusKm, 250)
    let tiny = resolveLocation(url('/?lat=0&lon=0&radius=0.1'))
    assert.equal(tiny.radiusKm, 5)
  })

  it('falls back to Hamburg with no lat/lon params', () => {
    let r = resolveLocation(url('/'))
    assert.equal(r.source, 'fallback')
    assert.equal(r.fallbackReason, 'no-params')
    assert.equal(r.lat, HAMBURG.lat)
    assert.equal(r.lon, HAMBURG.lon)
    assert.equal(r.radiusKm, DEFAULT_RADIUS_KM)
  })

  it('marks fallback as denied when ?denied=1 is set', () => {
    let r = resolveLocation(url('/?denied=1'))
    assert.equal(r.source, 'fallback')
    assert.equal(r.fallbackReason, 'denied')
  })

  it('rejects invalid URL coordinates and falls back', () => {
    let r = resolveLocation(url('/?lat=abc&lon=xyz'))
    assert.equal(r.source, 'fallback')
  })

  it('rejects out-of-range latitude', () => {
    let r = resolveLocation(url('/?lat=95&lon=0'))
    assert.equal(r.source, 'fallback')
  })

  it('rejects out-of-range longitude', () => {
    let r = resolveLocation(url('/?lat=0&lon=200'))
    assert.equal(r.source, 'fallback')
  })
})
