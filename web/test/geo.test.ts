import * as assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { bboxFor, haversineKm } from '../app/data/geo.ts'

describe('haversineKm', () => {
  it('returns 0 for identical points', () => {
    assert.equal(haversineKm(53.5511, 9.9937, 53.5511, 9.9937), 0)
  })

  it('agrees with the firmware on Hamburg → Berlin (~255 km)', () => {
    let d = haversineKm(53.5511, 9.9937, 52.52, 13.405)
    assert.ok(d > 250 && d < 260, `expected ~255km, got ${d}`)
  })

  it('agrees with the firmware on Hamburg → New York (~6125 km)', () => {
    let d = haversineKm(53.5511, 9.9937, 40.7128, -74.006)
    assert.ok(d > 6100 && d < 6200, `expected ~6125km, got ${d}`)
  })
})

describe('bboxFor', () => {
  it('produces a valid box around Hamburg with 50km radius', () => {
    let b = bboxFor(53.5511, 9.9937, 50)
    assert.ok(b.lamin < 53.5511 && b.lamax > 53.5511)
    assert.ok(b.lomin < 9.9937 && b.lomax > 9.9937)
    // The latitude span should be ~0.9° (50km / 111.32)
    let latSpan = b.lamax - b.lamin
    assert.ok(latSpan > 0.85 && latSpan < 0.95, `lat span ${latSpan}`)
  })

  it('handles high latitudes without dividing by zero', () => {
    let b = bboxFor(89.999, 0, 100)
    assert.ok(Number.isFinite(b.lomin))
    assert.ok(Number.isFinite(b.lomax))
  })
})
