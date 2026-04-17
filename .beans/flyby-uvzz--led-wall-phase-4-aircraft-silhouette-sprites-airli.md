---
# flyby-uvzz
title: 'LED wall phase 4: aircraft silhouette sprites + airline logo tiles'
status: scrapped
type: task
priority: low
created_at: 2026-04-11T20:11:15Z
updated_at: 2026-04-12T18:00:08Z
parent: flyby-rt9h
blocked_by:
    - flyby-6pb1
---

Fourth (stretch) phase of the LED wall framebuffer renderer (parent: flyby-rt9h). Adds pixel-art visuals now that we own every pixel and have animation. Optional — only pursue if phases 1–3 land and feel good.

**Why**
Once we have a framebuffer, sprites are cheap. A tiny aircraft silhouette rotated to the current track heading, or a pixel-art airline tail tile next to the airline name, is the kind of detail that turns "nice display" into "someone cared".

**How to apply**
Priority is intentionally `low`. Gate on phase 3 shipping and feeling right — if the animation layer already carries the aesthetic win, this may not be worth building. Reassess before starting.

## Scope

- [ ] `web/app/client/display/sprites/aircraft.ts` — small set of aircraft silhouettes (~16×16 or 24×16) keyed by ICAO type family: narrowbody (A320/737), widebody (A330/777), regional (E-jet/CRJ), GA, heli. Hand-drawn bitmaps.
- [ ] `web/app/client/display/sprites/airlines.ts` — 8×8 tail-fin tiles for top ~20 airlines (LH, BA, AF, KL, AA, DL, UA, EK, QR, SQ, ...). Each is a tiny palette of brand colors.
- [ ] Sprite lookup by `aircraft.icaoType` → silhouette, by callsign prefix → airline tile
- [ ] Rotate silhouette to the plane's track bearing when drawing
- [ ] Layout: silhouette in top-right corner of panel, airline tile left of line 1 name
- [ ] Graceful fallback: unknown type → generic plane silhouette, unknown airline → no tile

## Decision gate

Before starting: look at phase 3 output and ask "does this already feel done?" If yes, scrap this bean. The goal is the experience, not completionism.

## Done when

Known aircraft types render as rotated silhouettes, top-20 airlines show a brand tile, unknowns degrade cleanly — AND the result demonstrably adds to the feel rather than feeling busy.

## Reasons for Scrapping\n\nParent feature (LED wall framebuffer) scrapped.
