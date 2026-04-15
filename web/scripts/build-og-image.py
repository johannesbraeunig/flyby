#!/usr/bin/env python3
"""
Generate web/public/og-image.png — the 1200x630 social-share card.

The image visually mirrors the LED panel UI (`web/public/app.css`):
deep brown background, warm-amber dot-matrix grid, blocky pixel text
rendered as individual LEDs (not antialiased system-font glyphs).

Pure-Pillow, no other deps. Run:

    python3 web/scripts/build-og-image.py

Re-run when the brand evolves; commit the resulting PNG.
"""

from __future__ import annotations

import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ───── Canvas ─────
W, H = 1200, 630
PIXEL = 6                 # one LED cell = 6x6 px
COLS = W // PIXEL         # 200 LEDs wide
ROWS = H // PIXEL         # 105 LEDs tall

# ───── Palette (mirrors :root vars in app.css) ─────
BG          = (10, 6, 4)              # --bg-deep
LED_OFF     = (255, 170, 0, 36)       # --led-off ≈ rgba(255,170,0,0.14)
AMBER       = (255, 170, 0)           # --led-amber
AMBER_SOFT  = (255, 192, 68)          # --led-amber-soft
LH_YELLOW   = (255, 198, 30)          # Lufthansa brand color (matches src/airlines.cpp)

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'og-image.png')
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf'


def render_text_to_grid(text: str, height_cells: int, font_path: str = FONT) -> list[list[int]]:
    """
    Render `text` into a 1-bit bitmap whose height is `height_cells` LEDs.
    Returns a 2D list of 0/1 — each cell is one LED.

    Uses fontmode='1' so the font rasterizes without antialiasing,
    yielding crisp pixel-aligned glyphs that look like a real LED panel.
    """
    # Pick a font px size that rasterizes to ~height_cells tall.
    # DejaVu Sans Mono Bold's cap-height at size N is roughly 0.72*N,
    # so to get a glyph that fills `height_cells`, we ask for size
    # ~height_cells / 0.72. Then we trim whitespace afterwards.
    font_px = max(8, int(round(height_cells / 0.72)))
    font = ImageFont.truetype(font_path, font_px)

    # Generous canvas, then crop.
    pad = font_px
    bbox = font.getbbox(text)
    w = bbox[2] - bbox[0] + pad * 2
    h = bbox[3] - bbox[1] + pad * 2

    img = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(img)
    d.fontmode = '1'  # no antialiasing → crisp 1-bit edges
    d.text((pad - bbox[0], pad - bbox[1]), text, fill=255, font=font)

    # Crop to actual ink.
    bbox2 = img.getbbox()
    if bbox2 is None:
        return [[0] * 1 for _ in range(height_cells)]
    img = img.crop(bbox2)

    # If the ink height differs slightly from height_cells (font metrics
    # are approximate), squash/stretch to exactly height_cells using
    # nearest-neighbor so we keep the pixel feel.
    ratio = height_cells / img.height
    new_w = max(1, round(img.width * ratio))
    img = img.resize((new_w, height_cells), Image.NEAREST)

    px = img.load()
    return [[1 if px[x, y] > 127 else 0 for x in range(img.width)] for y in range(img.height)]


def draw_dot(draw: ImageDraw.ImageDraw, gx: int, gy: int, color: tuple, radius: float = 2.0) -> None:
    """Draw a single LED dot at grid cell (gx, gy)."""
    cx = gx * PIXEL + PIXEL / 2
    cy = gy * PIXEL + PIXEL / 2
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), fill=color)


