#!/usr/bin/env python3
"""
Finanza Icon Generator — CEO-level fintech app icon set
Design: Hexagonal shield with stylized financial symbol, indigo-violet gradient,
        glassmorphism effects, subtle particles, modern fintech aesthetic.
"""

import math
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os

OUTPUT_DIR = "/run/media/selmo/HDBarracuda/Projetos/Financa_new/mobile/assets/images"
WEB_DIR = "/run/media/selmo/HDBarracuda/Projetos/Financa_new/frontend/public"

# ─── Color Palette ───
BG_START = (30, 30, 58)        # #1e1e3a — deep navy
BG_END = (15, 15, 35)          # darker edge
ACCENT_START = (99, 102, 241)  # #6366f1 — indigo
ACCENT_MID = (79, 70, 229)     # #4f46e5
ACCENT_END = (139, 92, 246)    # violet
GOLD = (251, 191, 36)          # amber accent
WHITE_SOFT = (230, 232, 240)
GLASS_HIGHLIGHT = (255, 255, 255, 40)
SHADOW_COLOR = (10, 10, 25)

# ─── Helper Functions ───

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))

def hex_to_rgba(hex_str, alpha=255):
    h = hex_str.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4)) + (alpha,)

def draw_gradient_bg(draw, w, h):
    """Draw diagonal gradient background"""
    for y in range(h):
        t = y / h
        color = lerp(BG_START, BG_END, t)
        draw.line([(0, y), (w, y)], fill=color)

def hexagon_points(cx, cy, r):
    """Return 6 points of a hexagon"""
    pts = []
    for i in range(6):
        angle = math.radians(60 * i - 30)  # flat-top
        x = cx + r * math.cos(angle)
        y = cy + r * math.sin(angle)
        pts.append((x, y))
    return pts

def draw_rounded_hex(draw, cx, cy, r, fill, outline=None, outline_width=0):
    """Draw a hexagon (approximated with rounded corners via thick lines)"""
    pts = hexagon_points(cx, cy, r)
    # Draw filled polygon
    draw.polygon(pts, fill=fill)
    if outline and outline_width:
        for i in range(6):
            p1 = pts[i]
            p2 = pts[(i+1) % 6]
            draw.line([p1, p2], fill=outline, width=outline_width)

def draw_financial_symbol_simple(draw, cx, cy, scale):
    """Simplified financial symbol for small icons (<200px)"""
    s = scale
    # Just the golden arrow + one bold bar
    bar_w = max(3, int(s * 0.10))
    bar_base = cy + s * 0.25
    bar_h = s * 0.40
    
    draw.rounded_rectangle(
        [cx - bar_w/2, bar_base - bar_h, cx + bar_w/2, bar_base],
        radius=bar_w/2 - 1, fill=WHITE_SOFT
    )
    
    # Golden top on bar
    draw.rounded_rectangle(
        [cx - bar_w/2 + 1, bar_base - bar_h + 1, cx + bar_w/2 - 1, bar_base - bar_h + s * 0.12],
        radius=bar_w/2 - 2, fill=GOLD
    )
    
    # Arrow
    ax, ay = cx + s * 0.25, bar_base - bar_h + s * 0.04
    arrow_sz = max(3, int(s * 0.08))
    draw.polygon([
        (ax, ay),
        (ax - arrow_sz, ay + arrow_sz * 1.2),
        (ax + arrow_sz * 0.3, ay - arrow_sz * 0.3),
    ], fill=GOLD)

