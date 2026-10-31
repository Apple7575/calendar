import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const out=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../output/tts-comparison');
const manifest=JSON.parse(fs.readFileSync(path.join(out,'manifest.json'),'utf8'));
if(manifest.generated!==120||manifest.jobs.some(j=>j.status!=='ready'))throw Error('Comparison is incomplete');
let html=fs.readFileSync(path.join(out,'index.html'),'utf8');
for(const job of manifest.jobs){
  const marker=`src="${job.file}"`;
  if(!html.includes(marker))throw Error(`Missing audio control: ${job.id}`);
  const encoded=fs.readFileSync(path.join(out,job.file)).toString('base64');
  html=html.replace(marker,`src="data:audio/mpeg;base64,${encoded}"`);
}
if((html.match(/src="data:audio\/mpeg;base64,/g)||[]).length!==120)throw Error('Embedded audio count mismatch');
const dest=path.join(out,'listen.html');fs.writeFileSync(dest,html);
console.log(JSON.stringify({embeddedAudio:120,bytes:fs.statSync(dest).size,path:dest}));
