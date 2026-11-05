// 집중 질문 검수: 하버드생(첫 계획)과 일론 머스크(벌점 마치기)의 말풍선을 390x844, 844x390에서 찍고 버튼 가림과 하루 횟수를 잰다.
// 격리된 브라우저 컨텍스트와 예시 데이터만 사용한다. 유료 호출이 없다. iOS 실기기 검증을 대신하지 않는다.
// 사용: $env:PREVIEW_PORT='8123'; node scripts/check-focus-questions-web.cjs
const {previewUrl}=require('./lib/preview-url.cjs');
const fs=require('fs');
const {chromium}=require('C:/Users/SSAFY/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const out='.expo/focus-questions';
fs.mkdirSync(out,{recursive:true});
const DEMO='routine.v1.web-priority-demo',SHOWN='focus.questions.shown.v1';
const SIZES=[[390,844],[844,390]];
const errors=[],report=[];
const check=(ok,message)=>{if(!ok)errors.push(message)};

/** 말풍선이 버튼·입력칸과 겹치는지, 화면 밖으로 나가는지, 가로로 넘치는지 잰다. */
async function measure(page,name){
 const r=await page.evaluate(()=>{
  const bubble=document.querySelector('[data-testid=mascot-bubble]');
  if(!bubble)return {bubble:null};
  const b=bubble.getBoundingClientRect(),hits=[];
  for(const e of document.querySelectorAll('[role=button],button,input,textarea')){
   if(e===bubble||bubble.contains(e)||e.closest('[aria-hidden=true]'))continue;
   const o=e.getBoundingClientRect();if(!o.width||!o.height)continue;
   if(b.left<o.right&&o.left<b.right&&b.top<o.bottom&&o.top<b.bottom)hits.push((e.getAttribute('aria-label')||e.textContent||e.tagName).trim().slice(0,24));
  }
  return {bubble:{left:b.left,right:b.right,top:b.top,bottom:b.bottom},text:bubble.textContent,hits,scrollWide:document.documentElement.scrollWidth>innerWidth,inside:b.left>=0&&b.right<=innerWidth&&b.top>=0};
 });
 report.push({name,...r});
 check(!!r.bubble,name+': 말풍선이 없다');
 if(r.bubble){check(r.hits.length===0,name+': 가리는 버튼 '+r.hits.join(', '));check(r.inside,name+': 화면 밖');check(!r.scrollWide,name+': 가로 넘침');check(/라면/.test(r.text)&&/\?$/.test(r.text),name+': 문구 '+r.text);}
}
async function shots(page,name){
 for(const [width,height] of SIZES){
  await page.setViewportSize({width,height});
  await page.waitForTimeout(350);
  await page.getByTestId('mascot-bubble').scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);
  await page.screenshot({path:`${out}/${name}-${width}x${height}.png`});
  await measure(page,`${name} ${width}x${height}`);
 }
 await page.setViewportSize({width:390,height:844});
 await page.waitForTimeout(200);
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
 const tab=(p,name)=>p.getByRole('tab',{name,exact:true});
 const shown=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)||'null'),SHOWN);
 const bubble=p=>p.getByTestId('mascot-bubble');
 try{
  // 계획: 하루 첫 계획에 한 번. 닫을 수 있고, 다시 열어도 또 뜨지 않는다. 계획 규칙은 그대로.
  const plan=await open();
  await tab(plan,'학습').click();await plan.waitForTimeout(300);await tab(plan,'집중').click();
  await bubble(plan).waitFor({timeout:15000});
  await shots(plan,'plan');
  check((await shown(plan))?.plan===1,'계획 질문 횟수: '+JSON.stringify(await shown(plan)));
  check(await btn(plan,'계획 저장').isDisabled(),'빈 계획의 저장 규칙이 바뀌었다');
  await bubble(plan).click();await plan.waitForTimeout(150);
  check(await bubble(plan).count()===0,'말풍선을 눌러도 닫히지 않는다');
  await plan.reload({waitUntil:'networkidle'});
  await tab(plan,'학습').click();await plan.waitForTimeout(300);await tab(plan,'집중').click();await plan.waitForTimeout(800);
  await plan.screenshot({path:`${out}/plan-again-390x844.png`});
  check(await bubble(plan).count()===0,'같은 날 계획 질문이 또 떴다');
  await plan.context().close();

  // 벌점 마치기: 하루 두 번, 세 번째는 지금과 같은 화면.
  const quit=await open();
  await btn(quit,'2분, 이 행동부터 시작').click();
  await quit.getByTestId('focus-clock').waitFor();
  const seed=async()=>{await quit.evaluate(key=>{const s=JSON.parse(localStorage.getItem(key)),now=Date.now();s.bookTimer={...s.bookTimer,focusElapsed:90,focusResumedAt:now,running:true,endsAt:now+30000};localStorage.setItem(key,JSON.stringify(s));},DEMO);await quit.reload({waitUntil:'networkidle'});await btn(quit,'집중 공부로 시간 모으기').click();await quit.getByTestId('focus-clock').waitFor();await quit.waitForTimeout(400);};
  const finish=()=>quit.getByRole('button',{name:/^공부 마치기\s*벌점/});
  await seed();
  check(await bubble(quit).count()===0,'누르기 전에 머스크 질문이 떴다');
  await quit.screenshot({path:`${out}/quit-before-390x844.png`});
  await finish().click();await bubble(quit).waitFor();
  await shots(quit,'quit');
  check((await quit.getByRole('button',{name:/^마치기\s*벌점/}).count())===1,'벌점 표시가 있는 마치기가 없다');
  await btn(quit,'계속 공부').click();await quit.waitForTimeout(150);
  check(await bubble(quit).count()===0,'계속 공부로 닫히지 않는다');
  await finish().click();await bubble(quit).waitFor();
  await btn(quit,'계속 공부').click();await quit.waitForTimeout(150);
  check((await shown(quit))?.quit===2,'머스크 횟수: '+JSON.stringify(await shown(quit)));
  await finish().click();await quit.waitForTimeout(200);
  check(await bubble(quit).count()===0,'세 번째에도 머스크 질문이 떴다');
  check(await btn(quit,'계속 공부').count()===0,'세 번째에 계속 공부 버튼이 남았다');
  check(await quit.getByRole('button',{name:/^한 번 더 누르면 마쳐요/}).count()===1,'세 번째 확인이 기존 화면이 아니다');
  await quit.screenshot({path:`${out}/quit-over-limit-390x844.png`});
  await quit.context().close();

 }catch(e){errors.push(String(e.message).split('\n')[0]);}
 await browser.close();
 fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,1));
 for(const r of report)console.log(r.name,r.text,'hits='+JSON.stringify(r.hits));
 console.log('errors',errors.length);errors.forEach(e=>console.log(' -',e));
 process.exit(errors.length?1:0);
})();
