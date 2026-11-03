// Independent audio-input review. The reviewer is never given the intended word.
import fs from 'node:fs';
import path from 'node:path';
import {n2Root,reserveRequest,finishRequest} from './n2-budget.mjs';
import {isSinglePronunciation} from './n2-pronunciation-utils.mjs';
const folder=path.join(n2Root,'audio'),read=file=>fs.existsSync(path.join(folder,file))?fs.readFileSync(path.join(folder,file),'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
const unresolved=JSON.parse(fs.readFileSync(path.join(folder,'pronunciation-unresolved.json'))),repairs=read('repairs.jsonl');
const journal=path.join(folder,'audio-input-reviews.jsonl'),previous=read('audio-input-reviews.jsonl');
const known=new Set(previous.map(row=>row.audioHash));
for(const item of unresolved){
 const candidates=repairs.filter(row=>row.noteId===item.noteId).slice(-9).reverse();
 for(const candidate of candidates){
  if(known.has(candidate.audioHash))continue;
  const ticket=reserveRequest('asr',.1,{endpoint:'chat/completions',model:'gpt-audio-1.5',purpose:'blinded-phonetic-audio-review'});
  const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(90000),body:JSON.stringify({model:'gpt-audio-1.5',modalities:['text'],max_tokens:300,temperature:0,messages:[{role:'system',content:'Listen to the audio and transcribe the full speech phonetically in Japanese hiragana. Preserve every repetition, extra syllable and long vowel. Do not infer a familiar word or correct any pronunciation. For example tsu and su, short sho and long shou are different. Return only JSON {"heardReading":"...","unclear":false,"extraSpeech":false}. Set unclear true when the phonemes cannot be established confidently. No intended word is supplied.'},{role:'user',content:[{type:'input_audio',input_audio:{data:fs.readFileSync(path.join(folder,candidate.file)).toString('base64'),format:'mp3'}}]}]})});
  if(!response.ok)throw Error('Audio-input review HTTP '+response.status);
  const result=await response.json(),usage=result.usage,audioTokens=usage.prompt_tokens_details?.audio_tokens??usage.prompt_tokens;
  finishRequest(ticket,((audioTokens*32+Math.max(0,usage.prompt_tokens-audioTokens)*2.5+usage.completion_tokens*10)/1e6)*1.25,{usage,method:'gpt-audio input audio 32, text 2.5, text output 10 USD per million tokens plus 25 percent margin'});
  const check=JSON.parse(result.choices[0].message.content.replace(/^```(?:json)?\s*|\s*```$/g,''));
  const row={...candidate,transcription:check.heardReading,judgment:{heardReading:check.heardReading},recheckedWith:'gpt-audio-1.5-blinded',audioReview:check};
  row.accepted=!check.unclear&&!check.extraSpeech&&isSinglePronunciation(row);
  fs.appendFileSync(journal,JSON.stringify(row)+'\n');known.add(candidate.audioHash);
  console.log(JSON.stringify({word:item.word,heardReading:check.heardReading,accepted:row.accepted}));
  if(row.accepted){fs.appendFileSync(path.join(folder,'repair-rechecks.jsonl'),JSON.stringify(row)+'\n');break;}
 }
}
