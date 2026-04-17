---
# flyby-zjzk
title: Add social media meta tags (Open Graph / Twitter Card)
status: completed
type: feature
priority: normal
created_at: 2026-04-15T05:33:11Z
updated_at: 2026-04-15T05:48:06Z
---

Add proper meta tags so the Flyby app previews nicely when shared on social media.

## Todo

- [x] Add Open Graph tags (og:title, og:description, og:image, og:url, og:type)
- [x] Add Twitter Card tags (twitter:card, twitter:title, twitter:description, twitter:image)
- [x] Add standard meta description tag
- [x] Create/choose a preview image for og:image (web/public/share-image.png)
- [ ] Verify rendering with a social card validator (e.g. opengraph.xyz, Twitter card validator) — post-deploy check

## Summary of Changes

- Added Open Graph + Twitter Card + description meta tags in `web/app/ui/document.tsx`.
- Threaded request `origin` through `home` controller → `Layout` → `Document` so `og:url` and `og:image` are absolute URLs derived from the incoming request (works on any domain: fly.dev default or custom).
- Copied preview image to `web/public/share-image.png`.
- Left the validator check for post-deploy; the rendered HTML was verified locally.
