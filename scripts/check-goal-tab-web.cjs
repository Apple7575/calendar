// 목표 탭 검수: 실제 웹 미리보기에서 첫 실행, 저장, 진행, 다음 한 걸음, 친구 선택 유지를 확인한다.
// 격리된 브라우저 컨텍스트와 예시 데이터만 사용한다. iOS 실기기·네이티브 날짜 선택기 검증을 대신하지 않는다.
// 사용: $env:PREVIEW_PORT='8093'; node scripts/check-goal-tab-web.cjs
const assert=require('assert/strict'),fs=require('fs');
const {previewUrl}=require('./lib/preview-url.cjs');
const {chromium}=require('C:/Users/SSAFY/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const out='.expo/goal-tab';fs.mkdirSync(out,{recursive:true});
const STORE='routine.v1.web-preview';
const dateKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const dayAgo=n=>{const d=new Date(Date.now()-4*3600e3);d.setDate(d.getDate()-n);return dateKey(d)};
const today=dayAgo(0);
const base=extra=>JSON.stringify({version:1,decks:[],words:[],newLimit:10,days:{},...extra});
const goal=extra=>({id:'goal-1',title:'JLPT N2 합격',why:'일본에서 일하고 싶어서',weeklyTargetDays:5,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),...extra});
const task=extra=>({id:'t1',subject:'문법',action:'3쪽 풀기',preparation:'',target:'',minimum:120,...extra});
const plan=(tasks,day=today)=>({[day]:{day,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),tasks}});
const paid=(morning,words,gym)=>({paid:{morning,words,gym},morning:[true,false,false],complete:[],responses:0,studySeconds:0});

const results=[];
const ok=(name,detail='')=>{results.push(name);console.log('PASS',name,detail)};
const tab=(page,name)=>page.getByRole('tab',{name,exact:true});
const shown=locator=>locator.evaluate(el=>{for(let n=el;n;n=n.parentElement){const c=getComputedStyle(n);if(c.display==='none'||c.visibility!=='visible'||c.opacity==='0')return false}return true});
const visibleText=page=>page.evaluate(()=>{const walk=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const parts=[];while(walk.nextNode()){let on=true;for(let n=walk.currentNode.parentElement;n;n=n.parentElement){const c=getComputedStyle(n);if(c.display==='none'||c.opacity==='0'){on=false;break}}if(on)parts.push(walk.currentNode.textContent)}return parts.join('\n')});
async function open(browser,{data=null,reduced=false,viewport={width:390,height:844},timezoneId}={}){
 const context=await browser.newContext({viewport,reducedMotion:reduced?'reduce':'no-preference',...(timezoneId?{timezoneId}:{})});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({data,STORE})=>{if(data&&!localStorage.getItem(STORE))localStorage.setItem(STORE,data);localStorage.setItem('routine.experience.v1',JSON.stringify({motion:true,sound:false,haptics:false}))},{data,STORE});
 await page.goto(previewUrl('/'),{waitUntil:'networkidle',timeout:240000});
 await tab(page,'목표').click();await page.waitForTimeout(1200);
 return {context,page,errors};
}
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORE);

