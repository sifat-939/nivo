#!/usr/bin/env python3
"""Export platform icons from Nivo's generated premium logo; never redraw it."""
from pathlib import Path
import struct
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'src/assets/brand/nivo-logo.png'


def draw_icon(size: int) -> Image.Image:
    with Image.open(SOURCE) as source:
        return source.convert('RGBA').resize((size, size), Image.Resampling.LANCZOS)


def write_icns(path: Path, image: Image.Image) -> None:
    # Modern ICNS PNG chunks; preserves standard Retina and legacy macOS sizes.
    entries = [(b'icp4', 16), (b'icp5', 32), (b'icp6', 64),
               (b'ic07', 128), (b'ic08', 256), (b'ic09', 512), (b'ic10', 1024)]
    chunks = []
    for tag, size in entries:
        png = image.resize((size, size), Image.Resampling.LANCZOS)
        data = png.convert('RGBA')
        import io
        stream = io.BytesIO()
        data.save(stream, format='PNG', optimize=True)
        payload = stream.getvalue()
        chunks.append(tag + struct.pack('>I', len(payload) + 8) + payload)
    body = b''.join(chunks)
    path.write_bytes(b'icns' + struct.pack('>I', len(body) + 8) + body)


def main() -> None:
    (ROOT / 'build/icons').mkdir(parents=True, exist_ok=True)
    for size in (16, 32, 48, 64, 128, 256, 512):
        draw_icon(size).save(ROOT / f'build/icons/{size}x{size}.png', optimize=True)
    with Image.open(SOURCE) as source:
        master = source.convert('RGBA')
    draw_icon(256).save(ROOT / 'src/assets/brand/nivo-mark.png', optimize=True)
    master.save(ROOT / 'build/icon.png', optimize=True)
    master.resize((256, 256), Image.Resampling.LANCZOS).save(ROOT / 'build/icon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    small_icon = master.resize((256, 256), Image.Resampling.LANCZOS)
    for name in ('installerIcon.ico', 'uninstallerIcon.ico'):
        small_icon.save(ROOT / f'build/{name}', format='ICO', sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    write_icns(ROOT / 'build/icon.icns', master)


if __name__ == '__main__':
    main()
