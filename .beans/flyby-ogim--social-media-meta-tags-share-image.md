---
# flyby-ogim
title: Social-media meta tags + share image
status: in-progress
type: task
priority: normal
created_at: 2026-04-15T04:16:19Z
updated_at: 2026-04-15T04:16:19Z
parent: flyby-44dn
---

When a FlyBy URL gets pasted into Slack, iMessage, Twitter/X, Mastodon,
LinkedIn, Discord, Facebook etc. the unfurl currently shows nothing —
no preview image, no description, just the bare URL. That's a missed
opportunity for a project whose entire point is a striking visual.

Add proper Open Graph + Twitter Card meta tags to the document `<head>`
and ship a 1200×630 share image that mirrors the look & feel of the LED
panel: warm-amber dot-matrix on deep brown, with a sample 3-line plane
card centered.

## Requirements
- Image is **1200×630 PNG** (the de-facto OG/Twitter card size, supported
  everywhere). Lives in `web/public/` so it's served by `staticFiles`.
- Image must visually match the running app: dark `#0a0604` background,
  amber `#ffaa00` LEDs, dot-matrix grid, blocky pixel text rendered as
  individual LED dots (not antialiased system-font text).
- Meta tags cover the union of what major scrapers consume:
  - Open Graph: `og:type`, `og:title`, `og:description`, `og:image`,
    `og:image:width`, `og:image:height`, `og:image:alt`, `og:url`,
    `og:site_name`
  - Twitter: `twitter:card=summary_large_image`, `twitter:title`,
    `twitter:description`, `twitter:image`, `twitter:image:alt`
  - Plain `<meta name="description">` for non-social scrapers + SEO
- `og:url` and `og:image` must be **absolute URLs**. Use the request
  origin (works for any deploy host) with an env-var override
  (`FLYBY_PUBLIC_URL`) for the rare case the request origin is wrong
  (e.g. behind a proxy that doesn't forward the right Host header).
- The image must look correct under both Facebook's and Twitter's
  scrapers — both downscale aggressively, so the LED text needs to
  stay legible at the 600px-wide thumbnail size too.

## Todos
- [x] Generate the 1200×630 share PNG (LED dot-matrix render of a
      sample plane card: airline name + flight + altitude/speed/dist)
- [x] Add `<meta>` tags to `web/app/ui/document.tsx` for Open Graph,
      Twitter Card, and plain description
- [x] Plumb the request URL through `Document` so `og:url` and the
      absolute `og:image` URL come out correct on any deploy host;
      honor `FLYBY_PUBLIC_URL` env var as an override
- [x] Verify image renders + is served by `staticFiles` (`curl -I`)
- [x] Verify meta tags appear in the rendered HTML (`curl /` | grep)
- [x] `npm run typecheck` clean
- [x] `npm test` — existing 44 specs still green; add coverage for the
      new meta-tag rendering

## Notes
- The image is generated **once**, committed as a static asset, and
  served directly. We deliberately do NOT generate it per-request from
  the live aircraft data: OG scrapers cache aggressively (Facebook for
  ~30 days), so a "live" share image would be misleading anyway, and
  it would expose the OpenSky rate limit to scraper traffic.
- Generation script (`scripts/build-og-image.py`) is committed so the
  image can be regenerated if the brand evolves. It only needs Pillow.