(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 { // 첫 실행, 필수값, 저장, 유지, 고치기
  const {context,page,errors}=await open(browser);
  const text=await visibleText(page);
  assert.ok(text.includes('아직 목표가 없어요'));
  assert.ok(!text.includes('친구들'),'친구들 탭 문구가 남아 있음');
  assert.equal(await tab(page,'친구들').count(),0);
  assert.ok(await page.getByTestId('goal-empty').locator('[data-testid^="animal-"]').count());
  await page.screenshot({path:`${out}/empty-390.png`});
  ok('첫 실행: 목표 탭·빈 상태·고른 친구 표시, 친구들 탭 없음');

  await page.getByRole('button',{name:'목표 정하기'}).click();await page.waitForTimeout(300);
  await page.screenshot({path:`${out}/form-390.png`});
  await page.getByRole('button',{name:'목표 저장'}).click();await page.waitForTimeout(300);
  assert.ok((await visibleText(page)).includes('목표 이름을 적어 주세요'));
  await page.getByLabel('목표 이름').fill('JLPT N2 합격');
  await page.getByRole('button',{name:'목표 저장'}).click();await page.waitForTimeout(300);
  assert.ok((await visibleText(page)).includes('일주일에 며칠 할지 골라 주세요'));
  assert.equal(await page.getByLabel('목표 이름').inputValue(),'JLPT N2 합격');
  await page.getByLabel('목표 날짜 (선택)').fill('2026-02-30');
  await page.getByRole('button',{name:'일주일에 5일'}).click();
  await page.getByRole('button',{name:'목표 저장'}).click();await page.waitForTimeout(300);
  assert.ok((await visibleText(page)).includes('날짜를 2026-12-06처럼'));
  assert.equal(await page.getByLabel('목표 날짜 (선택)').inputValue(),'2026-02-30');
  ok('필수값·잘못된 날짜 오류, 입력값 유지');

  await page.getByLabel('이유 한 줄 (선택)').fill('일본에서 일하고 싶어서');
  await page.getByLabel('목표 날짜 (선택)').fill('2099-12-06');
  await page.getByRole('button',{name:'목표 저장'}).click();await page.waitForTimeout(500);
  let after=await visibleText(page);
  for(const t of ['JLPT N2 합격','일본에서 일하고 싶어서','이번 주 공부한 날','0일 / 주 5일','다음 한 걸음','D-'])assert.ok(after.includes(t),t);
  await page.reload({waitUntil:'networkidle'});await tab(page,'목표').click();await page.waitForTimeout(800);
  after=await visibleText(page);assert.ok(after.includes('JLPT N2 합격'));
  assert.equal((await saved(page)).primaryGoal.weeklyTargetDays,5);
  ok('저장 후 카드 표시, 새로고침 유지');

  await page.getByRole('button',{name:'목표 고치기'}).click();await page.waitForTimeout(300);
  assert.equal(await page.getByLabel('목표 이름').inputValue(),'JLPT N2 합격');
  await page.getByLabel('목표 날짜 (선택)').fill('');
  await page.getByLabel('목표 이름').fill('N2 합격');
  await page.getByRole('button',{name:'목표 저장'}).click();await page.waitForTimeout(500);
  after=await visibleText(page);assert.ok(after.includes('N2 합격'));assert.ok(!/D[-+]\d|D-DAY/.test(after),'날짜 없음이면 D-day 숨김');
  ok('고치기: 값 불러오기, 날짜 제거 시 D-day 숨김');
  assert.deepEqual(errors,[]);await context.close();
 }
 { // 날짜 지남
  const {context,page}=await open(browser,{data:base({primaryGoal:goal({dueDate:'2026-01-01'})})});
  const text=await visibleText(page);assert.match(text,/D\+\d+/);assert.ok(text.includes('정한 날짜가 지났어요'));
  ok('날짜 지남: D+N과 고치기 안내');await context.close();
 }
 { // 진행 계산: 공부한 날만
  const days={};if(new Date(`${today}T12:00:00`).getDay()!==1)days[dayAgo(1)]=paid(10,0,30);
  const at=new Date().toISOString(),bookSessions=[{id:'s1',subject:'문법',startedAt:at,completedAt:at,seconds:900,note:'3쪽 끝',next:''}];
  const {context,page,errors}=await open(browser,{data:base({primaryGoal:goal(),days,bookSessions})});
  assert.ok((await visibleText(page)).includes('1일 / 주 5일'),'아침·운동만 한 날은 세지 않음');
  await page.screenshot({path:`${out}/records-390.png`});
  const week=await page.getByTestId('goal-week').locator('[data-testid^="goal-day-"]').evaluateAll(els=>els.map(e=>e.getAttribute('data-testid').slice(-10)));
  const first=new Date(`${week[0]}T12:00:00`);assert.equal(first.getDay(),1,'월요일 시작');assert.equal(week.length,7);assert.ok(week.includes(today));
  ok('이번 주: 월요일 시작, 공부한 날만 셈');assert.deepEqual(errors,[]);await context.close();
 }
 { // 다음 한 걸음 3상태
  let run=await open(browser,{data:base({primaryGoal:goal()})});
  await run.page.getByRole('button',{name:'오늘 첫 행동 정하기'}).click();await run.page.waitForTimeout(800);
  assert.ok(await run.page.getByText('공부 준비').last().isVisible(),'계획 화면 이동');
  await run.context.close();
  run=await open(browser,{data:base({primaryGoal:goal(),priorityDays:plan([task()])})});
  assert.ok((await visibleText(run.page)).includes('3쪽 풀기'));
  const before=JSON.stringify((await saved(run.page)).priorityDays);
  await run.page.getByRole('button',{name:'오늘 탭에서 이어 가기'}).click();await run.page.waitForTimeout(800);
  assert.ok(!(await shown(run.page.getByTestId('goal-summary'))),'오늘 탭으로 이동');
  assert.equal(JSON.stringify((await saved(run.page)).priorityDays),before,'이동만으로 계획이 시작되면 안 됨');
  await run.context.close();
  run=await open(browser,{data:base({primaryGoal:goal(),days:{[today]:paid(0,0,0)},priorityDays:plan([task({startedAt:new Date(Date.now()-300000).toISOString(),baseline:0,completedAt:new Date().toISOString(),receiptId:'r1'})]),handwritingReceipts:[{id:'r1',imageHash:'a'.repeat(64),subject:'문법',at:new Date().toISOString(),day:today,lines:['3쪽'],languages:['ko'],units:2,duplicateUnits:0,minutes:0,policyVersion:1}]})});
  const done=await visibleText(run.page);assert.ok(done.includes('오늘 계획한 공부를 모두 끝냈어요'));assert.ok(done.includes('1일 / 주 5일'),'끝낸 중요한 공부를 셈');
  await run.page.getByRole('button',{name:'내일 계획 준비하기'}).click();await run.page.waitForTimeout(800);
  assert.ok(await run.page.getByText('공부 준비').last().isVisible(),'내일 계획 화면 이동');
  await run.context.close();
  ok('다음 한 걸음 3상태 이동, 이동만으로 계획이 시작되지 않음');
 }
 { // 잘못된 값, 기존 저장값 유지
  const data=base({primaryGoal:{title:''},boriStage:'growing',days:{[today]:paid(10,0,0)}});
  const {context,page,errors}=await open(browser,{data});
  assert.ok((await visibleText(page)).includes('저장된 목표를 읽지 못했어요'));
  await tab(page,'기록').click();await page.waitForTimeout(500);
  assert.ok((await visibleText(page)).includes('우리의 기록'));
  await tab(page,'목표').click();await page.waitForTimeout(400);
  await page.getByRole('button',{name:'목표 다시 정하기'}).click();await page.waitForTimeout(300);
  await page.getByLabel('목표 이름').fill('새 목표');await page.getByRole('button',{name:'일주일에 3일'}).click();
  await page.getByRole('button',{name:'목표 저장'}).click();await page.waitForTimeout(500);
  const state=await saved(page);assert.equal(state.primaryGoal.title,'새 목표');assert.equal(state.boriStage,'growing');assert.equal(state.days[today].paid.morning,10);
  ok('잘못된 목표 값: 앱은 열리고 다시 정할 수 있으며 다른 기록 유지');assert.deepEqual(errors,[]);await context.close();
 }
 { // 설정의 친구 선택과 터치
  const {context,page,errors}=await open(browser,{data:base({primaryGoal:goal()})});
  const mascot=page.getByTestId('goal-summary').locator('[data-testid^="animal-"]');
  assert.match(await mascot.getAttribute('data-testid'),/^animal-C01-/);
  await mascot.click();await page.waitForTimeout(300);assert.match(await mascot.getAttribute('data-testid'),/-A06$/);
  assert.equal(await mascot.locator('[data-active]').getAttribute('data-active'),'true');
  await tab(page,'기록').click();await page.waitForTimeout(500);assert.equal(await mascot.locator('[data-active]').getAttribute('data-active'),'false');
  await tab(page,'목표').click();await page.waitForTimeout(400);
  await page.getByRole('button',{name:'프로필·설정'}).evaluateAll(els=>{const on=els.find(e=>{for(let n=e;n;n=n.parentElement){const c=getComputedStyle(n);if(c.opacity==='0'||c.display==='none')return false}return true});on.click()});await page.waitForTimeout(800);
  await page.getByText('소리·진동·모션·화면').last().click();await page.waitForTimeout(800);
  assert.ok((await visibleText(page)).includes('홈에서 함께할 친구'));
  await page.getByRole('button',{name:'고슴도치 선택',exact:true}).click();await page.waitForTimeout(400);
  assert.equal(await page.evaluate(()=>localStorage.getItem('routine.animal.character.v1')),'C02');
  await page.reload({waitUntil:'networkidle'});await tab(page,'목표').click();await page.waitForTimeout(800);
  assert.match(await page.getByTestId('goal-summary').locator('[data-testid^="animal-"]').getAttribute('data-testid'),/^animal-C02-/);
  ok('고른 친구 표시·터치 반응·탭 이동 시 정지, 설정 선택 유지');assert.deepEqual(errors,[]);await context.close();
 }
 { // 모션 줄이기
  const {context,page}=await open(browser,{reduced:true,data:base({primaryGoal:goal()})});
  const mascot=page.getByTestId('goal-summary').locator('[data-testid^="animal-"]');await mascot.waitFor();
  assert.notEqual(await mascot.locator('[data-still-frame]').getAttribute('data-still-frame'),'');
  assert.equal(await mascot.locator('[data-active]').getAttribute('data-active'),'false');
  ok('모션 줄이기: 대표 프레임 정지');await context.close();
 }
 { // 저녁 시간
  let off=(20-new Date().getUTCHours()+24)%24;if(off>14)off-=24;
  const {context,page}=await open(browser,{timezoneId:'Etc/GMT'+(off>=0?'-'+off:'+'+(-off)),data:base({primaryGoal:goal()})});
  await page.screenshot({path:`${out}/evening-390.png`});ok('저녁 시간 화면 캡처');await context.close();
 }
 for(const viewport of [{width:390,height:844},{width:375,height:667},{width:320,height:568}]){
  const {context,page}=await open(browser,{viewport,data:base({primaryGoal:goal({title:'JLPT N2 시험에 합격해서 일본에서 일하기 위한 긴 목표 이름',dueDate:'2099-12-06'})})});
  const over=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);assert.ok(over<=0);
  await page.screenshot({path:`${out}/long-title-${viewport.width}.png`});
  ok('가로 넘침 없음',`${viewport.width}x${viewport.height}`);await context.close();
 }
 console.log('ALL PASS',results.length,'· 웹 미리보기 결과이며 iOS 실기기 검증이 아님');
}finally{await browser.close()}})().catch(e=>{console.error('FAIL after',results.length,e.message);process.exit(1)});
