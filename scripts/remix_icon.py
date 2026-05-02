#!/usr/bin/env python3
"""
Finanza Icon Remixer — Taking the Gemini original and adding "Elite" polish.
Effects: Frosted glass bezel, inner shadow, outer halo glow, and color balance tweak.
"""

import sys
import os
from PIL import Image, ImageOps, ImageFilter, ImageEnhance, ImageDraw

SOURCE = "/home/selmo/Downloads/Gemini_Generated_Image_.png"
OUTPUT_DIR = "/run/media/selmo/HDBarracuda/Projetos/Financa_new/mobile/assets/images"
PROJECT_ROOT = "/run/media/selmo/HDBarracuda/Projetos/Financa_new"

def create_remix():
    print(f"🎨 Remixing {SOURCE}...")
    
    # 1. Base Image
    base = Image.open(SOURCE).convert("RGBA")
    
    # Square crop (copy from previous success)
    w, h = base.size
    dim = min(w, h)
    left = (w - dim) / 2
    top = (h - dim) / 2
    base = base.crop((left, top, left + dim, top + dim))
    base = base.resize((1024, 1024), Image.Resampling.LANCZOS)
    
    # 2. Enhance - more contrast and pop
    enhancer = ImageEnhance.Contrast(base)
    base = enhancer.enhance(1.15)
    enhancer = ImageEnhance.Color(base)
    base = enhancer.enhance(1.1)

    # 3. Create a "Glass Frame" overlay
    # This adds a semi-transparent border highlight
    overlay = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    
    # Inner glow / Bezel
    for i in range(40):
        alpha = int(60 * (1 - i/40))
        # Top-left white highlight (bezel)
        d.ellipse([10+i, 10+i, 1014-i, 1014-i], outline=(255, 255, 255, alpha), width=1)
        
    # 4. Vignette / Outer Shadow
    # Makes the center pop
    vignette = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    vd = ImageDraw.Draw(vignette)
    for i in range(200):
        alpha = int(180 * (i/200)**2)
        vd.ellipse([-100+i, -100+i, 1124-i, 1124-i], outline=(0, 0, 0, alpha), width=1)
    
    # 5. Cyan Sparkle (AI touch)
    # Adding a subtle glowing point in the center
    sparkle = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sparkle)
    for i in range(150, 0, -5):
        alpha = int(100 * (1 - i/150))
        sd.ellipse([512-i, 512-i, 512+i, 512+i], fill=(193, 241, 255, alpha))
        
    # Combine
    out = Image.alpha_composite(base, sparkle)
    out = Image.alpha_composite(out, overlay)
    out = Image.alpha_composite(out, vignette)
    
    # 6. Final Polish - Corner Masking (Rounded Rect)
    # Many apps look better with a slight uniform corner radius
    mask = Image.new("L", (1024, 1024), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, 1024, 1024], radius=180, fill=255)
    
    final = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    final.paste(out, (0, 0), mask)
    
    # Save results
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Map to all required files
    sizes = {
        "icon.png": 1024,
        "adaptive-icon.png": 1080,
        "splash-icon.png": 1080,
        "favicon.png": 64
    }
    
    for name, size in sizes.items():
        resized = final.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(os.path.join(OUTPUT_DIR, name), "PNG")
        if name == "favicon.png":
            resized.save(os.path.join(PROJECT_ROOT, "frontend/public", name), "PNG")
            
    # Extra PWA icons
    final.resize((192, 192)).save(os.path.join(PROJECT_ROOT, "frontend/public/icon-192.png"), "PNG")
    final.resize((512, 512)).save(os.path.join(PROJECT_ROOT, "frontend/public/icon-512.png"), "PNG")

    print("\n🚀 Remix Complete! Applied 'Aurora Sparkle' design.")

if __name__ == "__main__":
    create_remix()
