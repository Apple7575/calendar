import './n2-metered-fetch.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {n2Root} from './n2-budget.mjs';
import {isSinglePronunciation} from './n2-pronunciation-utils.mjs';
const folder=path.join(n2Root,'audio'),manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.original.json')));
const j=manifest.jobs.find(row=>row.noteId==='n2_hk_p039_031'&&row.kind==='word');
if(j.word!=='尽きる'||j.reading!=='つきる')throw Error('Focused word identity changed');
const binary=path.resolve('.expo/audio-tools/imageio_ffmpeg/binaries'),ffmpeg=path.join(binary,fs.readdirSync(binary).find(name=>name.endsWith('.exe')));
const command=(args,input)=>execFileSync(ffmpeg,['-hide_banner','-loglevel','error',...args],{input,maxBuffer:15*1024*1024,windowsHide:true});
async function request(endpoint,body,form=false){const r=await fetch('https://api.openai.com/v1/'+endpoint,{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,...(!form?{'Content-Type':'application/json'}:{})},body:form?body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});if(!r.ok)throw Error('Focused audio HTTP '+r.status);return r;}
let accepted=false;
for(const input of ['体力が尽きる。尽きる。','これで終わりです。つきる。','尽きる。これは力が尽きるという意味です。']){
 const payload={...j.payload,input,instructions:'標準的な日本語で、本文を正確に自然に読んでください。句点では明確に一呼吸置いてください。「尽きる」は「つきる」と読みます。',model:'gpt-4o-mini-tts'};
 const raw=Buffer.from(await(await request('audio/speech',payload)).arrayBuffer());
 const rawHash=crypto.createHash('sha256').update(raw).digest('hex');fs.writeFileSync(path.join(folder,'audio',j.noteId+'-context-'+rawHash.slice(0,12)+'.mp3'),raw);
 const pcm=command(['-i','pipe:0','-f','f32le','-ar','24000','-ac','1','pipe:1'],raw),samples=new Float32Array(pcm.buffer.slice(pcm.byteOffset,pcm.byteOffset+pcm.byteLength));
 const chunks=[];let begin=-1,last=-1;
 for(let i=0;i<samples.length;i+=240){let energy=0;for(let k=i;k<Math.min(i+240,samples.length);k++)energy+=samples[k]**2;
  if(Math.sqrt(energy/240)>.002){if(begin<0)begin=i;last=i+240;}
  else if(begin>=0&&i-last>=4320){chunks.push([Math.max(0,begin-480),Math.min(samples.length,last+960)]);begin=-1;}
 }
 if(begin>=0)chunks.push([Math.max(0,begin-480),Math.min(samples.length,last+960)]);
 for(const [begin,end]of chunks.reverse()){
  if((end-begin)/24000>2.5)continue;
  const temp=path.join(folder,'audio',j.noteId+'-context-crop-tmp.mp3');
  command(['-y','-f','f32le','-ar','24000','-ac','1','-i','pipe:0','-c:a','libmp3lame','-b:a','128k','-write_xing','1','-map_metadata','-1',temp],Buffer.from(samples.slice(begin,end).buffer));
  const bytes=fs.readFileSync(temp);fs.unlinkSync(temp);const hash=crypto.createHash('sha256').update(bytes).digest('hex'),file=`audio/${j.noteId}-word-context-${hash.slice(0,12)}.mp3`;fs.writeFileSync(path.join(folder,file),bytes);
  const form=new FormData();form.append('file',new Blob([bytes],{type:'audio/mpeg'}),'word.mp3');form.append('model','gpt-4o-transcribe');form.append('language','ja');
  const transcript=await(await request('audio/transcriptions',form,true)).json();
  const row={...j,originalHash:j.audioHash,audioHash:hash,file,bytes:bytes.length,payload,transcription:transcript.text,accepted:false,attempt:1,method:'context-generation-verified-isolated-utterance',sourceContextHash:rawHash,sourceWindowSeconds:[begin/24000,end/24000]};
  row.accepted=isSinglePronunciation(row);fs.appendFileSync(path.join(folder,'repairs.jsonl'),JSON.stringify(row)+'\n');
  console.log(JSON.stringify({input,transcription:row.transcription,accepted:row.accepted}));
  if(row.accepted){accepted=true;break;}
 }
 if(accepted)break;
}
console.log(JSON.stringify({accepted}));
