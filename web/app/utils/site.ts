// Compute absolute URLs for the running deployment.
//
// `og:url` and `og:image` MUST be absolute URLs — relative URLs are
// silently ignored by Facebook, Slack, Twitter/X, iMessage and most
// other unfurlers. The right origin to use depends on how the app is
// reached:
//
//   - In normal direct-to-server deployments, `request.url`'s origin
//     is correct (e.g. fly.io's edge passes through the right Host).
//   - Behind a misconfigured proxy or in dev tunnels the request URL
//     may show the internal host (`http://0.0.0.0:44100`) instead of
//     the public one. The `FLYBY_PUBLIC_URL` env var overrides for
//     that case (set it to e.g. `https://flyby.fly.dev`).
//
// We deliberately don't try to be clever about `X-Forwarded-*`
// headers here — the env var is a one-line escape hatch that's
// easier to reason about than a chain of header-trust assumptions.

export function siteOrigin(request: Request): string {
  let override = process.env.FLYBY_PUBLIC_URL?.trim()
  if (override) return override.replace(/\/+$/, '')
  return new URL(request.url).origin
}

// Full canonical URL for the current request — origin + pathname +
// search. Used as `og:url` so a recipient who clicks the unfurl
// lands on the same view the sharer was looking at.
export function canonicalUrl(request: Request): string {
  let url = new URL(request.url)
  return siteOrigin(request) + url.pathname + url.search
}

// Absolute URL for a path under the site origin.
export function absoluteUrl(request: Request, path: string): string {
  let p = path.startsWith('/') ? path : '/' + path
  return siteOrigin(request) + p
}
