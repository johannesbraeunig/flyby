import * as assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { parseStates, rankByDistance } from '../app/data/opensky.ts'

// One row from OpenSky's /api/states/all, positional layout:
//   [icao24, callsign, origin_country, time_position, last_contact,
//    longitude, latitude, baro_altitude, on_ground, velocity, true_track,
//    vertical_rate, sensors, geo_altitude, squawk, spi, position_source]
function row(over: Partial<Record<number, unknown>>): unknown[] {
  let base: unknown[] = [
    'abc123',
    'DLH441  ',
    'Germany',
    1700000000,
    1700000000,
    9.9937,
    53.5511,
    11000,
    false,
    240,
    180,
    0,
    null,
    11000,
    null,
    false,
    0,
  ]
  for (let k of Object.keys(over)) {
    base[Number(k)] = over[Number(k) as unknown as keyof typeof over]
  }
  return base
}

describe('parseStates', () => {
  it('returns [] on garbage', () => {
    assert.deepEqual(parseStates(null), [])
    assert.deepEqual(parseStates({}), [])
    assert.deepEqual(parseStates({ states: 'oops' }), [])
  })

  it('extracts a position from a well-formed row', () => {
    let positions = parseStates({ states: [row({})] })
    assert.equal(positions.length, 1)
    let p = positions[0]!
    assert.equal(p.icao24, 'abc123')
    assert.equal(p.callsign, 'DLH441')
    assert.equal(p.lat, 53.5511)
    assert.equal(p.lon, 9.9937)
    assert.equal(p.altMeters, 11000)
    assert.equal(p.velocityMps, 240)
    assert.equal(p.onGround, false)
  })

  it('skips on-ground aircraft', () => {
    assert.equal(parseStates({ states: [row({ 8: true })] }).length, 0)
  })

  it('skips rows with null lat/lon', () => {
    assert.equal(parseStates({ states: [row({ 5: null }), row({ 6: null })] }).length, 0)
  })

  it('skips rows where both baro_altitude and geo_altitude are null', () => {
    // These are typically ground-radar blips or surface vehicles the
    // on_ground flag missed — no altitude → treat as ground.
    assert.equal(parseStates({ states: [row({ 7: null, 13: null })] }).length, 0)
  })

  it('falls back to geo_altitude when baro_altitude is missing', () => {
    let positions = parseStates({ states: [row({ 7: null, 13: 9500 })] })
    assert.equal(positions[0]!.altMeters, 9500)
  })
})

describe('rankByDistance', () => {
  it('sorts by ascending haversine distance from the observer', () => {
    let positions = parseStates({
      states: [
        row({ 0: 'far', 5: 11.0, 6: 54.0 }),
        row({ 0: 'near', 5: 9.99, 6: 53.55 }),
      ],
    })
    let ranked = rankByDistance(positions, 53.5511, 9.9937)
    assert.equal(ranked.length, 2)
    assert.equal(ranked[0]!.icao24, 'near')
    assert.equal(ranked[1]!.icao24, 'far')
    assert.ok(ranked[0]!.distanceKm < ranked[1]!.distanceKm)
  })

  it('produces different rankings for different observers (regression: cache must not bake distance)', () => {
    let positions = parseStates({
      states: [
        row({ 0: 'a', 5: 9.0, 6: 53.0 }),
        row({ 0: 'b', 5: 10.0, 6: 54.0 }),
      ],
    })
    let nearA = rankByDistance(positions, 53.0, 9.0)
    let nearB = rankByDistance(positions, 54.0, 10.0)
    assert.equal(nearA[0]!.icao24, 'a')
    assert.equal(nearB[0]!.icao24, 'b')
  })
})
