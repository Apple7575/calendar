// PC-only utility. No API key is written to disk or included in the mobile bundle.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const production = process.argv.includes('--cedar-decks');
const singleWordFix = process.argv.includes('--single-word-v2');
const out = path.join(root, production ? 'output/deck-audio' : 'output/tts-comparison');
const manifestPath = path.join(out, 'manifest.json');
const ledgerPath = path.join(out, 'attempts.jsonl');
const args = new Set(process.argv.slice(2));
const generate = args.has('--generate');
const smoke = args.has('--smoke');
const limitArg = process.argv.find(a => a.startsWith('--max-new='));
const maxNew = smoke ? 1 : limitArg ? Number(limitArg.split('=')[1]) : 120;
const cap = production ? 194 : 120;
if (!Number.isInteger(maxNew) || maxNew < 1 || maxNew > cap) throw Error(`max-new must be 1..${cap}`);
const key = process.env.OPENAI_API_KEY?.trim();
const model = 'gpt-4o-mini-tts-2025-12-15';
const voices = production ? ['cedar'] : ['coral', 'marin', 'cedar'];
const targets = ['改札','価格','各駅','血液型','方角','延期','気温','機械','外科','月末','上下','睡眠','数字','頭痛','連続','洗濯','温暖だ','停電','楽器','出身'];
const decks = ['n3-reading-01.json', 'n3-reading-p003.json'].map(name =>
  JSON.parse(fs.readFileSync(path.join(root, 'output/decks', name), 'utf8')));
const allNotes = decks.flatMap(d => d.notes);
const notes = production ? allNotes : targets.map(word => {
  const note = decks.flatMap(d => d.notes).find(n => n.Word === word);
  if (!note?.Word_Reading || !note.Sentence || !note.Sentence_Meaning) throw Error(`Incomplete sample: ${word}`);
  return note;
});
const previous = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
if(singleWordFix && fs.existsSync(manifestPath) && !fs.existsSync(path.join(out,'manifest.word-v1.backup.json'))) fs.copyFileSync(manifestPath,path.join(out,'manifest.word-v1.backup.json'));
const comparisonRoot = path.join(root, 'output/tts-comparison');
const comparison = production ? JSON.parse(fs.readFileSync(path.join(comparisonRoot,'manifest.json'),'utf8')) : {};
const jobs = notes.flatMap(note => voices.flatMap((voice, voiceIndex) => ['word','sentence'].map(kind => {
  const input = kind === 'word' ? singleWordFix ? note.Word_Reading.replace(/\s/g,'') : note.Word : note.Sentence;
  const instructions = singleWordFix && kind === 'word' ? 'Speak this single Japanese vocabulary item exactly once in natural standard Japanese. Do not repeat, spell, explain, or add any other words. No introduction. Neutral, clear delivery.' : `日本語の語彙学習用音声です。標準的な日本語で、落ち着いた自然な声ではっきり読んでください。` +
    `本文だけを読み、説明や前置き、読み方の紹介を追加しないでください。` +
    `本文中の「${note.Word}」は「${note.Word_Reading}」と読みます。` +
    (kind === 'word' ? '単語を一回だけ読んでください。' : '単語ごとに区切らず、文全体を自然な抑揚で一回だけ読んでください。');
  if ([...input].length > 120 || [...instructions].length > 500) throw Error('Sample input size cap exceeded');
  const payload = { model, voice, input, instructions, response_format: 'mp3', speed: 1 };
  const hash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  const id = `${note.ID}-${kind}-${voice}`;
  const file = `audio/${voice}/${note.ID}-${kind}-${hash.slice(0,12)}.mp3`;
  const old = previous.jobs?.find(j => j.id === id && j.hash === hash) ?? comparison.jobs?.find(j => j.id === id && j.hash === hash);
  const previousById = previous.jobs?.find(j => j.id === id);
  const legacyAudioNames = [...new Set([...(previousById?.legacyAudioNames ?? []), ...(previousById && previousById.hash !== hash ? [path.basename(previousById.file)] : [])])];
  if (production && old?.status === 'ready' && !fs.existsSync(path.join(out,file))) {
    const source = path.join(comparisonRoot, old.file);
    if(fs.existsSync(source) && crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex') === old.audioHash) {
      fs.mkdirSync(path.dirname(path.join(out,file)),{recursive:true});
      fs.copyFileSync(source,path.join(out,file));
    }
  }
  const ready = old?.status === 'ready' && fs.existsSync(path.join(out, file)) &&
    fs.statSync(path.join(out, file)).size === old.bytes &&
    crypto.createHash('sha256').update(fs.readFileSync(path.join(out,file))).digest('hex') === old.audioHash;
  return { id, noteId: note.ID, word: note.Word, reading: note.Word_Reading,
    meaning: note.Word_Meaning, sentence: note.Sentence, sentenceReading: note.Sentence_Reading,
    sentenceMeaning: note.Sentence_Meaning, kind, voice, label: String.fromCharCode(65+voiceIndex),
    hash, file, payload, legacyAudioNames, status: ready ? 'ready' : 'pending',
    ...(ready ? {bytes:old.bytes,audioHash:old.audioHash,requestId:old.requestId,generatedAt:old.generatedAt} : {}) };
})));
if (jobs.length !== cap || new Set(jobs.map(j => j.id)).size !== cap) throw Error('Unexpected generation plan');
fs.mkdirSync(out, { recursive: true });

