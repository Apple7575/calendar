import argparse, concurrent.futures, hashlib, json, pathlib, re, subprocess, sys

root = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root / 'calendar/.expo/audio-tools'))
import imageio_ffmpeg

folder = root / 'output/corpus-audio'
parser = argparse.ArgumentParser()
parser.add_argument('--max-new', type=int, default=5)
args = parser.parse_args()
manifest_file = folder / 'manifest.json'
manifest = json.loads(manifest_file.read_text(encoding='utf-8'))
if manifest.get('trimAlgorithm') == 'voice-window-v2':
    print(json.dumps({'alreadyTrimmed': True, 'audioFiles': len(manifest['jobs'])})); sys.exit(0)
if (folder / 'manifest.before-trim.json').exists(): manifest = json.loads((folder / 'manifest.before-trim.json').read_text(encoding='utf-8'))
audit_file = folder / 'file-audit.before-trim.json'
audit = json.loads(audit_file.read_text(encoding='utf-8'))
if audit['errors'] or audit['checked'] != manifest['planned']:
    raise RuntimeError('All files must pass the original audio audit before trimming')
metrics = {r['file']: r for r in audit['results']}
progress_file = folder / 'trim-progress-v2.jsonl'
progress = [json.loads(line) for line in progress_file.read_text(encoding='utf-8').splitlines() if line.strip()] if progress_file.exists() else []
done = {r['sourceHash']: r for r in progress}
todo = [j for j in manifest['jobs'] if j['audioHash'] not in done][:args.max_new]
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()

def trim(job):
    source = (folder / job['file']).resolve()
    if not source.is_relative_to(folder.resolve()) or not re.fullmatch(r'[A-Za-z0-9_-]+', job['noteId']):
        raise RuntimeError('Unexpected audio path')
    if hashlib.sha256(source.read_bytes()).hexdigest() != job['audioHash']:
        raise RuntimeError('Source audio hash mismatch')
    leading = metrics[job['file']].get('voiceLeadingSilence')
    if leading is None: raise RuntimeError('Leading-silence measurement missing')
    start = max(0.0, leading - 0.020)
    if start < 0.005:
        return {'sourceHash': job['audioHash'], 'file': job['file'], 'audioHash': job['audioHash'], 'bytes': job['bytes'], 'trimSeconds': 0}
    temporary = folder / 'audio' / f"{job['noteId']}-{job['kind']}-trim-tmp.mp3"
    subprocess.run([ffmpeg, '-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-i', str(source), '-af', f'atrim=start={start:.6f},asetpts=PTS-STARTPTS', '-c:a', 'libmp3lame', '-b:a', '128k', '-write_xing', '1', '-map_metadata', '-1', '-threads', '1', str(temporary)], check=True, capture_output=True, creationflags=subprocess.CREATE_NO_WINDOW)
    audio = temporary.read_bytes(); digest = hashlib.sha256(audio).hexdigest()
    name = f"{job['noteId']}-{job['kind']}-fast-{digest[:12]}.mp3"
    destination = folder / 'audio' / name
    destination.write_bytes(audio); temporary.unlink()
    return {'sourceHash': job['audioHash'], 'file': 'audio/' + name, 'audioHash': digest, 'bytes': len(audio), 'trimSeconds': start}

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    for i, row in enumerate(pool.map(trim, todo), 1):
        with progress_file.open('a', encoding='utf-8') as stream: stream.write(json.dumps(row) + '\n')
        done[row['sourceHash']] = row
        if i % 100 == 0: print(json.dumps({'trimmedThisRun': i, 'prepared': len(done), 'total': manifest['planned']}), flush=True)

if all(j['audioHash'] in done for j in manifest['jobs']):
    backup = folder / 'manifest.before-trim.json'
    if not backup.exists(): backup.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    audit_backup = folder / 'file-audit.before-trim.json'
    if not audit_backup.exists(): audit_backup.write_text(json.dumps(audit, ensure_ascii=False), encoding='utf-8')
    for job in manifest['jobs']:
        row = done[job['audioHash']]
        job.update(untrimmedFile=job['file'], untrimmedAudioHash=job['audioHash'], file=row['file'], audioHash=row['audioHash'], bytes=row['bytes'], leadingTrimSeconds=row['trimSeconds'])
    manifest['trimmed'] = True
    manifest['trimAlgorithm'] = 'voice-window-v2'
    manifest_file.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'prepared': len(done), 'planned': manifest['planned'], 'manifestUpdated': manifest.get('trimmed', False)}), flush=True)
