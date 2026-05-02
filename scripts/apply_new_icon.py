#!/usr/bin/env python3
import os
from PIL import Image

SOURCE_IMAGE = "/home/selmo/Downloads/Gemini_Generated_Image_.png"
PROJECT_ROOT = "/run/media/selmo/HDBarracuda/Projetos/Financa_new"
MOBILE_ASSETS = os.path.join(PROJECT_ROOT, "mobile/assets/images")
FRONTEND_ASSETS = os.path.join(PROJECT_ROOT, "frontend/public")

def process_icon(source_path, output_path, size):
    with Image.open(source_path) as img:
        # Create a square transparent background
        square_img = Image.new("RGBA", (size, size), (255, 255, 255, 0))
        
        # Calculate aspect ratio
        width, height = img.size
        ratio = min(size / width, size / height)
        new_size = (int(width * ratio), int(height * ratio))
        
        # Resize image
        resized_img = img.resize(new_size, Image.Resampling.LANCZOS)
        
        # Center the image
        offset = ((size - new_size[0]) // 2, (size - new_size[1]) // 2)
        square_img.paste(resized_img, offset, resized_img if resized_img.mode == 'RGBA' else None)
        
        # Save
        square_img.save(output_path, "PNG")
        print(f"✓ Generated {output_path} ({size}x{size})")

print(f"Applying new 'original' icon from {SOURCE_IMAGE}...")

os.makedirs(MOBILE_ASSETS, exist_ok=True)
os.makedirs(FRONTEND_ASSETS, exist_ok=True)

# Mobile
process_icon(SOURCE_IMAGE, os.path.join(MOBILE_ASSETS, "icon.png"), 1024)
process_icon(SOURCE_IMAGE, os.path.join(MOBILE_ASSETS, "adaptive-icon.png"), 1080)
process_icon(SOURCE_IMAGE, os.path.join(MOBILE_ASSETS, "splash-icon.png"), 1080)
process_icon(SOURCE_IMAGE, os.path.join(MOBILE_ASSETS, "favicon.png"), 64)

# Web
process_icon(SOURCE_IMAGE, os.path.join(FRONTEND_ASSETS, "favicon.png"), 64)

# PWA icons (v1.7.28 had them, let's keep them updated too)
process_icon(SOURCE_IMAGE, os.path.join(FRONTEND_ASSETS, "icon-192.png"), 192)
process_icon(SOURCE_IMAGE, os.path.join(FRONTEND_ASSETS, "icon-512.png"), 512)

print("\nDone! All project icons updated.")
