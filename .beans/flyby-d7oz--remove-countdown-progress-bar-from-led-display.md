---
# flyby-d7oz
title: Remove countdown progress bar from LED display
status: completed
type: task
priority: normal
created_at: 2026-05-09T13:58:57Z
updated_at: 2026-05-09T13:59:38Z
---

Remove the amber 1px countdown progress bar at Y=0 added in commit b66e525, and restore line Y positions to their original values.

## Tasks

- [x] Remove progress-bar drawing call and helper from src/render.cpp
- [x] Remove progress field from Frame struct in src/layout.h
- [x] Restore kLine1Y/kLine2Y/kLine3Y to original 1/12/23 values
- [x] Remove progress computation in src/app.cpp loop
- [x] Remove drawPixel helper from src/display.cpp / src/display.h (no longer used)

## Summary of Changes

Reverted commit b66e525 by removing the amber countdown progress bar from the LED display:

- `src/render.cpp`: dropped `draw_progress_bar()` helper and its call site in `draw_frame()`.
- `src/layout.h`: removed `progress` field from `Frame`; restored line Y positions to 1 / 12 / 23 and original comment.
- `src/app.cpp`: removed per-render progress computation in `loop()`.
- `src/display.cpp` / `src/display.h`: removed `drawPixel()` helper (was only used by the bar).

Net diff: -22 / +4 lines, exact inverse of b66e525.
