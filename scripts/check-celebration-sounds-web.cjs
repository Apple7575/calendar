// 축하 효과음(S1-07): 순간마다 정한 소리 파일을 웹 미리보기가 실제로 불러오는지 본다(낮 13시, 390x844).
// 밤 21시에는 어떤 소리 파일도 불러오지 않는지도 본다. 소리가 귀에 어떻게 들리는지, 무음 스위치·진동은 iPhone 실기기에서만 확인할 수 있다.
// 사용: $env:PREVIEW_PORT='8094'; node scripts/check-celebration-sounds-web.cjs
const {previewUrl}=require('./lib/preview-url.cjs');
const {chromium}=require('C:/Users/SSAFY/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const DEMO='routine.v1.web-priority-demo',errors=[],report=[];
const check=(ok,m)=>{if(!ok)errors.push(m)};
// 순간 → 기대하는 파일. 큰 축하는 하루 3번 한도가 있어 페이지를 새로 열어 하나씩 본다.
const CASES=[
 [{kind:'dayComplete'},'dayComplete'],[{kind:'streak',n:3},'streak3'],[{kind:'streak',n:14},'streak14'],
 [{kind:'stakeWon',won:1000},'stakeWon'],[{kind:'comeback'},'comeback'],
 [{kind:'promiseKept',minutes:10},'promiseKept'],[{kind:'interest',minutes:3},'interest'],[{kind:'wordStep',minutes:5},'wordStep'],
 [{kind:'weekCheck'},'weekCheck'],[{kind:'priorityAll'},'priorityAll'],[{kind:'growth'},'priorityAll'],
 [{kind:'routineStep'},'routineStep'],[{kind:'planSaved'},'planSaved'],[{kind:'speakingStep',minutes:5},null],
];

(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const open=async time=>{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const page=await context.newPage();
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  const sounds=[];page.on('request',r=>{const m=r.url().match(/sounds\/celebration\/([A-Za-z0-9]+)\.mp3/)||r.url().match(/\/([A-Za-z0-9]+)(?:\.[0-9a-f]+)?\.mp3/);if(m)sounds.push(m[1]);});
  await page.clock.install({time});
  await page.goto(previewUrl('/?priorityDemo=1'),{waitUntil:'networkidle',timeout:300000});
  await page.waitForFunction(k=>!!localStorage.getItem(k),DEMO,{timeout:30000});
  await page.evaluate(()=>{for(const k of Object.keys(localStorage))if(k.startsWith('celebration.'))localStorage.removeItem(k)});
  await page.reload({waitUntil:'networkidle'});await page.waitForTimeout(1500);
  sounds.length=0;
  return {page,context,sounds};
 };
 try{
  for(const [request,expected] of CASES){
   const {page,context,sounds}=await open(new Date(2026,10,7,13,0));
   await page.evaluate(r=>window.__celebrate(r),request);await page.waitForTimeout(1500);
   const got=[...new Set(sounds)];
   report.push({request:request.kind+(request.n?':'+request.n:''),expected,got});
   if(expected)check(got.length===1&&got[0]===expected,`${request.kind}${request.n?' '+request.n:''}: ${expected} 기대, ${JSON.stringify(got)}`);
   else check(got.length===0,`${request.kind}: 소리 없음 기대, ${JSON.stringify(got)}`);
   await context.close();
  }
  const {page,context,sounds}=await open(new Date(2026,10,7,21,30));
  for(const [request] of CASES.slice(0,6))await page.evaluate(r=>window.__celebrate(r),request);
  await page.waitForTimeout(2000);
  report.push({night:true,got:[...new Set(sounds)]});
  check(sounds.length===0,'밤인데 소리 파일을 불러옴 '+JSON.stringify(sounds));
  await context.close();
 }catch(e){errors.push(String(e.message).split('\n')[0])}
 await browser.close();
 console.log(JSON.stringify(report));
 if(errors.length){console.error('FAIL\n'+errors.join('\n'));process.exit(1)}
 console.log('PASS check-celebration-sounds-web');
})();
