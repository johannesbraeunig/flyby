#include "render.h"

#include "display.h"
#include "layout.h"

namespace render {
namespace {

void draw_one_line(const layout::Line& line, int y, uint32_t now_ms) {
  if (line.text[0] == 0) return;

  const int text_w = layout::text_width_px(line.text);
  int x;
  if (line.scroll) {
    x = layout::scroll_x_offset(text_w, layout::kPanelWidth, now_ms,
                                 layout::kScrollSpeedPxPerSec);
  } else {
    // Center non-scrolling lines on the panel.
    x = (layout::kPanelWidth - text_w) / 2;
    if (x < 0) x = 0;
  }
  const uint16_t color = display::rgb(line.r, line.g, line.b);
  display::drawText(x, y, line.text, color);
}

}  // namespace

void draw_frame(const layout::Frame& frame, uint32_t now_ms) {
  display::clear();
  draw_one_line(frame.line1, layout::kLine1Y, now_ms);
  draw_one_line(frame.line2, layout::kLine2Y, now_ms);
  draw_one_line(frame.line3, layout::kLine3Y, now_ms);
  display::flush();
}

}  // namespace render
