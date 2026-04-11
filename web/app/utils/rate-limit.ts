// FlyBy rate limiter — simple per-client token bucket.
//
// Used to gate the 30 s polling endpoint (/api/nearest) so a single
// buggy or hostile client can't empty OpenSky's ~400/day anonymous
// quota for /states/all. A legitimate client polling every 30 s uses
// 2 req/min; the default bucket (6 / min burst) gives 3× headroom.
//
// Keyed on whatever identifier the caller passes — typically Fly's
// `fly-client-ip` header, falling back to `x-forwarded-for` or a
// literal "unknown" in local dev.
//
// This is best-effort protection for a side-project deployment. For
// a real public-facing FlyBy, authenticate with OpenSky instead —
// that lifts the daily quota out of rate-limit territory entirely.

export interface RateLimitConfig {
  /** Max tokens in the bucket (controls burst tolerance). */
  burst: number
  /** Tokens added per second (controls sustained rate). */
  refillPerSec: number
}

interface Bucket {
  tokens: number
  lastRefill: number
}

const buckets = new Map<string, Bucket>()
const BUCKET_MAX_ENTRIES = 1000

export function tryAcquire(key: string, config: RateLimitConfig): boolean {
  let now = Date.now()
  let bucket = buckets.get(key)
  if (!bucket) {
    bucket = { tokens: config.burst, lastRefill: now }
    // Re-insert so Map's insertion-order iterator puts the newest
    // entries at the end; eviction below always drops the oldest.
    buckets.set(key, bucket)
    evictIfFull(key)
  } else {
    // Refill since last touch.
    let elapsedSec = (now - bucket.lastRefill) / 1000
    bucket.tokens = Math.min(config.burst, bucket.tokens + elapsedSec * config.refillPerSec)
    bucket.lastRefill = now
  }
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1
    return true
  }
  return false
}

function evictIfFull(exceptKey: string) {
  if (buckets.size <= BUCKET_MAX_ENTRIES) return
  // Evict the oldest entry that isn't the one we just created.
  for (let k of buckets.keys()) {
    if (k !== exceptKey) {
      buckets.delete(k)
      return
    }
  }
}

// Extract a stable client key from the request headers. Fly sets
// `fly-client-ip` on every request; other proxies use
// `x-forwarded-for` (which can be a comma-separated chain — take
// the first entry). Falls through to a literal "local" so multiple
// dev connections share a single bucket rather than exploding the
// cache.
export function clientKeyFor(headers: Headers): string {
  let flyIp = headers.get('fly-client-ip')
  if (flyIp) return flyIp.trim()
  let xff = headers.get('x-forwarded-for')
  if (xff) {
    let first = xff.split(',')[0]
    if (first) return first.trim()
  }
  return 'local'
}

export function __resetRateLimitForTests() {
  buckets.clear()
}
