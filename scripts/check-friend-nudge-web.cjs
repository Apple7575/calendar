// 친구 말 걸기·기록 달력 스티커 검수: 시계를 18:30, 20:40, 13:00, 다음 날 18:30으로 고정해 오늘 탭 말풍선을 보고,
// 실천한 날을 넣은 예시 데이터로 기록 달력 스티커를 390x844에서 찍고 잰다. 웹 미리보기 검사이며 iOS 실기기 검증을 대신하지 않는다.
// 사용: $env:PREVIEW_PORT='8094'; node scripts/check-friend-nudge-web.cjs
const {previewUrl}=require('./lib/preview-url.cjs');
const fs=require('fs');
const {chromium}=require('C:/Users/SSAFY/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const out='.expo/friend-nudge';
fs.mkdirSync(out,{recursive:true});
const DEMO='routine.v1.web-priority-demo';
const errors=[],report=[];
const check=(ok,message)=>{if(!ok)errors.push(message)};

async function measure(page,name){
 const r=await page.evaluate(()=>{
  const seen=e=>{const b=e.getBoundingClientRect();return b.width>0&&b.height>0&&b.bottom>0&&b.top<innerHeight&&!e.closest('[aria-hidden=true]')};
  const small=[...document.querySelectorAll('[role=button]')].filter(seen).map(e=>({l:(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,24),b:e.getBoundingClientRect()})).filter(x=>(x.b.height<43.5||x.b.width<43.5)&&x.l!=='예시 초기화').map(x=>x.l+' '+Math.round(x.b.width)+'x'+Math.round(x.b.height));
  return {wide:document.documentElement.scrollWidth>innerWidth,small};
 });
 report.push({name,...r});check(!r.wide,name+': 가로 넘침');check(!r.small.length,name+': 작은 버튼 '+r.small.join(', '));
}
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const open=async(time,seed)=>{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  await page.clock.install({time});
  await page.goto(previewUrl('/?priorityDemo=1'),{waitUntil:'networkidle',timeout:300000});
  await page.waitForFunction(k=>!!localStorage.getItem(k),DEMO,{timeout:30000});
  if(seed){await page.evaluate(seed);await page.reload({waitUntil:'networkidle'});}
  await page.waitForTimeout(800);
  return page;
 };
 const step=async(name,fn)=>{try{await fn()}catch(e){errors.push(name+': '+String(e.message).split('\n')[0])}};

 await step('evening',async()=>{
  const p=await open(new Date(2026,10,6,18,30));
  await p.getByTestId('friend-nudge-evening').waitFor({timeout:15000});
  check(await p.getByText('저녁이에요. 오늘 공부는 아직이에요.',{exact:true}).count()===1,'18시 말풍선 문구가 없다');
  const start=p.getByRole('button',{name:/이 행동부터 시작|첫 공부 준비|오늘의 첫 행동/}).first();
  const box=await start.boundingBox();check(!!box&&box.y+box.height<=844-70,'말풍선이 있어도 시작 버튼이 첫 화면에 보여야 한다: '+JSON.stringify(box));
  await p.screenshot({path:`${out}/home-1800-390x844.png`});await measure(p,'home 18:30');
  await p.getByRole('button',{name:'말풍선 닫기'}).click();await p.waitForTimeout(300);
  check(await p.getByTestId('friend-nudge-evening').count()===0,'닫아도 말풍선이 남는다');
  await p.reload({waitUntil:'networkidle'});await p.waitForTimeout(800);
  check(await p.getByTestId('friend-nudge-evening').count()===0,'닫은 칸이 다시 뜬다');
  await p.clock.setFixedTime(new Date(2026,10,6,20,40));await p.waitForTimeout(1500);
  await p.getByTestId('friend-nudge-lastCall').waitFor({timeout:15000});
  await p.screenshot({path:`${out}/home-2040-390x844.png`});await measure(p,'home 20:40');
  await p.context().close();
 });
 await step('quiet hours',async()=>{
  const p=await open(new Date(2026,10,6,13,0));
  check(await p.locator('[data-testid^=friend-nudge]').count()===0,'13시에 말풍선이 뜬다');
  await p.clock.setFixedTime(new Date(2026,10,6,21,5));await p.waitForTimeout(1500);
  check(await p.locator('[data-testid^=friend-nudge]').count()===0,'21시 뒤에 말풍선이 뜬다');
  await p.context().close();
 });
 await step('studied',async()=>{
  const p=await open(new Date(2026,10,6,18,30),()=>{const k='routine.v1.web-priority-demo',s=JSON.parse(localStorage.getItem(k)),day=Object.keys(s.days).sort().pop();s.days[day].paid={...s.days[day].paid,gym:30};localStorage.setItem(k,JSON.stringify(s));});
  check(await p.locator('[data-testid^=friend-nudge]').count()===0,'오늘 실천했는데 말풍선이 뜬다');
  await p.context().close();
 });
 await step('stickers',async()=>{
  const p=await open(new Date(2026,10,6,12,0),()=>{const k='routine.v1.web-priority-demo',s=JSON.parse(localStorage.getItem(k)),day=Object.keys(s.days).sort().pop();for(const d of ['2026-11-01','2026-11-02','2026-11-04','2026-11-05']){s.days[d]={...JSON.parse(JSON.stringify(s.days[day])),paid:{...s.days[day].paid,gym:30}}}localStorage.setItem(k,JSON.stringify(s));});
  await p.getByRole('tab',{name:'기록',exact:true}).click();await p.waitForTimeout(800);
  const labels=await p.locator('[aria-label*=스티커]').evaluateAll(es=>es.map(e=>e.getAttribute('aria-label')));
  check(labels.length===4,'스티커가 4개가 아니다: '+labels.join(' | '));
  await p.screenshot({path:`${out}/records-stickers-390x844.png`});await measure(p,'records stickers');
  await p.context().close();
 });
 await browser.close();
 fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,1));
 for(const r of report)console.log(r.name,JSON.stringify({wide:r.wide,small:r.small}));
 console.log('errors',errors.length);errors.forEach(e=>console.log(' -',e));
 process.exit(errors.length?1:0);
})();
