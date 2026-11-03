import './n2-metered-fetch.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {n2Root,reserveRequest,finishRequest} from './n2-budget.mjs';
import {isSinglePronunciation} from './n2-pronunciation-utils.mjs';
const folder=path.join(n2Root,'audio'),rows=fs.readFileSync(path.join(folder,'repairs.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
const source=rows.findLast(row=>row.method==='context-generation-verified-isolated-utterance'&&row.payload.input.startsWith('体力'));
if(!source)throw Error('Missing preserved context recording');
const raw=fs.readFileSync(path.join(folder,'audio',source.noteId+'-context-'+source.sourceContextHash.slice(0,12)+'.mp3'));
const form=new FormData();form.append('file',new Blob([raw],{type:'audio/mpeg'}),'context.mp3');form.append('model','whisper-1');form.append('language','ja');form.append('response_format','verbose_json');form.append('timestamp_granularities[]','word');
const response=await fetch('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},body:form});if(!response.ok)throw Error('Alignment HTTP '+response.status);
const alignment=await response.json();fs.writeFileSync(path.join(folder,'focused-word-alignment.json'),JSON.stringify(alignment,null,2));console.log(JSON.stringify({text:alignment.text,words:alignment.words}));
// Reserve a conservative extra allowance: legacy Whisper may not return usage.
const extra=reserveRequest('asr',.01,{endpoint:'whisper-duration-accounting'});finishRequest(extra,.006*(alignment.duration??20)/60*1.25,{method:'Whisper duration estimate in addition to wrapper allowance'});
const clean=s=>s.replace(/[\s\p{P}]/gu,''),words=alignment.words??[];let text='',offsets=[];
for(const word of words){const begin=text.length;text+=clean(word.word);offsets.push({...word,begin,end:text.length});}
const target=text.indexOf('尽きる');if(target<0)throw Error('Word absent from alignment');
const matched=offsets.filter(word=>word.end>target&&word.begin<target+3);if(!matched.length)throw Error('Missing word boundaries');
const lead=Number(process.argv.find(value=>value.startsWith('--lead-ms='))?.split('=')[1]??25)/1000;
if(lead<0||lead>.25)throw Error('Invalid alignment margin');
const begin=Math.max(0,matched[0].start-lead),end=matched.at(-1).end+.04;
const binary=path.resolve('.expo/audio-tools/imageio_ffmpeg/binaries'),ffmpeg=path.join(binary,fs.readdirSync(binary).find(name=>name.endsWith('.exe'))),temp=path.join(folder,'audio','focused-aligned-tmp.mp3');
execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-i','pipe:0','-ss',String(begin),'-t',String(end-begin),'-c:a','libmp3lame','-b:a','128k','-write_xing','1','-map_metadata','-1',temp],{input:raw,windowsHide:true});
const bytes=fs.readFileSync(temp);fs.unlinkSync(temp);const hash=crypto.createHash('sha256').update(bytes).digest('hex'),file=`audio/${source.noteId}-word-aligned-${hash.slice(0,12)}.mp3`;fs.writeFileSync(path.join(folder,file),bytes);
const check=new FormData();check.append('file',new Blob([bytes],{type:'audio/mpeg'}),'word.mp3');check.append('model','gpt-4o-transcribe');check.append('language','ja');
const asr=await fetch('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},body:check});if(!asr.ok)throw Error('Check HTTP '+asr.status);
const result=await asr.json(),row={...source,file,audioHash:hash,bytes:bytes.length,transcription:result.text,sourceWindowSeconds:[begin,end],method:'word-timestamp-context-extraction'};row.accepted=isSinglePronunciation(row);fs.appendFileSync(path.join(folder,'repairs.jsonl'),JSON.stringify(row)+'\n');console.log(JSON.stringify({word:row.word,transcription:row.transcription,accepted:row.accepted}));
