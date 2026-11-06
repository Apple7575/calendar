// 휴식 끝 알람 검수 (S1-21): 종 아이콘(기본 켬), 앱이 켜진 채 휴식이 끝나면 '알람 끄기'가 뜨는지, 누르면 사라지는지,
// 종을 끄면 뜨지 않는지, 휴식 문구가 한계를 알려 주는지 390x844, 844x390에서 찍고 잰다.
// 격리된 브라우저 컨텍스트와 예시 데이터만 사용한다. 유료 호출이 없다. 소리·진동·무음 스위치·알림 소리는 iOS 실기기에서 확인한다.
// 사용: $env:PREVIEW_PORT='8123'; node scripts/check-rest-alarm-web.cjs
const {previewUrl}=require('./lib/preview-url.cjs');
const fs=require('fs');
const {chromium}=require('C:/Users/SSAFY/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const out='.expo/rest-alarm';
fs.mkdirSync(out,{recursive:true});
const DEMO='routine.v1.web-priority-demo';
const errors=[],report=[];
const check=(ok,message)=>{if(!ok)errors.push(message);};

(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const btn=(p,name)=>p.getByRole('button',{name,exact:true});
 /** 단계를 채운 공부에서 휴식을 시작하고, 휴식이 몇 초 뒤 끝나게 맞춘다. */
 const resting=async(endsInMs)=>{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const p=await context.newPage();
  p.on('pageerror',e=>errors.push('pageerror: '+e.message));
  await p.goto(previewUrl('/?priorityDemo=1'),{waitUntil:'networkidle',timeout:300000});
  await btn(p,'2분, 이 행동부터 시작').click();await p.getByTestId('focus-clock').waitFor();
  await p.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k)),now=Date.now();s.bookTimer={...s.bookTimer,focusElapsed:130,focusResumedAt:now,running:true,endsAt:now+60000};localStorage.setItem(k,JSON.stringify(s));},DEMO);
  await p.reload({waitUntil:'networkidle'});
  await btn(p,'집중 공부로 시간 모으기').click();await p.getByTestId('focus-clock').waitFor();await p.waitForTimeout(400);
  await p.getByRole('button',{name:/^휴식/}).click();await p.waitForTimeout(500);
  if(endsInMs!==undefined)await p.evaluate(([k,ms])=>{const s=JSON.parse(localStorage.getItem(k));s.bookTimer={...s.bookTimer,endsAt:Date.now()+ms};localStorage.setItem(k,JSON.stringify(s));},[DEMO,endsInMs]);
  if(endsInMs!==undefined){await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(500);if(!(await p.getByTestId('focus-clock').count()))await btn(p,'집중 공부로 시간 모으기').click();await p.getByTestId('focus-clock').waitFor();}
  return p;
 };
 const step=async(name,fn)=>{try{await fn();}catch(e){errors.push(name+': '+String(e.message).split('\n')[0]);}};

 await step('bell and copy',async()=>{
  const p=await resting();
  const bell=p.getByTestId('rest-alarm-toggle');
  check(await bell.getAttribute('aria-label')==='휴식 끝 알람 켜짐','종 아이콘 기본값이 켬이 아니다');
  check(await p.getByText(/잘 땐 이 화면을 켜 두세요/).count()===1,'켬 문구(화면 켜 두기·무음이면 진동)가 없다');
  for(const [width,height] of [[390,844],[844,390]]){
   await p.setViewportSize({width,height});await p.waitForTimeout(300);
   await p.screenshot({path:`${out}/rest-bell-on-${width}x${height}.png`});
   const r=await bell.evaluate(e=>{const b=e.getBoundingClientRect(),hits=[];for(const o of document.querySelectorAll('[role=button],[role=switch]')){if(o===e)continue;const c=o.getBoundingClientRect();if(c.width&&b.left<c.right&&c.left<b.right&&b.top<c.bottom&&c.top<b.bottom)hits.push(o.textContent||o.getAttribute('aria-label'));}return {w:b.width,h:b.height,hits,wide:document.documentElement.scrollWidth>innerWidth};});
   report.push({name:`bell ${width}x${height}`,...r});
   check(r.w>=44&&r.h>=44,`bell ${width}: 44pt 미만`);check(!r.hits.length,`bell ${width}: 겹침 ${r.hits}`);check(!r.wide,`bell ${width}: 가로 넘침`);
  }
  await p.setViewportSize({width:390,height:844});
  await bell.click();await p.waitForTimeout(300);
  check(await bell.getAttribute('aria-label')==='휴식 끝 알람 꺼짐','종을 눌러도 꺼지지 않았다');
  check(await p.getByText(/알람 끔 · 끝나면 소리 없는 알림만 와요/).count()===1,'끔 문구가 없다');
  await p.screenshot({path:`${out}/rest-bell-off-390x844.png`});
  await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(800);
  if(!(await p.getByTestId('focus-clock').count()))await btn(p,'집중 공부로 시간 모으기').click();
  await p.getByTestId('rest-alarm-toggle').waitFor();
  check(await p.getByTestId('rest-alarm-toggle').getAttribute('aria-label')==='휴식 끝 알람 꺼짐','끈 값이 기기에 기억되지 않았다');
  await p.context().close();
 });

 await step('rings at the end, stops on tap',async()=>{
  const p=await resting(6000);
  check(await p.getByTestId('rest-alarm-stop').count()===0,'끝나기 전에 울렸다');
  await p.getByTestId('rest-alarm-stop').waitFor({timeout:15000});
  await p.screenshot({path:`${out}/ringing-390x844.png`});
  check(await p.getByText('휴식 끝',{exact:true}).count()===1,'울리는데 휴식 끝 화면이 아니다');
  await p.getByTestId('rest-alarm-stop').click();
  await p.getByTestId('rest-alarm-stop').waitFor({state:'detached'});
  await p.waitForTimeout(1500);
  check(await p.getByTestId('rest-alarm-stop').count()===0,'끈 뒤 다시 울렸다');
  await p.context().close();
 });

 await step('starting study stops it',async()=>{
  const p=await resting(5000);
  await p.getByTestId('rest-alarm-stop').waitFor({timeout:15000});
  await p.getByRole('button',{name:/분 집중 시작$/}).click();
  await p.getByTestId('rest-alarm-stop').waitFor({state:'detached',timeout:5000});
  await p.context().close();
 });

 await step('bell off does not ring',async()=>{
  const p=await resting(5000);
  await p.getByTestId('rest-alarm-toggle').click();
  await p.waitForTimeout(7000);
  check(await p.getByText('휴식 끝',{exact:true}).count()===1,'휴식이 끝나지 않았다');
  check(await p.getByTestId('rest-alarm-stop').count()===0,'종을 껐는데 울렸다');
  await p.context().close();
 });

 await browser.close();
 fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,1));
 for(const r of report)console.log(r.name,JSON.stringify(r));
 console.log('errors',errors.length);for(const e of errors)console.log(' -',e);
 process.exit(errors.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
