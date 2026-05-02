#!/usr/bin/env python3
"""
Finanza Icon Generator v2 — "Obsidian Elite" CEO-level design.
Design: Midnight squircle base, carbon-fiber textured inner frame, 
        stylized floating 'F' with liquid gold and indigo highlights.
"""

import math
import random
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os

OUTPUT_DIR = "/run/media/selmo/HDBarracuda/Projetos/Financa_new/mobile/assets/images"
WEB_DIR = "/run/media/selmo/HDBarracuda/Projetos/Financa_new/frontend/public"

# ─── Color Palette (Premium Fintech) ───
OBSIDIAN = (10, 10, 14)        # #0a0a0e - almost black
DARK_NAVY = (20, 20, 35)       # #141423
GOLD_LIGHT = (255, 215, 0)     # #ffd700
GOLD_DARK = (184, 134, 11)     # #b8860b
INDIGO = (99, 102, 241)        # #6366f1
VIOLET = (139, 92, 246)        # #8b5cf6
WHITE_PURE = (255, 255, 255)

# ─── Helper Functions ───

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))

def draw_squircle(draw, size, color):
    """Draw a squircle shape (superellipse)"""
    # Approximation using a rounded rectangle with high radius
    margin = size * 0.02
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=size * 0.28, fill=color
    )

def draw_texture(draw, size):
    """Draw a subtle premium 'carbon-fiber/data' texture"""
    step = max(4, int(size * 0.01))
    for i in range(0, size, step):
        for j in range(0, size, step):
            if (i + j) % (step * 2) == 0:
                alpha = 8 if (i // step + j // step) % 2 == 0 else 4
                draw.point((i, j), fill=(255, 255, 255, alpha))

def draw_glow(img, cx, cy, r, color):
    """Draw a radial glow effect"""
    glow_img = Image.new('RGBA', img.size, (0, 0, 0, 0))
    g_draw = ImageDraw.Draw(glow_img)
    
    for i in range(r, 0, -2):
        alpha = int(40 * (1 - i / r))
        g_draw.ellipse([cx - i, cy - i, cx + i, cy + i], fill=color + (alpha,))
    
    img.alpha_composite(glow_img)

def draw_stylized_f(draw, cx, cy, size):
    """Draw a modern, sharp 'F' with 3D metallic feel"""
    s = size
    w = s * 0.18  # stroke width
    h = s * 0.6   # total height
    
    # Vertically centered vertical bar
    v_top = cy - h/2
    v_bottom = cy + h/2
    v_left = cx - s * 0.15
    v_right = v_left + w
    
    # Draw shadow first (offset)
    draw.rounded_rectangle([v_left+4, v_top+4, v_right+4, v_bottom+4], radius=4, fill=(0,0,0,100))
    
    # Main Vertical Bar (Indigo to Violet gradient)
    for i in range(int(h)):
        t = i / h
        color = lerp(INDIGO, VIOLET, t)
        draw.line([(v_left, v_top + i), (v_right, v_top + i)], fill=color, width=1)

    # Top Horizontal Bar (curved, liquid gold)
    bar1_w = s * 0.35
    bar1_top = v_top
    bar1_bottom = v_top + w * 0.8
    bar1_right = v_left + bar1_w
    
    # Draw gold gradient for top bar
    for x in range(int(v_left), int(bar1_right)):
        t = (x - v_left) / (bar1_right - v_left)
        color = lerp(GOLD_LIGHT, GOLD_DARK, t)
        draw.line([(x, bar1_top), (x, bar1_bottom)], fill=color, width=1)
        
    # Middle Horizontal Bar (shorter, ghost white)
    bar2_w = s * 0.22
    bar2_top = v_top + h * 0.35
    bar2_bottom = bar2_top + w * 0.6
    bar2_right = v_left + bar2_w
    
    draw.rounded_rectangle([v_left, bar2_top, bar2_right, bar2_bottom], radius=2, fill=(240, 240, 255))
    
    # "Intelligence Star" (AI)
    star_x = bar1_right + s * 0.05
    star_y = bar1_top
    size_star = s * 0.08
    
    # Draw 4-point star
    draw.polygon([
        (star_x, star_y - size_star), # top
        (star_x + size_star/3, star_y), # mid
        (star_x + size_star, star_y), # right
        (star_x + size_star/3, star_y + size_star/3), # mid
        (star_x, star_y + size_star), # bottom
        (star_x - size_star/3, star_y + size_star/3), # mid
        (star_x - size_star, star_y), # left
        (star_x - size_star/3, star_y), # mid
    ], fill=GOLD_LIGHT)

def generate_elite_icon(size, output_path):
    """The master generator for the CEO-level obsidian icon"""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 1. Base Squircle
    draw_squircle(draw, size, OBSIDIAN)
    
    # 2. Gradient Inner Layer (Subtle depth)
    margin = size * 0.05
    for y in range(int(margin), int(size - margin)):
        t = (y - margin) / (size - 2 * margin)
        color = lerp(OBSIDIAN, DARK_NAVY, t * 1.5)
        draw.line([(margin, y), (size - margin, y)], fill=color)
        
    # 3. Apply detailed texture
    draw_texture(draw, size)
    
    # 4. Center glow for the symbol
    cx, cy = size / 2, size / 2
    draw_glow(img, cx, cy, int(size * 0.35), INDIGO)
    
    # 5. Re-draw center content to composite correctly
    draw = ImageDraw.Draw(img)
    draw_stylized_f(draw, cx, cy, size)
    
    # 6. Glass reflection (Top sheen)
    sheen = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(sheen)
    s_draw.ellipse([-size*0.2, -size*0.2, size*1.2, size*0.4], fill=(255, 255, 255, 15))
    img.alpha_composite(sheen)
    
    # 7. Final Border
    draw.rounded_rectangle(
        [margin, margin, size - margin, size - margin],
        radius=size * 0.28, outline=(99, 102, 241, 40), width=max(1, int(size * 0.005))
    )
    
    img.save(output_path, 'PNG')
    print(f"  ✓ {output_path} generated.")

# ─── Execution ───

print("👔 Generating Finanza Elite Icon Set (CEO Visual)...")

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(WEB_DIR, exist_ok=True)

# Main Icons
generate_elite_icon(1024, os.path.join(OUTPUT_DIR, "icon.png"))
generate_elite_icon(1080, os.path.join(OUTPUT_DIR, "adaptive-icon.png"))
generate_elite_icon(1080, os.path.join(OUTPUT_DIR, "splash-icon.png"))
generate_elite_icon(64, os.path.join(OUTPUT_DIR, "favicon.png"))
generate_elite_icon(64, os.path.join(WEB_DIR, "favicon.png"))

# Adaptive Background (Midnight gradient)
bg_img = Image.new('RGB', (1080, 1080), OBSIDIAN)
bg_draw = ImageDraw.Draw(bg_img)
for y in range(1080):
    t = y / 1080
    color = lerp(OBSIDIAN, DARK_NAVY, t)
    bg_draw.line([(0, y), (1080, y)], fill=color)
bg_img.save(os.path.join(OUTPUT_DIR, "adaptive-icon-background.png"))

print("\n🚀 Elite icons are ready for build!")
