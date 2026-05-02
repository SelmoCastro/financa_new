#!/usr/bin/env python3
import os
from PIL import Image

SOURCE_IMAGE = "/home/selmo/Downloads/Gemini_Generated_Image_.png"
PROJECT_ROOT = "/run/media/selmo/HDBarracuda/Projetos/Financa_new"
MOBILE_ASSETS = os.path.join(PROJECT_ROOT, "mobile/assets/images")
FRONTEND_ASSETS = os.path.join(PROJECT_ROOT, "frontend/public")

def process_icon(source_path, output_path, size):
    with Image.open(source_path) as img:
        # Convert to RGBA if not already
        img = img.convert("RGBA")
        
        # Crop to square first
        width, height = img.size
        if width > height:
            left = (width - height) / 2
            top = 0
            right = (width + height) / 2
            bottom = height
        else:
            left = 0
            top = (height - width) / 2
            right = width
            bottom = (height + width) / 2
        
        img = img.crop((left, top, right, bottom))
        
        # Resize to final size
        img = img.resize((size, size), Image.Resampling.LANCZOS)
        
        # Save
        img.save(output_path, "PNG")
        print(f"✓ Generated {output_path} ({size}x{size})")

print(f"Applying final icon from {SOURCE_IMAGE} (Square Crop)...")

os.makedirs(MOBILE_ASSETS, exist_ok=True)
os.makedirs(FRONTEND_ASSETS, exist_ok=True)

# Mobile
process_icon(SOURCE_IMAGE, os.path.join(MOBILE_ASSETS, "icon.png"), 1024)
process_icon(SOURCE_IMAGE, os.path.join(MOBILE_ASSETS, "adaptive-icon.png"), 1080)
process_icon(SOURCE_IMAGE, os.path.join(MOBILE_ASSETS, "splash-icon.png"), 1080)
process_icon(SOURCE_IMAGE, os.path.join(MOBILE_ASSETS, "favicon.png"), 64)

# Web
process_icon(SOURCE_IMAGE, os.path.join(FRONTEND_ASSETS, "favicon.png"), 64)
process_icon(SOURCE_IMAGE, os.path.join(FRONTEND_ASSETS, "icon-192.png"), 192)
process_icon(SOURCE_IMAGE, os.path.join(FRONTEND_ASSETS, "icon-512.png"), 512)

print("\nDone! Icons updated with square crop.")
