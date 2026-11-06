// 여러 장 필기 검수: 기다리는 사진 여러 장의 목록, 겹치는 장 표시와 빼기, 한 장 더 찍기(5장 상한), 하루 50장 안내를 390x844, 844x390에서 찍고 잰다.
// 예시 데이터에 기다리는 사진을 직접 넣는다. 카메라와 서버 인식은 웹에서 확인되지 않는다. iOS 실기기 검증을 대신하지 않는다.
// 사용: $env:PREVIEW_PORT='8123'; node scripts/check-multi-page-web.cjs
const {previewUrl}=require('./lib/preview-url.cjs');
const fs=require('fs');
const {chromium}=require('C:/Users/SSAFY/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const out='.expo/multi-page';
fs.mkdirSync(out,{recursive:true});
const DEMO='routine.v1.web-priority-demo',SIZES=[[390,844],[844,390]];
const errors=[],report=[];
const check=(ok,message)=>{if(!ok)errors.push(message)};
const hangul=(n,from)=>Array.from({length:n},(_,i)=>String.fromCharCode(0xAC00+from+i)).join('');
const page=(n,chars,from=n*1000)=>({imageHash:n.toString(16).padStart(64,'0'),analysis:{lines:[hangul(chars,from)],languages:['ko'],quality:'readable',message:''}});

async function measure(p,name){
 const r=await p.evaluate(()=>{
  const seen=e=>{const b=e.getBoundingClientRect();return b.width>0&&b.height>0&&!e.closest('[aria-hidden=true]')};
  const small=[...document.querySelectorAll('[role=button]')].filter(seen).map(e=>({l:(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,24),h:e.getBoundingClientRect().height})).filter(x=>x.h<43.5&&x.l!=='예시 초기화').map(x=>x.l+' '+Math.round(x.h));
  return {wide:document.documentElement.scrollWidth>innerWidth,small};
 });
 report.push({name,...r});check(!r.wide,name+': 가로 넘침');check(!r.small.length,name+': 작은 버튼 '+r.small.join(', '));
}
async function shots(p,name){
 for(const [width,height] of SIZES){await p.setViewportSize({width,height});await p.waitForTimeout(250);await p.screenshot({path:`${out}/${name}-${width}x${height}.png`,fullPage:true});await measure(p,`${name} ${width}x${height}`);}
 await p.setViewportSize({width:390,height:844});await p.waitForTimeout(100);
}
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const btn=(p,name)=>p.getByRole('button',{name,exact:true});
 const step=async(name,fn)=>{try{await fn();}catch(e){errors.push(name+': '+String(e.message).split('\n')[0]);}};
 const open=async(seed)=>{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const p=await context.newPage();p.on('pageerror',e=>errors.push('pageerror: '+e.message));
  await p.goto(previewUrl('/?priorityDemo=1'),{waitUntil:'networkidle',timeout:300000});
  await p.waitForFunction(k=>!!localStorage.getItem(k),DEMO,{timeout:30000});
  await btn(p,'2분, 이 행동부터 시작').click();await p.getByTestId('focus-clock').waitFor();
  await p.evaluate(([k,seed])=>{const s=JSON.parse(localStorage.getItem(k)),now=Date.now(),subject=s.bookTimer.subject;
   s.bookTimer={...s.bookTimer,focusElapsed:121,focusResumedAt:now,running:false,remaining:0,endsAt:now};
   const pages=seed.pages;s.handwritingPending={id:'multi-qa',imageHash:pages[0].imageHash,subject,analysis:pages[0].analysis,pages};
   if(seed.savedToday){const day=(d=>{if(d.getHours()<4)d.setDate(d.getDate()-1);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')})(new Date());
    s.handwritingReceipts=[...(s.handwritingReceipts||[]),...Array.from({length:seed.savedToday},(_,i)=>({id:'qa-old'+i,imageHash:(9000+i).toString(16).padStart(64,'0'),subject,at:new Date(now).toISOString(),day,lines:[String.fromCharCode(0xB000+i*3,0xB001+i*3,0xB002+i*3)],languages:['ko'],units:3,duplicateUnits:0,minutes:0,policyVersion:1,rewardStatus:'pending',rewardPolicy:'ramp-v2',focusCycle:s.focusRamp?.cycleId}))];}
   localStorage.setItem(k,JSON.stringify(s));},[DEMO,seed]);
  await p.reload({waitUntil:'networkidle'});
  await btn(p,'집중 공부로 시간 모으기').click();
  await p.getByText(/^읽은 내용을 확인해 주세요/).waitFor({timeout:15000});
  return p;
 };

 await step('two pages, one repeated',async()=>{
  const p=await open({pages:[page(1,120,0),{imageHash:'2'.padStart(64,'0'),analysis:page(1,120,0).analysis}]});
  check(await p.getByText('읽은 내용을 확인해 주세요 · 2장',{exact:true}).count()===1,'장 수 제목이 없다');
  check(await p.getByText('1장 · 새 글자 120자',{exact:true}).count()===1,'1장 줄이 없다');
  check(await p.getByText(/^2장 · 새 글자 0자 · 이미 기록한 내용이라 빼 주세요$/).count()===1,'겹치는 장 표시가 없다');
  const blocked=btn(p,'이미 기록한 장을 빼 주세요');
  check(await blocked.count()===1&&(await blocked.getAttribute('aria-disabled')==='true'||await blocked.isDisabled()),'겹치는 장이 있는데 제출할 수 있다');
  check(await p.getByRole('button',{name:/^한 장 더 찍기 · 2\/5장/}).count()===1,'한 장 더 찍기가 없다');
  await shots(p,'duplicate');
  await btn(p,'2장 빼기').click();await p.waitForTimeout(400);
  check(await p.getByText('읽은 내용을 확인해 주세요 · 1장',{exact:true}).count()===1,'빼기 뒤 장 수가 그대로다');
  check(await p.getByRole('button',{name:/^다 찍었어요/}).count()===1,'빼고 나서 제출 버튼이 없다');
  const left=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).handwritingPending?.pages?.length,DEMO);
  check(left===1,'저장된 장 수: '+left);
  await shots(p,'one-left');
  await p.context().close();
 });

 await step('five pages',async()=>{
  const p=await open({pages:[1,2,3,4,5].map(n=>page(n,30))});
  check(await p.getByRole('button',{name:/^한 장 더 찍기/}).count()===0,'5장인데 더 찍기가 있다');
  check(await p.getByRole('button',{name:/^다 찍었어요/}).count()===1,'5장 제출 버튼이 없다');
  await shots(p,'five');
  await p.context().close();
 });

 await step('fifty a day',async()=>{
  const p=await open({pages:[page(1,30)],savedToday:49});
  check(await p.getByText('오늘은 50장까지 찍을 수 있어요. 내일 다시 찍어 주세요.',{exact:true}).count()===1,'하루 상한 안내가 없다');
  check(await p.getByRole('button',{name:/^한 장 더 찍기/}).count()===0,'하루 상한인데 더 찍기가 있다');
  await shots(p,'daily-limit');
  await p.context().close();
 });

 await browser.close();
 fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,1));
 for(const r of report)console.log(r.name,JSON.stringify({wide:r.wide,small:r.small}));
 console.log('errors',errors.length);errors.forEach(e=>console.log(' -',e));
 process.exit(errors.length?1:0);
})();
