import * as assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { lookupAirline } from '../app/data/airlines.ts'

describe('lookupAirline', () => {
  it('finds Lufthansa from DLH441', () => {
    let a = lookupAirline('DLH441')
    assert.ok(a)
    assert.equal(a!.name, 'Lufthansa')
    assert.equal(a!.hex, '#F9BA00')
  })

  it('finds British Airways from BAW117', () => {
    let a = lookupAirline('BAW117')
    assert.equal(a?.name, 'British Airways')
  })

  it('is case-insensitive', () => {
    assert.equal(lookupAirline('dlh441')?.name, 'Lufthansa')
    assert.equal(lookupAirline('Dlh441')?.name, 'Lufthansa')
  })

  it('returns null for unknown prefixes', () => {
    assert.equal(lookupAirline('ZZZ999'), null)
  })

  it('returns null for short or empty callsigns', () => {
    assert.equal(lookupAirline(''), null)
    assert.equal(lookupAirline('AB'), null)
    assert.equal(lookupAirline(null), null)
    assert.equal(lookupAirline(undefined), null)
  })
})
