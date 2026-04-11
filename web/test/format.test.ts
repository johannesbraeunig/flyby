import * as assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { formatDistance, formatFlightLevel, formatSpeed, splitCallsign } from '../app/utils/format.ts'

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
