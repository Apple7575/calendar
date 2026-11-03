import './n2-metered-fetch.mjs';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
import {isSinglePronunciation} from './n2-pronunciation-utils.mjs';
const folder=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../output/vocabulary/n2-20261102/audio'),file=path.join(folder,'manifest.json'),originalFile=path.join(folder,'manifest.original.json');
if(!fs.existsSync(originalFile))fs.copyFileSync(file,originalFile);
const original=JSON.parse(fs.readFileSync(originalFile,'utf8')),read=name=>fs.existsSync(path.join(folder,name))?fs.readFileSync(path.join(folder,name),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
const judgments=new Map(read('pronunciation-judgments.jsonl').map(r=>[r.audioHash,r])),fixed=new Map();
for(const r of [...read('repairs.jsonl'),...read('repair-rechecks.jsonl')])if(isSinglePronunciation(r))fixed.set(r.originalHash,r);
const originalAudit=path.join(folder,'file-audit.original.json');if(!fs.existsSync(originalAudit))fs.copyFileSync(path.join(folder,'file-audit.json'),originalAudit);
const badFiles=new Set(JSON.parse(fs.readFileSync(originalAudit,'utf8')).errors.map(e=>e.file)),unresolved=[];let reused=0,repaired=0;
const jobs=original.jobs.map(j=>{
 if(j.kind==='sentence')return j;
 const judgment=judgments.get(j.audioHash);
 if(judgment&&isSinglePronunciation(judgment)&&!badFiles.has(j.file)){reused++;return {...j,quality:{method:'asr-and-reading-comparison',transcription:judgment.transcription,source:'original'}};}
 const repair=fixed.get(j.audioHash);
 if(!repair){unresolved.push({noteId:j.noteId,word:j.word,reading:j.reading,transcription:judgment?.transcription});return j;}
 const bytes=fs.readFileSync(path.join(folder,repair.file));if(crypto.createHash('sha256').update(bytes).digest('hex')!==repair.audioHash)throw Error('Repair SHA mismatch');
 repaired++;return {...j,file:repair.file,bytes:bytes.length,audioHash:repair.audioHash,payload:repair.payload,hash:crypto.createHash('sha256').update(JSON.stringify(repair.payload)).digest('hex'),originalAudioHash:j.audioHash,reused:false,quality:{method:'asr-and-reading-comparison',transcription:repair.transcription,source:'repaired',recheckedWith:repair.recheckedWith}};
});
fs.writeFileSync(path.join(folder,'pronunciation-unresolved.json'),JSON.stringify(unresolved,null,2));
if(unresolved.length){console.log(JSON.stringify({readyToFinalize:false,remaining:unresolved.length,reused,repaired,examples:unresolved.slice(0,8)}));process.exitCode=1;}
else{const finalized={...original,jobs,reviewed:true,review:{words:reused+repaired,reused,repaired,humanListeningComplete:false,sentenceTranscriptionComplete:false}};fs.writeFileSync(file,JSON.stringify(finalized,null,2));console.log(JSON.stringify({readyToFinalize:true,words:reused+repaired,reused,repaired,audioFiles:jobs.length}));}
