// 축하 부품 검수: 큰 축하·중간 카드·하루 한도, 정산 소식(예치금 성공·약속·이자)을 390x844에서 찍고 잰다.
// 웹 미리보기 검사다. 소리·진동·Lottie 재생과 iOS 실기기 화면을 대신하지 않는다.
// 사용: $env:PREVIEW_PORT='8094'; node scripts/check-celebrations-web.cjs
const {previewUrl}=require('./lib/preview-url.cjs');
const fs=require('fs');
const {chromium}=require('C:/Users/SSAFY/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out='.expo/celebrations';fs.mkdirSync(out,{recursive:true});
const DEMO='routine.v1.web-priority-demo',errors=[],report=[];
const check=(ok,m)=>{if(!ok)errors.push(m)};
async function measure(page,name){
 const r=await page.evaluate(()=>{const seen=e=>{const b=e.getBoundingClientRect();return b.width>0&&b.height>0&&b.bottom>0&&b.top<innerHeight};
  const small=[...document.querySelectorAll('[role=button]')].filter(seen).map(e=>({l:(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,24),b:e.getBoundingClientRect()})).filter(x=>(x.b.height<43.5||x.b.width<43.5)&&x.l!=='예시 초기화').map(x=>x.l+' '+Math.round(x.b.width)+'x'+Math.round(x.b.height));
  return {wide:document.documentElement.scrollWidth>innerWidth,small}});
 report.push({name,...r});check(!r.wide,name+': 가로 넘침');check(!r.small.length,name+': 작은 버튼 '+r.small.join(', '));
}
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const open=async(time,seed)=>{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const page=await context.newPage();
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  await page.clock.install({time});
  await page.goto(previewUrl('/?priorityDemo=1'),{waitUntil:'networkidle',timeout:300000});
  await page.waitForFunction(k=>!!localStorage.getItem(k),DEMO,{timeout:30000});
  await page.evaluate(()=>{for(const k of Object.keys(localStorage))if(k.startsWith('celebration.'))localStorage.removeItem(k)});
  if(seed)await page.evaluate(seed);
  await page.reload({waitUntil:'networkidle'});await page.waitForTimeout(1200);
  const header=page.getByRole('heading',{name:'주간 점검',exact:true});
  if(await header.isVisible().catch(()=>false)&&!(await page.locator('[data-testid^=celebration-big]').count())){await page.getByRole('button',{name:'닫기',exact:true}).last().click();await page.waitForTimeout(500);}
  return page;
 };
 const step=async(name,fn)=>{try{await fn()}catch(e){errors.push(name+': '+String(e.message).split('\n')[0])}};
 const fire=(p,req)=>p.evaluate(r=>window.__celebrate(r),req);

 await step('tiers',async()=>{
  const p=await open(new Date(2026,10,6,12,0));
  await fire(p,{kind:'dayComplete',character:'C04'});
  await p.getByTestId('celebration-big-dayComplete').waitFor({timeout:10000});
  await p.screenshot({path:`${out}/big-day-complete-390x844.png`});await measure(p,'big dayComplete');
  await p.getByRole('button',{name:'계속하기'}).click();await p.waitForTimeout(400);
  await fire(p,{kind:'streak',n:7,character:'C02'});await p.getByTestId('celebration-big-streak').waitFor({timeout:10000});
  await p.screenshot({path:`${out}/big-streak-7-390x844.png`});await measure(p,'big streak 7');
  await p.getByRole('button',{name:'계속하기'}).click();await p.waitForTimeout(400);
  await fire(p,{kind:'comeback'});await p.getByTestId('celebration-big-comeback').waitFor({timeout:10000});
  await p.getByRole('button',{name:'계속하기'}).click();await p.waitForTimeout(400);
  await fire(p,{kind:'stakeWon',won:11000});
  await p.getByTestId('celebration-toast-stakeWon').waitFor({timeout:10000});
  check(await p.getByTestId('celebration-big-stakeWon').count()===0,'네 번째 큰 축하가 낮아지지 않았다');
  await p.waitForTimeout(3200);
  check(await p.getByTestId('celebration-toast-stakeWon').count()===0,'중간 카드가 사라지지 않는다');
  await fire(p,{kind:'wordStep',minutes:5,character:'C02'});await p.getByTestId('celebration-toast-wordStep').waitFor({timeout:10000});
  await p.screenshot({path:`${out}/toast-word-step-390x844.png`});await measure(p,'toast wordStep');
  await p.waitForTimeout(3200);
  await fire(p,{kind:'wordStep',minutes:5});await p.waitForTimeout(600);
  check(await p.getByTestId('celebration-toast-wordStep').count()===0,'10분 안 같은 중간 축하가 또 떴다');
  await p.context().close();
 });
 await step('settlement',async()=>{
  const seed=()=>{const k='routine.v1.web-priority-demo',s=JSON.parse(localStorage.getItem(k));
   s.weeklyStakes={'2026-10-26':{amount:10000,targetDays:5,placedAt:'2026-10-26T01:00:00.000Z',status:'won',payoutWon:11000,studyDays:5,settledAt:'2026-11-02T05:00:00.000Z'}};
   s.dayPromises={'2026-11-05':{startAt:'09:00',setAt:'2026-11-04T12:00:00.000Z',outcome:{status:'kept',at:'2026-11-05T00:05:00.000Z',day:'2026-11-05',minutes:10,won:1000}}};
   s.interestDays={'2026-11-04':{unusedMinutes:20,won:600,emergency:false}};localStorage.setItem(k,JSON.stringify(s));};
  const p=await open(new Date(2026,10,6,12,0),seed);
  await p.getByTestId('celebration-big-stakeWon').waitFor({timeout:15000});
  await p.screenshot({path:`${out}/settlement-stake-390x844.png`});await measure(p,'settlement stake');
  await p.getByRole('button',{name:'계속하기'}).click();
  await p.getByTestId('celebration-toast-promiseKept').waitFor({timeout:10000});
  await p.screenshot({path:`${out}/settlement-promise-390x844.png`});
  await p.getByTestId('celebration-toast-interest').waitFor({timeout:10000});
  await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(2500);
  check(await p.locator('[data-testid^=celebration-]').count()===0,'본 정산 소식이 다시 뜬다');
  await p.context().close();
 });
 await browser.close();
 fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,1));
 for(const r of report)console.log(r.name,JSON.stringify({wide:r.wide,small:r.small}));
 console.log('errors',errors.length);errors.forEach(e=>console.log(' -',e));process.exit(errors.length?1:0);
})();
