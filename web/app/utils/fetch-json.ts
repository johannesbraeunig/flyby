// Bounded-size JSON fetch helper.
//
// All of FlyBy's third-party lookups (OpenSky, adsbdb, hexdb) call
// `await res.json()` directly, which means a malicious or compromised
// upstream can return a 500 MB JSON blob and OOM our 1 GB Fly VM.
// This helper caps the response body at a caller-specified byte limit
// and parses only if the response is under budget.
//
// Two layers of protection:
//   1. Content-Length header check (fast path — most responses have
//      it, and we reject obviously oversized bodies without reading
//      a byte).
//   2. Streaming read with a running byte counter (catches responses
//      that don't advertise Content-Length, or lie).

export interface FetchJsonOptions {
  signal?: AbortSignal
  headers?: Record<string, string>
  /** Hard byte cap on the response body. */
  maxBytes: number
}

export class BodyTooLargeError extends Error {
  constructor(public readonly bytes: number) {
    super(`response body exceeds ${bytes} byte cap`)
    this.name = 'BodyTooLargeError'
  }
}

// Shared User-Agent across every outbound request so upstream
// operators see a single identifiable client string rather than
// the browser-style default.
export const FLYBY_USER_AGENT =
  'flyby-web/0.1 (https://github.com/johannesbraeunig/flyby)'

/**
 * Fetch and parse JSON with a hard size limit. Returns:
 *   - `{ ok: true, status, headers, json }` on success
 *   - `{ ok: false, status, headers, reason }` on any failure,
 *     including non-2xx HTTP, body-too-large, and parse errors
 *
 * The caller gets `status` and `headers` on both branches so they
 * can distinguish "rate limited" (429 + Retry-After) from "unknown"
 * (404) from other failures. Never throws; errors surface as
 * `{ ok: false }`.
 */
export async function fetchBoundedJson(
  url: string,
  options: FetchJsonOptions,
): Promise<
  | { ok: true; status: number; headers: Headers; json: unknown }
  | {
      ok: false
      status: number
      headers: Headers
      reason: 'too-large' | 'parse' | 'http'
    }
> {
  let res = await fetch(url, {
    signal: options.signal,
    headers: { 'User-Agent': FLYBY_USER_AGENT, ...options.headers },
  })
  let headers = res.headers

  // Content-Length fast path.
  let declaredLen = headers.get('content-length')
  if (declaredLen !== null) {
    let n = Number.parseInt(declaredLen, 10)
    if (Number.isFinite(n) && n > options.maxBytes) {
      // Drain to free the socket (don't actually read the bytes).
      try {
        await res.body?.cancel()
      } catch {}
      return { ok: false, status: res.status, headers, reason: 'too-large' }
    }
  }

  // Read bytes with a running cap. `res.text()` doesn't take a
  // size limit, so we stream manually.
  let body: string
  try {
    body = await readBoundedText(res, options.maxBytes)
  } catch (raw) {
    if (raw instanceof BodyTooLargeError) {
      return { ok: false, status: res.status, headers, reason: 'too-large' }
    }
    throw raw
  }

  if (!res.ok) {
    return { ok: false, status: res.status, headers, reason: 'http' }
  }

  try {
    return { ok: true, status: res.status, headers, json: JSON.parse(body) }
  } catch {
    return { ok: false, status: res.status, headers, reason: 'parse' }
  }
}

async function readBoundedText(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return ''
  let reader = res.body.getReader()
  let total = 0
  let chunks: Uint8Array[] = []
  while (true) {
    let { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    total += value.byteLength
    if (total > maxBytes) {
      try {
        await reader.cancel()
      } catch {}
      throw new BodyTooLargeError(maxBytes)
    }
    chunks.push(value)
  }
  let merged = new Uint8Array(total)
  let offset = 0
  for (let chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(merged)
}
