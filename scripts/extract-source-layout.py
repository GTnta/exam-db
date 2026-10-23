"""Read source PDFs into a cached layout; scanned pages are queued for Windows OCR.

Run with the bundled Python (PyMuPDF), then read-source-ocr.ps1 with Windows
PowerShell. Neither command edits the PDFs or existing question images.
"""
import json
import re
from pathlib import Path
import pymupdf

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / 'data/_tmp/source-layout'
CACHE.mkdir(parents=True, exist_ok=True)
questions = json.loads((ROOT / 'data/questions.json').read_text(encoding='utf-8-sig'))
requests = []
for pdf in sorted({q['pdf_path'] for q in questions}):
    doc = pymupdf.open(ROOT / pdf)
    for i, page in enumerate(doc):
        key = f'{Path(pdf).stem}-{i + 1}'
        target = CACHE / f'{key}.json'
        if target.exists():
            continue
        lines = []
        for block in page.get_text('dict')['blocks']:
            for line in block.get('lines', []):
                text = ''.join(span['text'] for span in line['spans'])
                x0, y0, x1, y1 = line['bbox']
                lines.append(dict(text=text, x=x0/page.rect.width, y=y0/page.rect.height,
                                  right=x1/page.rect.width, bottom=y1/page.rect.height))
        if len(re.findall(r'[ぁ-龠]', ''.join(line['text'] for line in lines))) > 25:
            target.write_text(json.dumps(dict(pdf=pdf, page=i+1, method='pdf-text', lines=lines),
                                         ensure_ascii=False), encoding='utf-8')
        else:
            image = CACHE / f'{key}.png'
            if not image.exists():
                page.get_pixmap(matrix=pymupdf.Matrix(1800/page.rect.width, 1800/page.rect.width)).save(image)
            requests.append(dict(pdf=pdf, page=i+1, image=str(image), output=str(target)))
    print(pdf, flush=True)
    doc.close()
(CACHE / 'ocr-requests.json').write_text(json.dumps(requests, ensure_ascii=False), encoding='utf-8')
print(f'OCR pages: {len(requests)}')
