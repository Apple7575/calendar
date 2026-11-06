// 주간 점검·밤 돌아보기·빌드 확인표 검수(웹 미리보기, iPhone 13 Pro 390x844).
// 격리된 브라우저 컨텍스트와 예시 데이터만 쓴다. 알림·클립보드·실제 예치금 정산은 실기기와 Felix 함수로 따로 확인한다.
// 사용: $env:PREVIEW_PORT='8093'; node scripts/check-weekly-review-web.cjs [before|after]
const assert=require('assert/strict'),fs=require('fs');
const {previewUrl}=require('./lib/preview-url.cjs');
const {chromium}=require('C:/Users/SSAFY/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const stage=process.argv[2]==='before'?'before':'after';
const out=`.expo/weekly-review/${stage}`;fs.mkdirSync(out,{recursive:true});
const STORE='routine.v1.web-preview';
const MONDAY=new Date(2026,10,9,9,0),LAST='2026-11-02',MON='2026-11-09';
const iso=(day,h)=>{const [y,m,d]=day.split('-').map(Number);return new Date(y,m-1,d,h).toISOString();};
const session=(id,day,h,seconds)=>({id,subject:'수학',startedAt:iso(day,h),completedAt:new Date(Date.parse(iso(day,h))+seconds*1000).toISOString(),seconds,note:'오늘 한 것',next:''});
const rates={morningMin:500,morningFull:1000,eveningMin:0,eveningFull:0,gymMin:1000,gymFull:3000,wordStep:500,outputStep:500};
const paid=morning=>({paid:{morning,words:0,gym:0},morning:[true,true,false],complete:[],responses:0,studySeconds:0});
const mondayData=JSON.stringify({version:1,decks:[],words:[],newLimit:10,
 days:{[MON]:paid(5)},
 bookSessions:[session('a',LAST,9,1500),session('b','2026-11-04',20,2400)],
 emergencyUnlocks:[{id:'e1',at:iso('2026-11-05',22),day:'2026-11-05',until:0,reason:'택배 기사님 연락',minutes:30,won:3000,order:1}],
 money:{id:'w',startedAt:iso('2026-10-26',5),rates,days:{},entries:[{id:'start',kind:'reward',amount:30000,at:iso('2026-10-26',5),note:'지난 보상',day:'2026-10-26'},{id:'r1',kind:'reward',amount:1500,at:iso(LAST,10),note:'아침 루틴',day:LAST}]},
 goals:[{id:'g1',title:'JLPT N2 합격',why:'',weeklyTargetDays:5,createdAt:iso(LAST,5),updatedAt:iso(LAST,5),links:{subjects:['수학'],deckIds:[]}}],
});

const results=[];
const ok=(name)=>{results.push(name);console.log('PASS',name)};
const button=(page,name)=>page.getByRole('button',{name,exact:true}).last();
const press=async(page,name,wait=500)=>{await button(page,name).click();await page.waitForTimeout(wait)};
const text=page=>page.evaluate(()=>document.body.innerText);
const noOverflow=async page=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'가로 넘침');

async function open(browser,{data=null,time}={}){
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.grantPermissions(['clipboard-read','clipboard-write'],{origin:new URL(previewUrl('/')).origin});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(time){await page.clock.install({time});await page.clock.resume();}
 await page.addInitScript(({data,STORE})=>{if(data&&!localStorage.getItem(STORE))localStorage.setItem(STORE,data);localStorage.setItem('routine.experience.v1',JSON.stringify({motion:false,sound:false,haptics:false}))},{data,STORE});
 await page.goto(previewUrl('/'),{waitUntil:'networkidle',timeout:240000});
 await page.waitForTimeout(1500);
 return {context,page,errors};
}

