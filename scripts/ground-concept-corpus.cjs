const fs=require('fs'),path=require('path'),{check}=require('./lib/concept-source-grounding.cjs');
const root=path.resolve('../output/concept-lab/n3-20261102'),jobs=JSON.parse(fs.readFileSync(path.join(root,'corpus/jobs.json'),'utf8'));
const pages=new Map();
for(let n=166;n<=374;n++){
 const ja=path.join(root,'pages',`${n}-ja.json`),ko=path.join(root,'pages',`${n}-ko.json`);if(!fs.existsSync(ja)||!fs.existsSync(ko))continue;
 const j=JSON.parse(fs.readFileSync(ja,'utf8').replace(/^\uFEFF/,'')),k=JSON.parse(fs.readFileSync(ko,'utf8').replace(/^\uFEFF/,''));
 const png=fs.readFileSync(path.join(root,'pages',`${n}.png`)),height=png.readUInt32BE(20),width=png.readUInt32BE(16);
 const top=line=>Math.min(...(line.words??[]).map(w=>w.y));
 const vocab=k.find(l=>/어휘|語彙/.test(l.text)&&top(l)>height*.3&&(l.words?.[0]?.x??width)<width*.2);
 const cutoff=vocab?top(vocab):height*.94;
 const body=j.filter(l=>top(l)<cutoff).map(l=>l.text).join('\n');
 const main=k.filter(l=>top(l)>height*.10&&top(l)<Math.min(cutoff,height*.60)).map(l=>l.text).join('');
 pages.set(n,{text:body,mainHangul:(main.match(/[가-힣]/g)??[]).length,mainKana:(main.match(/[ぁ-ゖァ-ヺ]/g)??[]).length,vocabCutoff:vocab?Math.round(cutoff):null});
}
const results=[];
const correctionFile=path.join(root,'corpus/visual-corrections.json'),corrections=fs.existsSync(correctionFile)?JSON.parse(fs.readFileSync(correctionFile,'utf8')):[];
for(const job of jobs.filter(j=>j.status==='complete')){const d=JSON.parse(fs.readFileSync(path.join(root,'corpus',`${job.id}-draft.json`),'utf8'));const context=job.images.map(n=>pages.get(n)?.text??'').join('\n');
 for(const fix of corrections.filter(c=>c.job===job.id)){const index=d.items.findIndex(i=>i.key===fix.item.key);if(index<0)d.items.push(fix.item);else d.items[index]=fix.item;}
 for(const item of d.items){const local=pages.get(item.page);if(!local){results.push({job:job.id,key:item.key,page:item.page,pass:false,reason:'로컬 OCR 대조 대기'});continue;}
  const quote=item.kind==='listening'?item.transcript||item.sourceText:item.kind==='reading'?item.text||item.sourceText:item.sourceText;
  results.push({job:job.id,key:item.key,page:item.page,...check({quote,localText:local.text,contextText:context,mainHangul:local.mainHangul,mainKana:local.mainKana,kind:item.kind}),koreanDominant:local.mainHangul>100&&local.mainHangul>5*Math.max(1,local.mainKana)});
 }
}
fs.writeFileSync(path.join(root,'corpus','ocr-grounding.json'),JSON.stringify({pages:pages.size,results,pageStats:Object.fromEntries([...pages].map(([n,p])=>[n,{hangul:p.mainHangul,kana:p.mainKana,vocabCutoff:p.vocabCutoff}]))},null,2));
console.log(JSON.stringify({ocrPages:pages.size,checked:results.length,passed:results.filter(r=>r.pass).length,held:results.filter(r=>!r.pass).length}));
