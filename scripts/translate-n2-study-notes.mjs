import fs from 'node:fs';
import path from 'node:path';
import {n2Root,costs} from './n2-budget.mjs';
import './n2-metered-fetch.mjs';
const file=path.join(n2Root,'content/n2-vocabulary-content.json'),deck=JSON.parse(fs.readFileSync(file,'utf8'));
const output=path.join(n2Root,'korean-fields.jsonl'),old=fs.existsSync(output)?fs.readFileSync(output,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[],cache=new Map(old.map(n=>[n.ID,n]));
const pending=deck.notes.filter(n=>['Hint','Grammar_Note'].some(k=>!/[가-힣]/.test(n[k]))&&!cache.has(n.ID)),batches=[];while(pending.length)batches.push(pending.splice(0,36));
const schema={type:'object',additionalProperties:false,required:['notes'],properties:{notes:{type:'array',items:{type:'object',additionalProperties:false,required:['ID','Hint','Grammar_Note'],properties:{ID:{type:'string'},Hint:{type:'string'},Grammar_Note:{type:'string'}}}}}};
await Promise.all(Array.from({length:3},async()=>{
 while(batches.length){const batch=batches.shift();const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4.1-mini-2025-04-14',store:false,temperature:0,max_output_tokens:6500,input:[{role:'system',content:'Translate the Japanese-only Hint and Grammar_Note into concise natural Korean for a Japanese vocabulary learner. Preserve facts and Japanese quoted terms. If a field is already Korean, return it unchanged. Do not change the word, pronunciation, example or meaning; they are context only. Return each ID unchanged. Hints should help recall without just giving the Korean answer.'},{role:'user',content:JSON.stringify(batch.map(n=>({ID:n.ID,Word:n.Word,Word_Reading:n.Word_Reading,Word_Meaning:n.Word_Meaning,Hint:n.Hint,Grammar_Note:n.Grammar_Note})))}],text:{format:{type:'json_schema',name:'korean_fields',strict:true,schema}}}),signal:AbortSignal.timeout(180000)});
  if(!response.ok)throw Error('Korean note translation API '+response.status);const result=await response.json();if(result.status!=='completed')throw Error('Incomplete Korean translations');
  const rows=JSON.parse(result.output.flatMap(o=>o.content??[]).filter(c=>c.type==='output_text').map(c=>c.text).join('')).notes;
  if(rows.length!==batch.length||new Set(rows.map(r=>r.ID)).size!==batch.length)throw Error('Translation count differs');
  for(const n of rows){if(!batch.some(o=>o.ID===n.ID)||!/[가-힣]/.test(n.Hint)||!/[가-힣]/.test(n.Grammar_Note))throw Error('Korean study field validation failed');cache.set(n.ID,n);fs.appendFileSync(output,JSON.stringify(n)+'\n');}
  console.log(JSON.stringify({translatedNotes:rows.length,costs:costs()}));
 }
}));
for(const n of deck.notes)if(cache.has(n.ID))Object.assign(n,cache.get(n.ID));
fs.writeFileSync(file,JSON.stringify(deck,null,2));
console.log(JSON.stringify({notes:deck.notes.length,nonKoreanGrammar:deck.notes.filter(n=>!/[가-힣]/.test(n.Grammar_Note)).length,nonKoreanHint:deck.notes.filter(n=>!/[가-힣]/.test(n.Hint)).length}));