const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function save() {
  const manifest = {schema:production?'routine.deck-audio.v1':'routine.tts-comparison.v1', model, notes:notes.length, voices,
    organizationSelection:'Uses the project-scoped API key; no old Mee project ID is supplied.',
    charge:'Actual billed amount is not available from the speech response. Check Personal usage dashboard.',
    generated:jobs.filter(j=>j.status==='ready').length, planned:jobs.length, jobs};
  fs.writeFileSync(`${manifestPath}.tmp`, JSON.stringify(manifest,null,2));
  fs.renameSync(`${manifestPath}.tmp`, manifestPath);
  const rows = notes.map((n,index) => `<section><h2>${index+1}. ${escape(n.Word)} <small>${escape(n.Word_Reading)} · ${escape(n.Word_Meaning)}</small></h2>
    <p lang="ja">${escape(n.Sentence)}</p><p class="muted">${escape(n.Sentence_Meaning)}</p>
    <div class="voices">${voices.map((voice,i)=>`<div><h3>목소리 ${String.fromCharCode(65+i)}</h3>${['word','sentence'].map(kind=>{
      const j=jobs.find(j=>j.noteId===n.ID&&j.voice===voice&&j.kind===kind);
      return `<label>${kind==='word'?'단어':'예문'}</label>${j.status==='ready'?`<audio controls preload="none" src="${escape(j.file)}"></audio>`:`<p class="muted">${j.status==='failed'?'생성 실패':'아직 생성하지 않았어요'}</p>`}`;
    }).join('')}</div>`).join('')}</div>
    <label>선호 목소리 <select data-note="${escape(n.ID)}"><option value="">선택 안 함</option><option>A</option><option>B</option><option>C</option></select></label>
    <input data-memo="${escape(n.ID)}" placeholder="오독·억양·추가된 말 등 메모" aria-label="${escape(n.Word)} 검토 메모"></section>`).join('');
  fs.writeFileSync(path.join(out,'index.html'), `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>일본어 음성 비교</title>
    <style>body{font:16px system-ui;margin:0;background:#f2f4f6;color:#191f28}main{max-width:1000px;margin:auto;padding:24px}section{background:white;border-radius:20px;padding:24px;margin:20px 0}h1{font-size:28px}h2{font-size:25px}small{font-size:16px;font-weight:400;color:#6b7684}.muted{color:#6b7684}.voices{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}audio{display:block;width:100%;margin:8px 0 20px}label{display:block}input,select,button{font:inherit;padding:10px;border:1px solid #d1d6db;border-radius:10px}input{box-sizing:border-box;width:100%;margin-top:12px}button{background:#3182f6;color:white;border:0;cursor:pointer}@media(max-width:650px){.voices{grid-template-columns:1fr}main{padding:16px}section{padding:18px}}</style>
    <main><h1>일본어 단어·예문 음성 비교</h1><p>AI로 생성한 비교용 음성 · ${manifest.generated}/${jobs.length}개 생성</p><p>읽기 정확도 → 억양 → 반복 청취 편안함 순서로 들어보세요. 아직 전체 덱의 음성을 만든 것은 아니에요.</p>
    <details><summary>생성 설정 보기</summary><p>${model} · A: coral / B: marin / C: cedar · 보통 속도 · 단어 읽기는 지시문으로 제공하며 적용 여부는 청취로 확인해야 해요.</p></details>
    <p><button id="export">검토 결과 저장</button></p>${rows}</main><script>
    const storageKey='routine-tts-review-v1';let saved={};try{saved=JSON.parse(localStorage.getItem(storageKey)||'{}')}catch{}
    document.querySelectorAll('[data-note],[data-memo]').forEach(el=>{const id=el.dataset.note||el.dataset.memo;const field=el.dataset.note?'voice':'memo';el.value=saved[id]?.[field]||'';el.addEventListener('change',()=>{saved[id]={...saved[id],[field]:el.value};try{localStorage.setItem(storageKey,JSON.stringify(saved))}catch{}})});
    document.getElementById('export').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(saved,null,2)],{type:'application/json'}));a.download='tts-review.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
    document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')document.querySelectorAll('audio').forEach(a=>{if(a!==e.target)a.pause()})},true);
    </script></html>`);
}
save();

