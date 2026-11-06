// 다음 공부 예약 검수 (S1-10): 마치면 한 번 묻고, 고르면 저장되고, 타이머의 시작 버튼이 같은 과목으로 바로 시작하는지,
// "오늘은 끝"·닫기 뒤에는 다시 묻지 않는지 390x844, 360x740에서 찍고 잰다.
// 격리된 브라우저 컨텍스트와 예시 데이터만 사용한다. 유료 호출이 없다. 웹에서는 알림이 걸리지 않으니 알림은 iOS 실기기에서 확인한다.
// 사용: $env:PREVIEW_PORT='8123'; node scripts/check-next-study-web.cjs
const {previewUrl}=require('./lib/preview-url.cjs');
const fs=require('fs');
const {chromium}=require('C:/Users/SSAFY/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const out='.expo/next-study';
fs.mkdirSync(out,{recursive:true});
const DEMO='routine.v1.web-priority-demo';
const errors=[],report=[];
const check=(ok,message)=>{if(!ok)errors.push(message);};

(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const btn=(p,name)=>p.getByRole('button',{name,exact:true});
 const saved=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),DEMO);
 const open=async()=>{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  await page.goto(previewUrl('/?priorityDemo=1'),{waitUntil:'networkidle',timeout:300000});
  return page;
 };
 const toClock=async p=>{await p.getByRole('button',{name:/^(집중 공부로 시간 모으기|이어서 집중하기)/}).first().click();await p.getByTestId('focus-clock').waitFor();await p.waitForTimeout(350);};
 /** 30초 공부한 상태에서 "공부 마치기" (단계 전이라 벌점 없음). */
 const finishStudy=async()=>{
  const p=await open();
  await btn(p,'2분, 이 행동부터 시작').click();await p.getByTestId('focus-clock').waitFor();
  await p.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k)),now=Date.now();s.bookTimer={...s.bookTimer,focusElapsed:30,focusResumedAt:now,running:true,endsAt:now+60000};localStorage.setItem(k,JSON.stringify(s));},DEMO);
  await p.reload({waitUntil:'networkidle'});await toClock(p);
  await btn(p,'공부 마치기').click();
  await p.getByTestId('next-study').waitFor({timeout:15000});
  return p;
 };
 const step=async(name,fn)=>{try{await fn();}catch(e){errors.push(name+': '+String(e.message).split('\n')[0]);}};

 await step('ask and reserve',async()=>{
  const p=await finishStudy();globalThis.lastPage=p;
  const labels=await p.getByTestId('next-study').getByRole('button').allInnerTexts();
  check(labels.some(l=>/^10분 뒤 · \d+:\d\d$/.test(l))&&labels.some(l=>/^30분 뒤/.test(l))&&labels.includes('오늘은 끝'),'선택지가 다르다: '+labels.join(' | '));
  check(await p.getByText(/벌점은 없어요/).count()===1,'벌점 없음 안내가 없다');
  for(const [width,height] of [[390,844],[360,740]]){
   await p.setViewportSize({width,height});await p.waitForTimeout(250);
   await p.screenshot({path:`${out}/ask-${width}x${height}.png`});
   const r=await p.evaluate(()=>({wide:document.documentElement.scrollWidth>innerWidth,small:[...document.querySelectorAll('[role=button]')].filter(e=>{const b=e.getBoundingClientRect();return b.width>0&&b.height<44}).map(e=>e.textContent)}));
   report.push({name:`ask ${width}x${height}`,...r});
   check(!r.wide,`ask ${width}: 가로 넘침`);
  }
  await p.setViewportSize({width:390,height:844});
  await p.getByRole('button',{name:/^30분 뒤/}).click();
  await p.getByTestId('next-study').waitFor({state:'detached'});
  const row=(await saved(p)).studyReservations.at(-1);
  check(row?.choice==='30m'&&row.at-row.answeredAt===30*60000,'30분 예약이 저장되지 않았다: '+JSON.stringify(row));
  const subject=row?.subject;
  check(((await saved(p)).focusPenalties?.length??0)===0,'예약에 벌점이 붙었다');
  await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(800);
  check(await p.getByTestId('next-study').count()===0,'답한 뒤 다시 물었다');
  // 알림을 누르면 열리는 타이머의 시작 버튼은 웹에서 열 수 없어 jest(startReservedStudy)와 실기기에서 확인한다.
  await p.context().close();
 });

 await step('done for today',async()=>{
  const p=await finishStudy();
  await btn(p,'오늘은 끝').click();
  await p.getByTestId('next-study').waitFor({state:'detached'});
  const row=(await saved(p)).studyReservations.at(-1);
  check(row?.choice==='none'&&row.at===undefined,'"오늘은 끝"이 저장되지 않았다');
  await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(800);
  check(await p.getByTestId('next-study').count()===0,'"오늘은 끝" 뒤 다시 물었다');
  await p.context().close();
 });

 await step('close',async()=>{
  const p=await finishStudy();
  await p.getByRole('button',{name:'닫기',exact:true}).last().click();
  await p.getByTestId('next-study').waitFor({state:'detached'});
  await p.waitForTimeout(300);
  const row=(await saved(p)).studyReservations.at(-1);
  check(typeof row?.closedAt==='number'&&row.choice===undefined,'닫기가 저장되지 않았다');
  await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(800);
  check(await p.getByTestId('next-study').count()===0,'닫은 뒤 다시 물었다');
  await p.context().close();
 });

 await browser.close();
 fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,1));
 for(const r of report)console.log(r.name,JSON.stringify({wide:r.wide,small:r.small}));
 console.log('errors',errors.length);for(const e of errors)console.log(' -',e);
 process.exit(errors.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
