"""Non-destructive, resumable leading/trailing silence trim for BOTH word and sentence recordings."""
import argparse, concurrent.futures, hashlib, json, pathlib, subprocess, sys, array, math
ROOT=pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'calendar/.expo/audio-tools'))
import imageio_ffmpeg
P=argparse.ArgumentParser();P.add_argument('--max-new',type=int,default=10);args=P.parse_args()
F=ROOT/'output/vocabulary/n2-20261102/audio';mf=F/'manifest.json';backup=F/'manifest.before-edges-v3.json'
if not backup.exists():backup.write_bytes(mf.read_bytes())
source=json.loads(backup.read_text(encoding='utf8'));progress=F/'edge-trim-v3b.jsonl'
rows=[json.loads(s) for s in progress.read_text(encoding='utf8').splitlines() if s.strip()] if progress.exists() else []
done={r['sourceHash']:r for r in rows};ffmpeg=imageio_ffmpeg.get_ffmpeg_exe();rate=24000
def command(cmd,body=None):
 return subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-nostdin',*cmd],input=body,capture_output=True,check=True,creationflags=subprocess.CREATE_NO_WINDOW).stdout
def decode(path):
 samples=array.array('f');samples.frombytes(command(['-i',str(path),'-f','f32le','-ac','1','-ar',str(rate),'-']));return samples
def edges(samples):
 peak=max(abs(x) for x in samples);threshold=max(.00065,min(.0015,peak*.004));first=next((i for i,x in enumerate(samples) if abs(x)>=threshold),-1);last=next((len(samples)-1-i for i,x in enumerate(reversed(samples)) if abs(x)>=threshold),-1)
 if first<0 or peak<.01:raise RuntimeError('silent recording')
 return first/rate,(len(samples)-1-last)/rate,peak
def trim(j):
 path=(F/j['file']).resolve()
 if not path.is_relative_to(F.resolve()) or hashlib.sha256(path.read_bytes()).hexdigest()!=j['audioHash']:raise RuntimeError('source path/hash mismatch')
 samples=decode(path);lead,tail,peak=edges(samples);start=max(0,int((lead-.020)*rate));end=min(len(samples),int((len(samples)/rate-tail+.040)*rate));removed=(start+len(samples)-end)/rate
 if end-start<rate*.1:raise RuntimeError('voice window too short')
 if removed<.015:newfile=j['file'];data=path.read_bytes();out=samples
 else:
  temporary=F/'audio'/f"{j['noteId']}-{j['kind']}-edges-tmp.mp3"
  command(['-y','-f','f32le','-ar',str(rate),'-ac','1','-i','pipe:0','-c:a','libmp3lame','-b:a','128k','-write_xing','1','-map_metadata','-1','-threads','1',str(temporary)],samples[start:end].tobytes())
  data=temporary.read_bytes();temporary.unlink()
  digest=hashlib.sha256(data).hexdigest();newfile=f"audio/{j['noteId']}-{j['kind']}-edges-{digest[:12]}.mp3";(F/newfile).write_bytes(data);out=decode(F/newfile)
 leading,trailing,newpeak=edges(out)
 # MP3 codec padding is measured rather than treated as speech. Retain quiet consonants/breath release.
 if newpeak<.01 or len(out)/rate<.1:raise RuntimeError('invalid trimmed recording')
 return {'sourceHash':j['audioHash'],'noteId':j['noteId'],'kind':j['kind'],'previousFile':j['file'],'file':newfile,'audioHash':hashlib.sha256(data).hexdigest(),'bytes':len(data),'trimLead':start/rate,'trimTail':(len(samples)-end)/rate,'duration':len(out)/rate,'sourceDuration':len(samples)/rate,'leadingSilence':leading,'trailingSilence':trailing,'peak':newpeak,'rms':math.sqrt(sum(x*x for x in out)/len(out))}
todo=[j for j in source['jobs'] if j['audioHash'] not in done][:args.max_new]
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for i,row in enumerate(pool.map(trim,todo),1):
  with progress.open('a',encoding='utf8') as f:f.write(json.dumps(row)+'\n')
  done[row['sourceHash']]=row
  if i%100==0:print(json.dumps({'prepared':len(done),'planned':source['planned']}),flush=True)
complete=all(j['audioHash'] in done for j in source['jobs'])
if complete:
 current=json.loads(mf.read_text(encoding='utf8'))
 if current.get('trimAlgorithm')!='voice-edges-v3':
  for j in source['jobs']:
   row=done[j['audioHash']];j['previousAudioFiles']=list(dict.fromkeys([*j.get('previousAudioFiles',[]),j['file'],j.get('untrimmedFile',j['file'])]));j.update(file=row['file'],audioHash=row['audioHash'],bytes=row['bytes'],edgeTrim={'lead':row['trimLead'],'tail':row['trimTail'],'sourceHash':row['sourceHash']})
  source.update(trimmed=True,trimAlgorithm='voice-edges-v3');mf.write_text(json.dumps(source,ensure_ascii=False,indent=2),encoding='utf8')
 audit={'checked':len(source['jobs']),'errors':[],'results':[{'noteId':r['noteId'],'kind':r['kind'],'file':r['file'],'audioHash':r['audioHash'],'duration':r['duration'],'peak':r['peak'],'rms':r['rms'],'leadingSilence':r['leadingSilence'],'voiceLeadingSilence':r['leadingSilence'],'trailingSilence':r['trailingSilence']} for r in done.values()]}
 (F/'file-audit.edges-v3.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf8')
 (F/'file-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'prepared':len(done),'planned':source['planned'],'complete':complete,'originalsPreserved':True}),flush=True)
