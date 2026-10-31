import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
import {isSinglePronunciation,targetOccurrences} from './pronunciation-utils.mjs';
const folder=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../output/corpus-audio'),max=Number(process.argv.find(a=>a.startsWith('--max-new='))?.split('=')[1]??5);
if(!process.env.OPENAI_API_KEY||!Number.isInteger(max)||max<1||max>2000)throw Error('Missing API key or invalid cap');
const manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'),'utf8'));
const rows=fs.readFileSync(path.join(folder,'word-transcriptions.jsonl'),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const resultFile=path.join(folder,'repairs.jsonl'),previous=fs.existsSync(resultFile)?fs.readFileSync(resultFile,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
const normalize=s=>s.normalize('NFKC').replace(/[\s\p{P}\p{S}]/gu,'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
const matchingReading=isSinglePronunciation;
const judgmentsFile=path.join(folder,'pronunciation-judgments.jsonl'),judgments=fs.existsSync(judgmentsFile)?fs.readFileSync(judgmentsFile,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
const rechecksFile=path.join(folder,'repair-rechecks.jsonl'),rechecks=fs.existsSync(rechecksFile)?fs.readFileSync(rechecksFile,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
const fixed=new Set([...previous,...rechecks].filter(matchingReading).map(r=>r.originalHash)),flagged=new Set(judgments.filter(r=>!matchingReading(r)).map(r=>r.audioHash));
const jobs=manifest.jobs.filter(j=>j.kind==='word'&&flagged.has(j.audioHash)&&!fixed.has(j.audioHash)).slice(0,max);
let failed=false,accepted=0;
async function request(url,options){const r=await fetch(url,{...options,signal:AbortSignal.timeout(90000)});if(!r.ok)throw Error(`API status ${r.status}`);return r;}
await Promise.all(Array.from({length:4},async()=>{while(jobs.length&&!failed){const j=jobs.shift();try{
 for(let attempt=1;attempt<=3;attempt++){
  const reading=j.reading.split(/[\/／]/)[0].replace(/\s/g,''),word=j.word.split(/[\/／]/)[0];
  const payload={...j.payload,input:(attempt===2?reading:word)+'。',instructions:`日本語の辞書の見出し語です。本文の単語は「${reading}」と発音します。正しい読み方で一度だけ発音し、すぐに終了してください。読み方の説明、繰り返し、前置き、翻訳は一切読み上げません。落ち着いた標準的な日本語です。`,response_format:'mp3'};
  const response=await request('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(payload)}),bytes=Buffer.from(await response.arrayBuffer());
  const hash=crypto.createHash('sha256').update(bytes).digest('hex'),file=`audio/${j.noteId}-word-fixed-${hash.slice(0,12)}.mp3`;fs.writeFileSync(path.join(folder,file),bytes);
  const form=new FormData();form.append('file',new Blob([bytes],{type:'audio/mpeg'}),path.basename(file));form.append('model','gpt-4o-mini-transcribe-2025-12-15');form.append('language','ja');form.append('response_format','json');
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