def draw_financial_symbol(draw, cx, cy, scale):
    """Draw a modern, abstract financial symbol: ascending bars + integrated S-curve"""
    if scale < 200:
        return draw_financial_symbol_simple(draw, cx, cy, scale)
    
    s = scale
    
    # Define three bars ascending (like a bar chart going up)
    bar_w = s * 0.08
    bar_gap = s * 0.05
    bar_base = cy + s * 0.20  # bottom of bars
    
    # Bar 1 (shortest)
    h1 = s * 0.12
    x1 = cx - bar_w - bar_gap
    draw.rounded_rectangle(
        [x1 - bar_w/2, bar_base - h1, x1 + bar_w/2, bar_base],
        radius=bar_w/2, fill=WHITE_SOFT
    )
    
    # Bar 2 (medium)
    h2 = s * 0.22
    x2 = cx
    draw.rounded_rectangle(
        [x2 - bar_w/2, bar_base - h2, x2 + bar_w/2, bar_base],
        radius=bar_w/2, fill=WHITE_SOFT
    )
    
    # Bar 3 (tallest) — the "growth" bar
    h3 = s * 0.32
    x3 = cx + bar_w + bar_gap
    draw.rounded_rectangle(
        [x3 - bar_w/2, bar_base - h3, x3 + bar_w/2, bar_base],
        radius=bar_w/2, fill=WHITE_SOFT
    )
    
    # Highlight bar (golden accent on the tallest bar)
    gold_h = s * 0.10
    draw.rounded_rectangle(
        [x3 - bar_w/2 + 2, bar_base - h3 + 3, x3 + bar_w/2 - 2, bar_base - h3 + gold_h],
        radius=bar_w/2 - 1, fill=GOLD
    )
    
    # Ascending trend line (arrow-like)
    line_start = (cx - s * 0.28, bar_base - s * 0.05)
    line_mid = (cx, bar_base - s * 0.15)
    line_end = (cx + s * 0.28, bar_base - s * 0.28)
    
    # Draw line segments
    draw.line([line_start, line_mid, line_end], fill=GOLD, width=max(2, int(s * 0.03)))
    
    # Arrowhead
    arrow_sz = s * 0.06
    ax, ay = line_end
    draw.polygon([
        (ax, ay),
        (ax - arrow_sz, ay + arrow_sz * 1.2),
        (ax + arrow_sz * 0.3, ay - arrow_sz * 0.3),
    ], fill=GOLD)

def draw_shield_hex(draw, cx, cy, r):
    """Draw the main hex shield with gradient fill"""
    # Create gradient mask effect by drawing concentric hexagons
    for i in range(8):
        t = i / 7
        radius = r - i * (r * 0.03)
        color = lerp(ACCENT_START, ACCENT_END, t)
        pts = hexagon_points(cx, cy, radius)
        draw.polygon(pts, fill=color)
    
    # Inner glow
    inner_r = r * 0.92
    inner_pts = hexagon_points(cx, cy, inner_r)
    # Draw with subtle lighter stroke
    for i in range(6):
        p1 = inner_pts[i]
        p2 = inner_pts[(i+1) % 6]
        draw.line([p1, p2], fill=(150, 145, 220), width=2)

def draw_particles(draw, cx, cy, r):
    """Draw subtle sparkle particles around the hexagon"""
    import random
    rng = random.Random(42)
    for _ in range(15):
        angle = rng.uniform(0, 2 * math.pi)
        dist = rng.uniform(r * 0.85, r * 1.15)
        px = cx + dist * math.cos(angle)
        py = cy + dist * math.sin(angle)
        sz = rng.uniform(1.5, 4.0)
        alpha = rng.randint(80, 200)
        color = (220, 210, 255, alpha) if rng.random() > 0.3 else (GOLD[0], GOLD[1], GOLD[2], alpha)
        draw.ellipse([px - sz, py - sz, px + sz, py + sz], fill=color)