async function run() {
  const history = fs.existsSync(ledgerPath) ? fs.readFileSync(ledgerPath,'utf8').trim().split('\n').filter(Boolean).map(l=>JSON.parse(l)) : [];
  const attempted = new Set(history.filter(e=>e.event==='started').map(e=>e.hash));
  const onlyWord = process.argv.find(a=>a.startsWith('--only-word='))?.split('=')[1];
  const pending = jobs.filter(j=>j.status!=='ready' && (!singleWordFix || j.kind==='word') && (!onlyWord || j.word===onlyWord));
  if(singleWordFix && jobs.some(j=>j.kind==='sentence'&&j.status!=='ready'))throw Error('Original sentence recordings are missing; repair stops without regenerating them.');
  console.log(JSON.stringify({model,planned:jobs.length,ready:jobs.filter(j=>j.status==='ready').length,pendingSelected:pending.length,maxNew,mode:generate?'generate':'plan',keyPresent:!!key}));
  if (!generate) return;
  if (!key) throw Error('OPENAI_API_KEY is not set. No API request was sent.');
  if (pending.some(j=>attempted.has(j.hash))) throw Error('An earlier attempt is incomplete or failed. Inspect the ledger before explicitly retrying; automatic retries are disabled.');
  const currentHashes=new Set(jobs.map(j=>j.hash));
  if (history.filter(e=>e.event==='started'&&currentHashes.has(e.hash)).length+Math.min(pending.length,maxNew)>cap) throw Error('Persistent request cap exceeded');
  let made=0;
  for (const job of pending.slice(0,maxNew)) {
    const append = data => fs.appendFileSync(ledgerPath, JSON.stringify({at:new Date().toISOString(),id:job.id,hash:job.hash,...data})+'\n');
    append({event:'started'});
    try {
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
        body:JSON.stringify(job.payload),signal:AbortSignal.timeout(90000)
      });
      if (!response.ok) {
        let error={};try{error=await response.json()}catch{}
        const message=String(error.error?.message || response.statusText).replaceAll(key,'[REDACTED]').slice(0,400);
        throw Error(`HTTP ${response.status} ${error.error?.code || ''}: ${message}`);
      }
      if (!/audio|octet-stream/i.test(response.headers.get('content-type')||'')) throw Error('Unexpected response content type');
      const reader=response.body.getReader();const chunks=[];let total=0;
      while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>2_000_000){await reader.cancel();throw Error('Audio response size cap exceeded')}chunks.push(value)}
      const buffer=Buffer.concat(chunks);
      const mp3=buffer.subarray(0,3).toString()==='ID3'||(buffer[0]===255&&(buffer[1]&224)===224);
      if(buffer.length<256||!mp3)throw Error('Response is not a valid MP3 header');
      const dest=path.join(out,job.file);fs.mkdirSync(path.dirname(dest),{recursive:true});
      fs.writeFileSync(`${dest}.tmp`,buffer);fs.renameSync(`${dest}.tmp`,dest);
      Object.assign(job,{status:'ready',bytes:buffer.length,audioHash:crypto.createHash('sha256').update(buffer).digest('hex'),
        requestId:response.headers.get('x-request-id'),generatedAt:new Date().toISOString()});
      append({event:'completed',bytes:buffer.length,requestId:job.requestId});
      made++;save();console.log(JSON.stringify({generated:job.id,bytes:buffer.length,ready:jobs.filter(j=>j.status==='ready').length}));
    } catch(error) {
      job.status='failed';job.error=String(error.message).replaceAll(key,'[REDACTED]');append({event:'failed',message:job.error});save();throw error;
    }
  }
  console.log(JSON.stringify({createdThisRun:made,totalReady:jobs.filter(j=>j.status==='ready').length,preview:path.join(out,'index.html')}));
}
run().catch(error=>{console.error(key?String(error.message).replaceAll(key,'[REDACTED]'):error.message);process.exitCode=1});
