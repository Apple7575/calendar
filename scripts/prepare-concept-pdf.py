"""Resumable, local-only scan intake. OCR is evidence, never automatic publication."""
import argparse
import hashlib
import json
import pathlib
import subprocess
import pymupdf

APP = pathlib.Path(__file__).resolve().parents[1]
OUT = APP.parent / 'output/concept-lab/n3-20261102'
SAMPLES = [4, 5, 38, 44, 180, 182, 260, 280, 340, 342]


def write(path, value):
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')
    temp.replace(path)


def main():
    args = argparse.ArgumentParser()
    args.add_argument('--input', default='C:/Users/SSAFY/Downloads/개념서.pdf')
    args.add_argument('--pages', default=','.join(map(str, SAMPLES)))
    args.add_argument('--ocr', action='store_true')
    opts = args.parse_args()
    source = pathlib.Path(opts.input)
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    doc = pymupdf.open(source)
    OUT.mkdir(parents=True, exist_ok=True)
    progress_path = OUT / 'progress.json'
    progress = json.loads(progress_path.read_text(encoding='utf8')) if progress_path.exists() else {
        'sha256': digest, 'pages': {str(n): {'status': 'pending'} for n in range(1, len(doc) + 1)}}
    if progress['sha256'] != digest:
        raise ValueError('Input changed: choose a different run directory')
    write(OUT / 'intake.json', {'input': str(source), 'sha256': digest, 'pages': len(doc),
          'textCharacters': sum(len(p.get_text()) for p in doc), 'deckId': 'n3-concept-lab',
          'title': '해커스 JLPT N3 한권합격', 'paidCalls': 0,
          'missingMaterial': ['목차의 인쇄 376쪽 이후 모의고사', '청해 원본 MP3'],
          'printedPagePolicy': 'record per visually checked page; no global inferred offset'})
    (OUT / 'pages').mkdir(exist_ok=True)
    helper = APP.parent / 'tmp/pdfs/ocr-page.ps1'
    for n in sorted(set(map(int, opts.pages.split(',')))):
        if not 1 <= n <= len(doc):
            raise ValueError(f'Page outside source: {n}')
        image = OUT / 'pages' / f'{n:03}.png'
        if not image.exists():
            doc[n - 1].get_pixmap(matrix=pymupdf.Matrix(2, 2)).save(str(image))
        page = progress['pages'][str(n)]
        page['rendered'] = True
        if opts.ocr:
            for language in ['ja', 'ko']:
                target = OUT / 'pages' / f'{n:03}-{language}.json'
                if not target.exists():
                    result = subprocess.run(['powershell', '-NoProfile', '-File', str(helper),
                        '-ImagePath', str(image), '-Language', language, '-OutputPath', str(target)],
                        capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW)
                    if result.returncode:
                        page['ocrError'] = f'{language}: exit {result.returncode}'
                        write(progress_path, progress)
                        raise RuntimeError(f'OCR failed on page {n}, {language}; progress retained')
            page['ocr'] = 'unverified'
        page.setdefault('status', 'pending')
        # A rerun may add OCR, but never promote pending or overwrite review decisions.
        write(progress_path, progress)
        print(json.dumps({'page': n, 'ocr': page.get('ocr'), 'review': page['status']}), flush=True)
    progress['summary'] = {'total': len(doc),
        'rendered': sum(bool(p.get('rendered')) for p in progress['pages'].values()),
        'ocr': sum(p.get('ocr') == 'unverified' for p in progress['pages'].values()),
        'reviewed': sum(p['status'] == 'model_visual_reviewed' for p in progress['pages'].values()),
        'sampleReviewed': sum(p['status'] == 'sample_reviewed' for p in progress['pages'].values()),
        'paidCalls': 0}
    write(progress_path, progress)


if __name__ == '__main__':
    main()
