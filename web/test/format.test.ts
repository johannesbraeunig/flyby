import * as assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  compass8,
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

describe('compass8', () => {
  it('snaps exact 45° multiples to the matching direction', () => {
    assert.equal(compass8(0), 'N')
    assert.equal(compass8(45), 'NE')
    assert.equal(compass8(90), 'E')
    assert.equal(compass8(135), 'SE')
    assert.equal(compass8(180), 'S')
    assert.equal(compass8(225), 'SW')
    assert.equal(compass8(270), 'W')
    assert.equal(compass8(315), 'NW')
  })
  it('snaps to the nearest 45° bin', () => {
    assert.equal(compass8(10), 'N')
    assert.equal(compass8(22), 'N') // just below the 22.5° boundary
    assert.equal(compass8(23), 'NE') // just above
    assert.equal(compass8(44), 'NE')
    assert.equal(compass8(200), 'S') // closer to 180 than 225
    assert.equal(compass8(210), 'SW') // closer to 225 than 180
    assert.equal(compass8(260), 'W')
  })
  it('wraps values ≥ 360 and handles negatives', () => {
    assert.equal(compass8(360), 'N')
    assert.equal(compass8(720), 'N')
    assert.equal(compass8(-90), 'W')
  })
  it('handles non-finite input', () => {
    assert.equal(compass8(NaN), '?')
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
