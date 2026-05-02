#!/usr/bin/env python3
import os
from PIL import Image

SOURCE_IMAGE = "/home/selmo/Downloads/Gemini_Generated_Image_.png"
PROJECT_ROOT = "/run/media/selmo/HDBarracuda/Projetos/Financa_new"
MOBILE_ASSETS = os.path.join(PROJECT_ROOT, "mobile/assets/images")
FRONTEND_ASSETS = os.path.join(PROJECT_ROOT, "frontend/public")

def process_icon_raw(source_path, output_path, size):
    with Image.open(source_path) as img:
        img = img.convert("RGBA")
        
        # Square Crop
        width, height = img.size
        dim = min(width, height)
        left = (width - dim) / 2
        top = (height - dim) / 2
        img = img.crop((left, top, left + dim, top + dim))
        
        # Resize simple (LANCZOS for quality)
        img = img.resize((size, size), Image.Resampling.LANCZOS)
        
        # Save
        img.save(output_path, "PNG")
        print(f"✓ Original RAW: {output_path} ({size}x{size})")

print(f"Applying EXACT icon from {SOURCE_IMAGE}...")

os.makedirs(MOBILE_ASSETS, exist_ok=True)
os.makedirs(FRONTEND_ASSETS, exist_ok=True)

# Mobile
process_icon_raw(SOURCE_IMAGE, os.path.join(MOBILE_ASSETS, "icon.png"), 1024)
process_icon_raw(SOURCE_IMAGE, os.path.join(MOBILE_ASSETS, "adaptive-icon.png"), 1080)
process_icon_raw(SOURCE_IMAGE, os.path.join(MOBILE_ASSETS, "splash-icon.png"), 1080)
process_icon_raw(SOURCE_IMAGE, os.path.join(MOBILE_ASSETS, "favicon.png"), 64)

# Web
process_icon_raw(SOURCE_IMAGE, os.path.join(FRONTEND_ASSETS, "favicon.png"), 64)
process_icon_raw(SOURCE_IMAGE, os.path.join(FRONTEND_ASSETS, "logo.png"), 512)
process_icon_raw(SOURCE_IMAGE, os.path.join(FRONTEND_ASSETS, "icon-192.png"), 192)
process_icon_raw(SOURCE_IMAGE, os.path.join(FRONTEND_ASSETS, "icon-512.png"), 512)

print("\nDone! RAW icons applied to all production paths.")
