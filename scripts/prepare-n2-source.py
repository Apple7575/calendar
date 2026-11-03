"""Render and locally OCR the supplied N2 word pages without changing N3 or calling paid APIs."""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys

import pymupdf

APP = Path(__file__).resolve().parents[1]
WORKSPACE = APP.parent
SOURCE = Path("C:/Users/SSAFY/Downloads/JLPT_N2빈출단어문형.pdf")
RUN = "n2-20261102"
IMAGES = WORKSPACE / "tmp/pdfs" / RUN
OUTPUT = WORKSPACE / "output/vocabulary" / RUN


def digest(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def write_json(file, value):
    file.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def main():
    IMAGES.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    document = pymupdf.open(SOURCE)
    if len(document) != 80:
        raise ValueError("Reinspect source: expected the visually reviewed 80-page PDF")
    source_hash = digest(SOURCE)
    if source_hash != "c96f784845c97f5e4ae5bc2b9a2154c20d8bea9eb7c01a5aed38e908b2cd1366":
        raise ValueError("Source PDF differs from the inspected original")
    copy = IMAGES / SOURCE.name
    if copy.exists() and digest(copy) != source_hash:
        raise ValueError("Existing source copy differs; refusing to overwrite")
    if not copy.exists():
        shutil.copy2(SOURCE, copy)
    protection = OUTPUT / "n3-before.json"
    if not protection.exists():
        files = sorted((APP / "assets/decks").rglob("*"))
        write_json(protection, {str(f.relative_to(APP)): digest(f) for f in files if f.is_file()})
    protected = json.loads(protection.read_text(encoding="utf-8"))
    for relative, expected in protected.items():
        if digest(APP / relative) != expected:
            raise ValueError(f"Existing deck asset changed: {relative}")
    intake_file = OUTPUT / "intake.json"
    intake = json.loads(intake_file.read_text(encoding="utf-8"))
    intake.update({
        "runId": RUN, "deckId": "hk-n2-vocabulary", "deckName": "JLPT N2 단어장",
        "noteIdPrefix": "n2_hk_", "sourceHash": source_hash,
        "includedPdfPages": list(range(2, 44)), "printedPageOffset": 0,
        "excluded": {"cover": [1], "grammar": [44, 75], "memo": [76, 80]},
        "sourceReviewed": False, "audioGenerated": False, "published": False,
    })
    intake.setdefault("paidApiBudget", {"status": "awaiting-user-input", "spentUSD": 0})
    write_json(intake_file, intake)
    for number in range(2, 44):
        image = IMAGES / f"word-page-{number:03}.png"
        if not image.exists():
            document[number - 1].get_pixmap(matrix=pymupdf.Matrix(3, 3)).save(str(image))
    ocr_script = WORKSPACE / "tmp/pdfs/ocr-page.ps1"
    if not ocr_script.exists():
        raise FileNotFoundError("Existing local Windows OCR helper is unavailable")
    jobs = [(page, language) for page in range(2, 44) for language in ("ja", "ko")]

    def recognize(job):
        page, language = job
        target = IMAGES / f"word-page-{page:03}-{language}.json"
        if not target.exists():
            result = subprocess.run([
                "powershell", "-NoProfile", "-File", str(ocr_script),
                "-ImagePath", str(IMAGES / f"word-page-{page:03}.png"),
                "-Language", language, "-OutputPath", str(target),
            ], capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW)
            if result.returncode:
                raise RuntimeError(f"Local OCR failed on page {page}, {language}: exit {result.returncode}")
        rows = json.loads(target.read_text(encoding="utf-8-sig"))
        return {"pdfPage": page, "language": language, "lines": len(rows), "status": "UNVERIFIED_OCR"}

    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for result in pool.map(recognize, jobs):
            results.append(result)
            if len(results) % 12 == 0:
                print(json.dumps({"localOcrCompleted": len(results), "total": len(jobs)}), flush=True)
    write_json(OUTPUT / "local-ocr-index.json", results)
    for relative, expected in protected.items():
        if digest(APP / relative) != expected:
            raise ValueError(f"Existing deck asset changed: {relative}")
    print(json.dumps({"wordPages": 42, "ocrFiles": len(results), "paidRequests": 0,
                      "existingDeckAssetsUnchanged": True, "learningDeckCreated": False}), flush=True)


if __name__ == "__main__":
    main()
