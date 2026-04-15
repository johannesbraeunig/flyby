#!/usr/bin/env python3
"""
Generate web/public/og-image.png — the 1200x630 social-share card.

Design goals (OG/Twitter-card best practices):
  • Single focal point: the LED plane panel, not a wall of text.
  • Brand wordmark legible at the 600px-wide thumbnail size.
  • Faithful mirror of the live app's labelled-stats layout
    (web/app/ui/plane-card.tsx) — same label-above-value structure,
    same standard-amber line 1 (NOT the airline brand color — see
    plane-card.tsx:298: "line 1 stays in the standard LED amber
    regardless of airline — the brand-color version was noisy."),
    same 9×5 pixel arrow for the route (PixelArrow, plane-card.tsx:144).
  • Clear hierarchy: brand → product → tagline → URL.
  • Pure-Pillow, no other deps. Re-runnable, idempotent.

Run:
    python3 web/scripts/build-og-image.py
"""

from __future__ import annotations

import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ───── Canvas ─────
W, H = 1200, 630
PIXEL = 5                 # one LED cell = 5x5 px
COLS = W // PIXEL         # 240 LEDs wide
ROWS = H // PIXEL         # 126 LEDs tall

# ───── Palette (mirrors :root vars in app.css) ─────
BG          = (10, 6, 4)              # --bg-deep
LED_OFF     = (255, 170, 0, 28)       # dim amber, ambient grid
AMBER       = (255, 170, 0)           # --led-amber
AMBER_SOFT  = (255, 192, 68)          # --led-amber-soft
AMBER_DIM   = (255, 190, 80)          # --ui-muted-ish, for labels

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'og-image.png')
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'


# ─────────────────────────────────────────────────────────────────────
# Text rendering: rasterize a TTF glyph at a small px size with
# antialiasing OFF so each "on" pixel becomes one LED cell. Caller
# specifies height in LED cells; width is whatever the font produces
# at that height.
# ─────────────────────────────────────────────────────────────────────

def render_text_to_grid(text: str, height_cells: int) -> list[list[int]]:
    # DejaVu Mono Bold's cap-height at size N is ~0.72*N. Pick a font
    # px size so the rendered ink ends up ~height_cells tall. Then we
    # crop and resize to exactly height_cells using NEAREST so the
    # pixel feel survives.
    font_px = max(8, int(round(height_cells / 0.72)))
    font = ImageFont.truetype(FONT, font_px)

    pad = font_px
    bbox = font.getbbox(text)
    w = bbox[2] - bbox[0] + pad * 2
    h = bbox[3] - bbox[1] + pad * 2

    img = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(img)
    d.fontmode = '1'  # no antialiasing
    d.text((pad - bbox[0], pad - bbox[1]), text, fill=255, font=font)

    bbox2 = img.getbbox()
    if bbox2 is None:
        return [[0]]
    img = img.crop(bbox2)

    ratio = height_cells / img.height
    new_w = max(1, round(img.width * ratio))
    img = img.resize((new_w, height_cells), Image.NEAREST)

    px = img.load()
    return [[1 if px[x, y] > 127 else 0 for x in range(img.width)]
            for y in range(img.height)]


# 9×5 dot-matrix right-pointing arrow — the same shape PixelArrow
# renders in plane-card.tsx:144. Hand-coded so the route arrow on the
# OG image visually matches the live app exactly.
PIXEL_ARROW: list[list[int]] = [
    [0, 0, 0, 0, 0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0, 0, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 1],
    [0, 0, 0, 0, 0, 0, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 1, 0, 0],
]


def grid_width(g: list[list[int]]) -> int:
    return len(g[0]) if g else 0


# ─────────────────────────────────────────────────────────────────────
# Drawing primitives
# ─────────────────────────────────────────────────────────────────────

