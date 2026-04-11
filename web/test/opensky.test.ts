import * as assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  parseStates,
  rankByDistance,
  selectNearestPreferringCommercial,
} from '../app/data/opensky.ts'

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
    assert.equal(p.verticalRateMps, 0)
    assert.equal(p.onGround, false)
  })

  it('extracts vertical_rate from row[11]', () => {
    let climbing = parseStates({ states: [row({ 11: 8.5 })] })[0]!
    assert.equal(climbing.verticalRateMps, 8.5)
    let descending = parseStates({ states: [row({ 11: -5 })] })[0]!
    assert.equal(descending.verticalRateMps, -5)
    let missing = parseStates({ states: [row({ 11: null })] })[0]!
    assert.equal(missing.verticalRateMps, null)
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

describe('selectNearestPreferringCommercial', () => {
  it('returns null for an empty list', () => {
    assert.equal(selectNearestPreferringCommercial([]), null)
  })

  it('picks the nearest commercial plane even when a GA plane is closer', () => {
    let positions = parseStates({
      states: [
        row({ 0: 'ga-1', 1: 'DMMXC   ', 5: 9.99, 6: 53.55 }), // tiny GA, right next to observer
        row({ 0: 'lh-1', 1: 'DLH441  ', 5: 10.0, 6: 54.0 }), // further Lufthansa
      ],
    })
    let ranked = rankByDistance(positions, 53.5511, 9.9937)
    // Distance-sorted: DMMXC first, DLH441 second.
    assert.equal(ranked[0]!.callsign, 'DMMXC')
    // Commercial preference flips the pick to DLH441.
    let pick = selectNearestPreferringCommercial(ranked)
    assert.equal(pick?.callsign, 'DLH441')
  })

  it('falls back to the nearest plane when no commercial flights are in range', () => {
    let positions = parseStates({
      states: [
        row({ 0: 'ga-1', 1: 'DMMXC   ', 5: 9.99, 6: 53.55 }),
        row({ 0: 'ga-2', 1: 'N45DP   ', 5: 10.0, 6: 54.0 }),
      ],
    })
    let ranked = rankByDistance(positions, 53.5511, 9.9937)
    let pick = selectNearestPreferringCommercial(ranked)
    assert.equal(pick?.callsign, 'DMMXC')
  })

  it('picks the NEAREST commercial plane when multiple are in range', () => {
    let positions = parseStates({
      states: [
        row({ 0: 'lh-far', 1: 'DLH999  ', 5: 11.0, 6: 55.0 }),
        row({ 0: 'ba-near', 1: 'BAW117  ', 5: 10.0, 6: 54.0 }),
        row({ 0: 'ga-closest', 1: 'DMMXC   ', 5: 9.99, 6: 53.55 }),
      ],
    })
    let ranked = rankByDistance(positions, 53.5511, 9.9937)
    let pick = selectNearestPreferringCommercial(ranked)
    assert.equal(pick?.callsign, 'BAW117')
  })

  it('recognises airlines whose ICAO prefix is not in the brand-color table', () => {
    // EXS = Jet2.com, BTI = airBaltic — real commercial airlines that
    // don't happen to be in our 40-entry airlines.ts table. The
    // callsign-pattern detector should still treat them as commercial.
    let positions = parseStates({
      states: [
        row({ 0: 'ga-1', 1: 'DMMXC   ', 5: 9.99, 6: 53.55 }), // closest, GA
        row({ 0: 'jet2', 1: 'EXS74XC ', 5: 10.0, 6: 54.0 }), // farther, Jet2.com
      ],
    })
    let ranked = rankByDistance(positions, 53.5511, 9.9937)
    let pick = selectNearestPreferringCommercial(ranked)
    assert.equal(pick?.callsign, 'EXS74XC')
  })

  it('does not mistake general-aviation registrations for commercial', () => {
    let positions = parseStates({
      states: [
        row({ 0: 'us-ga', 1: 'N45DP   ', 5: 9.99, 6: 53.55 }), // US reg
        row({ 0: 'uk-ga', 1: 'GHUEW   ', 5: 10.0, 6: 54.0 }), // UK reg, 4 letters then no digit
        row({ 0: 'de-ga', 1: 'DMMXC   ', 5: 11.0, 6: 55.0 }), // DE reg, no digits
      ],
    })
    let ranked = rankByDistance(positions, 53.5511, 9.9937)
    let pick = selectNearestPreferringCommercial(ranked)
    // No commercial → falls back to the nearest overall.
    assert.equal(pick?.callsign, 'N45DP')
  })
})
