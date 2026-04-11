import * as assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { bboxFor, bearingDeg, elevationDeg, haversineKm } from '../app/data/geo.ts'

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

  it('clamps latitude to [-90, 90] near the poles', () => {
    let b = bboxFor(89.5, 0, 500)
    assert.ok(b.lamax <= 90, `lamax ${b.lamax} must be ≤ 90`)
    assert.ok(b.lamin >= -90)
  })

  it('clamps longitude to [-180, 180] near the antimeridian', () => {
    let b = bboxFor(0, 179, 500)
    assert.ok(b.lomax <= 180, `lomax ${b.lomax} must be ≤ 180`)
    assert.ok(b.lomin >= -180)
    let b2 = bboxFor(0, -179, 500)
    assert.ok(b2.lomin >= -180, `lomin ${b2.lomin} must be ≥ -180`)
    assert.ok(b2.lomax <= 180)
  })
})

describe('bearingDeg', () => {
  it('returns ~0° (N) for a target directly north', () => {
    let b = bearingDeg(50, 10, 51, 10)
    assert.ok(Math.abs(b - 0) < 0.5, `got ${b}`)
  })

  it('returns ~90° (E) for a target due east', () => {
    let b = bearingDeg(50, 10, 50, 11)
    assert.ok(Math.abs(b - 90) < 1, `got ${b}`)
  })

  it('returns ~180° (S) for a target due south', () => {
    let b = bearingDeg(50, 10, 49, 10)
    assert.ok(Math.abs(b - 180) < 0.5, `got ${b}`)
  })

  it('returns ~270° (W) for a target due west', () => {
    let b = bearingDeg(50, 10, 50, 9)
    assert.ok(Math.abs(b - 270) < 1, `got ${b}`)
  })

  it('always returns a value in [0, 360)', () => {
    // Targets on the other side of the antimeridian.
    for (let lon of [-179, 179, -10, 10, 0]) {
      let b = bearingDeg(0, 0, 0.1, lon)
      assert.ok(b >= 0 && b < 360, `got ${b} for lon=${lon}`)
    }
  })
})

describe('elevationDeg', () => {
  it('returns 90° for a plane directly overhead (distance 0)', () => {
    assert.equal(elevationDeg(10000, 0), 90)
  })

  it('returns 45° when altitude equals horizontal distance', () => {
    // 10 km altitude, 10 km ground distance → 45°
    let e = elevationDeg(10000, 10)
    assert.ok(Math.abs(e - 45) < 0.1, `got ${e}`)
  })

  it('returns ~0° for distant cruise altitude', () => {
    // 10 km altitude, 200 km ground → atan(10/200) ≈ 2.86°
    let e = elevationDeg(10000, 200)
    assert.ok(Math.abs(e - 2.86) < 0.1, `got ${e}`)
  })

  it('returns 0° for a plane at ground level', () => {
    assert.equal(elevationDeg(0, 50), 0)
  })
})
