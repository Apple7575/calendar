// Use the independent decoder's actual PCM for the remaining cross-decoder edge outliers.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{execFileSync}=require('child_process');
const {chromium}=require('C:/Users/SSAFY/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const folder=path.resolve(__dirname,'../../output/vocabulary/n2-20261102/audio'),mf=path.join(folder,'manifest.json'),m=JSON.parse(fs.readFileSync(mf)),audit=JSON.parse(fs.readFileSync(path.join(folder,'file-audit.json')));
const candidates=new Set(audit.results.filter(r=>r.leadingSilence>.15||r.trailingSilence>.15).map(r=>r.audioHash));
const binary=path.resolve('.expo/audio-tools/imageio_ffmpeg/binaries'),ffmpeg=path.join(binary,fs.readdirSync(binary).find(f=>f.endsWith('.exe')));
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage();await page.goto('about:blank');await page.evaluate(()=>window.__ctx=new AudioContext({sampleRate:24000}));
 const backup=path.join(folder,'manifest.before-browser-edges.json');if(!fs.existsSync(backup))fs.copyFileSync(mf,backup);
 for(const job of m.jobs.filter(j=>candidates.has(j.audioHash))){
  const bytes=fs.readFileSync(path.join(folder,job.file));if(crypto.createHash('sha256').update(bytes).digest('hex')!==job.audioHash)throw Error('Hash changed');
  const decoded=await page.evaluate(async base64=>{
   const encoded=Uint8Array.from(atob(base64),c=>c.charCodeAt(0)),audio=await window.__ctx.decodeAudioData(encoded.buffer),samples=audio.getChannelData(0),rate=audio.sampleRate;
   let first=0,last=samples.length-1;while(first<samples.length&&Math.abs(samples[first])<.002)first++;while(last>first&&Math.abs(samples[last])<.002)last--;
   const begin=Math.max(0,first-Math.round(rate*.020)),end=Math.min(samples.length,last+1+Math.round(rate*.040));if(end-begin<rate*.1)throw Error('Unsafe voice window');
   const pcm=new Uint8Array(samples.slice(begin,end).buffer);let binary='';for(let i=0;i<pcm.length;i+=4096)binary+=String.fromCharCode(...pcm.subarray(i,i+4096));
   return {data:btoa(binary),rate,lead:begin/rate,tail:(samples.length-end)/rate};
  },bytes.toString('base64'));
  const temp=path.join(folder,'audio',job.noteId+'-'+job.kind+'-browser-tmp.mp3');
  execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-y','-f','f32le','-ar',String(decoded.rate),'-ac','1','-i','pipe:0','-c:a','libmp3lame','-b:a','128k','-write_xing','1','-map_metadata','-1',temp],{input:Buffer.from(decoded.data,'base64'),windowsHide:true});
  const out=fs.readFileSync(temp);fs.unlinkSync(temp);const hash=crypto.createHash('sha256').update(out).digest('hex'),file=`audio/${job.noteId}-${job.kind}-browser-tight-${hash.slice(0,12)}.mp3`;fs.writeFileSync(path.join(folder,file),out);
  job.previousAudioFiles=[...new Set([...(job.previousAudioFiles??[]),job.file])];Object.assign(job,{file,audioHash:hash,bytes:out.length,browserEdgeRefine:{lead:decoded.lead,tail:decoded.tail}});
 }
 fs.writeFileSync(mf,JSON.stringify(m,null,2));console.log(JSON.stringify({refined:candidates.size,originalsPreserved:true}));
}finally{await browser.close()}})().catch(e=>{console.error(e.stack);process.exitCode=1});
