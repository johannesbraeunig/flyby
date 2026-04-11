import * as assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import {
  __resetOpenskyAuthForTests,
  invalidateToken,
  openskyAuthHeader,
} from '../app/data/opensky-auth.ts'

let originalFetch: typeof fetch
let originalId: string | undefined
let originalSecret: string | undefined

beforeEach(() => {
  originalFetch = globalThis.fetch
  originalId = process.env.OPENSKY_CLIENT_ID
  originalSecret = process.env.OPENSKY_CLIENT_SECRET
  __resetOpenskyAuthForTests()
})

afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalId === undefined) delete process.env.OPENSKY_CLIENT_ID
  else process.env.OPENSKY_CLIENT_ID = originalId
  if (originalSecret === undefined) delete process.env.OPENSKY_CLIENT_SECRET
  else process.env.OPENSKY_CLIENT_SECRET = originalSecret
  __resetOpenskyAuthForTests()
})

describe('openskyAuthHeader', () => {
  it('returns an empty object when env vars are unset', async () => {
    delete process.env.OPENSKY_CLIENT_ID
    delete process.env.OPENSKY_CLIENT_SECRET
    let called = false
    globalThis.fetch = (async () => {
      called = true
      return new Response('{}', { status: 200 })
    }) as typeof fetch
    assert.deepEqual(await openskyAuthHeader(), {})
    assert.equal(called, false, 'should not hit the token endpoint without creds')
  })

  it('returns an empty object when only the client id is set', async () => {
    process.env.OPENSKY_CLIENT_ID = 'abc'
    delete process.env.OPENSKY_CLIENT_SECRET
    assert.deepEqual(await openskyAuthHeader(), {})
  })

  it('fetches an access token and returns a Bearer header', async () => {
    process.env.OPENSKY_CLIENT_ID = 'client-x'
    process.env.OPENSKY_CLIENT_SECRET = 'secret-y'
    let seenBody: string | null = null
    let seenContentType: string | null = null
    let calls = 0
    globalThis.fetch = (async (input: Request | URL | string, init: RequestInit = {}) => {
      calls++
      let urlStr = typeof input === 'string' ? input : input.toString()
      assert.match(urlStr, /auth\.opensky-network\.org.*token$/)
      seenBody = typeof init.body === 'string' ? init.body : null
      let headers = new Headers(init.headers)
      seenContentType = headers.get('content-type')
      return new Response(
        JSON.stringify({ access_token: 'tok-123', expires_in: 1800 }),
        { status: 200 },
      )
    }) as typeof fetch

    let h = await openskyAuthHeader()
    assert.deepEqual(h, { Authorization: 'Bearer tok-123' })
    assert.equal(calls, 1)
    assert.match(seenBody ?? '', /grant_type=client_credentials/)
    assert.match(seenBody ?? '', /client_id=client-x/)
    assert.match(seenBody ?? '', /client_secret=secret-y/)
    assert.equal(seenContentType, 'application/x-www-form-urlencoded')
  })

  it('caches the token across calls until expiry', async () => {
    process.env.OPENSKY_CLIENT_ID = 'id'
    process.env.OPENSKY_CLIENT_SECRET = 'secret'
    let calls = 0
    globalThis.fetch = (async () => {
      calls++
      return new Response(
        JSON.stringify({ access_token: 'cached', expires_in: 1800 }),
        { status: 200 },
      )
    }) as typeof fetch

    for (let i = 0; i < 5; i++) {
      assert.deepEqual(await openskyAuthHeader(), {
        Authorization: 'Bearer cached',
      })
    }
    assert.equal(calls, 1, 'only the first call hits the token endpoint')
  })

  it('re-fetches after invalidateToken()', async () => {
    process.env.OPENSKY_CLIENT_ID = 'id'
    process.env.OPENSKY_CLIENT_SECRET = 'secret'
    let calls = 0
    globalThis.fetch = (async () => {
      calls++
      return new Response(
        JSON.stringify({ access_token: `tok-${calls}`, expires_in: 1800 }),
        { status: 200 },
      )
    }) as typeof fetch

    let h1 = await openskyAuthHeader()
    assert.deepEqual(h1, { Authorization: 'Bearer tok-1' })
    invalidateToken()
    let h2 = await openskyAuthHeader()
    assert.deepEqual(h2, { Authorization: 'Bearer tok-2' })
    assert.equal(calls, 2)
  })

  it('falls back to anonymous if the token endpoint returns an error', async () => {
    process.env.OPENSKY_CLIENT_ID = 'id'
    process.env.OPENSKY_CLIENT_SECRET = 'secret'
    globalThis.fetch = (async () =>
      new Response('bad creds', { status: 401 })) as typeof fetch
    assert.deepEqual(await openskyAuthHeader(), {})
  })

  it('falls back to anonymous on a network error', async () => {
    process.env.OPENSKY_CLIENT_ID = 'id'
    process.env.OPENSKY_CLIENT_SECRET = 'secret'
    globalThis.fetch = (async () => {
      throw new Error('boom')
    }) as typeof fetch
    assert.deepEqual(await openskyAuthHeader(), {})
  })

  it('falls back to anonymous if the token response is malformed', async () => {
    process.env.OPENSKY_CLIENT_ID = 'id'
    process.env.OPENSKY_CLIENT_SECRET = 'secret'
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ not_a_token: true }), {
        status: 200,
      })) as typeof fetch
    assert.deepEqual(await openskyAuthHeader(), {})
  })

  it('single-flights concurrent requests during refresh', async () => {
    process.env.OPENSKY_CLIENT_ID = 'id'
    process.env.OPENSKY_CLIENT_SECRET = 'secret'
    let calls = 0
    globalThis.fetch = (async () => {
      calls++
      // Introduce a small async tick so the other awaits land in
      // the same "refresh in-flight" window.
      await new Promise((r) => setTimeout(r, 10))
      return new Response(
        JSON.stringify({ access_token: 'shared', expires_in: 1800 }),
        { status: 200 },
      )
    }) as typeof fetch

    let [h1, h2, h3] = await Promise.all([
      openskyAuthHeader(),
      openskyAuthHeader(),
      openskyAuthHeader(),
    ])
    assert.deepEqual(h1, { Authorization: 'Bearer shared' })
    assert.deepEqual(h2, h1)
    assert.deepEqual(h3, h1)
    assert.equal(calls, 1, 'only one token request for three concurrent callers')
  })
})
