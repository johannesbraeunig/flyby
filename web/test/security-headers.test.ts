import * as assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { applySecurityHeaders, CSP } from '../app/utils/security-headers.ts'

describe('applySecurityHeaders', () => {
  it('sets all required headers on a plain response', () => {
    let res = applySecurityHeaders(new Response('ok', { status: 200 }))
    assert.equal(res.headers.get('content-security-policy'), CSP)
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin')
    assert.match(res.headers.get('permissions-policy') ?? '', /geolocation=/)
    assert.match(res.headers.get('strict-transport-security') ?? '', /max-age=/)
  })

  it('preserves the response body and status', async () => {
    let res = applySecurityHeaders(
      new Response('hello', { status: 418, statusText: "I'm a teapot" }),
    )
    assert.equal(res.status, 418)
    assert.equal(await res.text(), 'hello')
  })

  it('preserves existing response headers', () => {
    let res = applySecurityHeaders(
      new Response('ok', {
        status: 200,
        headers: { 'Cache-Control': 'no-store', 'X-Foo': 'bar' },
      }),
    )
    assert.equal(res.headers.get('cache-control'), 'no-store')
    assert.equal(res.headers.get('x-foo'), 'bar')
    assert.equal(res.headers.get('content-security-policy'), CSP)
  })

  it('produces a CSP that allows our actual asset sources', () => {
    assert.match(CSP, /script-src 'self'/)
    assert.match(CSP, /style-src 'self' https:\/\/fonts\.googleapis\.com/)
    assert.match(CSP, /font-src https:\/\/fonts\.gstatic\.com/)
    assert.match(CSP, /img-src 'self' data:/)
    assert.match(CSP, /frame-ancestors 'none'/)
  })

  it('does NOT allow arbitrary inline scripts', () => {
    assert.doesNotMatch(CSP, /script-src[^;]*'unsafe-inline'/)
    assert.doesNotMatch(CSP, /script-src[^;]*'unsafe-eval'/)
  })
})
