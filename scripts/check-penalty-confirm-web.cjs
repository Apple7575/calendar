// 벌점 확인과 휴식 조건 검수: 벌점이 붙는 경로마다 먼저 묻는지, 돌아온 직후 휴식이 막히는지 390x844, 844x390에서 찍고 잰다.
// 격리된 브라우저 컨텍스트와 예시 데이터만 사용한다. 유료 호출이 없다. iOS 실기기 검증을 대신하지 않는다.
// 사용: $env:PREVIEW_PORT='8123'; node scripts/check-penalty-confirm-web.cjs
const {previewUrl}=require('./lib/preview-url.cjs');
const fs=require('fs');
const {chromium}=require('C:/Users/SSAFY/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const out='.expo/penalty-confirm';
fs.mkdirSync(out,{recursive:true});
const DEMO='routine.v1.web-priority-demo',SHOWN='focus.questions.shown.v1';
const SIZES=[[390,844],[844,390]];
const errors=[],report=[];
const check=(ok,message)=>{if(!ok)errors.push(message)};

/** 눈에 보이는 버튼끼리, 말풍선과 버튼이 겹치는지, 가로로 넘치는지 잰다. */
async function measure(page,name,selector){
 const r=await page.evaluate(selector=>{
  const seen=e=>{const b=e.getBoundingClientRect();return b.width>0&&b.height>0&&!e.closest('[aria-hidden=true]')};
  const target=selector?[...document.querySelectorAll('div[dir=auto]')].find(e=>e.textContent.includes(selector)):document.querySelector('[data-testid=mascot-bubble]');
  const hits=[];
  if(target){const b=target.getBoundingClientRect();for(const e of document.querySelectorAll('[role=button],button,input,textarea')){if(e===target||e.contains(target)||target.contains(e)||!seen(e))continue;const o=e.getBoundingClientRect();if(b.left<o.right&&o.left<b.right&&b.top<o.bottom&&o.top<b.bottom)hits.push((e.getAttribute('aria-label')||e.textContent||e.tagName).trim().slice(0,24));}}
  return {found:!!target,text:target?.textContent,hits,wide:document.documentElement.scrollWidth>innerWidth};
 },selector);
 report.push({name,...r});
 check(r.found,name+': 찾을 수 없다');
 if(r.found)check(r.hits.length===0,name+': 겹치는 버튼 '+r.hits.join(', '));
 check(!r.wide,name+': 가로 넘침');
}
async function shots(page,name,selector){
 for(const [width,height] of SIZES){
  await page.setViewportSize({width,height});
  await page.waitForTimeout(300);
  await page.screenshot({path:`${out}/${name}-${width}x${height}.png`});
  await measure(page,`${name} ${width}x${height}`,selector);
 }
 await page.setViewportSize({width:390,height:844});
 await page.waitForTimeout(150);
}

(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const open=async()=>{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  await page.goto(previewUrl('/?priorityDemo=1'),{waitUntil:'networkidle',timeout:300000});
  return page;
 };
 const btn=(p,name)=>p.getByRole('button',{name,exact:true});
 const shown=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)||'null'),SHOWN);
 const timer=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)).bookTimer,DEMO);
 const penalties=p=>p.evaluate(k=>(JSON.parse(localStorage.getItem(k)).focusPenalties??[]).length,DEMO);
 const seed=(p,seconds)=>p.evaluate(([k,seconds])=>{const s=JSON.parse(localStorage.getItem(k)),now=Date.now();s.bookTimer={...s.bookTimer,focusElapsed:seconds,focusResumedAt:now,running:true,endsAt:now+60000};localStorage.setItem(k,JSON.stringify(s));},[DEMO,seconds]);
 const studying=async(seconds)=>{const p=await open();await btn(p,'2분, 이 행동부터 시작').click();await p.getByTestId('focus-clock').waitFor();await seed(p,seconds);await p.reload({waitUntil:'networkidle'});return p;};
 const backToClock=async p=>{await btn(p,'집중 공부로 시간 모으기').click();await p.getByTestId('focus-clock').waitFor();await p.waitForTimeout(350);};
 const step=async(name,fn)=>{try{await fn();}catch(e){errors.push(name+': '+String(e.message).split('\n')[0]);}};
 const QUIT_ROW=/^이 과목 공부 마치기 · 벌점/;

 await step('rest',async()=>{
  const p=await studying(130);await backToClock(p);
  check(await p.getByRole('button',{name:'휴식 · +2분',exact:true}).count()===1,'휴식 버튼에 받을 분이 없다');
  await p.getByRole('button',{name:/^휴식/}).click();
  await btn(p,'쉬는 시간 건너뛰고 공부하기').click();await p.waitForTimeout(400);
  check(await p.getByRole('button',{name:/^휴식/}).count()===0,'돌아오자마자 휴식 버튼이 있다');
  check(await p.getByText(/더 공부하면 휴식할 수 있어요/).count()===1,'막힌 이유 안내가 없다');
  check(await p.getByRole('button',{name:'필기 사진 제출',exact:true}).count()===0,'휴식이 단계를 정산했는데 같은 단계로 사진을 낼 수 있다');
  await shots(p,'rest-gate','더 공부하면 휴식');
  const before=await timer(p);check(before.restedCredit>0,'저장값이 없다: '+JSON.stringify(before));
  await p.reload({waitUntil:'networkidle'});await backToClock(p);
  check(await p.getByRole('button',{name:/^휴식/}).count()===0,'다시 열었더니 휴식 버튼이 생겼다');
  await p.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k));s.bookTimer={...s.bookTimer,focusElapsed:305,focusResumedAt:Date.now()};localStorage.setItem(k,JSON.stringify(s));},DEMO);
  await p.reload({waitUntil:'networkidle'});await backToClock(p);
  check(await p.getByRole('button',{name:/^휴식/}).count()===1,'단계만큼 다시 공부해도 휴식 버튼이 없다');
  check(await p.getByText(/더 공부하면 휴식할 수 있어요/).count()===0,'열렸는데 안내가 남았다');
  await p.context().close();
 });

 await step('shared count',async()=>{
  const p=await studying(90);await backToClock(p);
  await p.getByRole('button',{name:/^공부 마치기\s*벌점/}).click();await p.getByTestId('mascot-bubble').waitFor();
  await btn(p,'계속 공부').click();await p.waitForTimeout(150);
  check((await shown(p))?.quit===1,'집중 화면 횟수: '+JSON.stringify(await shown(p)));
  await btn(p,'다 했어요 · 사진으로 끝내기').click();
  const row=p.getByRole('button',{name:QUIT_ROW});await row.waitFor();
  await row.click();await p.getByTestId('mascot-bubble').waitFor();
  check(await penalties(p)===0,'묻기 전에 벌점이 붙었다');
  check((await shown(p))?.quit===2,'공유 횟수: '+JSON.stringify(await shown(p)));
  await p.getByRole('button',{name:/^마치기 · 벌점/}).scrollIntoViewIfNeeded();
  await shots(p,'book-study');
  await btn(p,'계속 공부').click();await p.waitForTimeout(150);
  check(await penalties(p)===0,'계속 공부인데 벌점이 붙었다');
  await p.getByRole('button',{name:QUIT_ROW}).click();await p.waitForTimeout(200);
  check(await p.getByTestId('mascot-bubble').count()===0,'세 번째에도 질문이 떴다');
  const again=p.getByRole('button',{name:/^한 번 더 누르면 마쳐요 · 벌점/});
  check(await again.count()===1,'세 번째 확인 문구가 없다');
  await again.click();await p.waitForTimeout(300);
  check(await penalties(p)===1,'두 번 눌렀는데 벌점이 없다');
  await p.context().close();
 });

 await step('pause',async()=>{
  const p=await studying(90);await backToClock(p);
  await btn(p,'멈추고 메모').click();
  const skip=p.getByRole('button',{name:'지금은 메모 없이 멈추기',exact:true});await skip.waitFor();
  await skip.click();await p.getByTestId('mascot-bubble').waitFor();
  check(await penalties(p)===0,'메모 없이 멈추기가 바로 벌점을 붙였다');
  await shots(p,'pause');
  await skip.click();await p.waitForTimeout(400);
  check(await penalties(p)===1,'두 번째 누름에 벌점이 없다');
  await p.context().close();
 });

 await step('pause save',async()=>{
  const p=await studying(90);await backToClock(p);
  await btn(p,'멈추고 메모').click();
  await p.getByRole('textbox',{name:'이어갈 첫 행동',exact:true}).fill('33쪽부터');
  const save=p.getByRole('button',{name:'다음 행동 저장하고 잠깐 멈추기',exact:true});
  await save.click();await p.getByTestId('mascot-bubble').waitFor();
  check(await penalties(p)===0,'저장하고 멈추기가 바로 벌점을 붙였다');
  await btn(p,'계속 공부').click();await p.getByTestId('focus-clock').waitFor();
  check(await penalties(p)===0,'계속 공부로 돌아왔는데 벌점이 붙었다');
  await p.context().close();
 });

 await step('home other task',async()=>{
  const p=await studying(90);
  await btn(p,'오늘의 다른 공부 보기').click();
  const row=p.getByRole('button',{name:/^2순위 .* 열기$/});await row.waitFor();
  await row.click();await p.getByTestId('mascot-bubble').waitFor();
  check(await penalties(p)===0,'홈에서 다른 공부 시작이 바로 벌점을 붙였다');
  const go=p.getByRole('button',{name:/^마치고 시작 · 벌점/});check(await go.count()===1,'마치고 시작 버튼이 없다');
  await go.scrollIntoViewIfNeeded();
  await shots(p,'home');
  await btn(p,'계속 공부').click();await p.waitForTimeout(150);
  check(await penalties(p)===0,'계속 공부인데 벌점이 붙었다');
  await p.context().close();
 });

 await step('free',async()=>{
  const p=await studying(30);await backToClock(p);
  await btn(p,'다 했어요 · 사진으로 끝내기').count();
  const quit=btn(p,'공부 마치기');await quit.click();await p.waitForTimeout(400);
  check(await p.getByTestId('mascot-bubble').count()===0,'면제인데 질문이 떴다');
  check(await penalties(p)===0,'면제인데 벌점이 붙었다');
  check((await shown(p))?.quit===undefined,'면제인데 횟수를 썼다');
  await p.context().close();
 });

 await browser.close();
 fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,1));
 for(const r of report)console.log(r.name,'|',r.text,'| hits='+JSON.stringify(r.hits));
 console.log('errors',errors.length);errors.forEach(e=>console.log(' -',e));
 process.exit(errors.length?1:0);
})();
