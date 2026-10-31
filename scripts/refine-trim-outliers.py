import concurrent.futures, hashlib, json, pathlib, subprocess, sys
root=pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0,str(root/'calendar/.expo/audio-tools'))
import imageio_ffmpeg
folder=root/'output/corpus-audio'
manifest_file=folder/'manifest.json'
m=json.loads(manifest_file.read_text(encoding='utf-8'))
audit=json.loads((folder/'file-audit.json').read_text(encoding='utf-8'))
if audit['errors']:raise RuntimeError('Audio audit failed')
metrics={r['file']:r for r in audit['results']}
original=json.loads((folder/'manifest.before-trim.json').read_text(encoding='utf-8'))
original_jobs={(j['noteId'],j['kind']):j for j in original['jobs']}
todo=[j for j in m['jobs'] if metrics[j['file']]['voiceLeadingSilence']>.05]
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
def refine(j):
    base=original_jobs[(j['noteId'],j['kind'])]
    start=j.get('leadingTrimSeconds',0)+metrics[j['file']]['voiceLeadingSilence']-.02
    temporary=folder/'audio'/f"{j['noteId']}-{j['kind']}-refine-tmp.mp3"
    subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-nostdin','-y','-i',str(folder/base['file']),'-af',f'atrim=start={start:.6f},asetpts=PTS-STARTPTS','-c:a','libmp3lame','-b:a','128k','-write_xing','1','-map_metadata','-1','-threads','1',str(temporary)],check=True,capture_output=True,creationflags=subprocess.CREATE_NO_WINDOW)
    audio=temporary.read_bytes();digest=hashlib.sha256(audio).hexdigest();name=f"{j['noteId']}-{j['kind']}-fast-{digest[:12]}.mp3"
    (folder/'audio'/name).write_bytes(audio);temporary.unlink()
    return j,{'file':'audio/'+name,'audioHash':digest,'bytes':len(audio),'leadingTrimSeconds':start}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    for job,update in pool.map(refine,todo):job.update(update)
m['trimRefinementPasses']=m.get('trimRefinementPasses',0)+1
m['refinedAudio']=[{'noteId':j['noteId'],'kind':j['kind'],'file':j['file']} for j in todo]
manifest_file.write_text(json.dumps(m,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'refined':len(todo),'originalsPreserved':True}))
