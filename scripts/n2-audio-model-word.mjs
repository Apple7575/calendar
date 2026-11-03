import './n2-metered-fetch.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {n2Root} from './n2-budget.mjs';
import {isSinglePronunciation} from './n2-pronunciation-utils.mjs';
const folder=path.join(n2Root,'audio'),manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.original.json'))),job=manifest.jobs.find(j=>j.noteId==='n2_hk_p039_031'&&j.kind==='word');
async function request(url,body,form=false){const response=await fetch('https://api.openai.com/v1/'+url,{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,...(!form?{'Content-Type':'application/json'}:{})},body:form?body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});if(!response.ok)throw Error('Audio model HTTP '+response.status+': '+(await response.text()).slice(0,350));return response.json();}
const payload={model:'gpt-audio-2025-08-28',modalities:['text','audio'],audio:{voice:'cedar',format:'mp3'},max_tokens:500,messages:[{role:'system',content:'日本語の辞書音声です。指定した日本語の単語を一回だけ発音し、その直後に終了してください。語頭の「つ」は tsu です。「すきる」ではありません。前置き、解説、繰り返しは言わないでください。自然な標準速度で読みます。'},{role:'user',content:'尽きる（つきる）'}]};
if(process.argv.includes('--latest'))payload.model='gpt-audio-1.5';
const result=await request('chat/completions',payload),audio=result.choices[0].message.audio;
const bytes=Buffer.from(audio.data,'base64'),hash=crypto.createHash('sha256').update(bytes).digest('hex'),file=`audio/${job.noteId}-word-audio-model-${hash.slice(0,12)}.mp3`;fs.writeFileSync(path.join(folder,file),bytes);
const form=new FormData();form.append('file',new Blob([bytes],{type:'audio/mpeg'}),'word.mp3');form.append('model','gpt-4o-transcribe');form.append('language','ja');
const asr=await request('audio/transcriptions',form,true),row={...job,originalHash:job.audioHash,file,audioHash:hash,bytes:bytes.length,payload,transcription:asr.text,attempt:1,modelTranscript:audio.transcript};row.accepted=isSinglePronunciation(row);fs.appendFileSync(path.join(folder,'repairs.jsonl'),JSON.stringify(row)+'\n');console.log(JSON.stringify({word:row.word,voice:payload.audio.voice,transcription:row.transcription,accepted:row.accepted}));
