import './n2-metered-fetch.mjs';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),folder=path.join(root,'output/vocabulary/n2-20261102/audio');
const manifest=JSON.parse(fs.readFileSync(process.env.N2_ASR_SNAPSHOT??path.join(folder,'manifest.json'),'utf8')),max=Number(process.argv.find(a=>a.startsWith('--max-new='))?.split('=')[1]??100);
if(!process.env.OPENAI_API_KEY||!Number.isInteger(max)||max<1||max>2000)throw Error('Missing API key or invalid request cap');
const resultFile=path.join(folder,'word-transcriptions.jsonl'),old=fs.existsSync(resultFile)?fs.readFileSync(resultFile,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
const known=new Set(old.map(r=>r.audioHash));const jobs=manifest.jobs.filter(j=>j.kind==='word'&&j.status==='ready'&&!known.has(j.audioHash)).sort((a,b)=>b.bytes-a.bytes).slice(0,max);let failed=false,done=0;
const normalize=s=>s.normalize('NFKC').replace(/[\s\p{P}\p{S}]/gu,'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
await Promise.all(Array.from({length:8},async()=>{while(jobs.length&&!failed){const j=jobs.shift();try{
 const form=new FormData();form.append('file',new Blob([fs.readFileSync(path.join(folder,j.file))],{type:'audio/mpeg'}),path.basename(j.file));form.append('model','gpt-4o-mini-transcribe-2025-12-15');form.append('language','ja');form.append('response_format','json');form.append('prompt','単語だけの音声です。聞こえる言葉をそのまま書いてください。繰り返しがあれば省略しないでください。');
 const response=await fetch('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},body:form,signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error(`Transcription status ${response.status}`);const body=await response.json(),text=String(body.text??'');
 const clean=normalize(text),targets=[j.word.split(/[\/／]/)[0],j.reading].map(normalize).filter(Boolean),counts=targets.map(target=>clean.split(target).length-1),repeated=Math.max(...counts)>=2;
 const row={noteId:j.noteId,word:j.word,reading:j.reading,audioHash:j.audioHash,transcription:text,repeated,recognizedTarget:counts.some(n=>n>=1),usage:body.usage};fs.appendFileSync(resultFile,JSON.stringify(row)+'\n');done++;if(repeated)console.log(JSON.stringify({word:j.word,reading:j.reading,transcription:text,repeated}));if(done%25===0)console.log(JSON.stringify({checkedThisRun:done}));
 }catch(e){failed=true;console.error(JSON.stringify({word:j.word,error:e.message,retry:false}));}}}));
const rows=fs.readFileSync(resultFile,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);console.log(JSON.stringify({checked:rows.length,repetitionFlags:rows.filter(r=>r.repeated).length,asrIsNotHumanListening:true}));if(failed)process.exitCode=1;
