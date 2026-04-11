// FlyBy render — Arduino-side glue between layout::Frame and the
// HUB75 display driver. Calls display::drawText for each line at the
// correct y-offset, applying scroll based on the elapsed millis().

#pragma once

#include <stdint.h>

#include "layout.h"

namespace render {

// Draw a composed frame to the panel. `now_ms` is the current millis()
// reading; the renderer derives per-line scroll offsets from it so the
// caller can render every loop tick for smooth scrolling.
void draw_frame(const layout::Frame& frame, uint32_t now_ms);

}  // namespace render
