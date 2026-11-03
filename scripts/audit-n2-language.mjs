import fs from 'node:fs';
import path from 'node:path';
import {n2Root,costs} from './n2-budget.mjs';
import './n2-metered-fetch.mjs';
const deck=JSON.parse(fs.readFileSync(path.join(n2Root,'content/n2-vocabulary-content.json'),'utf8'));
const file=path.join(n2Root,'language-audit.jsonl'),old=fs.existsSync(file)?fs.readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[],done=new Set(old.flatMap(r=>r.ids));
const pending=deck.notes.filter(n=>!done.has(n.ID)),queue=[];while(pending.length)queue.push(pending.splice(0,48));
const schema={type:'object',additionalProperties:false,required:['flags'],properties:{flags:{type:'array',items:{type:'object',additionalProperties:false,required:['ID','field','issue','suggestion'],properties:{ID:{type:'string'},field:{type:'string'},issue:{type:'string'},suggestion:{type:'string'}}}}}};
await Promise.all(Array.from({length:4},async()=>{
 while(queue.length){const rows=queue.shift(),body={model:'gpt-4.1-2025-04-14',store:false,temperature:0,max_output_tokens:4000,input:[{role:'system',content:'Audit Japanese learning notes for concrete errors ONLY. Check source word vs pronunciation, source Korean meaning vs sentence usage, exact FULL Sentence_Reading vs Sentence (including numbers, kanji and inflections), and accurate Korean sentence translation. Do not flag stylistic preferences. Source dictionary adjectives may have copula だ (e.g. 新ただ/あらただ); this is preserved book notation, not itself an error, but an example must say 新たな not 新ただな. Proper valid multiple readings and hiragana spelling are allowed. Keep each issue under 100 characters. Return flags only for definite issues, with ID, field, reason and a precise proposed correction. An empty flags array is acceptable. You are checking text, not claiming audio listening.'},{role:'user',content:JSON.stringify(rows.map(n=>Object.fromEntries(['ID','Word','Word_Reading','Word_Meaning','Sentence','Sentence_Reading','Sentence_Meaning'].map(k=>[k,n[k]]))))}],text:{format:{type:'json_schema',name:'language_audit',strict:true,schema}}};
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(180000)});if(!r.ok)throw Error('N2 language audit API '+r.status);
  const result=await r.json();if(result.status!=='completed')throw Error('Incomplete language audit');
  const text=result.output.flatMap(o=>o.content??[]).filter(c=>c.type==='output_text').map(c=>c.text).join(''),flags=JSON.parse(text).flags;
  if(flags.some(f=>!rows.some(n=>n.ID===f.ID)))throw Error('Unknown language-audit note ID');
  fs.appendFileSync(file,JSON.stringify({ids:rows.map(n=>n.ID),flags,usage:result.usage})+'\n');
  console.log(JSON.stringify({checked:rows.length,flags:flags.length,costs:costs()}));
 }
}));
