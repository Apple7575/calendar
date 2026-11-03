// Promote only explicit independent per-item approvals. Originals remain on disk.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const {sampleBook}=require('../src/lib/conceptLabContent.ts'),{validateCard}=require('../src/lib/conceptLab.ts');
const root=path.resolve('../output/concept-lab/n3-20261102/corpus'),jobs=JSON.parse(fs.readFileSync(path.join(root,'jobs.json'),'utf8'));
const normal=s=>String(s??'').normalize('NFKC').replace(/[\s〜～~·・。、:：/（）()]/g,'').toLowerCase();
const hash=s=>crypto.createHash('sha256').update(s).digest('hex').slice(0,12);
const out={extractions:[],concepts:[],cards:[],bundles:[],coverage:{}};
const existingConcepts=sampleBook.concepts.filter(c=>!c.id.startsWith('concept-pdf-')),existingCards=sampleBook.cards.filter(c=>!c.id.startsWith('lab_pdf_'));
const n3=new Set(JSON.parse(fs.readFileSync('assets/decks/n3-vocabulary.json','utf8')).notes.map(n=>normal(n.Word)));
const audio=JSON.parse(fs.readFileSync('assets/concept-lab/corpusListening.json','utf8'));
const correctionsFile=path.join(root,'visual-corrections.json'),corrections=fs.existsSync(correctionsFile)?JSON.parse(fs.readFileSync(correctionsFile,'utf8')):[];
const staged=[],pageReviews=[],excluded=[],holds=[];
const languagesFile=path.join(root,'page-language.json'),languages=fs.existsSync(languagesFile)?JSON.parse(fs.readFileSync(languagesFile,'utf8')):[];
const languageFixFile=path.join(root,'page-language-corrections.json');if(fs.existsSync(languageFixFile))for(const fix of JSON.parse(fs.readFileSync(languageFixFile,'utf8'))){const i=languages.findIndex(p=>p.page===fix.page);if(i<0)languages.push(fix);else languages[i]=fix;}
const groundingFile=path.join(root,'ocr-grounding.json'),grounding=fs.existsSync(groundingFile)?JSON.parse(fs.readFileSync(groundingFile,'utf8')):{results:[]};
const styleFile=path.join(root,'explanation-ko.json'),styles=fs.existsSync(styleFile)?JSON.parse(fs.readFileSync(styleFile,'utf8')):{};
Object.assign(styles,JSON.parse(fs.readFileSync('assets/concept-lab/editorialNotes.json','utf8')));
for(const job of jobs){
 if(job.status!=='complete')continue;
 const draft=JSON.parse(fs.readFileSync(path.join(root,`${job.id}-draft.json`),'utf8')),review=JSON.parse(fs.readFileSync(path.join(root,`${job.id}-review.json`),'utf8'));
 pageReviews.push(...review.pages.map(p=>({...p,job:job.id,unitId:job.unit.id})));
 const items=draft.items.map(i=>({...i}));
 for(const fix of corrections.filter(c=>c.job===job.id)){const index=items.findIndex(i=>i.key===fix.item.key);if(index<0)items.push(fix.item);else items[index]=fix.item;}
 for(const item of items){const fix=corrections.find(c=>c.job===job.id&&c.item.key===item.key),ground=grounding.results.find(r=>r.job===job.id&&r.key===item.key),audioOnlyHold=item.kind==='listening'&&item.transcript&&/음원|원음|오디오/.test(item.reason??'')&&!/판독|누락|오염|불완전|불명/.test(item.reason??''),approved=(!!fix?.visualCompared||((item.status===undefined||item.status==='ready'||audioOnlyHold)&&review.approved.includes(item.key)&&!review.held.some(h=>h.key===item.key)))&&ground?.pass===true;
  if(!job.core.includes(item.page)){holds.push({job:job.id,key:item.key,reason:'outside core'});continue;}
  const language=languages.find(p=>p.page===item.page);
  if(item.page>=226&&language?.kind!=='japanese_source'){excluded.push({page:item.page,key:item.key,reason:language?`원문 문제 제외: ${language.kind} · ${language.proof}`:'페이지 언어·해석 중복 검수 대기'});continue;}
  const id=`lab_pdf_p${item.page}_${hash(item.kind+'|'+item.anchor+'|'+item.sourceText+'|'+item.label+'|'+item.prompt)}`;
  const evidenceId=`ex-${id}`,reason=approved?'':ground?.pass!==true?(ground?.reason??'로컬 OCR 근거 대조 대기'):item.reason??review.held.find(h=>h.key===item.key)?.reason??'독립 검수 미승인';
  const source={pdfPage:item.page,printedPage:Number.isInteger(item.printedPage)?item.printedPage:null,region:item.anchor||item.key,status:approved?'model_visual_reviewed':'needs_review'};
  out.extractions.push({id:evidenceId,unitId:job.unit.id,source,representation:item.kind==='concept'?'structured_excerpt':'verbatim',text:item.sourceText||'',kind:item.kind==='concept'?'grammar':item.kind==='listening'?'dialogue':'passage',...(reason?{uncertain:[reason]}:{})});
  staged.push({job,item,id,evidenceId,approved,reason,visualCompared:!!fix?.visualCompared});
 }
}
const conceptsByLabel=new Map();
for(const c of existingConcepts){const meaning=existingCards.find(card=>card.conceptId===c.id&&card.id.endsWith('_meaning'))?.answer??'';const key=normal(c.label)+'|'+normal(meaning);conceptsByLabel.set(key,c);}
const meaningIndex=new Map();
for(const s of staged.filter(s=>s.item.kind==='concept'&&s.job.unit.id==='g-concept')){
 const {item,job,id,evidenceId}=s,key=normal(item.label)+'|'+normal(item.meaning);let concept=conceptsByLabel.get(key);
 if(!concept){concept={id:`concept-pdf-${hash(key)}`,label:`${item.label} · ${item.meaning}`,domain:'grammar',unitId:job.unit.id,evidenceIds:[evidenceId],tags:['N3','textbook',job.unit.id]};conceptsByLabel.set(key,concept);out.concepts.push(concept);}
 s.concept=concept;const label=normal(item.label);if(!meaningIndex.has(label))meaningIndex.set(label,new Set());meaningIndex.get(label).add(normal(item.meaning));
}
const quality={natural:true,unambiguous:true,level:true,grounded:true,reviewer:'separate API source-image verification; no human review claim'};
function cleanPrompt(text){return String(text??'').replace(/^\s*\d{1,3}\s*\n/,'').replace(/[\[［]\s*[\]］]/g,'（　）').replace(/。(?=[^\n])/g,'。\n').trim();}
function makeCard(s,q,id,bundleId){
 const prompt=cleanPrompt(q.prompt),accepted=Array.isArray(q.accepted)?q.accepted.filter(a=>typeof a==='string'):[];
 const cue=s.job.unit.domain!=='listening'&&q.cue&&typeof q.cue.text==='string'&&!normal(prompt).includes(normal(q.cue.text))&&['seen','heard'].includes(q.cue.kind)?q.cue:undefined;
 const ability=s.job.unit.domain==='listening'?'listening':s.job.unit.domain==='reading'?'comprehension':s.job.unit.id==='g-order'?'order':s.job.unit.id==='g-text'?'cohesion':s.job.unit.id==='g-form'?'form':q.ability==='form'?'form':'grammar';
 let type=s.job.unit.domain==='listening'?'audio':['basic','reverse','cloze','transform','compare','apply'].includes(q.type)?q.type:'basic';
 if(type==='cloze'&&!/[（(]\s*[）)]|＿|___/.test(prompt))type='basic';
 let approved=s.approved,reason=s.reason;
 if(!prompt||!String(q.answer??'').trim()||!String(q.explanation??'').trim()){approved=false;reason='질문·답·해설 필수 필드 확인 필요';}
 if(prompt.length>360||String(q.explanation??'').length>400){approved=false;reason='짧은 카드 형식으로 정리 필요';}
 const choices=Array.isArray(q.choices)?q.choices:undefined;let answer=String(q.answer??'');const index=answer.normalize('NFKC').trim();if(choices&&/^[1-4a-dA-D]$/.test(index)){const position=/[a-d]/i.test(index)?index.toLowerCase().charCodeAt(0)-97:Number(index)-1;answer=choices.find(c=>c.normalize('NFKC').match(new RegExp('^\\s*'+index+'(?:[.．:：)）]|\\s)')))||choices[position]||answer;}
 const card={id,unitId:s.job.unit.id,ability,type,prompt:prompt||`PDF ${s.item.page}쪽 · 원문 질문 확인 필요`,answer:answer||'확인 필요',accepted,choices,rubric:'교재 근거와 의미·목표 문법이 맞으면 인정. 허용 답안 및 자연스러운 같은 의미의 응답은 자기 평가로 인정.',explanation:String(q.explanation??'')||'원문 질문·답·해설 확인이 필요한 보류 항목',hint:'문맥과 목표 표현을 확인해 보세요.',origin:'textbook',novel:false,status:approved?'ready':'needs_review',evidenceIds:[s.evidenceId],difficulty:'N3',assessment:'self',quality:{...quality,...(s.visualCompared?{reviewer:'working-model direct source comparison + local OCR; not human'}:{})},...(cue?{cue}:{}),...(bundleId?{bundleId}:{})};
 if(!approved)holds.push({id,page:s.item.page,reason});
 return card;
}
for(const s of staged){
 const {item,id,job,evidenceId}=s;
 if(item.kind==='concept'){
  if(job.unit.id!=='g-concept'){excluded.push({id,page:item.page,reason:'학습 전략 설명을 개념 암기 카드로 만들지 않음'});continue;}
  if(!item.label||!item.meaning){holds.push({id,reason:'missing concept fields'});continue;}
  if(n3.has(normal(item.label))&&!/[〜～~]/.test(item.label)){excluded.push({id,page:item.page,reason:'기존 N3에 있는 단어 뜻 카드 재제작 제외',label:item.label});continue;}
  if(existingCards.some(c=>c.conceptId===s.concept.id&&c.id.endsWith('_meaning')&&normal(c.answer)===normal(item.meaning))){excluded.push({id,page:item.page,reason:'기존 개념 뜻 카드 재사용',conceptId:s.concept.id});continue;}
  if(out.cards.some(c=>c.conceptId===s.concept.id&&c.ability==='grammar'&&normal(c.answer)===normal(item.meaning))){excluded.push({id,page:item.page,reason:'중복 개념 뜻 카드 통합',conceptId:s.concept.id});continue;}
  const example=String(item.sourceText??'').split('\n').map(l=>l.trim()).find(l=>/[。？！?]/.test(l)&&/[ぁ-ゖァ-ヺ一-龯]/.test(l)&&!/[가-힣]/.test(l)&&l.length<=140);
  const card=makeCard(s,{prompt:[example,`${item.label} → ${example?'이 문장에서의 뜻?':'핵심 뜻?'}`].filter(Boolean).join('\n'),answer:item.meaning,accepted:[item.meaning],explanation:[item.meaning,item.connection].filter(Boolean).join('\n'),type:'basic'},id);
  card.conceptId=s.concept.id;
  if((meaningIndex.get(normal(item.label))?.size??0)>1&&!example){card.status='needs_review';holds.push({id,page:item.page,reason:'여러 뜻을 구분할 원문 문맥 필요'});}
  out.cards.push(card);
 }else if(item.kind==='question'){
  const card=makeCard(s,item,id);const candidates=[...conceptsByLabel.entries()].filter(([key])=>normal(item.answer)===key.split('|')[0]);
  if(candidates.length===1&&job.unit.domain==='grammar')card.conceptId=candidates[0][1].id;
  out.cards.push(card);
 }else if(item.kind==='reading'||item.kind==='listening'){
  if(!Array.isArray(item.questions)||!item.questions.length){holds.push({id,page:item.page,reason:item.reason??'질문 또는 대본 확인 필요'});continue;}
  const bundleId=`bundle-${id}`,assetId=`audio-${id}`,bundle={id:bundleId,unitId:job.unit.id,kind:item.kind,origin:'textbook',text:String(item.text??''),...(item.transcript?{transcript:String(item.transcript)}:{}),questionIds:[]};
  if(item.kind==='listening'){bundle.text='';bundle.audioAssetId=assetId;if(!item.transcript||!audio[assetId])bundle.blockedReason=!item.transcript?'읽을 수 있는 대본 없음 · 원문을 추측해 복원하지 않음':'합성 음성 제작·재전사 확인 대기';}
  if(item.kind==='reading'&&!bundle.text)bundle.blockedReason='지문 확인 필요';
  for(const [i,q]of item.questions.entries()){const card=makeCard(s,q,`${id}_q${i+1}`,bundleId);if(item.kind==='listening')card.audioAssetId=assetId;if(bundle.blockedReason){card.status='needs_review';holds.push({id:card.id,page:item.page,reason:bundle.blockedReason});}bundle.questionIds.push(card.id);out.cards.push(card);}
  if(out.cards.some(c=>c.bundleId===bundleId&&c.status!=='ready')){bundle.blockedReason=bundle.blockedReason??'묶음에 확인이 필요한 질문 있음';for(const c of out.cards.filter(c=>c.bundleId===bundleId))c.status='needs_review';}
  out.bundles.push(bundle);
 }
}
const fullBook={...sampleBook,cards:[...existingCards,...out.cards],concepts:[...existingConcepts,...out.concepts],extractions:[...sampleBook.extractions.filter(e=>!e.id.startsWith('ex-lab_pdf_')),...out.extractions],bundles:[...sampleBook.bundles.filter(b=>!b.id.startsWith('bundle-lab_pdf_')),...out.bundles]};
for(const card of out.cards)if(typeof styles[card.id]==='string'){card.explanation=styles[card.id];card.explanationOrigin='ai';}
for(const card of out.cards.filter(c=>c.status==='ready')){const errors=validateCard(card,fullBook);if(errors.length){card.status='needs_review';holds.push({id:card.id,reason:'앱 검증: '+errors.join(', ')});}}
for(const bundle of out.bundles)if(out.cards.some(c=>c.bundleId===bundle.id&&c.status!=='ready')){bundle.blockedReason=bundle.blockedReason??'묶음 질문 검증 보류';for(const c of out.cards.filter(c=>c.bundleId===bundle.id))c.status='needs_review';}
const unique=(rows,name)=>{const ids=new Set();for(const r of rows){if(ids.has(r.id))throw Error(`Duplicate ${name}: ${r.id}`);ids.add(r.id);}};for(const k of ['extractions','concepts','cards','bundles'])unique(out[k],k);
out.coverage={at:new Date().toISOString(),sourceHash:sampleBook.sourceHash,totalPages:209,processedPages:jobs.filter(j=>j.status==='complete').reduce((n,j)=>n+j.core.length,0),completeBatches:jobs.filter(j=>j.status==='complete').length,totalBatches:jobs.length,failed:jobs.filter(j=>j.status==='failed').map(j=>({id:j.id,error:j.error})),pendingBatches:jobs.filter(j=>j.status==='pending').length,pageReviews,excluded,holds,rawItems:staged.length,ready:out.cards.filter(c=>c.status==='ready').length,held:out.cards.filter(c=>c.status!=='ready').length,allPagesReviewed:jobs.every(j=>j.status==='complete'),sourceExtractionComplete:jobs.every(j=>j.status==='complete')&&pageReviews.every(p=>p.status!=='partial'),byUnit:jobs.reduce((a,j)=>{a[j.unit.id]??={pages:0,ready:0,held:0};a[j.unit.id].pages+=j.status==='complete'?j.core.length:0;return a;},{})};
for(const card of out.cards){out.coverage.byUnit[card.unitId][card.status==='ready'?'ready':'held']++;}
fs.writeFileSync('assets/concept-lab/sourceCorpus.json',JSON.stringify(out,null,2)+'\n');fs.writeFileSync(path.join(root,'packaged-coverage.json'),JSON.stringify(out.coverage,null,2));console.log(JSON.stringify({processedPages:out.coverage.processedPages,rawItems:staged.length,ready:out.coverage.ready,held:out.coverage.held,excluded:excluded.length}));
