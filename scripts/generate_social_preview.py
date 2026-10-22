"""Rebuild the WhatsApp/Open Graph card from the firm's existing identity assets.

Optional developer-only dependencies: pip install Pillow CairoSVG
This script is NOT part of the production build; the generated JPEG is committed.
Run from repository root: python3 scripts/generate_social_preview.py
"""
from io import BytesIO
from pathlib import Path

import cairosvg
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
MEDIA = ROOT / 'site' / 'assets' / 'media'
OUTPUT = ROOT / 'site' / 'images' / 'social-card-v2.jpg'

WIDTH, HEIGHT = 1200, 630
SPLIT = 600
INK = '#0B0C0F'
CHAMPAGNE = '#E0C58D'
WHITE = '#F5F1E8'

canvas = Image.new('RGB', (WIDTH, HEIGHT), INK)
# Source is an actual image already used on the firm's managing-partner page.
portrait = Image.open(MEDIA / 'achola-robe-4k.webp').convert('RGB')
portrait = ImageOps.fit(portrait, (WIDTH - SPLIT, HEIGHT), method=Image.Resampling.LANCZOS, centering=(0.5, 0.45))
canvas.paste(portrait, (SPLIT, 0))
draw = ImageDraw.Draw(canvas)
draw.rectangle((SPLIT - 2, 0, SPLIT + 3, HEIGHT), fill='#C7A36A')

def font(size, weight='regular'):
    files = {
        'regular': '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        'bold': '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    }
    p = Path(files[weight])
    if p.exists():
        return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()

# Use the site's own vector wordmark, preserving the exact brand identity.
svg = (MEDIA / 'logo-light.svg').read_bytes()
brand = Image.open(BytesIO(cairosvg.svg2png(bytestring=svg, output_width=558, output_height=131))).convert('RGBA')
canvas.paste(brand, (20, 178), brand)
draw.line((54, 90, 136, 90), fill=CHAMPAGNE, width=4)
draw.text((153, 77), 'WESTLANDS  ·  NAIROBI', font=font(17, 'bold'), fill=CHAMPAGNE)
draw.line((54, 350, 546, 350), fill='#34302B', width=2)
draw.text((54, 399), 'THE BAR OF EXCELLENCE', font=font(26, 'bold'), fill=CHAMPAGNE)
draw.text((54, 449), 'Efficient. Thorough. Reliable.', font=font(23), fill=WHITE)
draw.text((54, 566), 'LEGAL ADVICE  ·  REPRESENTATION', font=font(14, 'bold'), fill='#D5D0C7')
canvas.save(OUTPUT, format='JPEG', quality=88, optimize=True, progressive=True, subsampling=0)
print(f'Saved {OUTPUT} ({OUTPUT.stat().st_size:,} bytes)')
