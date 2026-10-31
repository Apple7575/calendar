import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),folder=path.join(root,'output/corpus-audio');fs.mkdirSync(path.join(folder,'audio'),{recursive:true});
if(fs.existsSync(path.join(folder,'manifest.json'))&&JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'),'utf8')).reviewed)throw Error('This corpus is reviewed. Refusing to regenerate or replace the reviewed audio manifest.');
const content=JSON.parse(fs.readFileSync(path.join(root,'output/book-pages/n3-corpus-content.json'),'utf8'));
const original=JSON.parse(fs.readFileSync(path.join(root,'output/deck-audio/manifest.json'),'utf8'));
const generate=process.argv.includes('--generate'),maxNew=Number(process.argv.find(a=>a.startsWith('--max-new='))?.split('=')[1]??40);
if(!Number.isInteger(maxNew)||maxNew<1||maxNew>5000)throw Error('Invalid generation cap');
if(generate&&!process.env.OPENAI_API_KEY)throw Error('API key missing.');
const jobs=[];const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
for(const note of content.notes)for(const kind of ['word','sentence']){
 const old=original.jobs.find(j=>j.noteId===note.ID&&j.kind===kind&&j.word===note.Word&&j.reading===note.Word_Reading&&(kind==='word'||j.sentence===note.Sentence));
 const input=kind==='word'?note.Word_Reading.replace(/\s/g,''):note.Sentence;
 const instructions=kind==='word'?'Speak this single Japanese vocabulary item exactly once in natural standard Japanese. Do not repeat, spell, explain, or add any other words. No introduction. Neutral, clear delivery.':`日本語の語彙学習用音声です。標準的な日本語で、落ち着いた自然な声ではっきり読んでください。本文だけを読み、説明や前置き、読み方の紹介を追加しないでください。本文中の「${note.Word}」は「${note.Word_Reading}」と読みます。単語ごとに区切らず、文全体を自然な抑揚で一回だけ読んでください。`;
 if(!input||input.length>200)throw Error(`Audio input missing/too long: ${note.ID}`);
 const payload={model:'gpt-4o-mini-tts-2025-12-15',voice:'cedar',input,instructions,response_format:'mp3',speed:1},hash=digest(JSON.stringify(payload));
 const file=old?path.basename(old.file):`${note.ID}-${kind}-${hash.slice(0,12)}.mp3`,destination=path.join(folder,'audio',file);
 if(old&&!fs.existsSync(destination)){const bytes=fs.readFileSync(path.join(root,'output/deck-audio',old.file));if(digest(bytes)!==old.audioHash)throw Error('Original audio hash mismatch');fs.writeFileSync(destination,bytes);fs.writeFileSync(destination+'.ready.json',JSON.stringify({audioHash:old.audioHash,bytes:bytes.length,reused:true}));}
 const sidecar=destination+'.ready.json';let info=fs.existsSync(sidecar)?JSON.parse(fs.readFileSync(sidecar,'utf8')):null;
 if(info&&(!fs.existsSync(destination)||digest(fs.readFileSync(destination))!==info.audioHash))throw Error(`Audio integrity error: ${file}`);
 jobs.push({noteId:note.ID,kind,word:note.Word,reading:note.Word_Reading,sentence:note.Sentence,file:`audio/${file}`,payload,hash,status:info?'ready':'pending',...info});
}
if(jobs.length>5000)throw Error('Maximum 5000 audio jobs');
let created=0,failed=false,completeSinceSave=0;
const estimatedUSD=()=>jobs.reduce((n,j)=>n+(j.bytes??0),0)/16000/60*0.015+0.5;
function save(){fs.writeFileSync(path.join(folder,'manifest.json'),JSON.stringify({schema:'routine.corpus-audio.v1',notes:content.notes.length,planned:jobs.length,ready:jobs.filter(j=>j.status==='ready').length,createdThisRun:created,estimatedUSD:estimatedUSD(),actualBillVerified:false,jobs},null,2));completeSinceSave=0;}
save();const pending=jobs.filter(j=>j.status==='pending').slice(0,maxNew);console.log(JSON.stringify({notes:content.notes.length,ready:jobs.filter(j=>j.status==='ready').length,total:jobs.length,pending:pending.length,generate}));
if(generate)await Promise.all(Array.from({length:4},async()=>{while(pending.length&&!failed){const job=pending.shift();if(estimatedUSD()>9.5){failed=true;console.error('Estimated $10 audio budget guard reached.');break;}
 const started={at:new Date().toISOString(),noteId:job.noteId,kind:job.kind,hash:job.hash,status:'started'};fs.appendFileSync(path.join(folder,'attempts.jsonl'),JSON.stringify(started)+'\n');
 try{
  const response=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(job.payload),signal:AbortSignal.timeout(90000)});
  if(!response.ok)throw Error(`Audio API status ${response.status}`);
  const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length<1000||bytes.length>2000000)throw Error('Audio byte count outside expected range');
  const destination=path.join(folder,job.file);fs.writeFileSync(destination,bytes);const info={audioHash:digest(bytes),bytes:bytes.length,reused:false};fs.writeFileSync(destination+'.ready.json',JSON.stringify(info));Object.assign(job,info,{status:'ready'});created++;completeSinceSave++;
  fs.appendFileSync(path.join(folder,'attempts.jsonl'),JSON.stringify({...started,status:'ready',bytes:bytes.length})+'\n');if(completeSinceSave>=10){save();console.log(JSON.stringify({ready:jobs.filter(j=>j.status==='ready').length,total:jobs.length,created,estimatedUSD:Number(estimatedUSD().toFixed(3))}));}
 }catch(e){job.status='failed';failed=true;fs.appendFileSync(path.join(folder,'attempts.jsonl'),JSON.stringify({...started,status:'failed',message:e.message})+'\n');console.error(JSON.stringify({noteId:job.noteId,kind:job.kind,error:e.message,retry:false}));}
}}));
save();if(failed)process.exitCode=1;
