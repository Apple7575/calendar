import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawn} from 'node:child_process';
const here=path.dirname(fileURLToPath(import.meta.url)),out=path.resolve(here,'../../output/book-pages');
const pages=Array.from({length:38},(_,i)=>i+6);let failed=false,completed=0;
function spent(){
 if(!fs.existsSync(out))return 0;
 const ledger=path.join(out,'attempts.jsonl');
 const records=fs.existsSync(ledger)?fs.readFileSync(ledger,'utf8').trim().split('\n').filter(Boolean).map(line=>JSON.parse(line)):[];
 // Earlier completed files predate the request ledger. Conservatively add their costs too.
 const existing=fs.readdirSync(out).filter(n=>/-(MODEL-REVIEWED|GENERATED-NEEDS-REVIEW)\.json$/.test(n)).map(n=>JSON.parse(fs.readFileSync(path.join(out,n),'utf8')));
 return [...records,...existing].reduce((sum,row)=>sum+(row.usage?.input_tokens??0)*0.4/1e6+(row.usage?.output_tokens??0)*1.6/1e6,0)+0.08;
}
async function job(page,review){
 if(spent()>2.8)throw Error('Text generation budget guard: $3 estimated maximum.');
 await new Promise((resolve,reject)=>{const p=spawn(process.execPath,[path.join(here,'prepare-book-page.mjs'),`--page=${page}`,...(review?['--review']:[])],{stdio:['ignore','pipe','pipe'],windowsHide:true});let output='',error='';p.stdout.on('data',c=>output+=c);p.stderr.on('data',c=>error+=c);p.on('error',reject);p.on('close',code=>code===0?resolve():reject(Error(`Page ${page}, review=${review}: ${error.slice(0,1000)}`)));});
}
await Promise.all(Array.from({length:3},async()=>{while(pages.length&&!failed){const page=pages.shift();try{await job(page,false);await job(page,true);completed++;console.log(JSON.stringify({page,sourceModelReviewed:true,completed,total:38,estimatedTextUSD:Number(spent().toFixed(4))}));}catch(e){failed=true;console.error(e.message);}}}));
if(failed)process.exitCode=1;else console.log(JSON.stringify({complete:true,pages:completed,estimatedTextUSD:spent(),humanReviewComplete:false,audioGenerated:false}));
