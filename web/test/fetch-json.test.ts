import * as assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'

import { fetchBoundedJson, FLYBY_USER_AGENT } from '../app/utils/fetch-json.ts'

let originalFetch: typeof fetch

beforeEach(() => {
  originalFetch = globalThis.fetch
})
afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('fetchBoundedJson', () => {
  it('returns parsed JSON on a well-formed 200 response', async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ hello: 'world' }), { status: 200 })) as typeof fetch
    let r = await fetchBoundedJson('https://example.test/ok', { maxBytes: 1024 })
    assert.equal(r.ok, true)
    if (r.ok) {
      assert.equal(r.status, 200)
      assert.deepEqual(r.json, { hello: 'world' })
    }
  })

  it('passes User-Agent on every outbound request', async () => {
    let seenUa: string | null = null
    globalThis.fetch = (async (input: Request | URL | string, init: RequestInit = {}) => {
      let headers = new Headers(init.headers)
      seenUa = headers.get('user-agent')
      return new Response('{}', { status: 200 })
    }) as typeof fetch
    await fetchBoundedJson('https://example.test/ua', { maxBytes: 1024 })
    assert.equal(seenUa, FLYBY_USER_AGENT)
  })

  it('rejects via Content-Length fast path when declared length exceeds cap', async () => {
    globalThis.fetch = (async () =>
      new Response('x'.repeat(10), {
        status: 200,
        headers: { 'Content-Length': '99999' },
      })) as typeof fetch
    let r = await fetchBoundedJson('https://example.test/huge', { maxBytes: 100 })
    assert.equal(r.ok, false)
    if (!r.ok) assert.equal(r.reason, 'too-large')
  })

  it('rejects via streaming read when actual body exceeds cap', async () => {
    // No Content-Length header — helper must catch size at read time.
    let big = 'x'.repeat(5000)
    globalThis.fetch = (async () => {
      // Build a response without Content-Length by streaming a ReadableStream.
      let stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(big))
          controller.close()
        },
      })
      return new Response(stream, { status: 200 })
    }) as typeof fetch
    let r = await fetchBoundedJson('https://example.test/lies', { maxBytes: 1024 })
    assert.equal(r.ok, false)
    if (!r.ok) assert.equal(r.reason, 'too-large')
  })

  it('returns ok:false with reason http on non-2xx', async () => {
    globalThis.fetch = (async () =>
      new Response('nope', { status: 404 })) as typeof fetch
    let r = await fetchBoundedJson('https://example.test/404', { maxBytes: 1024 })
    assert.equal(r.ok, false)
    if (!r.ok) {
      assert.equal(r.status, 404)
      assert.equal(r.reason, 'http')
    }
  })

  it('returns ok:false with reason parse on malformed JSON', async () => {
    globalThis.fetch = (async () =>
      new Response('not json', { status: 200 })) as typeof fetch
    let r = await fetchBoundedJson('https://example.test/garbage', { maxBytes: 1024 })
    assert.equal(r.ok, false)
    if (!r.ok) assert.equal(r.reason, 'parse')
  })
})