(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 { // 설정과 목표 탭의 들어가는 곳
  const {context,page,errors}=await open(browser);
  if(stage==='after')assert.ok(!(await text(page)).includes('지난주 ·'),'볼 기록이 없으면 주간 점검이 저절로 열리지 않음');
  await press(page,'프로필·설정',1000);
  await page.screenshot({path:`${out}/settings-390.png`,fullPage:true});
  if(stage==='after'){
   await press(page,'이번 빌드 확인',1000);
   assert.ok((await text(page)).includes('빌드 50'));
   await press(page,'월요일 주간 점검 됨',200);
   await press(page,'밤 돌아보기 알림 안 됨',200);
   await page.getByLabel('밤 돌아보기 알림 메모').fill('알림이 안 와요');
   await page.waitForTimeout(300);
   await page.screenshot({path:`${out}/build-check-390.png`});
   await page.getByRole('button',{name:/PM에게 보낼 글 복사/}).last().click();await page.waitForTimeout(600);
   const copied=await page.evaluate(()=>navigator.clipboard.readText());
   assert.ok(copied.startsWith('[빌드 50 확인]'),copied);
   assert.ok(copied.includes('✓ 월요일 주간 점검')&&copied.includes('✗ 밤 돌아보기 알림 — 알림이 안 와요'),copied);
   assert.ok((await text(page)).includes('복사했어요'));
   await page.reload({waitUntil:'networkidle'});await page.waitForTimeout(1500);
   assert.ok(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('routine.buildCheck.v1.50'))));
   const store=await page.evaluate(k=>localStorage.getItem(k),STORE);
   assert.ok(!store||!store.includes('buildCheck'),'확인표는 루틴 데이터(백업)에 들어가지 않음');
   await noOverflow(page);
   ok('빌드 확인표: ✓/✗·메모 저장, 복사 글, 루틴 데이터 밖에 저장');
  }
  assert.deepEqual(errors,[]);await context.close();
 }
 { // 월요일: 아침 루틴 뒤 첫 열기에 주간 점검
  const {context,page,errors}=await open(browser,{data:mondayData,time:MONDAY});
  if(stage==='before'){await page.getByRole('tab',{name:'목표',exact:true}).click();await page.waitForTimeout(1200);await page.screenshot({path:`${out}/goal-home-390.png`,fullPage:true});}
  if(stage==='after'){
   await page.waitForTimeout(2000); // 앱을 열자마자 주간 점검이 떠야 한다.
   let t=await text(page);
   assert.ok(t.includes('주간 점검')&&t.includes('지난주'),'월요일 아침 루틴 뒤 주간 점검이 자동으로 열려야 함');
   for(const s of ['공부 시간','1시간 5분','공부한 날','2일 / 7일','긴급 해제','1번','택배 기사님 연락','30분 · 3,000원','받은 돈','1,500원','안 쓴 시간 이자','걸지 않음','최근 4주','보통 14:30에 시작했어요 (2일)','10분 이상 남긴 날'])assert.ok(t.includes(s),s);
   assert.equal(await page.getByTestId('week-trend').getAttribute('aria-label'),'최근 4주 공부한 날 0, 0, 0, 2일, 지난주 2일');
   assert.ok((await page.getByTestId('week-saved-ten').innerText()).includes('—'),'이자 기록 전 주는 —');
   await page.screenshot({path:`${out}/week-check-390.png`,fullPage:true});
   await noOverflow(page);
   ok('월요일 아침 루틴 뒤 자동으로 열림, 지난주 요약');
   await press(page,'10,000원',200);
   await press(page,'밤 돌아보기 알림 20:50로 바꾸기',200);
   await page.getByLabel('지난주는 어떤 주였나요? (선택)').fill('  시험 주  ');
   await press(page,'이번 주 시작하기',1200);
   const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),STORE);
   assert.ok(saved.weeklyReviews[MON].doneAt);
   assert.deepEqual(saved.weeklyReviews[MON].rule,{kind:'reflectTime',value:2050});
   assert.equal(saved.weeklyStakes[MON].amount,10000);
   assert.equal(saved.weeklyNotes[LAST].text,'시험 주','메모는 점검한 주(지난주)에 앞뒤 공백을 자르고 저장');
   assert.ok(!saved.weeklyNotes[MON],'이번 주에는 붙이지 않음');
   assert.ok(saved.money.entries.some(e=>e.id==='stake:'+MON&&e.amount===-10000),'건 돈이 지갑에서 빠짐');
   await page.reload({waitUntil:'networkidle'});await page.waitForTimeout(17000);
   assert.ok(!(await text(page)).includes('다음 주에 바꿀 규칙'),'같은 주에는 다시 열리지 않음');
   ok('예치금·규칙 저장, 같은 주에는 다시 열지 않음');
   await page.getByRole('tab',{name:'목표',exact:true}).click();await page.waitForTimeout(800);
   await page.screenshot({path:`${out}/goal-home-390.png`,fullPage:true});
   await press(page,'주간 점검',1000);
   t=await text(page);
   assert.ok(t.includes('이번 주 점검을 마쳤어요')&&t.includes('밤 돌아보기 알림 20:50')&&t.includes('지난주 메모: 시험 주'),'마친 상태');
   await page.screenshot({path:`${out}/week-check-done-390.png`,fullPage:true});
   ok('마친 주는 결과만 보여 줌');
  }
  assert.deepEqual(errors,[]);await context.close();
 }
 if(stage==='after'){ // 월요일을 놓친 주: 화요일 첫 열기에 열림, 예치금은 다음 월요일
  const {context,page,errors}=await open(browser,{data:mondayData,time:new Date(2026,10,10,10,0)});
  await page.waitForTimeout(2000);
  const t=await text(page);
  assert.ok(t.includes('주간 점검')&&t.includes('지난주'),'월요일을 놓친 주에도 처음 연 날 열려야 함');
  assert.ok(t.includes('예치금은 다음 월요일에 걸 수 있어요'));
  assert.equal(await page.getByTestId('stake-choices').count(),0);
  await page.screenshot({path:`${out}/week-check-tuesday-390.png`,fullPage:true});
  await press(page,'아침 단어 장수 15장로 바꾸기',200);
  await press(page,'이번 주 시작하기',1200);
  const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),STORE);
  assert.deepEqual(saved.weeklyReviews[MON].rule,{kind:'morningWords',value:15});
  assert.ok(!saved.weeklyStakes?.[MON],'월요일이 아니면 예치금 없음');
  assert.ok(!saved.weeklyNotes?.[LAST]&&!saved.weeklyNotes?.[MON],'빈 메모는 저장하지 않음');
  ok('월요일을 놓친 주: 화요일 첫 열기에 열림, 예치금 대신 안내, 규칙은 고를 수 있음');
  assert.deepEqual(errors,[]);await context.close();
 }
 if(stage==='after'){ // 밤 돌아보기
  const {context,page,errors}=await open(browser,{data:mondayData,time:new Date(2026,10,10,20,30)});
  await press(page,'닫기',800); // 이번 주 점검이 먼저 뜬다
  await page.getByRole('tab',{name:'목표',exact:true}).click();await page.waitForTimeout(800);
  await press(page,'밤 1분 돌아보기',1000);
  let t=await text(page);
  for(const s of ['오늘 하루','노는 시간','목표 진행','JLPT N2 합격','내일 첫 공부 약속'])assert.ok(t.includes(s),s);
  assert.equal(await button(page,'내일 시작 시각을 골라 주세요').getAttribute('aria-disabled'),'true');
  await page.screenshot({path:`${out}/reflect-390.png`,fullPage:true});
  await press(page,'오전 7시',150);
  await page.getByRole('tab',{name:'30분',exact:true}).click();await page.waitForTimeout(150);
  await press(page,'내일 7:30에 시작하기',900);
  t=await text(page);
  assert.ok(t.includes('내일 07:30에 첫 공부를 시작해요'),'약속 저장 표시');
  const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),STORE);
  assert.equal(saved.dayPromises['2026-11-11'].startAt,'07:30');
  await page.screenshot({path:`${out}/reflect-done-390.png`,fullPage:true});
  await noOverflow(page);
  ok('밤 돌아보기: 오늘·목표 표시, 시각 고르기 전 버튼 막힘, 내일 약속 저장');
  assert.deepEqual(errors,[]);await context.close();
 }
 console.log(`${stage}: ${results.length} checks passed, captures in ${out}`);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
