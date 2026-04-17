---
# flyby-rt9h
title: 'FlyBy web: LED wall framebuffer renderer'
status: scrapped
type: feature
priority: normal
created_at: 2026-04-11T20:05:59Z
updated_at: 2026-04-12T18:00:08Z
parent: flyby-56fy
---

Rewrite the FlyBy web display layer from "styled JSX text with pixel-decorative CSS" to "actual LED framebuffer rendered on a canvas" — same architecture as the ESP32 firmware in `src/display.cpp`. Instead of the browser drawing Jersey 10 glyphs for us, we own every pixel and compose characters ourselves via a bitmap font. This unlocks real pixel-level animation that's impossible with styled text.

## Why

The current panel is tuned nicely (Jersey 10 font, dot grid, scanlines, dead/hot/stuck pixels) but every character is still a browser-rendered glyph sitting on top of decorative effects. That means:

- No scrolling text when content overflows
- No wipe / crossfade transitions on the 30 s poll update (hard innerHTML snap)
- No plane silhouettes walking across the display
- No per-pixel sparkle / fade / flicker tied to individual characters
- No architectural parity with the firmware

Moving to a framebuffer gives us all of that, and makes the web version feel like a faithful simulation of the HUB75 panel instead of "a web page that looks like one".

## What this unlocks

- Horizontal scrolling for long strings (firmware already does this)
- Wipe-in / column-reveal transitions
- Per-pixel crossfade between old and new content
- Sparkle / random LED pop as ambient life
- Aircraft silhouette sprites traveling across the panel
- Native airline logo tiles
- Digit-flip animations on numeric values (CPA, ALT, SPD)
- Loading / connecting states drawn in-display instead of CSS widgets
- A single pipeline that the firmware and web version both conceptually share

## Architecture

**Canvas 2D** is the right tool — not SVG (too many DOM elements at scale), not per-pixel divs (same problem), not WebGL (overkill). Fast, imperative, per-pixel, animates smoothly with `requestAnimationFrame`.

```
web/app/client/display/
├── framebuffer.ts       # Uint8Array(W*H) + set/get/clear/fill
├── font-5x7.ts          # ASCII → 5×7 bitmap data (~350 bytes)
├── drawing.ts           # drawChar, drawText, drawSprite, drawLine
├── renderer.ts          # framebuffer → canvas, applies glow via filter
├── scene.ts             # high-level: "show plane info", "scrolling line 1"
├── animations/
│   ├── scroll.ts
│   ├── wipe.ts
│   ├── crossfade.ts
│   └── sparkle.ts
└── sprites/
    ├── aircraft.ts      # pixel-art silhouettes per icao_type
    └── airlines.ts      # tiny airline logo tiles
```

Runtime:
1. Server still renders the same JSON data model (plane, route, aircraft, bearing, elevation, vertical rate) — no data-layer changes.
2. HTML skeleton has one `<canvas id="flyby-display">` instead of the stack of `<div class="panel-line">`.
3. Client-side bootstrap reads plane data from a `<script type="application/json">` tag, hands it to the scene manager, which draws into the framebuffer, which blits to the canvas at 60 fps.
4. The 30 s poll fetches JSON from `/api/nearest`, feeds it to scene.update(), triggers a wipe/crossfade/scroll transition instead of the current innerHTML replace.

Display resolution: target ~192×64 CSS pixels, upscaled via `image-rendering: pixelated` and CSS transform to fill the viewport. Framebuffer is 12 KB — cheap per frame.

Font: hand-coded 5×7 bitmap for uppercase + digits + a few symbols (~45 glyphs, ~700 byte JSON). Not pulling a font library.

## Feature flag

Gate the whole thing behind `?canvas=1` (or a settings toggle) so we can A/B the current Jersey 10 panel against the canvas version during development. Rip the flag out once the canvas version ships.

## Phases (see child tasks)

- Phase 1: Framebuffer + bitmap font + one-line prototype
- Phase 2: Full panel in canvas
- Phase 3: Animation primitives
- Phase 4: Aircraft sprites + airline tiles (optional)

## What stays unchanged

- Server-side data layer (opensky, routes, aircraft, tracks, opensky-auth)
- OAuth2, caching, rate limiting, security headers
- Settings modal, bottom nav, URL param handling
- The overall LED-board visual vocabulary (amber, glow, scanlines)

## Risks

- May not feel better than the current tuned Jersey 10 display. Mitigated by Phase 1 being a side-by-side prototype behind a flag.
- Performance on low-end mobile. Mitigated by keeping framebuffer small (12 KB) and redraws amortised via requestAnimationFrame.
- Font legibility at the chosen resolution. Mitigated by using a well-tested 5×7 bitmap font; fall back to a larger 6×10 if needed.

## Todos
- [ ] Phase 1: prototype ships behind ?canvas=1 flag
- [ ] Phase 2: full panel rendered on canvas
- [ ] Phase 3: scroll / wipe / crossfade / sparkle primitives
- [ ] Phase 4: aircraft silhouettes + airline tiles
- [ ] Remove ?canvas=1 flag and the old JSX panel code once canvas version is judged worth it
- [ ] Document the display architecture in web/README.md

## Resolution decision (2026-04-11)

**Target framebuffer: 192 × 96, 2:1 aspect, RGB palette.**

Reasoning:
- Body text at 5×7 + 1px kerning → 32 chars/line (enough for "FLIGHT KLM37Y  ROUTE AMS→NRT")
- Line 1 at 2× scale (10×14) gives the chunky "LUFTHANSA" prominence from the reference photo
- Vertical: 14+3+8+3+8+3+8+5+8 ≈ 60px content, 36px slack
- One dead pixel = 1/18432 ≈ 0.005% → convincingly a single failed LED, not a design feature
- Perf: 55KB Uint8Array × 30fps is trivial on mobile

Rejected:
- 128×64: only 21 chars/line, route stat breaks
- 64×64: can't fit a stat panel at all; good for firmware, wrong for web
- 256×128: every pixel matters less — outages become too subtle

Firmware parity is at the **font/sprite/scene-code level**, not pixel-for-pixel. ESP32 HUB75 renders the same glyphs to its 64×32 or 128×64 physical panel; web renders to 192×96. Drawing primitives port 1:1.

## Reasons for Scrapping\n\nCanvas framebuffer renderer abandoned in favour of the existing DOM panel.
