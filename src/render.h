#pragma once

#include <stdint.h>

#include "layout.h"

namespace render {

void draw_frame(const layout::Frame& frame, uint32_t now_ms);

}  // namespace render
