"""Local OCR evidence for source-grounding; never promotes a page to reviewed."""
import concurrent.futures
import json
import pathlib
import subprocess
APP=pathlib.Path(__file__).resolve().parents[1]
OUT=APP.parent/'output/concept-lab/n3-20261102'
HELPER=APP.parent/'tmp/pdfs/ocr-page.ps1'
jobs=[(n,language) for n in range(166,375) for language in ['ja','ko'] if not (OUT/'pages'/f'{n:03}-{language}.json').exists()]
def run(job):
 n,language=job
 result=subprocess.run(['powershell','-NoProfile','-File',str(HELPER),'-ImagePath',str(OUT/'pages'/f'{n:03}.png'),'-Language',language,'-OutputPath',str(OUT/'pages'/f'{n:03}-{language}.json')],capture_output=True,creationflags=subprocess.CREATE_NO_WINDOW)
 if result.returncode: raise RuntimeError(f'OCR {n} {language}: exit {result.returncode}')
 return n,language
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for index,result in enumerate(pool.map(run,jobs),1):
  if index%20==0 or index==len(jobs): print(json.dumps({'ocrJobsComplete':index,'remainingJobsAtStart':len(jobs),'last':result}),flush=True)
