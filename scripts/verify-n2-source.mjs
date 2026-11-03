import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {n2Root,costs} from './n2-budget.mjs';
import './n2-metered-fetch.mjs';
const queue=Array.from({length:42},(_,i)=>i+2),dir=path.join(n2Root,'source-verified');fs.mkdirSync(dir,{recursive:true});
const schema={type:'object',additionalProperties:false,required:['page','notes'],properties:{page:{type:'integer'},notes:{type:'array',items:{type:'object',additionalProperties:false,required:['column','row','Word','Word_Reading','Word_Meaning','printedReading','uncertain','reason'],properties:{column:{type:'integer'},row:{type:'integer'},Word:{type:'string'},Word_Reading:{type:'string'},Word_Meaning:{type:'string'},printedReading:{type:'boolean'},uncertain:{type:'boolean'},reason:{type:'string'}}}}}};
let failed=false;
await Promise.all(Array.from({length:6},async()=>{
 while(queue.length&&!failed){const page=queue.shift(),file=path.join(dir,`page-${String(page).padStart(3,'0')}.json`);if(fs.existsSync(file))continue;
  try{
   const base=path.resolve(n2Root,'../../../tmp/pdfs/n2-20261102');
   const images=[1,2].map(c=>({type:'input_image',detail:'high',image_url:'data:image/png;base64,'+fs.readFileSync(path.join(base,`column-${String(page).padStart(3,'0')}-${c}.png`)).toString('base64')}));
   const prompt=`This user-provided N2 vocabulary page ${page} is shown as TWO HIGH-RESOLUTION CROPS in LEFT then RIGHT column order. Independently transcribe EVERY checkbox vocabulary row. Do NOT author examples and do NOT use memorized vocabulary lists. Read the actual source word, printed kana and Korean gloss of EACH row. Distinguish 憐れむ (あわれむ) from 憧れる (あこがれる), and read Korean glosses exactly rather than guessing. Ignore section headers, the instruction checkbox near the top, footers and QR codes. column is 1 or 2; row starts at 1 in each column. Preserve repetitions as separate source rows. Word_Reading includes printed inflections/particles. If no reading is printed for a kana word, repeat that kana word as Word_Reading and printedReading=false. For な adjectives printed as e.g. 新ただ/あらただ, preserve source but flag grammar/example concerns in reason; do not mark a clearly legible source uncertain just because its dictionary notation is unusual. uncertain=true only for unreadable source, with a concrete reason. Return all rows in original left-column top-to-bottom then right-column top-to-bottom order.`;
   const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4.1-mini-2025-04-14',temperature:0,store:false,max_output_tokens:6500,input:[{role:'user',content:[{type:'input_text',text:prompt},...images]}],text:{format:{type:'json_schema',name:'source_only',strict:true,schema}}}),signal:AbortSignal.timeout(180000)});
   if(!r.ok)throw Error('Source verification API '+r.status);
   const result=await r.json(),text=result.output?.flatMap(o=>o.content??[]).filter(c=>c.type==='output_text').map(c=>c.text).join('');
   if(result.status!=='completed')throw Error('Incomplete source verification');
   const parsed=JSON.parse(text);if(parsed.page!==page||parsed.notes.length<5||parsed.notes.length>100)throw Error('Source row count invalid');
   const rowSet=new Set(parsed.notes.map(n=>`${n.column}:${n.row}`));if(rowSet.size!==parsed.notes.length)throw Error('Duplicate source row position');
   fs.writeFileSync(file,JSON.stringify({...parsed,sourceMethod:'independent-column-crop-transcription',usage:result.usage},null,2));
   console.log(JSON.stringify({sourceVerifiedPage:page,rows:parsed.notes.length,uncertain:parsed.notes.filter(n=>n.uncertain).length,costs:costs()}));
  }catch(e){failed=true;console.error(e.message);}
 }
}));
if(failed)process.exitCode=1;
