import './n2-metered-fetch.mjs';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
import {isSinglePronunciation,targetOccurrences} from './n2-pronunciation-utils.mjs';
const folder=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../output/vocabulary/n2-20261102/audio'),max=Number(process.argv.find(a=>a.startsWith('--max-new='))?.split('=')[1]??5);
const strong=process.argv.includes('--strong');
const clear=process.argv.includes('--clear');
if(!process.env.OPENAI_API_KEY||!Number.isInteger(max)||max<1||max>2000)throw Error('Missing API key or invalid cap');
const manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'),'utf8'));
const rows=fs.readFileSync(path.join(folder,'word-transcriptions.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const resultFile=path.join(folder,'repairs.jsonl'),previous=fs.existsSync(resultFile)?fs.readFileSync(resultFile,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
const normalize=s=>s.normalize('NFKC').replace(/[\s\p{P}\p{S}]/gu,'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
const matchingReading=isSinglePronunciation;
const judgmentsFile=path.join(folder,'pronunciation-judgments.jsonl'),judgments=fs.existsSync(judgmentsFile)?fs.readFileSync(judgmentsFile,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
const rechecksFile=path.join(folder,'repair-rechecks.jsonl'),rechecks=fs.existsSync(rechecksFile)?fs.readFileSync(rechecksFile,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
const fixed=new Set([...previous,...rechecks].filter(matchingReading).map(r=>r.originalHash)),flagged=new Set(judgments.filter(r=>!matchingReading(r)).map(r=>r.audioHash));
const auditFile=path.join(folder,'file-audit.original.json');
if(fs.existsSync(auditFile)){
 const bad=new Set(JSON.parse(fs.readFileSync(auditFile,'utf8')).errors.map(row=>row.file));
 for(const job of manifest.jobs)if(bad.has(job.file))flagged.add(job.audioHash);
}
const jobs=manifest.jobs.filter(j=>j.kind==='word'&&flagged.has(j.audioHash)&&!fixed.has(j.audioHash)).slice(0,max);
let failed=false,accepted=0;
async function request(url,options){const r=await fetch(url,{...options,signal:AbortSignal.timeout(90000)});if(!r.ok)throw Error(`API status ${r.status}`);return r;}
await Promise.all(Array.from({length:4},async()=>{while(jobs.length&&!failed){const j=jobs.shift();try{
 for(let attempt=1;attempt<=3;attempt++){
  const reading=j.reading.split(/[\/／]/)[0].replace(/\s/g,''),word=j.word.split(/[\/／]/)[0];
  const payload={...j.payload,input:(attempt===2?reading:word)+'。',instructions:`日本語の辞書の見出し語です。本文の単語は「${reading}」と発音します。正しい読み方で一度だけ発音し、すぐに終了してください。読み方の説明、繰り返し、前置き、翻訳は一切読み上げません。落ち着いた標準的な日本語です。`,response_format:'mp3'};
  if(strong){
   payload.input=(attempt===1?word:attempt===2?reading:reading.replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+96)))+(attempt===2?'':'。');
   payload.instructions='Speak the Japanese dictionary headword exactly once in natural, clear standard Japanese. End immediately after that one word. No repetition, introductions, explanations, translations or extra speech. The intended reading is '+reading+'.';
  }
  if(clear){
   payload.input=(attempt===1?reading.replace(/[ぁ-ゖ]/g,c=>String.fromCharCode(c.charCodeAt(0)+96)):attempt===2?reading:word)+(attempt===1?'！':attempt===2?'。':'');
   payload.instructions=`日本語の母語話者として、見出し語を一回だけ明瞭に読み上げてください。読み方は「${reading}」です。全ての音節、促音、長音を正確に発音してください。語頭と語尾を省略しないでください。繰り返し、解説、翻訳、前置きは言いません。`;
  }
  if(process.argv.includes('--current-model'))payload.model='gpt-4o-mini-tts';
  if(process.argv.includes('--focused')){
   if(reading!=='つきる')throw Error('Focused pronunciation mode is only for tsukiru');
   payload.input=(attempt===1?`「${word}」`:attempt===2?reading:word)+'。';
   payload.instructions='日本語母語話者として「つきる」と一度だけ読みます。語頭はスではなく「ツ」です。最初の子音は /ts/、全体は /tsɯkʲiɾɯ/ です。単語一つだけを自然に読み、すぐ終了してください。前置き、解説、繰り返しは言わないでください。';
  }
  if(process.argv.includes('--phonetic-input')){
   if(reading!=='つきる')throw Error('Phonetic input mode is only for tsukiru');
   payload.input=['Tsukiru.','突きる。','つきる！'][attempt-1];
   payload.instructions='Speak Japanese only. Pronounce TSU-ki-ru (つきる) once as one natural Japanese word. Initial TSU is the Japanese affricate as in tsunami, not SU. No introduction, repetition, or explanation.';
  }
  if(process.argv.includes('--bare')){
   payload.input=attempt===1?reading:attempt===2?`「${reading}」`:word;
   payload.model='gpt-4o-mini-tts-2025-12-15';
   if(attempt===1)delete payload.instructions;
   else payload.instructions='日本語で一度だけ読んでください。';
  }
  if(process.argv.includes('--spelling')){
   if(reading!=='つきる')throw Error('Spelling variant is only for tsukiru');
   payload.input=['津切る。','ツキル。','つきる。'][attempt-1];
   payload.instructions=attempt===1?'標準的な日本語で、本文だけ一度読んでください。':'落ち着いた日本語で、少しゆっくり、一つの単語「つきる」をはっきり一回だけ発音してください。語頭を省略せず、ツ・キ・ルの三拍を自然につなげて読みます。';
  }
  const response=await request('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(payload)}),bytes=Buffer.from(await response.arrayBuffer());
  const hash=crypto.createHash('sha256').update(bytes).digest('hex'),file=`audio/${j.noteId}-word-fixed-${hash.slice(0,12)}.mp3`;fs.writeFileSync(path.join(folder,file),bytes);
  const form=new FormData();form.append('file',new Blob([bytes],{type:'audio/mpeg'}),path.basename(file));form.append('model',strong?'gpt-4o-transcribe':'gpt-4o-mini-transcribe-2025-12-15');form.append('language','ja');form.append('response_format','json');
  const asr=await(await request('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},body:form})).json();
  const clean=normalize(String(asr.text??'')),targets=[j.word.split(/[\/／]/)[0],j.reading.split(/[\/／]/)[0]].map(normalize).filter(Boolean),counts=targets.map(t=>clean.split(t).length-1);
  const repeats=targetOccurrences(asr.text,word,reading)>1;
  let acceptedHere=!repeats&&targets.some(t=>clean===t),judgment=null;
  if(!acceptedHere&&!repeats){
   const result=await(await request('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4.1-mini-2025-04-14',input:[{role:'system',content:'Compare expected Japanese pronunciation and an ASR transcript. Convert the FULL transcript to hiragana preserving repetitions and extra speech. Accept only exactly one word matching expected reading. Homophones in different kanji are acceptable. Different sounds, repeats, explanations or extra words are not. Do not infer the right reading from the intended meaning.'},{role:'user',content:JSON.stringify({expectedReading:reading,word,transcript:asr.text})}],text:{format:{type:'json_schema',name:'pronunciation',strict:true,schema:{type:'object',properties:{acceptable:{type:'boolean'},heardReading:{type:'string'}},required:['acceptable','heardReading'],additionalProperties:false}}},max_output_tokens:250})})).json();
   judgment=JSON.parse(result.output.flatMap(o=>o.content??[]).filter(c=>c.type==='output_text').map(c=>c.text).join(''));acceptedHere=normalize(judgment.heardReading)===normalize(reading)&&!/[가-힣]/.test(asr.text??'');
  }
  const row={noteId:j.noteId,word:j.word,reading:j.reading,originalHash:j.audioHash,audioHash:hash,file,bytes:bytes.length,payload,transcription:asr.text,judgment,accepted:acceptedHere,attempt,usage:asr.usage};row.accepted=isSinglePronunciation(row);acceptedHere=row.accepted;fs.appendFileSync(resultFile,JSON.stringify(row)+'\n');
  console.log(JSON.stringify({word:j.word,attempt,accepted:acceptedHere,transcription:asr.text}));if(acceptedHere){accepted++;break;}
 }
 }catch(e){failed=true;console.error(JSON.stringify({noteId:j.noteId,error:e.message,retry:false}));}}}));
console.log(JSON.stringify({acceptedThisRun:accepted,processedCap:max}));if(failed)process.exitCode=1;
