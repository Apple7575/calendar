// 디자인 시스템 검수: 대표 화면을 360/390px로 찍고 터치 영역·가로 넘침·버튼 가림을 잰다.
// 격리된 브라우저 컨텍스트와 예시 데이터만 사용한다. 유료 OCR을 호출하지 않는다. iOS 실기기 검증을 대신하지 않는다.
// 사용: $env:PREVIEW_PORT='8094'; node scripts/check-design-system-web.cjs before
const {previewUrl}=require('./lib/preview-url.cjs');
const fs=require('fs');
const {chromium}=require('C:/Users/SSAFY/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const label=process.argv[2]||'after';
const out=`.expo/design-system/${label}`;
fs.mkdirSync(out,{recursive:true});
const SIZES=[[390,844],[360,740]];
const DEMO='routine.v1.web-priority-demo';
const report=[],errors=[];

async function audit(page,name,width){
 const r=await page.evaluate(()=>{
  const small=[];
  const visible=e=>{const b=e.getBoundingClientRect(),s=getComputedStyle(e);return b.width>0&&b.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&b.bottom>0&&b.top<innerHeight;};
  for(const e of document.querySelectorAll('[role=button],[role=tab],button,input,textarea')){
   if(!visible(e)||e.closest('[aria-hidden=true]'))continue;
   const b=e.getBoundingClientRect();
   if(b.height<43.5||b.width<43.5)small.push(`${(e.getAttribute('aria-label')||e.textContent||e.tagName).trim().slice(0,24)} ${Math.round(b.width)}x${Math.round(b.height)}`);
  }
  const clipped=[...document.querySelectorAll('[role=button]')].filter(e=>{if(!visible(e))return false;const t=e.querySelector('div[dir=auto]');return t&&t.scrollWidth>t.clientWidth+1&&getComputedStyle(t).whiteSpace==='nowrap';}).map(e=>(e.getAttribute('aria-label')||e.textContent).slice(0,24));
  const sizes={};for(const e of document.querySelectorAll('div[dir=auto],span')){if(!e.textContent.trim()||!visible(e))continue;const f=Math.round(parseFloat(getComputedStyle(e).fontSize));sizes[f]=(sizes[f]||0)+1;}
  return {overflow:document.documentElement.scrollWidth>innerWidth,small,clipped,sizes};
 });
 report.push({screen:name,width,...r});
}
async function shot(page,name){
 for(const [width,height] of SIZES){
  await page.setViewportSize({width,height});
  await page.waitForTimeout(250);
  await page.screenshot({path:`${out}/${name}-${width}.png`});
  await audit(page,name,width);
 }
 await page.setViewportSize({width:390,height:844});
}
const step=async(name,fn)=>{try{await fn();}catch(e){errors.push(`${name}: ${String(e.message).split('\n')[0]}`);}};

(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const open=async query=>{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(`${query}: ${e.message}`));
  await page.goto(previewUrl(query),{waitUntil:'networkidle',timeout:300000});
  return page;
 };
 const btn=(p,name)=>p.getByRole('button',{name,exact:true});
 const tab=(p,name)=>p.getByRole('tab',{name,exact:true});
 const settings=p=>p.getByRole('button',{name:'프로필·설정',exact:true}).first();
 try{
  const home=await open('/?priorityDemo=1');
  await step('home',async()=>{await btn(home,'2분, 이 행동부터 시작').waitFor();await shot(home,'01-home');await home.screenshot({path:`${out}/01-home-full.png`,fullPage:true});});
  await step('study',async()=>{await tab(home,'학습').click();await home.waitForTimeout(500);await shot(home,'02-study-words');await tab(home,'집중').click();await home.waitForTimeout(300);await shot(home,'03-focus-start');});
  await step('plan',async()=>{const p=await open('/?priorityDemo=1');await btn(p,'계획').click();await p.getByRole('textbox',{name:'1번째 과목',exact:true}).waitFor();await p.getByRole('textbox',{name:'1번째 과목',exact:true}).focus();await shot(p,'20-plan-field-focus');});
  await step('goal',async()=>{await tab(home,'목표').click();await home.waitForTimeout(800);await shot(home,'04-goal');});
  await step('records',async()=>{await tab(home,'기록').click();await home.waitForTimeout(500);await shot(home,'05-records');});
  await step('settings',async()=>{await tab(home,'오늘').click();await settings(home).click();await btn(home,'백업·복구').waitFor();await shot(home,'06-settings');await btn(home,'소리·진동·모션·화면').click();await home.waitForTimeout(400);await shot(home,'07-settings-experience');});
  await step('flow',async()=>{
   const p=await open('/?priorityDemo=1');
   await btn(p,'2분, 이 행동부터 시작').click();
   await p.getByTestId('focus-clock').waitFor();await shot(p,'09-timer');
   await p.setViewportSize({width:844,height:390});await p.waitForTimeout(300);await p.screenshot({path:`${out}/09-timer-landscape.png`});await audit(p,'09-timer-landscape',844);
   await p.setViewportSize({width:390,height:844});
   await p.evaluate(key=>{const s=JSON.parse(localStorage.getItem(key)),now=Date.now();s.bookTimer={...s.bookTimer,focusElapsed:121,focusResumedAt:now};localStorage.setItem(key,JSON.stringify(s));},'routine.v1.web-priority-demo');await p.reload({waitUntil:'networkidle'});await btn(p,'집중 공부로 시간 모으기').click();await p.getByTestId('focus-clock').waitFor();
   await btn(p,'다 했어요 · 사진으로 끝내기').click();await btn(p,'노트 사진 찍기').waitFor();await shot(p,'10-submit');
   await p.evaluate(key=>{const s=JSON.parse(localStorage.getItem(key)),now=Date.now();s.bookTimer={...s.bookTimer,focusElapsed:121,focusResumedAt:now,running:false,remaining:0,endsAt:now};s.handwritingPending={id:'design-qa',imageHash:'c'.repeat(64),subject:s.bookTimer.subject,analysis:{lines:['검수용 필기 전압과 전류의 관계를 공부하고 풀이 과정을 정리했습니다.'.repeat(6)],languages:['ko'],quality:'readable',message:''}};localStorage.setItem(key,JSON.stringify(s));},DEMO);
   await p.reload({waitUntil:'networkidle'});
   await btn(p,'집중 공부로 시간 모으기').click();await p.getByText('읽은 내용을 확인해 주세요',{exact:true}).waitFor();await shot(p,'11-submit-ready');
  });
  await step('cards',async()=>{
   const p=await open('/?n2Demo=1');
   await p.waitForTimeout(2500);await shot(p,'12-flashcard-front');
   const reveal=p.getByTestId('study-card-surface');if(await reveal.count()){await reveal.click();await p.waitForTimeout(500);await shot(p,'13-flashcard-back');}
   const back=btn(p,'뒤로');if(await back.count())await back.first().click();else await p.goBack();
   await p.waitForTimeout(400);
   await tab(p,'학습').click();await btn(p,'내 단어장').click();await p.waitForTimeout(500);await shot(p,'14-deck-list');
  });
  await step('japanese',async()=>{const p=await open('/?japaneseDemo=1');await p.waitForTimeout(1500);await shot(p,'15-japanese-sample');});
  await step('home-done',async()=>{const p=await open('/?priorityDemo=1');await btn(p,'2분, 이 행동부터 시작').click();await p.getByTestId('focus-clock').waitFor();await p.evaluate(key=>{const s=JSON.parse(localStorage.getItem(key));for(const d of Object.values(s.days)){d.paid={...d.paid,morning:1,gym:1};d.plan={ids:['q'],reviewIds:[]};d.complete=['q'];}delete s.bookTimer;localStorage.setItem(key,JSON.stringify(s));},DEMO);await p.reload({waitUntil:'networkidle'});await p.getByTestId('home-routine-count').scrollIntoViewIfNeeded();await p.waitForTimeout(500);await shot(p,'21-home-done');await p.evaluate(()=>localStorage.setItem('theme.id.v2','routine'));await p.reload({waitUntil:'networkidle'});await p.getByTestId('home-routine-count').scrollIntoViewIfNeeded();await p.waitForTimeout(500);await shot(p,'22-home-done-light');});
  await step('focus-overtime',async()=>{const p=await open('/?priorityDemo=1');await btn(p,'2분, 이 행동부터 시작').click();await p.getByTestId('focus-clock').waitFor();await p.waitForTimeout(400);await shot(p,'24-focus-running');const seed=async extra=>{await p.evaluate(([key,extra])=>{const s=JSON.parse(localStorage.getItem(key)),now=Date.now(),target=s.bookTimer.targetSeconds??s.bookTimer.duration;s.bookTimer={...s.bookTimer,focusElapsed:target+extra,focusResumedAt:now,remaining:0,endsAt:now,running:false};localStorage.setItem(key,JSON.stringify(s));},[DEMO,extra]);await p.reload({waitUntil:'networkidle'});await btn(p,'집중 공부로 시간 모으기').click();await p.getByTestId('focus-clock').waitFor();await p.waitForTimeout(600);return p.evaluate(()=>{const t=document.querySelector('[data-testid=timer-face-time]'),g=document.querySelector('[data-testid=focus-clock]');return {ink:getComputedStyle(t).color,ground:getComputedStyle(g).backgroundColor,time:t.textContent}})};const lime='rgb(196, 234, 137)',early=await seed(1);await shot(p,'25-focus-overtime-flash');if(early.ground!==lime||early.ink!=='rgb(0, 0, 0)'||early.time!=='02:01')throw new Error('목표 직후는 연두 바탕에 검은 글자로 공부한 시간: '+JSON.stringify(early));const later=await seed(80);await shot(p,'26-focus-overtime-after');if(later.ground!=='rgb(0, 0, 0)'||later.ink!=='rgb(245, 245, 242)'||later.time!=='03:20')throw new Error('뒤집힘 뒤에는 검은 바탕에 흰 글자로 공부한 시간(+ 없음): '+JSON.stringify(later));await p.setViewportSize({width:844,height:390});await p.waitForTimeout(300);await p.screenshot({path:`${out}/26-focus-overtime-after-landscape.png`});});
  await step('empty',async()=>{const p=await open('/');await p.waitForTimeout(800);await shot(p,'16-home-empty');});
  await step('light',async()=>{const p=await open('/?priorityDemo=1');await p.evaluate(()=>localStorage.setItem('theme.id.v2','routine'));await p.reload({waitUntil:'networkidle'});await btn(p,'2분, 이 행동부터 시작').waitFor();await shot(p,'17-home-light');await tab(p,'학습').click();await p.waitForTimeout(400);await shot(p,'18-study-light');await settings(p).click();await btn(p,'백업·복구').waitFor();await shot(p,'19-settings-light');});
 }finally{await browser.close();}
 fs.writeFileSync(`${out}/report.json`,JSON.stringify({errors,report},null,1));
 const fails=report.filter(r=>r.overflow||r.small.length||r.clipped.length);
 console.log(`screens ${report.length} · overflow ${report.filter(r=>r.overflow).length} · small-target screens ${report.filter(r=>r.small.length).length} · errors ${errors.length}`);
 for(const r of fails.filter(r=>r.width!==360))console.log(`  ${r.screen}@${r.width}${r.overflow?' OVERFLOW':''} small: ${r.small.join(' | ')}`);
 for(const e of errors)console.log('  ERR',e);
 // 단계 오류와 가로 넘침은 실패로 끝낸다. 작은 터치 영역은 목록으로만 알린다.
 if(errors.length||report.some(r=>r.overflow))process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1);});
