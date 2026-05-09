#include "render.h"

#include "display.h"
#include "layout.h"

namespace render {
namespace {

void draw_line_centered(const char* text, int y, uint8_t r, uint8_t g, uint8_t b) {
  if (!text || text[0] == 0) return;
  int w = layout::text_width_px(text);
  int x = (layout::kPanelWidth - w) / 2;
  if (x < 0) x = 0;
  display::drawText(x, y, text, display::rgb(r, g, b));
}

}  // namespace

void draw_frame(const layout::Frame& f, uint32_t) {
  display::clear();

  if (f.is_idle) {
    uint16_t c1 = display::rgb(f.l1_r, f.l1_g, f.l1_b);
    int w1 = layout::text_width_px(f.line1);
    display::drawText((layout::kPanelWidth - w1) / 2, layout::kLine1Y, f.line1, c1);

    if (f.line2[0]) {
      uint16_t c2 = display::rgb(f.l2_r, f.l2_g, f.l2_b);
      int w2 = layout::text_width_px(f.line2);
      display::drawText((layout::kPanelWidth - w2) / 2, layout::kLine2Y, f.line2, c2);
    }

    display::flush();
    return;
  }

  draw_line_centered(f.line1, layout::kLine1Y, f.l1_r, f.l1_g, f.l1_b);
  draw_line_centered(f.line2, layout::kLine2Y, f.l2_r, f.l2_g, f.l2_b);
  draw_line_centered(f.line3, layout::kLine3Y, f.l3_r, f.l3_g, f.l3_b);

  display::flush();
}

}  // namespace render
