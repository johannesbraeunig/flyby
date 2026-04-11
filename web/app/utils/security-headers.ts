// FlyBy response security headers.
//
// Applied to every response coming out of the router before it
// hits the Node http server. Kept in its own module so the CSP
// string is unit-testable without spinning up the full server.

// Content-Security-Policy: lock everything to same-origin except
// the three specific remote assets we actually use.
//
// - style-src  allows `'unsafe-inline'` because the panel uses a
//   handful of `style="color: …"` attributes on message variants
//   and on the locating page. Script-src stays strict, which is
//   what actually matters for XSS prevention.
// - fonts.googleapis.com serves the Jersey 10 stylesheet; the
//   woff2 itself lives on fonts.gstatic.com (font-src).
// - img-src allows `data:` for the inline SVG favicon.
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
  "font-src https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ')

export function applySecurityHeaders(response: Response): Response {
  // Response.headers can be guarded on some responses (e.g. ones
  // produced by renderToStream), so copy into a fresh Headers and
  // rebuild the response rather than mutating in place.
  let headers = new Headers(response.headers)
  headers.set('Content-Security-Policy', CSP)
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  headers.set('Permissions-Policy', 'geolocation=(self), fullscreen=(self)')
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
