import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {n2Root,costs} from './n2-budget.mjs';
const folder=path.join(n2Root,'audio'),here=path.dirname(fileURLToPath(import.meta.url));
const snapshot=path.join(folder,'manifest.asr-snapshot.json');
let lastAttempt=0;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function readManifest(){for(let i=0;i<3;i++){try{return JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'),'utf8'));}catch(e){if(i===2)throw e;await sleep(500);}}}
async function run(){await new Promise((resolve,reject)=>{
 const p=spawn(process.execPath,[path.join(here,'n2-check-corpus-pronunciation.mjs'),'--max-new=2000'],{env:{...process.env,N2_ASR_SNAPSHOT:snapshot},stdio:['ignore','pipe','pipe'],windowsHide:true});let error='';
 p.stdout.on('data',()=>{});p.stderr.on('data',c=>error+=c);p.on('error',reject);p.on('close',code=>code===0?resolve():reject(Error(error.slice(-1500))));
});}
while(true){
 const m=await readManifest(),file=path.join(folder,'word-transcriptions.jsonl');
 const known=new Set(fs.existsSync(file)?fs.readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(l=>JSON.parse(l).audioHash):[]);
 const ready=m.jobs.filter(j=>j.kind==='word'&&j.status==='ready'),pending=ready.filter(j=>!known.has(j.audioHash));
 if(pending.length>=100||(m.ready===m.planned&&pending.length)||pending.length&&Date.now()-lastAttempt>60000){
  fs.writeFileSync(snapshot,JSON.stringify(m));lastAttempt=Date.now();await run();
  console.log(JSON.stringify({wordSnapshotChecked:ready.length,audioReady:m.ready,total:m.planned,costs:costs()}));continue;
 }
 if(m.ready===m.planned&&!pending.length){console.log(JSON.stringify({allCurrentWordsTranscribed:ready.length,costs:costs()}));break;}
 await sleep(15000);
}
