import * as assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import {
  __resetRateLimitForTests,
  clientKeyFor,
  tryAcquire,
} from '../app/utils/rate-limit.ts'

describe('tryAcquire', () => {
  beforeEach(() => __resetRateLimitForTests())
  afterEach(() => __resetRateLimitForTests())

  it('allows up to `burst` requests immediately then rejects', () => {
    let cfg = { burst: 6, refillPerSec: 0.1 }
    for (let i = 0; i < 6; i++) {
      assert.equal(tryAcquire('ip-a', cfg), true, `burst slot ${i + 1}`)
    }
    assert.equal(tryAcquire('ip-a', cfg), false, 'burst exhausted')
  })

  it('refills over time at refillPerSec', async () => {
    let cfg = { burst: 2, refillPerSec: 10 } // 1 token / 100 ms
    assert.equal(tryAcquire('ip-b', cfg), true)
    assert.equal(tryAcquire('ip-b', cfg), true)
    assert.equal(tryAcquire('ip-b', cfg), false)
    await new Promise((r) => setTimeout(r, 150))
    assert.equal(tryAcquire('ip-b', cfg), true, 'refilled after 150 ms')
  })

  it('tracks different keys independently', () => {
    let cfg = { burst: 1, refillPerSec: 0.01 }
    assert.equal(tryAcquire('ip-c', cfg), true)
    assert.equal(tryAcquire('ip-c', cfg), false)
    assert.equal(tryAcquire('ip-d', cfg), true, 'different key has its own bucket')
  })

  it('never exceeds burst cap on refill', async () => {
    let cfg = { burst: 3, refillPerSec: 100 } // refills very fast
    await new Promise((r) => setTimeout(r, 50)) // would overfill if uncapped
    for (let i = 0; i < 3; i++) {
      assert.equal(tryAcquire('ip-e', cfg), true)
    }
    assert.equal(tryAcquire('ip-e', cfg), false, 'capped at burst=3')
  })
})

describe('clientKeyFor', () => {
  it('prefers fly-client-ip', () => {
    let h = new Headers({ 'fly-client-ip': '1.2.3.4', 'x-forwarded-for': '5.6.7.8' })
    assert.equal(clientKeyFor(h), '1.2.3.4')
  })

  it('falls back to the first x-forwarded-for entry', () => {
    let h = new Headers({ 'x-forwarded-for': '9.9.9.9, 10.10.10.10' })
    assert.equal(clientKeyFor(h), '9.9.9.9')
  })

  it('returns "local" when nothing is set', () => {
    let h = new Headers({})
    assert.equal(clientKeyFor(h), 'local')
  })

  it('trims whitespace from header values', () => {
    let h = new Headers({ 'x-forwarded-for': '  1.2.3.4  ' })
    assert.equal(clientKeyFor(h), '1.2.3.4')
  })
})
