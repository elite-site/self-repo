#!/usr/bin/env python3
"""
Generate the ELITE portal's favicon/apple-touch-icon/manifest set from the logo.

The source is `assets/elite logo.png` (1254x1254). The ELITE mark is a circular
emblem with a laurel wreath, inner ring lettering, and a central motif (open
book + lamp). The full seal is unreadable at 16px, so we produce two sets:

1. Real-mark high-res icons: crop the emblem to its bounding box, add safe
   padding, and export optimised PNGs at 180, 192, 512 for apple-touch-icon,
   Android PWA, and the manifest. These ARE the actual logo, cropped.

2. Purpose-built `favicon.svg`: a 32x32 geometric mark derived from the central
   book+lamp motif (the only part that survives at 16px). This is NOT a
   hand-rolled illustration - it is a threshold trace of the actual logo's
   central crop, simplified to solid shapes. The result is a clean SVG that
   scales perfectly and is recognisable as the ELITE mark.

Outputs:
- web/public/favicon.svg
- web/public/favicon-32.png
- web/public/apple-touch-icon.png   (180x180)
- web/public/icon-192.png
- web/public/icon-512.png
- web/public/site.webmanifest
- admin-client/public/favicon.svg (same)
- admin-client/public/favicon-32.png (same)
- admin-client/public/apple-touch-icon.png (same)
- admin-client/public/icon-192.png (same)
- admin-client/public/icon-512.png (same)
- admin-client/public/site.webmanifest (base: "/admin/")
"""

import os
from pathlib import Path
from PIL import Image, ImageOps, ImageFilter

ROOT = Path(__file__).parent.parent
ASSETS = ROOT / "assets"
WEB_PUBLIC = ROOT / "web" / "public"
ADMIN_PUBLIC = ROOT / "admin-client" / "public"

LOGO = ASSETS / "elite logo.png"

# The emblem bounding box (from earlier analysis: 36,9,1218,1200 on 1254x1254)
EMBLEM_BOX = (36, 9, 1218, 1200)

# Central motif crop (book + lamp, from earlier analysis)
MOTIF_BOX = (0.24, 0.30, 0.76, 0.78)  # relative to emblem

def crop_emblem(im: Image.Image) -> Image.Image:
    """Crop the full emblem with a small safe margin."""
    em = im.crop(EMBLEM_BOX)
    # Make it square by adding padding to the shorter side
    w, h = em.size
    if w > h:
        pad = (w - h) // 2
        em = ImageOps.expand(em, border=(0, pad), fill="white")
    elif h > w:
        pad = (h - w) // 2
        em = ImageOps.expand(em, border=(pad, 0), fill="white")
    return em

def crop_motif(im: Image.Image) -> Image.Image:
    """Crop the central motif from the emblem."""
    em = crop_emblem(im)
    w, h = em.size
    box = (
        int(w * MOTIF_BOX[0]),
        int(h * MOTIF_BOX[1]),
        int(w * MOTIF_BOX[2]),
        int(h * MOTIF_BOX[3]),
    )
    return em.crop(box)

def threshold_to_svg(mask: Image.Image, size: int = 32) -> str:
    """Convert a binary mask to a simple SVG using rectangular runs."""
    # This is a coarse but honest trace of the actual motif pixels
    mask = mask.resize((size, size), Image.LANCZOS)
    px = mask.load()
    paths = []
    for y in range(size):
        x = 0
        while x < size:
            if px[x, y] < 128:
                start = x
                while x < size and px[x, y] < 128:
                    x += 1
                width = x - start
                # Each run becomes a rect
                paths.append(
                    f'<rect x="{start}" y="{y}" width="{width}" height="1"/>'
                )
            else:
                x += 1
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" fill="#ED1E26">
{"".join(paths)}
</svg>'''

def build():
    print("Loading logo...")
    logo = Image.open(LOGO).convert("RGBA")
    print(f"  size: {logo.size}")

    # Flatten on white for the real-mark PNGs
    white_bg = Image.new("RGBA", logo.size, (255, 255, 255, 255))
    flat = Image.alpha_composite(white_bg, logo).convert("RGB")

    # 1. Real-mark emblem crop
    emblem = crop_emblem(flat)
    print(f"  emblem crop: {emblem.size}")

    # 2. Central motif for favicon.svg
    motif = crop_motif(flat)
    print(f"  motif crop: {motif.size}")
    motif_l = motif.convert("L")

    # Generate the favicon SVG by thresholding the motif
    favicon_svg = threshold_to_svg(motif_l, 32)

    # Write web public
    WEB_PUBLIC.mkdir(parents=True, exist_ok=True)
    ADMIN_PUBLIC.mkdir(parents=True, exist_ok=True)

    print("\nWriting web/public...")
    # favicon.svg
    (WEB_PUBLIC / "favicon.svg").write_text(favicon_svg)
    print("  favicon.svg")

    # favicon-32.png from SVG (rasterised)
    motif_small = motif.resize((32, 32), Image.LANCZOS)
    motif_small.save(WEB_PUBLIC / "favicon-32.png", optimize=True)
    print("  favicon-32.png")

    # apple-touch-icon.png (180x180) from emblem
    apple = emblem.resize((180, 180), Image.LANCZOS)
    apple.save(WEB_PUBLIC / "apple-touch-icon.png", optimize=True)
    print("  apple-touch-icon.png")

    # icon-192.png
    icon192 = emblem.resize((192, 192), Image.LANCZOS)
    icon192.save(WEB_PUBLIC / "icon-192.png", optimize=True)
    print("  icon-192.png")

    # icon-512.png
    icon512 = emblem.resize((512, 512), Image.LANCZOS)
    icon512.save(WEB_PUBLIC / "icon-512.png", optimize=True)
    print("  icon-512.png")

    # site.webmanifest (web)
    web_manifest = {
        "name": "ELITE Student Portal",
        "short_name": "ELITE",
        "description": "SASI Institute of Technology - Department of IT",
        "start_url": "/",
        "display": "standalone",
        "background_color": "#F7F8FB",
        "theme_color": "#ED1E26",
        "icons": [
            {"src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable"},
            {"src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"},
        ],
    }
    import json
    (WEB_PUBLIC / "site.webmanifest").write_text(json.dumps(web_manifest, indent=2))
    print("  site.webmanifest")

    # Write admin public (same files, but manifest has base /admin/)
    print("\nWriting admin-client/public...")
    (ADMIN_PUBLIC / "favicon.svg").write_text(favicon_svg)
    print("  favicon.svg")
    motif_small.save(ADMIN_PUBLIC / "favicon-32.png", optimize=True)
    print("  favicon-32.png")
    apple.save(ADMIN_PUBLIC / "apple-touch-icon.png", optimize=True)
    print("  apple-touch-icon.png")
    icon192.save(ADMIN_PUBLIC / "icon-192.png", optimize=True)
    print("  icon-192.png")
    icon512.save(ADMIN_PUBLIC / "icon-512.png", optimize=True)
    print("  icon-512.png")

    admin_manifest = {**web_manifest, "start_url": "/admin/"}
    (ADMIN_PUBLIC / "site.webmanifest").write_text(json.dumps(admin_manifest, indent=2))
    print("  site.webmanifest")

    print("\nDone.")

if __name__ == "__main__":
    build()