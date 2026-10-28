# Nivo premium logo

এই লোগো built-in ImageGen দিয়ে তৈরি মূল raster artwork। Python স্ক্রিপ্ট শুধু একই ছবির প্রয়োজনীয় আকার এবং PNG/ICO/ICNS ফরম্যাট রপ্তানি করে; লোগোর আকৃতি আঁকে না।

- মূল ছবি: `src/assets/brand/nivo-logo.png` — 1254 × 1254, RGBA, বাইরের অংশ স্বচ্ছ।
- মূল রঙিন artwork-এর সংরক্ষিত কপি: `src/assets/brand/nivo-logo-color.png` — 1254 × 1254, RGBA।
- বর্তমান artwork-এ শুধু silver folded N আছে; rounded-square tile সরিয়ে transparent background রাখা হয়েছে। আগের monochrome tile সংস্করণ `src/assets/brand/nivo-logo-monochrome-tile.png`-এ সংরক্ষিত।
- অ্যাপের হালকা UI asset: `src/assets/brand/nivo-mark.png` — 256 × 256।
- অ্যাপ ও ইনস্টলারের সব platform icon: `build/icon.*`, `build/icons/`, installer/uninstaller ICO।
- পুনরায় export: `python3 scripts/generate-brand-icons.py`।

## ব্যবহৃত prompt

> Use case: logo-brand. Create the FINAL high-resolution premium app icon for Nivo, a refined offline small-business accounting application. One single centered standalone symbol, no text, no wordmark, no sheet of variations. A bespoke elegant capital N formed from one continuous folded satin-metal ribbon, balanced softened geometry, beautifully resolved negative space, restrained emerald-teal to pale mint highlights, sophisticated midnight-navy inset shading. Subtle dimensional material and controlled studio illumination, clean crisp silhouette, feels like a luxury modern productivity brand, not a generic banking badge. The N must be immediately readable at small app-icon sizes. Place this N on an exquisite dark petrol-navy rounded-square app tile with very subtle soft gradient, delicate edge highlight, perfectly frontal and symmetrical tile silhouette. Tile occupies 90% of square canvas, N occupies 60% of tile; no exaggerated extrusion or perspective, no decorative surrounding shapes, no coins/chart/currency/shield motifs, no watermark, no letters other than the symbolic N. Outside the rounded square is genuinely transparent alpha, no cast shadow outside the tile. Deliver a high-resolution square production image, ideally 2048x2048 or higher, fine antialiasing, beautiful at 32px as well as full size. Palette harmonizes with #162C35 #147D78 #B8E4D9. This is original artwork, not a modification of any existing image.

টুলের প্রকৃত আউটপুট 1254 × 1254। মূল ছবিকে কৃত্রিমভাবে বড় করা হয়নি।

## Monochrome edit

মূল রঙিন লোগোটি built-in ImageGen-এর edit mode-এ reference হিসেবে ব্যবহার করা হয়েছে। Prompt:

> Use case: logo-brand. Asset type: production app icon. Image 1 is the exact edit target. Keep its Nivo folded ribbon N and rounded square tile exactly as shown: identical silhouette, geometry, composition, scale, folds, highlights, framing, and transparent outer padding. This is a strict monochrome conversion only. Every visible RGB color must be neutral gray (R=G=B): pure black through charcoal, silver, and white, with no tint whatsoever. Preserve the same bright silver ribbon on a black tile, premium dimensional satin-metal shading, subtle neutral highlights, and small-size readability. Preserve true transparency outside the rounded tile. No cyan, blue, teal, green, mint, navy, or any colored pixels; no text or new details; do not redesign.

আউটপুট 1254 × 1254 RGBA, বাইরের অংশের transparency-সহ। `nivo-logo-color.png` আগের generated color artwork অক্ষত রাখে।

## Transparent N edit

Built-in ImageGen edit, 2026-10-28. Final source: `src/assets/brand/nivo-logo.png`; generated RGBA alpha preserved. Prompt:

> Use case: background-extraction. Image 1 is the exact edit target, the existing Nivo logo. Remove ONLY the entire black rounded-square tile, its rim, and all background/shadow outside the silver N. Output ONLY the identical silver monochrome folded ribbon capital N as a clean cutout on genuinely transparent alpha, including transparent negative spaces between its strokes. Preserve the N exactly: same silhouette, ribbon folds, silver satin texture, highlights, dark inner ribbon surfaces, orientation, proportions and placement. Do not redesign, redraw stylistically, recolor, add anything, or flatten the N. No tile, no plate, no border, no backdrop, no extra letters, no cast shadow outside N. High resolution square PNG with transparent background.