def stamp_text(canvas: Image.Image, text: str, top_cell: int, left_cell: int,
               height_cells: int, color: tuple) -> int:
    """
    Render `text` at (left_cell, top_cell) on the LED grid, height = height_cells.
    Returns the rightmost LED column written (so the caller can stack glyphs).
    """
    grid = render_text_to_grid(text, height_cells)

    # Draw the bright LEDs into a separate RGBA layer so we can apply a
    # soft glow (Gaussian blur) underneath without blurring the dot grid.
    glow = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    sharp = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    glow_d = ImageDraw.Draw(glow)
    sharp_d = ImageDraw.Draw(sharp)

    h = len(grid)
    w = len(grid[0]) if h else 0
    for ry in range(h):
        for rx in range(w):
            if not grid[ry][rx]:
                continue
            gx = left_cell + rx
            gy = top_cell + ry
            if gx < 0 or gx >= COLS or gy < 0 or gy >= ROWS:
                continue
            # Sharp bright dot
            draw_dot(sharp_d, gx, gy, color + (255,), radius=2.4)
            # Larger soft halo for the bloom
            draw_dot(glow_d, gx, gy, color + (180,), radius=3.6)

    # Blur the halo → soft amber glow like the CSS text-shadow.
    glow = glow.filter(ImageFilter.GaussianBlur(radius=PIXEL * 0.9))

    canvas.alpha_composite(glow)
    canvas.alpha_composite(sharp)
    return left_cell + w


def main() -> None:
    # Base canvas: solid dark brown.
    canvas = Image.new('RGBA', (W, H), BG + (255,))

    # Off-LED background grid: a 1-px dim amber dot in every cell.
    bg_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    bg_d = ImageDraw.Draw(bg_layer)
    for gy in range(ROWS):
        for gx in range(COLS):
            draw_dot(bg_d, gx, gy, LED_OFF, radius=1.0)
    canvas.alpha_composite(bg_layer)

    # ── Three-line LED panel (centered horizontally, stacked) ──
    #
    # Helper that centers text on the LED grid. We measure-then-place
    # so the same heights (and font-derived widths) auto-center
    # without us hand-counting cells.
    def centered(text: str, top_cell: int, height_cells: int, color: tuple) -> None:
        grid = render_text_to_grid(text, height_cells)
        width = len(grid[0]) if grid else 0
        left = max(2, (COLS - width) // 2)
        stamp_text(canvas, text, top_cell, left, height_cells, color)

    # Layout (LED grid coordinates, 200×105):
    #   row  4 → "FLYBY · NEAREST PLANE OVERHEAD"  (brand, 6 cells)
    #   row 22 → "LUFTHANSA"                       (line 1, 22 cells, brand color)
    #   row 52 → "DLH441 FRA>JFK A333"             (line 2, 12 cells, amber)
    #   row 70 → "FL380  465KT  3.1KM"             (line 3, 12 cells, amber)
    #   row 92 → "github.com/johannesbraeunig/flyby" (footer, 6 cells, dim)

    centered('FLYBY  ·  NEAREST PLANE OVERHEAD',
             top_cell=4, height_cells=6, color=AMBER)

    # Line 1 — airline name in the airline's brand color (Lufthansa yellow)
    centered('LUFTHANSA', top_cell=22, height_cells=22, color=LH_YELLOW)

    # Line 2 — flight + route + aircraft type. ASCII '>' is the arrow
    # because the font renders it as a chunky chevron at this size,
    # echoing the pixel-arrow SVG used in the live UI.
    centered('DLH441 FRA>JFK A333', top_cell=52, height_cells=12, color=AMBER_SOFT)

    # Line 3 — altitude / speed / distance
    centered('FL380  465KT  3.1KM', top_cell=70, height_cells=12, color=AMBER_SOFT)

    # Footer — repo URL, dimmer
    centered('github.com/johannesbraeunig/flyby',
             top_cell=ROWS - 10, height_cells=5, color=AMBER_SOFT)

    # Save as RGB PNG (no alpha — many social scrapers don't like alpha).
    out = canvas.convert('RGB')
    out.save(OUT, 'PNG', optimize=True)
    print(f'wrote {OUT} ({W}x{H})')


if __name__ == '__main__':
    main()
