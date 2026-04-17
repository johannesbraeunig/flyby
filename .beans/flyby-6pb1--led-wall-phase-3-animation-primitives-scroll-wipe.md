---
# flyby-6pb1
title: 'LED wall phase 3: animation primitives (scroll, wipe, crossfade, sparkle)'
status: scrapped
type: task
priority: normal
created_at: 2026-04-11T20:10:56Z
updated_at: 2026-04-12T18:00:08Z
parent: flyby-rt9h
blocked_by:
    - flyby-zsda
---

Third phase of the LED wall framebuffer renderer (parent: flyby-rt9h). Once the full panel renders on canvas (flyby-zsda), add the animation layer that makes it feel alive — the actual payoff of owning the framebuffer.

**Why**
Static DOM → static canvas is a downgrade. The justification for rewriting is the effects we couldn't do in CSS: smooth horizontal scrolling for long airline names, wipe-in on plane change, crossfades between states, the occasional sparkle flicker.

**How to apply**
Build animation as a composition layer on top of the phase 2 scene renderer. Each frame computes the scene at time `t` and blits it. Aim for 30 fps (smooth enough, still cheap on mobile).

## Scope

- [ ] `web/app/client/display/animations/loop.ts` — `requestAnimationFrame` loop with `t` (elapsed ms since scene started) passed to the scene renderer. Pause when `document.hidden` to save battery.
- [ ] `web/app/client/display/animations/scroll.ts` — horizontal scroll for text wider than the panel. Loops with a gap. Used for long airline names.
- [ ] `web/app/client/display/animations/wipe.ts` — left-to-right column wipe when the scene's plane changes (callsign differs from previous). Old pixels replaced by new pixels one column at a time over ~400ms.
- [ ] `web/app/client/display/animations/crossfade.ts` — alpha blend between old and new scene over ~300ms, used for state transitions (ok → stale → empty)
- [ ] `web/app/client/display/animations/sparkle.ts` — occasional single-pixel brightening, picks random LED, brightens for 50ms, rate ~1/sec. Subtle, not distracting.
- [ ] Scene state machine: given `(currentProps, newProps)`, decide which transition to play
- [ ] Respect `prefers-reduced-motion` — disables all animations, just shows the end state
- [ ] Manual QA: walk through a plane change (e.g. hand-force a re-poll with different data), confirm wipe plays; long airline name ("AIR TRANSAT") scrolls; state change from ok→empty crossfades

## Open questions

- Do we tick the whole loop every frame or only when something's animating? Starting with "every frame" is simpler; optimize later if CPU shows up on mobile.

## Done when

The panel feels alive: airline names scroll if too long, plane changes wipe, state changes crossfade, occasional sparkle. Motion is suppressed under `prefers-reduced-motion`.

## Reasons for Scrapping\n\nParent feature (LED wall framebuffer) scrapped.
