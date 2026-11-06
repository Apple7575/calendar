// S1-14 실제 시작 시각 지도 검수(웹 미리보기). 밤 1분 돌아보기의 약속 카드에서 한 줄과 7칸 줄을 본다.
// 360px와 iPhone 13 Pro 390px 두 폭에서 가로 넘침이 없는지, 약속을 정한 뒤에는 한 줄만 남는지, 기록 0개에서도 깨지지 않는지 본다.
// 예시 데이터만 쓴다. 사용: $env:PREVIEW_PORT='8317'; node scripts/check-start-time-map-web.cjs  (Playwright 브라우저가 없으면 $env:PW_CHANNEL='chrome')
const assert=require('assert/strict'),fs=require('fs');
const {previewUrl}=require('./lib/preview-url.cjs');
const {chromium}=require('C:/Users/SSAFY/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const out='.expo/start-time-map';fs.mkdirSync(out,{recursive:true});
const STORE='routine.v1.web-preview';
const FRIDAY=new Date(2026,10,6,21,0); // 내일 = 토요일 11-07
const iso=(day,h,m=0)=>{const [y,mo,d]=day.split('-').map(Number);return new Date(y,mo-1,d,h,m).toISOString();};
const session=(id,startedAt)=>({id,subject:'수학',startedAt,completedAt:new Date(Date.parse(startedAt)+1500e3).toISOString(),seconds:1500,note:'',next:''});
// 4주 동안 요일마다 시작 시각을 다르게, 자정 넘은 늦은 시작(00:15 같은 다섯 글자)도 넣는다.
const starts=[['2026-10-10',10,40],['2026-10-17',9,0],['2026-10-24',11,0],['2026-10-31',10,5],
 ['2026-10-12',7,30],['2026-10-19',8,0],['2026-10-13',23,30],['2026-10-21',0,15],['2026-10-28',1,10],['2026-10-22',19,45],['2026-10-30',13,20],['2026-11-01',22,50],['2026-10-25',6,5]];
const base=sessions=>JSON.stringify({version:1,decks:[],words:[],newLimit:10,days:{},bookSessions:sessions,weeklyReviews:{'2026-11-02':{doneAt:iso('2026-11-02',9),rule:null}}});
const withData=base(starts.map(([d,h,m],i)=>session('s'+i,iso(d,h,m))));
const empty=base([]);

const results=[];const ok=n=>{results.push(n);console.log('PASS',n)};
const press=async(page,name,wait=500)=>{await page.getByRole('button',{name,exact:true}).last().click();await page.waitForTimeout(wait)};
const noOverflow=async page=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'가로 넘침');

async function openReflection(browser,width,data){
 const context=await browser.newContext({viewport:{width,height:844}});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:FRIDAY});await page.clock.resume();
 await page.addInitScript(({data,STORE})=>{if(!localStorage.getItem(STORE))localStorage.setItem(STORE,data);localStorage.setItem('routine.experience.v1',JSON.stringify({motion:false,sound:false,haptics:false}))},{data,STORE});
 await page.goto(previewUrl('/'));await page.waitForTimeout(2500);
 if(await page.getByRole('button',{name:'닫기',exact:true}).count())await press(page,'닫기',800);
 await page.getByRole('tab',{name:'목표',exact:true}).click();await page.waitForTimeout(800);
 await press(page,'밤 1분 돌아보기',1200);
 return {context,page,errors};
}

(async()=>{const browser=await chromium.launch(process.env.PW_CHANNEL?{channel:process.env.PW_CHANNEL}:{});try{
 for(const width of [360,390]){
  const {context,page,errors}=await openReflection(browser,width,withData);
  const hint=await page.getByTestId('start-time-hint').innerText();
  assert.equal(hint,'최근 4주 토요일은 보통 10:25쯤 시작했어요 (4번 중 4번).');
  const map=page.getByTestId('start-time-map');
  const cells=await map.evaluate(el=>[...el.querySelectorAll('div')].filter(d=>d.children.length===2&&d.innerText.split('\n').length===2).map(d=>{const r=d.getBoundingClientRect(),t=d.lastElementChild,tr=t.getBoundingClientRect();return {text:d.innerText,w:r.width,right:r.right,textH:tr.height,textW:t.scrollWidth,boxW:t.clientWidth};}));
  assert.equal(cells.length,7,'요일 칸 7개');
  const [card]=await page.getByTestId('start-time-map').evaluateAll(els=>els.map(e=>e.getBoundingClientRect().right));
  for(const c of cells){assert.ok(c.right<=card+0.5,`칸이 카드 밖: ${c.text}`);assert.ok(c.textW<=c.boxW+1,`시각이 칸을 넘침: ${c.text}`);assert.ok(c.textH<24,`시각이 두 줄: ${c.text}`);}
  assert.ok(cells.some(c=>c.text.includes('00:')),'자정 넘은 시각도 보임');
  await noOverflow(page);
  await page.getByTestId('start-time-map').screenshot({path:`${out}/map-${width}.png`});
  await page.screenshot({path:`${out}/reflect-${width}.png`,fullPage:true});
  ok(`${width}px: 한 줄 문구, 7칸, 넘침 없음 (칸 너비 ${Math.round(cells[0].w)}px)`);
  // 약속을 정하면 한 줄만 남는다.
  await press(page,'오전 10시',150);
  await press(page,'내일 10:00에 시작하기',1200);
  assert.equal(await page.getByTestId('start-time-map').count(),0,'약속 뒤에는 7칸 없음');
  assert.equal(await page.getByTestId('start-time-hint').innerText(),hint);
  await noOverflow(page);
  await page.screenshot({path:`${out}/promised-${width}.png`,fullPage:true});
  ok(`${width}px: 약속을 정한 뒤 한 줄만`);
  assert.deepEqual(errors,[]);await context.close();
 }
 const {context,page,errors}=await openReflection(browser,360,empty);
 assert.equal(await page.getByTestId('start-time-hint').innerText(),'아직 토요일 기록이 적어요. 몇 주 쓰면 평소 시작 시각이 보여요.');
 await noOverflow(page);
 await page.getByTestId('start-time-map').screenshot({path:`${out}/map-empty-360.png`});
 ok('기록 0개: 안내 한 줄, 7칸은 모두 —, 넘침 없음');
 assert.deepEqual(errors,[]);await context.close();
 console.log(`${results.length} checks passed, captures in ${out}`);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
