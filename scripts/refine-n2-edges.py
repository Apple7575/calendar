"""Refine codec/noise edge outliers using independent browser decode measurements."""
import array,concurrent.futures,hashlib,json,pathlib,subprocess,sys
ROOT=pathlib.Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'calendar/.expo/audio-tools'))
import imageio_ffmpeg
F=ROOT/'output/vocabulary/n2-20261102/audio';mf=F/'manifest.json';m=json.loads(mf.read_text(encoding='utf8'));audit=json.loads((F/'file-audit.json').read_text(encoding='utf8'))
if audit['errors'] or audit['checked']!=m['planned']:raise RuntimeError('Independent audit required')
backup=F/'manifest.before-edges-refinement.json'
if not backup.exists():backup.write_bytes(mf.read_bytes())
metrics={r['audioHash']:r for r in audit['results']};ffmpeg=imageio_ffmpeg.get_ffmpeg_exe();rate=24000
def run(args,data=None):return subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-nostdin',*args],input=data,capture_output=True,check=True,creationflags=subprocess.CREATE_NO_WINDOW).stdout
conservative='--conservative' in sys.argv
todo=[j for j in m['jobs'] if (metrics[j['audioHash']]['trailingSilence']>.15 or metrics[j['audioHash']]['leadingSilence']>.10) if conservative] if conservative else [j for j in m['jobs'] if metrics[j['audioHash']]['trailingSilence']>.085 or metrics[j['audioHash']]['leadingSilence']>.05 or metrics[j['audioHash']]['voiceLeadingSilence']>.05]
def refine(j):
 r=metrics[j['audioHash']];source=F/j['file'];samples=array.array('f');samples.frombytes(run(['-i',str(source),'-f','f32le','-ac','1','-ar',str(rate),'-']))
 leading=r['leadingSilence'] if conservative else max(r['leadingSilence'],r['voiceLeadingSilence'])
 start=max(0,int((leading-.020)*rate));end=min(len(samples),int((len(samples)/rate-r['trailingSilence']+.040)*rate))
 if end-start<rate*.1:raise RuntimeError('Unsafe voice window')
 temporary=F/'audio'/f"{j['noteId']}-{j['kind']}-edge-refine-tmp.mp3"
 run(['-y','-f','f32le','-ar',str(rate),'-ac','1','-i','pipe:0','-c:a','libmp3lame','-b:a','128k','-write_xing','1','-map_metadata','-1','-threads','1',str(temporary)],samples[start:end].tobytes())
 data=temporary.read_bytes();temporary.unlink();digest=hashlib.sha256(data).hexdigest();file=f"audio/{j['noteId']}-{j['kind']}-tight-{digest[:12]}.mp3";(F/file).write_bytes(data)
 return j,{'file':file,'audioHash':digest,'bytes':len(data),'previousAudioFiles':list(dict.fromkeys([*j.get('previousAudioFiles',[]),j['file']])),'refineEdges':{'lead':start/rate,'tail':(len(samples)-end)/rate}}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for i,(job,update) in enumerate(pool.map(refine,todo),1):
  job.update(update)
  if i%200==0:print(json.dumps({'refined':i,'candidates':len(todo)}),flush=True)
mf.write_text(json.dumps(m,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps({'refined':len(todo),'originalsPreserved':True}),flush=True)
