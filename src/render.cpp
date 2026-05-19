#include "render.h"

#include "display.h"
#include "layout.h"

namespace render {
namespace {

constexpr int kArrowPad = 2;

void draw_line_centered(const char* text, int y, uint8_t r, uint8_t g, uint8_t b) {
  if (!text || text[0] == 0) return;
  int w = layout::text_width_px(text);
  int x = (layout::kPanelWidth - w) / 2;
  if (x < 0) x = 0;
  display::drawText(x, y, text, display::rgb(r, g, b));
}

void draw_route_centered(const char* from, const char* to, int y,
                         uint8_t r, uint8_t g, uint8_t b) {
  if ((!from || !from[0]) && (!to || !to[0])) return;
  int wf = layout::text_width_px(from);
  int wa = layout::text_width_px(">");
  int wt = layout::text_width_px(to);
  int total = wf + kArrowPad + wa + kArrowPad + wt;
  int x = (layout::kPanelWidth - total) / 2;
  if (x < 0) x = 0;
  uint16_t c = display::rgb(r, g, b);
  display::drawText(x, y, from, c);
  x += wf + kArrowPad;
  display::drawText(x, y, ">", c);
  x += wa + kArrowPad;
  display::drawText(x, y, to, c);
}

constexpr int kArrowWidth = 5;

void draw_line4(const layout::Frame& f, int y) {
  if (!f.line4[0]) return;
  int wt = layout::text_width_px(f.line4);
  int total = wt;
  if (f.vrate_dir != 0) total += 2 + kArrowWidth;
  int x = (layout::kPanelWidth - total) / 2;
  if (x < 0) x = 0;
  uint16_t c = display::rgb(f.l4_r, f.l4_g, f.l4_b);
  display::drawText(x, y, f.line4, c);
  if (f.vrate_dir != 0) {
    int ax = x + wt + 2;
    if (f.vrate_dir > 0)
      display::drawArrowUp(ax, y, c);
    else
      display::drawArrowDown(ax, y, c);
  }
}

void draw_line1_centered(const char* text, int y, uint8_t r, uint8_t g, uint8_t b) {
  if (!text || text[0] == 0) return;
  int w = display::textWidthLarge(text);
  int x = (layout::kPanelWidth - w) / 2;
  if (x < 0) x = 0;
  display::drawTextLarge(x, y, text, display::rgb(r, g, b));
}

}  // namespace

void draw_frame(const layout::Frame& f, uint32_t) {
  display::clear();

  if (f.is_idle) {
    draw_line1_centered(f.line1, layout::kLine1Y, f.l1_r, f.l1_g, f.l1_b);
    display::flush();
    return;
  }

  bool has_route = f.line3_from[0] && f.line3_to[0];

  draw_line1_centered(f.line1, layout::kLine1Y, f.l1_r, f.l1_g, f.l1_b);
  draw_line_centered(f.line2, layout::kLine2Y, f.l2_r, f.l2_g, f.l2_b);
  if (has_route) {
    draw_route_centered(f.line3_from, f.line3_to, layout::kLine3Y,
                        f.l3_r, f.l3_g, f.l3_b);
    draw_line4(f, layout::kLine4Y);
  } else {
    draw_line4(f, layout::kLine3Y);
  }

  display::flush();
}

}  // namespace render