def stamp_grid(canvas: Image.Image, grid: list[list[int]],
               top_cell: int, left_cell: int, color: tuple,
               sharp_r: float = 1.9, glow_r: float = 3.0,
               glow_alpha: int = 170, blur_px: float | None = None) -> None:
    """
    Draw a 0/1 grid into the canvas as bright LEDs at the given cell
    offset. Two-pass: a sharp dot core, plus a blurred halo behind for
    the amber bloom that mirrors the CSS text-shadow.
    """
    glow = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    sharp = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    glow_d = ImageDraw.Draw(glow)
    sharp_d = ImageDraw.Draw(sharp)

    for ry, row in enumerate(grid):
        for rx, on in enumerate(row):
            if not on:
                continue
            gx = left_cell + rx
            gy = top_cell + ry
            if gx < 0 or gx >= COLS or gy < 0 or gy >= ROWS:
                continue
            cx = gx * PIXEL + PIXEL / 2
            cy = gy * PIXEL + PIXEL / 2
            sharp_d.ellipse((cx - sharp_r, cy - sharp_r, cx + sharp_r, cy + sharp_r),
                            fill=color + (255,))
            glow_d.ellipse((cx - glow_r, cy - glow_r, cx + glow_r, cy + glow_r),
                           fill=color + (glow_alpha,))

    blur = blur_px if blur_px is not None else PIXEL * 1.0
    glow = glow.filter(ImageFilter.GaussianBlur(radius=blur))
    canvas.alpha_composite(glow)
    canvas.alpha_composite(sharp)


def stat_block(canvas: Image.Image, label: str, value: str,
               top_cell: int, left_cell: int,
               label_h: int, value_h: int,
               value_color: tuple = AMBER,
               value_grid: list[list[int]] | None = None) -> int:
    """
    Render one app-style stat: tiny dim label on top, big bright
    value beneath. Mirrors the .stat / .stat-label / .stat-value
    structure from app.css. Returns the rightmost column written so
    callers can lay out multiple stats in a row.
    """
    lg = render_text_to_grid(label, label_h)
    if value_grid is None:
        vg = render_text_to_grid(value, value_h)
    else:
        vg = value_grid
    # Label is dim, no halo blur — labels in the app use `text-shadow:
    # 0 0 6px rgba(255,170,0,0.25)`, much subtler than the values.
    stamp_grid(canvas, lg, top_cell=top_cell, left_cell=left_cell,
               color=AMBER_DIM, sharp_r=1.4, glow_r=2.0, glow_alpha=80,
               blur_px=PIXEL * 0.6)
    # Value gap: the live UI uses margin-top: -0.12em on .stat-value,
    # i.e. labels and values almost touch. 2-cell gap is the LED-grid
    # equivalent.
    stamp_grid(canvas, vg, top_cell=top_cell + label_h + 2,
               left_cell=left_cell, color=value_color)
    return left_cell + max(grid_width(lg), grid_width(vg))


def horizontal_rule(canvas: Image.Image, top_cell: int,
                    left_cell: int, right_cell: int,
                    color: tuple = LED_OFF) -> None:
    """Subtle dim-amber dotted rule, every 2nd cell. Used to visually
    separate the brand strip from the panel without a hard line."""
    glow = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    for gx in range(left_cell, right_cell, 2):
        cx = gx * PIXEL + PIXEL / 2
        cy = top_cell * PIXEL + PIXEL / 2
        d.ellipse((cx - 1.0, cy - 1.0, cx + 1.0, cy + 1.0), fill=color)
    canvas.alpha_composite(glow)


# ─────────────────────────────────────────────────────────────────────
# Main composition
# ─────────────────────────────────────────────────────────────────────

