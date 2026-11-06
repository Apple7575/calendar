// 단계별 쉬는 시간 검수 (S2-14): 2분 단계에서 휴식을 누르면 1분 휴식(01:00 근처)이 되고, 링·문구가 1분 기준인지,
// 새로 고쳐도 1분 그대로인지 390x844, 844x390에서 찍고 잰다.
// 격리된 브라우저 컨텍스트와 예시 데이터만 사용한다. 유료 호출이 없다. 휴식 끝 알림 소리는 iOS 실기기에서 확인한다.
// 사용: $env:PREVIEW_PORT='8123'; node scripts/check-stage-break-web.cjs
const {previewUrl}=require('./lib/preview-url.cjs');
const fs=require('fs');
const {chromium}=require('C:/Users/SSAFY/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const out='.expo/stage-break';
fs.mkdirSync(out,{recursive:true});
const DEMO='routine.v1.web-priority-demo';
const errors=[],report=[];
const check=(ok,message)=>{if(!ok)errors.push(message);};
const secondsOf=t=>{const m=/(\d+):(\d\d)/.exec(t);return m?Number(m[1])*60+Number(m[2]):NaN;};

(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const btn=(p,name)=>p.getByRole('button',{name,exact:true});
 const clockSeconds=async p=>secondsOf(await p.getByTestId('focus-clock').innerText());
 try{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const p=await context.newPage();
  p.on('pageerror',e=>errors.push('pageerror: '+e.message));
  await p.goto(previewUrl('/?priorityDemo=1'),{waitUntil:'networkidle',timeout:300000});
  await btn(p,'2분, 이 행동부터 시작').click();await p.getByTestId('focus-clock').waitFor();
  await p.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k)),now=Date.now();s.bookTimer={...s.bookTimer,focusElapsed:130,focusResumedAt:now,running:true,endsAt:now+60000};localStorage.setItem(k,JSON.stringify(s));},DEMO);
  await p.reload({waitUntil:'networkidle'});
  await btn(p,'집중 공부로 시간 모으기').click();await p.getByTestId('focus-clock').waitFor();await p.waitForTimeout(400);
  await p.getByRole('button',{name:/^휴식/}).click();await p.waitForTimeout(600);
  const t=(await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).bookTimer,DEMO));
  check(t.phase==='break'&&t.breakSeconds===60&&t.remaining===60,'2분 단계 휴식이 1분이 아니다: '+JSON.stringify({phase:t.phase,breakSeconds:t.breakSeconds,remaining:t.remaining}));
  const left=await clockSeconds(p);
  check(left<=60&&left>=55,'시계가 1분 휴식을 보여 주지 않는다: '+left);
  for(const [width,height] of [[390,844],[844,390]]){
   await p.setViewportSize({width,height});await p.waitForTimeout(300);
   await p.screenshot({path:`${out}/rest-${width}x${height}.png`});
   const r=await p.evaluate(()=>({wide:document.documentElement.scrollWidth>innerWidth}));
   report.push({name:`rest ${width}x${height}`,left:await clockSeconds(p),...r});
   check(!r.wide,`rest ${width}: 가로 넘침`);
  }
  await p.setViewportSize({width:390,height:844});
  await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(500);
  if(!(await p.getByTestId('focus-clock').count()))await btn(p,'집중 공부로 시간 모으기').click();
  await p.getByTestId('focus-clock').waitFor();
  const again=await clockSeconds(p);
  check(again<=60&&again>=50,'새로 고친 뒤 1분 휴식이 아니다: '+again);
  await context.close();
 }catch(e){errors.push(String(e.message).split('\n')[0]);}
 await browser.close();
 fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,1));
 for(const r of report)console.log(r.name,JSON.stringify(r));
 console.log('errors',errors.length);for(const e of errors)console.log(' -',e);
 process.exit(errors.length?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
