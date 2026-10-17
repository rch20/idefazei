#!/usr/bin/env python3
"""Rasterize only the approved blank handouts; never change the original PDFs."""
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
documents = root / 'client/src/documents/foundation'
output = documents / 'handout-previews'
output.mkdir(exist_ok=True)
approved = {
    'simplificado': (2, 'b70c090a256f917dd1c14df5a0bad9463b11a767cf643e46f6d52bab6e7b5e8a'),
    'completo': (6, 'a6a4c2abc2063ce6f021411222d659e684df87e9e3c5f35740f8df3acf66d15c'),
}
manifest = {}
for label, (pages, checksum) in approved.items():
    pdf = documents / f'gabarito-fundamentos-{label}.pdf'
    assert hashlib.sha256(pdf.read_bytes()).hexdigest() == checksum, 'PDF_SOURCE_DRIFT'
    with tempfile.TemporaryDirectory(prefix='foundation-handout-preview-') as tmp:
        prefix = Path(tmp) / 'page'
        result = subprocess.run(['pdftoppm', '-r', '150', '-png', str(pdf), str(prefix)], capture_output=True)
        assert result.returncode == 0, 'PDF_RENDER_FAILED'
        sources = sorted(Path(tmp).glob('page-*.png'))
        assert len(sources) == pages, 'PAGE_COUNT_MISMATCH'
        rendered = []
        for index, source in enumerate(sources, 1):
            target = output / f'{label}-{index}.webp'
            with Image.open(source) as image:
                image.convert('RGB').save(target, format='WEBP', quality=88, method=6)
                size = image.size
            rendered.append({'file': target.name, 'width': size[0], 'height': size[1], 'bytes': target.stat().st_size, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})
        manifest[label] = {'pdfSha256': checksum, 'pages': rendered}
(output / 'source-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'documents': len(manifest), 'pages': sum(len(x['pages']) for x in manifest.values()), 'bytes': sum(p['bytes'] for x in manifest.values() for p in x['pages'])}))
