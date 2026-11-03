// Dedicated, bounded production run. Never imports the N2 cost ledger.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const folder=path.resolve('../output/concept-lab/n3-20261102/listening');fs.mkdirSync(folder,{recursive:true});
const plans=[
 {id:'lab_listening_trip',unitId:'l-point',page:350,voice:'alloy',text:'来週の大阪旅行のことなんですが、急に出張が入って、行けなくなりました。予約したホテルはまだキャンセルしていません。明日、ホテルに電話して、日程を変えられるか確認します。変更の手数料は私が払います。ごめんなさい。'},
 {id:'lab_listening_library',unitId:'l-gist',page:356,voice:'nova',text:'図書館からのお知らせです。今週の土曜日は、本棚の入れ替え作業のため、図書館を休館します。本の返却は、入り口の返却ボックスをご利用ください。日曜日は、いつもどおり午前九時から開館します。'},
 {id:'lab_listening_offer',unitId:'l-response',page:370,voice:'alloy',text:'この荷物、少し重いですね。よかったら、一緒に運びましょうか。'}
];
const manifestPath=path.join(folder,'manifest.json'),old=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath,'utf8')):null;
const manifest=old??{schema:'concept-listening.v1',budgetReservationId:'non-vocab-audio-v1',serverReservedUSD:.1,maxSpeechCalls:3,maxASRCalls:3,billVerified:false,jobs:plans.map(p=>({...p,origin:'ai',audioOrigin:'synthetic',model:'tts-1',status:'pending'}))};
const save=()=>fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2));save();
if(!process.argv.includes('--generate')){console.log(JSON.stringify({jobs:manifest.jobs.length,reservedUSD:.1,generate:false}));process.exit(0);}
if(!process.argv.includes('--server-reserved'))throw Error('Reserve shared server budget before production.');
if(!process.env.OPENAI_API_KEY)throw Error('Server-side production key missing.');
const ledger=path.join(folder,'attempts.jsonl');
const attempts=()=>fs.existsSync(ledger)?fs.readFileSync(ledger,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
async function call(job,kind,url,body){
 const previous=attempts();if(previous.some(a=>a.id===job.id&&a.kind===kind))throw Error('An attempt exists. No automatic paid retry.');
 if(previous.filter(a=>a.kind===kind).length>=3)throw Error('Production call cap reached.');
 fs.appendFileSync(ledger,JSON.stringify({id:job.id,kind,at:new Date().toISOString()})+'\n');
 const response=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,...(kind==='speech'?{'Content-Type':'application/json'}:{})},body,signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw Error(`API ${kind} status ${response.status}; reservation retained.`);return response;
}
for(const job of manifest.jobs){
 if(job.text.length>1000)throw Error('Speech input cap exceeded.');
 const file=path.join(folder,job.id+'.mp3');
 if(job.status==='pending'){
  const response=await call(job,'speech','https://api.openai.com/v1/audio/speech',JSON.stringify({model:'tts-1',voice:job.voice,input:job.text,response_format:'mp3',speed:.95}));
  const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length<1000||bytes.length>2000000)throw Error('Audio size invalid.');fs.writeFileSync(file,bytes);
  job.sha256=crypto.createHash('sha256').update(bytes).digest('hex');job.bytes=bytes.length;job.status='generated';save();
 }
 if(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==job.sha256)throw Error('Cached audio changed.');
 job.seconds=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',file],{encoding:'utf8'}).trim());
 if(!Number.isFinite(job.seconds)||job.seconds<=0||job.seconds>90)throw Error('ASR duration cap exceeded.');
 if(!job.transcription){const form=new FormData();form.set('model','whisper-1');form.set('language','ja');form.set('file',new Blob([fs.readFileSync(file)],{type:'audio/mpeg'}),job.id+'.mp3');job.transcription=(await(await call(job,'asr','https://api.openai.com/v1/audio/transcriptions',form)).json()).text;job.status='needs_review';save();}
 console.log(JSON.stringify({id:job.id,seconds:job.seconds,transcription:job.transcription}));
}
manifest.estimatedUSD=manifest.jobs.reduce((sum,j)=>sum+j.text.length*15/1e6+Math.ceil(j.seconds)*.006/60,0);save();
console.log(JSON.stringify({reservedUSD:manifest.serverReservedUSD,estimatedUSD:manifest.estimatedUSD,billVerified:false}));
