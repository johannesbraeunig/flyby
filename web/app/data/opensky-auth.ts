// FlyBy OpenSky authentication (OAuth2 client credentials).
//
// OpenSky Network deprecated HTTP Basic auth in favour of OAuth2
// exclusively. Flow:
//
//   1. POST client_id + client_secret to the token endpoint with
//      `grant_type=client_credentials` (application/x-www-form-
//      urlencoded).
//   2. Receive { access_token, expires_in } — the access token is
//      a JWT with an ~30 minute TTL.
//   3. Attach `Authorization: Bearer <access_token>` to every
//      request against /states/all and /tracks/all.
//   4. When the token expires (401 from upstream), invalidate the
//      cache and fetch a new one on the next request.
//
// Credentials come from `OPENSKY_CLIENT_ID` and
// `OPENSKY_CLIENT_SECRET` env vars — set locally via `web/.env`
// (loaded by Node's built-in `--env-file-if-exists` flag in
// `pnpm dev`) and in production via `fly secrets set
// OPENSKY_CLIENT_ID=… OPENSKY_CLIENT_SECRET=…`.
//
// Degrades silently: if either env var is missing, every
// `openskyAuthHeader()` call returns an empty headers object and
// requests fall back to anonymous access. Still works, just with
// the tighter anonymous rate limits (~10 s minimum spacing on
// /states/all, ~400 credits/day on /tracks/all).

import { FLYBY_USER_AGENT } from '../utils/fetch-json.ts'

const TOKEN_URL =
  'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token'

// Re-fetch the token this many seconds before it technically
// expires, so an in-flight request doesn't land on a freshly
// expired token by accident.
const REFRESH_SAFETY_MARGIN_SEC = 60

// Fallback if the server response doesn't include expires_in.
const DEFAULT_TOKEN_TTL_SEC = 30 * 60

interface CachedToken {
  accessToken: string
  /** Absolute ms timestamp. We refresh when `Date.now() >= expiresAt`. */
  expiresAt: number
}

let cached: CachedToken | null = null
// Single-flight protection so concurrent callers during a refresh
// don't all POST to the token endpoint in parallel.
let inflight: Promise<string | null> | null = null

function readCredentials(): { id: string; secret: string } | null {
  let id = process.env.OPENSKY_CLIENT_ID
  let secret = process.env.OPENSKY_CLIENT_SECRET
  if (!id || !secret) return null
  return { id, secret }
}

async function fetchNewToken(): Promise<string | null> {
  let creds = readCredentials()
  if (!creds) return null

  let body = new URLSearchParams()
  body.set('grant_type', 'client_credentials')
  body.set('client_id', creds.id)
  body.set('client_secret', creds.secret)

  try {
    let res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': FLYBY_USER_AGENT,
      },
      body: body.toString(),
    })
    if (!res.ok) {
      console.warn(
        `[opensky-auth] token endpoint returned HTTP ${res.status}; falling back to anonymous`,
      )
      return null
    }
    let json = (await res.json()) as {
      access_token?: unknown
      expires_in?: unknown
    }
    if (typeof json.access_token !== 'string' || json.access_token.length === 0) {
      console.warn('[opensky-auth] token response missing access_token; falling back')
      return null
    }
    let ttlSec =
      typeof json.expires_in === 'number' && json.expires_in > 0
        ? json.expires_in
        : DEFAULT_TOKEN_TTL_SEC
    cached = {
      accessToken: json.access_token,
      expiresAt: Date.now() + (ttlSec - REFRESH_SAFETY_MARGIN_SEC) * 1000,
    }
    return json.access_token
  } catch (err) {
    console.warn('[opensky-auth] token fetch failed:', err)
    return null
  }
}

async function getAccessToken(): Promise<string | null> {
  if (cached && cached.expiresAt > Date.now()) return cached.accessToken
  if (inflight) return inflight
  inflight = fetchNewToken().finally(() => {
    inflight = null
  })
  return inflight
}

/**
 * Returns an OAuth2 Bearer header if credentials are configured
 * and the token endpoint is reachable, otherwise an empty object.
 * Always resolves — never throws.
 */
export async function openskyAuthHeader(): Promise<Record<string, string>> {
  let token = await getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * Clear the cached token. Call when an upstream request returns
 * 401 Unauthorized — the server-side token lifetime may have
 * ended slightly before our safety margin thinks it should.
 * The next `openskyAuthHeader()` call will re-fetch.
 */
export function invalidateToken(): void {
  cached = null
}

export function __resetOpenskyAuthForTests(): void {
  cached = null
  inflight = null
}
