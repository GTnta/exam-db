"""Render registered source ranges; existing small-question images stay intact."""
import json
from collections import defaultdict
from pathlib import Path
import pymupdf

ROOT = Path(__file__).resolve().parent.parent
rows = json.loads((ROOT / 'data/context-image-crops.json').read_text(encoding='utf-8'))
by_pdf = defaultdict(list)
for row in rows:
    by_pdf[row['source_pdf']].append(row)
rendered = 0
for source, assets in by_pdf.items():
    doc = pymupdf.open(ROOT / source)
    for asset in assets:
        target = (ROOT / asset['path']).resolve()
        if not target.is_relative_to(ROOT / 'data/images/context'):
            raise ValueError('Output path escapes context directory')
        if target.exists():
            continue
        page = doc[asset['pdf_page'] - 1]
        clip = pymupdf.Rect(page.rect.width * .04, page.rect.height * asset['top'],
                            page.rect.width * .96, page.rect.height * asset['bottom'])
        pix = page.get_pixmap(matrix=pymupdf.Matrix(1600/page.rect.width, 1600/page.rect.width), clip=clip)
        target.parent.mkdir(parents=True, exist_ok=True)
        pix.save(target, jpg_quality=82)
        rendered += 1
    doc.close()
    print(f'{source}: done', flush=True)
print(f'new images: {rendered}; total referenced: {len(rows)}')