def main() -> None:
    canvas = Image.new('RGBA', (W, H), BG + (255,))

    # Ambient unlit-LED grid: a 1px dim amber dot in every cell.
    # This is what the live app does in CSS via radial-gradient on the
    # body. We dim it more than the CSS does (alpha 28 vs 36) because
    # the OG image gets viewed at thumbnail sizes where dense grids
    # turn into noise. Drawn ONCE into a reusable layer.
    bg = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    bg_d = ImageDraw.Draw(bg)
    for gy in range(ROWS):
        for gx in range(COLS):
            cx = gx * PIXEL + PIXEL / 2
            cy = gy * PIXEL + PIXEL / 2
            bg_d.ellipse((cx - 0.8, cy - 0.8, cx + 0.8, cy + 0.8), fill=LED_OFF)
    canvas.alpha_composite(bg)

    # ── Layout (LED grid 240×126 cells) ──
    # The composition reads top-to-bottom in 4 zones. Heights are
    # tuned so the whole layout fits in 126 rows with breathing room.
    #
    #   Zone        Rows     Purpose
    #   ──────────  ───────  ─────────────────────────────────────────
    #   Brand       6–19     "FLYBY" wordmark (hero)
    #   Tagline     23–27    "the nearest plane overhead"
    #   Divider     31       Dotted rule
    #   Panel L1    35–56    Airline name (big, standard amber)
    #   Panel L2    62–83    FLIGHT / ROUTE labelled stats
    #   Panel L3    88–109   ALT / SPD / DIST labelled stats
    #   Footer      117–121  Repo URL bottom-right
    #
    # Horizontal positions auto-center against measured widths — never
    # hand-counted, so re-running with different sample data still
    # composes correctly.

    # ── Brand strip (hero) ──
    brand_text = 'FLYBY'
    brand_h = 14
    brand_g = render_text_to_grid(brand_text, brand_h)
    brand_w = grid_width(brand_g)
    brand_left = (COLS - brand_w) // 2
    stamp_grid(canvas, brand_g, top_cell=6, left_cell=brand_left, color=AMBER,
               sharp_r=2.2, glow_r=3.5, glow_alpha=200, blur_px=PIXEL * 1.4)

    # Tagline — small, dim, beneath the wordmark
    tagline = 'the nearest plane overhead'
    tagline_h = 5
    tag_g = render_text_to_grid(tagline, tagline_h)
    tag_w = grid_width(tag_g)
    stamp_grid(canvas, tag_g, top_cell=23,
               left_cell=(COLS - tag_w) // 2, color=AMBER_DIM,
               sharp_r=1.3, glow_r=1.8, glow_alpha=80, blur_px=PIXEL * 0.5)

    # ── Divider ──
    horizontal_rule(canvas, top_cell=31, left_cell=24, right_cell=COLS - 24)

    # ── Panel line 1: airline name ──
    # Standard LED amber (NOT the brand color). plane-card.tsx:298:
    # "line 1 stays in the standard LED amber regardless of airline
    # — the brand-color version was noisy."
    airline = 'LUFTHANSA'
    airline_h = 22
    airline_g = render_text_to_grid(airline, airline_h)
    airline_w = grid_width(airline_g)
    airline_top = 35
    stamp_grid(canvas, airline_g, top_cell=airline_top,
               left_cell=(COLS - airline_w) // 2, color=AMBER,
               sharp_r=2.2, glow_r=3.4, glow_alpha=200, blur_px=PIXEL * 1.2)

    # ── Panel line 2: FLIGHT / ROUTE labelled stats ──
    # Same layout as the live UI: tiny dim label, big amber value
    # underneath, two stats laid out side-by-side with generous gap.
    line2_top = 62
    label_h = 6        # legible at thumbnail size — h=4 was unreadable mush
    value_h = 14
    label_value_gap = 3
    stat_gap = 18

    # Build the route value as: "FRA" + pixel-arrow + "JFK". We need
    # to compose the value width from three sub-grids so we can center
    # the FLIGHT+ROUTE pair as a unit.
    fra_g = render_text_to_grid('FRA', value_h)
    jfk_g = render_text_to_grid('JFK', value_h)
    arrow_g = PIXEL_ARROW
    arrow_pad = 3
    route_value_w = (grid_width(fra_g) + arrow_pad + grid_width(arrow_g)
                     + arrow_pad + grid_width(jfk_g))

    flight_value_g = render_text_to_grid('DLH441', value_h)
    flight_label_g = render_text_to_grid('FLIGHT', label_h)
    route_label_g = render_text_to_grid('ROUTE', label_h)

    flight_w = max(grid_width(flight_value_g), grid_width(flight_label_g))
    route_w = max(route_value_w, grid_width(route_label_g))
    line2_total_w = flight_w + stat_gap + route_w
    line2_left = (COLS - line2_total_w) // 2

    # FLIGHT stat
    stamp_grid(canvas, flight_label_g, top_cell=line2_top, left_cell=line2_left,
               color=AMBER_DIM, sharp_r=1.6, glow_r=2.2, glow_alpha=110,
               blur_px=PIXEL * 0.6)
    stamp_grid(canvas, flight_value_g, top_cell=line2_top + label_h + label_value_gap,
               left_cell=line2_left, color=AMBER_SOFT,
               sharp_r=2.0, glow_r=3.0, glow_alpha=170, blur_px=PIXEL * 1.0)

    # ROUTE stat (label + value with arrow)
    route_left = line2_left + flight_w + stat_gap
    stamp_grid(canvas, route_label_g, top_cell=line2_top, left_cell=route_left,
               color=AMBER_DIM, sharp_r=1.6, glow_r=2.2, glow_alpha=110,
               blur_px=PIXEL * 0.6)
    # Compose FRA → JFK
    fra_left = route_left
    value_top = line2_top + label_h + label_value_gap
    stamp_grid(canvas, fra_g, top_cell=value_top, left_cell=fra_left,
               color=AMBER_SOFT, sharp_r=2.0, glow_r=3.0, glow_alpha=170,
               blur_px=PIXEL * 1.0)
    arrow_left = fra_left + grid_width(fra_g) + arrow_pad
    # Vertical-center the arrow on the value's mid-row.
    arrow_top = value_top + (value_h - len(arrow_g)) // 2
    stamp_grid(canvas, arrow_g, top_cell=arrow_top, left_cell=arrow_left,
               color=AMBER_SOFT, sharp_r=2.2, glow_r=3.2, glow_alpha=180,
               blur_px=PIXEL * 1.0)
    jfk_left = arrow_left + grid_width(arrow_g) + arrow_pad
    stamp_grid(canvas, jfk_g, top_cell=value_top, left_cell=jfk_left,
               color=AMBER_SOFT, sharp_r=2.0, glow_r=3.0, glow_alpha=170,
               blur_px=PIXEL * 1.0)

    # ── Panel line 3: ALT / SPD / DIST labelled stats ──
    line3_top = 88

    alt_label = render_text_to_grid('ALT', label_h)
    spd_label = render_text_to_grid('SPD', label_h)
    dist_label = render_text_to_grid('DIST', label_h)
    alt_value = render_text_to_grid('FL380', value_h)
    spd_value = render_text_to_grid('465KT', value_h)
    dist_value = render_text_to_grid('3.1KM', value_h)

    alt_w = max(grid_width(alt_label), grid_width(alt_value))
    spd_w = max(grid_width(spd_label), grid_width(spd_value))
    dist_w = max(grid_width(dist_label), grid_width(dist_value))
    line3_total_w = alt_w + stat_gap + spd_w + stat_gap + dist_w
    line3_left = (COLS - line3_total_w) // 2

    def draw_stat(label_g, value_g, top, left):
        stamp_grid(canvas, label_g, top_cell=top, left_cell=left,
                   color=AMBER_DIM, sharp_r=1.6, glow_r=2.2, glow_alpha=110,
                   blur_px=PIXEL * 0.6)
        stamp_grid(canvas, value_g, top_cell=top + label_h + label_value_gap,
                   left_cell=left, color=AMBER_SOFT,
                   sharp_r=2.0, glow_r=3.0, glow_alpha=170, blur_px=PIXEL * 1.0)

    draw_stat(alt_label, alt_value, line3_top, line3_left)
    draw_stat(spd_label, spd_value, line3_top, line3_left + alt_w + stat_gap)
    draw_stat(dist_label, dist_value, line3_top,
              line3_left + alt_w + stat_gap + spd_w + stat_gap)

    # ── Footer URL — bottom right, dim ──
    # Rendered with the system sans-serif (antialiased) instead of as
    # LEDs. At the size needed for legibility (~16 px), the dot-matrix
    # treatment turns the URL into illegible noise — and the metadata
    # footer is conceptually distinct from the LED-panel data anyway,
    # so a clean small caption reads as "label" rather than "content".
    footer_font = ImageFont.truetype(
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 18,
    )
    footer_text = 'github.com/johannesbraeunig/flyby'
    footer_d = ImageDraw.Draw(canvas)
    fbbox = footer_d.textbbox((0, 0), footer_text, font=footer_font)
    fw = fbbox[2] - fbbox[0]
    fh = fbbox[3] - fbbox[1]
    footer_d.text(
        (W - fw - 28, H - fh - 22),
        footer_text,
        font=footer_font,
        fill=AMBER_DIM + (220,),
    )

    # Save as RGB PNG (no alpha — many social scrapers reject alpha).
    out = canvas.convert('RGB')
    out.save(OUT, 'PNG', optimize=True)
    print(f'wrote {OUT} ({W}x{H})')


if __name__ == '__main__':
    main()
