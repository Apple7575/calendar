import fs from 'node:fs';
import path from 'node:path';
import {n2Root,costs} from './n2-budget.mjs';
import './n2-metered-fetch.mjs';
const sourceDir=path.join(n2Root,'source-verified-strong'),resultDir=path.join(n2Root,'reconciled-pages');fs.mkdirSync(resultDir,{recursive:true});
const normalize=s=>String(s).normalize('NFKC').replace(/[\s,，、/／·・.。]/g,'');
const education=['Hint','Sentence','Sentence_Reading','Sentence_Meaning','Grammar_Note'];
const corrections=[],pending=[],pages=[];
for(let page=2;page<=43;page++){
 const sourceFile=path.join(sourceDir,`page-${String(page).padStart(3,'0')}.json`);
 if(!fs.existsSync(sourceFile))throw Error(`Independent source page ${page} is not ready.`);
 const source=JSON.parse(fs.readFileSync(sourceFile,'utf8'));
 const draft=JSON.parse(fs.readFileSync(path.join(n2Root,'source-pages',`page-${String(page).padStart(2,'0')}-MODEL-REVIEWED.json`),'utf8'));
 const available=draft.notes.map((n,i)=>({...n,draftIndex:i}));
 const rows=source.notes.map((s,i)=>{
  const id=`n2_hk_p${String(page).padStart(3,'0')}_${String(i+1).padStart(3,'0')}`;
  const exact=available.findIndex(n=>normalize(n.Word)===normalize(s.Word)&&normalize(n.Word_Reading)===normalize(s.Word_Reading));
  const candidate=exact>=0?available.splice(exact,1)[0]:null;
  const changed=!candidate||candidate.uncertain||normalize(candidate.Word_Meaning)!==normalize(s.Word_Meaning)||/[一-龠々]/.test(candidate.Sentence_Reading)||candidate.Sentence.includes('だな');
  const row={...s,ID:id,...Object.fromEntries(education.map(f=>[f,candidate?.[f]??'']))};
  if(changed){corrections.push({id,page,source:s,previous:candidate??null,reason:candidate?'source-gloss-or-example-correction':'source-word-or-reading-correction'});pending.push(row);}
  return row;
 });
 pages.push({page,sourceHash:draft.sourceHash,notes:rows});
}
fs.writeFileSync(path.join(n2Root,'source-corrections.json'),JSON.stringify(corrections,null,2));
const replacements=path.join(n2Root,'education-repairs.jsonl');
const previous=fs.existsSync(replacements)?fs.readFileSync(replacements,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
const repaired=new Map(previous.map(r=>[r.ID,r]));
const queue=pending.filter(r=>!repaired.has(r.ID)),batches=[];while(queue.length)batches.push(queue.splice(0,24));
const schema={type:'object',additionalProperties:false,required:['notes'],properties:{notes:{type:'array',items:{type:'object',additionalProperties:false,required:['ID',...education],properties:Object.fromEntries(['ID',...education].map(k=>[k,{type:'string'}]))}}}};
await Promise.all(Array.from({length:3},async()=>{
 while(batches.length){const batch=batches.shift();
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4.1-mini-2025-04-14',store:false,temperature:0,max_output_tokens:14000,input:[{role:'system',content:'Author NEW natural short N2 Japanese study examples for the exact source word, reading and Korean meaning. Return each ID unchanged. Hint is Korean and does not repeat the answer. Sentence is natural Japanese. Sentence_Reading is the FULL kana reading matching the sentence exactly (e.g. 仕方ない is しかたない). Sentence_Meaning is accurate Korean. Grammar_Note is a short accurate Korean explanation. A dictionary な-adjective headword ending in だ loses だ before な: 新ただ -> 新たな, never 新ただな. Preserve the meaning of the supplied gloss, do not substitute a visually similar kanji or another dictionary word.'},{role:'user',content:JSON.stringify(batch.map(n=>({ID:n.ID,Word:n.Word,Word_Reading:n.Word_Reading,Word_Meaning:n.Word_Meaning})))}],text:{format:{type:'json_schema',name:'education_repair',strict:true,schema}}}),signal:AbortSignal.timeout(180000)});
  if(!r.ok)throw Error('N2 education correction API '+r.status);
  const result=await r.json();if(result.status!=='completed')throw Error('Incomplete education corrections');
  const text=result.output.flatMap(o=>o.content??[]).filter(c=>c.type==='output_text').map(c=>c.text).join(''),fixed=JSON.parse(text).notes;
  if(fixed.length!==batch.length||new Set(fixed.map(n=>n.ID)).size!==batch.length)throw Error('Education correction count differs');
  for(const n of fixed){if(!batch.some(s=>s.ID===n.ID)||education.some(f=>!n[f])||/[一-龠々]/.test(n.Sentence_Reading))throw Error('Invalid education repair');repaired.set(n.ID,n);fs.appendFileSync(replacements,JSON.stringify(n)+'\n');}
  console.log(JSON.stringify({educationCorrected:fixed.length,costs:costs()}));
 }
}));
for(const p of pages){
 for(const n of p.notes)if(repaired.has(n.ID))Object.assign(n,repaired.get(n.ID));
 fs.writeFileSync(path.join(resultDir,`page-${String(p.page).padStart(3,'0')}.json`),JSON.stringify(p,null,2));
}
console.log(JSON.stringify({pages:pages.length,sourceCorrections:corrections.length,sourceRows:pages.reduce((n,p)=>n+p.notes.length,0),uncertainSource:pages.flatMap(p=>p.notes).filter(n=>n.uncertain).length}));