def generate_icon(size, output_path, is_adaptive_fg=False, is_splash=False):
    """Generate a single icon at given size"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Background (rounded rect for iOS icon style)
    margin = size * 0.05
    corner = size * 0.22  # iOS-style corner radius
    
    # Draw rounded rect background
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=corner, fill=BG_START
    )
    
    # Background gradient (diagonal — simulate with horizontal lines)
    for y in range(int(margin), int(size - margin)):
        t = (y - margin) / (size - 2 * margin)
        color = lerp(BG_START, BG_END, t * 0.6)
        draw.line(
            [(margin, y), (size - margin, y)],
            fill=color
        )
    
    # Center and radius for the hex shield
    cx = size / 2
    cy = size / 2
    r = size * 0.28
    
    # Draw particles behind
    draw_particles(draw, cx, cy, r)
    
    # Draw main hex shield with gradient
    draw_shield_hex(draw, cx, cy, r)
    
    # Hex outline (thin, bright)
    hex_pts = hexagon_points(cx, cy, r)
    for i in range(6):
        p1 = hex_pts[i]
        p2 = hex_pts[(i+1) % 6]
        draw.line([p1, p2], fill=(180, 175, 240), width=max(1, int(size * 0.005)))
    
    # Financial symbol inside
    draw_financial_symbol(draw, cx, cy, size * 0.38)
    
    # Glass highlight (top-left arc) — subtle
    highlight_pts = [
        (cx - r * 0.7, cy - r * 0.7),
        (cx - r * 0.3, cy - r * 0.7),
        (cx - r * 0.7, cy - r * 0.3),
    ]
    # Simplified: draw a small ellipse highlight
    hl_x = cx - r * 0.4
    hl_y = cy - r * 0.4
    hl_rx = r * 0.25
    hl_ry = r * 0.15
    draw.ellipse(
        [hl_x - hl_rx, hl_y - hl_ry, hl_x + hl_rx, hl_y + hl_ry],
        fill=(255, 255, 255, 25)
    )
    
    # Bottom shadow on rounded rect
    shadow_margin = size * 0.06
    shadow_y = size - size * 0.15
    for yy in range(int(shadow_y), int(size - margin)):
        alpha = int(40 * (1 - (yy - shadow_y) / (size - margin - shadow_y)))
        draw.line(
            [(margin, yy), (size - margin, yy)],
            fill=(0, 0, 0, alpha)
        )
    
    img.save(output_path, 'PNG')
    print(f"  ✓ {output_path} ({size}x{size})")

def generate_adaptive_bg(size, output_path):
    """Adaptive icon background — solid gradient fill"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Full gradient background
    for y in range(size):
        t = y / size
        color = lerp(BG_START, ACCENT_START, t)
        draw.line([(0, y), (size, y)], fill=color)
    
    # Subtle radial glow from center
    cx, cy = size / 2, size / 2
    max_r = size * 0.7
    for r_step in range(int(max_r), 0, -2):
        alpha = int(15 * (1 - r_step / max_r))
        draw.ellipse(
            [cx - r_step, cy - r_step, cx + r_step, cy + r_step],
            fill=(255, 255, 255, alpha)
        )
    
    img.save(output_path, 'PNG')
    print(f"  ✓ {output_path} ({size}x{size}) — adaptive background")

# ─── Main Generation ───

print("🎨 Generating Finanza premium icon set...\n")

os.makedirs(OUTPUT_DIR, exist_ok=True)

# Mobile icons
generate_icon(1024, os.path.join(OUTPUT_DIR, "icon.png"))
generate_icon(1080, os.path.join(OUTPUT_DIR, "adaptive-icon.png"), is_adaptive_fg=True)
generate_adaptive_bg(1080, os.path.join(OUTPUT_DIR, "adaptive-icon-background.png"))
generate_icon(1080, os.path.join(OUTPUT_DIR, "splash-icon.png"), is_splash=True)
generate_icon(64, os.path.join(OUTPUT_DIR, "favicon.png"))

# Web favicon
os.makedirs(WEB_DIR, exist_ok=True)
generate_icon(64, os.path.join(WEB_DIR, "favicon.png"))

# Also generate 192 and 512 for PWA
generate_icon(192, os.path.join(WEB_DIR, "icon-192.png"))
generate_icon(512, os.path.join(WEB_DIR, "icon-512.png"))

print("\n✅ All icons generated!")
print(f"\nMobile: {OUTPUT_DIR}")
print(f"Web:    {WEB_DIR}")
