---
# flyby-9591
title: 'LED wall phase 1: canvas framebuffer + 5×7 bitmap font prototype'
status: scrapped
type: task
priority: normal
created_at: 2026-04-11T20:10:18Z
updated_at: 2026-04-12T18:00:08Z
parent: flyby-rt9h
---

First concrete step toward the LED wall framebuffer renderer (parent: flyby-rt9h). Goal: prove the pipeline end-to-end on a single line of text, behind a feature flag, without touching the existing DOM renderer.

**Why**
A one-line prototype de-risks all the hard parts — framebuffer math, bitmap font design, upscaling aesthetic, glow filter — before we commit to rebuilding the whole panel.

**How to apply**
Build scaffolding in `web/app/client/display/` so phases 2–4 can layer on without rework. Keep it fully behind `?canvas=1` so main app is unaffected.

## Scope

- [ ] `web/app/client/display/framebuffer.ts` — tiny Uint8Array-backed 192×96 framebuffer (locked in parent flyby-rt9h — gives 32 chars/line body text, room for 2× scaled line 1, and convincing single-pixel LED outages) with `setPixel(x, y, on)`, `clear()`, `blit(ctx)` drawing to a `<canvas>` using `image-rendering: pixelated`
- [ ] `web/app/client/display/font-5x7.ts` — hand-coded 5×7 bitmap font covering A–Z, 0–9, space, `/`, `.`, `(`, `)`, `→`, `°`, `↑`, `↓`. Each glyph is a flat array of row bytes.
- [ ] `web/app/client/display/drawing.ts` — `drawText(fb, x, y, str, {color})`, `drawRect`, `drawLine`
- [ ] `web/app/client/display/renderer.ts` — boot hook: if `location.search` contains `canvas=1`, mount a `<canvas>` overlay over `#plane-card` and render a single line like "LUFTHANSA DLH441" at the correct amber glow
- [ ] Wire the overlay into `web/public/flyby.js` boot sequence (feature-flag gated)
- [ ] CSS: `canvas.led-wall { image-rendering: pixelated; filter: drop-shadow(0 0 3px var(--led-glow)); }`
- [ ] Manual QA: visit `/?lat=53.55&lon=9.99&canvas=1`, confirm one-line prototype renders in amber, DOM panel stays hidden behind it

## Out of scope (later phases)

- Full multi-line panel layout (phase 2)
- Animations (phase 3)
- Sprites / airline tiles (phase 4)

## Done when

One hard-coded line of text renders from the canvas framebuffer on top of the existing panel, behind `?canvas=1`, with the same amber glow aesthetic.

## Reasons for Scrapping\n\nCanvas LED wall approach abandoned — the DOM-based panel with Jersey 10 font and CSS effects looks better.
