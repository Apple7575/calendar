import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {n2Root,costs} from './n2-budget.mjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const from=Number(process.argv.find(a=>a.startsWith('--from='))?.split('=')[1]??2),to=Number(process.argv.find(a=>a.startsWith('--to='))?.split('=')[1]??43);
const pages=Array.from({length:42},(_,i)=>i+2).filter(p=>p>=from&&p<=to);
let failed=false,completed=0;
async function job(page,review){
 await new Promise((resolve,reject)=>{
  const p=spawn(process.execPath,[path.join(here,'prepare-n2-page.mjs'),`--page=${page}`,...(review?['--review']:[])],{stdio:['ignore','pipe','pipe'],windowsHide:true});
  let output='',error='';p.stdout.on('data',c=>output+=c);p.stderr.on('data',c=>error+=c);
  p.on('error',reject);p.on('close',code=>code===0?resolve():reject(Error(`N2 page ${page}, review=${review}: ${error.slice(0,1000)}`)));
 });
}
await Promise.all(Array.from({length:3},async()=>{
 while(pages.length&&!failed){
  const page=pages.shift();console.log(JSON.stringify({startingPage:page,completed,total:42}));
  try{await job(page,false);await job(page,true);completed++;
   fs.writeFileSync(path.join(n2Root,'text-progress.json'),JSON.stringify({completed,total:42,lastCompletedPage:page,costs:costs(),humanAllPageReview:false},null,2));
   console.log(JSON.stringify({page,completed,total:42,costs:costs()}));
  }catch(e){failed=true;console.error(e.message);}
 }
}));
if(failed)process.exitCode=1;
