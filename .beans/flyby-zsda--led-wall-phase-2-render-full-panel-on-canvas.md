---
# flyby-zsda
title: 'LED wall phase 2: render full panel on canvas'
status: scrapped
type: task
priority: normal
created_at: 2026-04-11T20:10:38Z
updated_at: 2026-04-12T18:00:08Z
parent: flyby-rt9h
blocked_by:
    - flyby-9591
---

Second phase of the LED wall framebuffer renderer (parent: flyby-rt9h). Replace the entire DOM panel with a canvas-based render once the phase 1 prototype proves the pipeline.

**Why**
The whole point of the framebuffer rewrite is pixel-level control over the full panel, not just one line. This is where the aesthetic shift actually shows up.

**How to apply**
Use the framebuffer + font primitives from flyby-9591. Still feature-flagged behind `?canvas=1` so we can A/B against the DOM panel. Data layer stays unchanged — this is purely a renderer swap.

## Scope

- [ ] `web/app/client/display/scene.ts` — `renderPanelOk(fb, props)`, `renderPanelMessage(fb, props)`. Takes the same data the current `PlaneCard` receives (airline, callsign, route, alt/spd/dist/look, vertical rate, type) and draws the full four-line panel into the framebuffer.
- [ ] Multi-color support: label color vs value color vs brand accents. Framebuffer needs at least 3 channels (R/G/B as 8-bit) or a palette index + lookup. Palette approach is simpler for LED aesthetic — pick that.
- [ ] Render pixel arrows (route, vertical rate, degree symbol) as glyphs in the font, not as SVGs
- [ ] Render dead/hot/stuck pixels as framebuffer pixels at fixed coords instead of CSS overlays — they're now part of the same visual plane
- [ ] Hydrate canvas on initial page load if `?canvas=1`, and re-render on the 30s `/api/nearest` poll (parse the HTML fragment → extract props → redraw, OR move to a JSON endpoint; decide based on phase 1 findings)
- [ ] Hide the DOM panel via CSS when canvas mode is active, so there's no double-render
- [ ] Manual QA: all panel variants (ok, stale, empty, rate-limited, error) render correctly on canvas at multiple viewport sizes

## Open questions to resolve during implementation

- JSON endpoint vs parse HTML fragment for poll updates? JSON is cleaner but adds a code path; HTML parse is hacky but zero-change to backend.
- Palette size? Probably 8 entries covers amber/red/green/dim/bright/brand.

## Done when

Canvas mode (`?canvas=1`) renders the complete panel — all 4 lines, all stat types, all message variants — with equal or better fidelity than the current DOM panel.

## Reasons for Scrapping\n\nParent feature (LED wall framebuffer) scrapped.
