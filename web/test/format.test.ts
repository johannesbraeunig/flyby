import * as assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  formatAltMeters,
  formatDistance,
  formatFlightLevel,
  formatSpeed,
  formatSpeedKmh,
  splitCallsign,
} from '../app/utils/format.ts'

describe('formatFlightLevel', () => {
  it('converts meters to FL hundreds-of-feet', () => {
    assert.equal(formatFlightLevel(11000), 'FL361')
    assert.equal(formatFlightLevel(0), 'FL000')
  })
  it('handles missing altitude', () => {
    assert.equal(formatFlightLevel(null), '?')
  })
})

describe('formatSpeed', () => {
  it('converts m/s to knots', () => {
    assert.equal(formatSpeed(240), '467kt')
  })
  it('handles missing speed', () => {
    assert.equal(formatSpeed(null), '?kt')
  })
})

describe('formatDistance', () => {
  it('shows decimal under 10km', () => {
    assert.equal(formatDistance(3.14), '3.1 km')
  })
  it('shows whole km over 10', () => {
    assert.equal(formatDistance(42.7), '43 km')
  })
})

describe('formatAltMeters', () => {
  it('rounds meters and suffixes with M', () => {
    assert.equal(formatAltMeters(8230), '8230M')
    assert.equal(formatAltMeters(0), '0M')
  })
  it('handles missing altitude', () => {
    assert.equal(formatAltMeters(null), '?')
  })
})

describe('formatSpeedKmh', () => {
  it('converts m/s to km/h', () => {
    // 250 m/s ≈ 900 km/h — classic long-haul cruise.
    assert.equal(formatSpeedKmh(250), '900KM/H')
    assert.equal(formatSpeedKmh(0), '0KM/H')
  })
  it('handles missing speed', () => {
    assert.equal(formatSpeedKmh(null), '?')
  })
})

describe('splitCallsign', () => {
  it('splits 3-letter prefix from flight number', () => {
    assert.deepEqual(splitCallsign('DLH441'), { icao: 'DLH', number: '441' })
  })
  it('strips trailing space', () => {
    assert.deepEqual(splitCallsign('BAW117  '), { icao: 'BAW', number: '117' })
  })
  it('uppercases', () => {
    assert.deepEqual(splitCallsign('klm642'), { icao: 'KLM', number: '642' })
  })
  it('handles missing prefix', () => {
    assert.deepEqual(splitCallsign('1234'), { icao: '', number: '1234' })
  })
})
