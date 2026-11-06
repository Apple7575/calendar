// 목표 탭 검수: 실제 웹 미리보기에서 첫 실행, 저장, 공부 연결, 여러 목표, 옛 저장값, 끊긴 연결, 끝내기·삭제, 공부 시간, 친구 선택 유지를 확인한다.
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
const old=extra=>({id:'goal-1',title:'JLPT N2 합격',why:'일본에서 일하고 싶어서',weeklyTargetDays:5,createdAt:new Date(Date.now()-30*864e5).toISOString(),updatedAt:new Date().toISOString(),...extra});
const goal=extra=>({...old(),links:{subjects:['문법'],deckIds:[]},...extra});
const task=extra=>({id:'t1',subject:'문법',action:'3쪽 풀기',preparation:'',target:'',minimum:120,...extra});
const plan=(tasks,day=today)=>({[day]:{day,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),tasks}});
const paid=(morning,words,gym)=>({paid:{morning,words,gym},morning:[true,false,false],complete:[],responses:0,studySeconds:0});

const results=[];
const ok=(name,detail='')=>{results.push(name);console.log('PASS',name,detail)};
const tab=(page,name)=>page.getByRole('tab',{name,exact:true});
const button=(page,name)=>page.getByRole('button',{name,exact:true}).last();
const card=(page,title='JLPT N2 합격')=>page.getByRole('button',{name:`${title} 목표 자세히 보기`}).first();
const press=async(page,name,wait=400)=>{await button(page,name).click();await page.waitForTimeout(wait)};
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
 { // 첫 실행, 필수값, 저장, 연결, 유지, 고치기
  const {context,page,errors}=await open(browser);
  const text=await visibleText(page);
  assert.ok(text.includes('아직 목표가 없어요'));
  assert.ok(!text.includes('친구들'),'친구들 탭 문구가 남아 있음');
  assert.equal(await tab(page,'친구들').count(),0);
  assert.ok(await page.getByTestId('goal-empty').locator('[data-testid^="animal-"]').count());
  await page.screenshot({path:`${out}/empty-390.png`});
  ok('첫 실행: 목표 탭·빈 상태·고른 친구 표시, 친구들 탭 없음');

  await press(page,'목표 정하기',300);
  await page.screenshot({path:`${out}/form-390.png`});
  await press(page,'목표 저장',300);
  assert.ok((await visibleText(page)).includes('목표 이름을 적어 주세요'));
  await page.getByLabel('목표 이름').fill('JLPT N2 합격');
  await press(page,'목표 저장',300);
  assert.ok((await visibleText(page)).includes('일주일에 며칠 할지 골라 주세요'));
  assert.equal(await page.getByLabel('목표 이름').inputValue(),'JLPT N2 합격');
  await page.getByLabel('목표 날짜 (선택)').fill('2026-02-30');
  await press(page,'일주일에 5일',100);
  await press(page,'목표 저장',300);
  assert.ok((await visibleText(page)).includes('날짜를 2026-12-06처럼'));
  assert.equal(await page.getByLabel('목표 날짜 (선택)').inputValue(),'2026-02-30');
  ok('필수값·잘못된 날짜 오류, 입력값 유지');

  await page.getByLabel('이유 한 줄 (선택)').fill('일본에서 일하고 싶어서');
  await page.getByLabel('목표 날짜 (선택)').fill('2099-12-06');
  await press(page,'목표 저장',500);
  let after=await visibleText(page);
  for(const t of ['JLPT N2 합격','일본에서 일하고 싶어서','D-','공부를 연결하면'])assert.ok(after.includes(t),t);
  assert.ok(!after.includes('일 / 주 5일'),'연결 전에는 수치 없음');
  assert.equal(await page.getByRole('button',{name:'목표 고치기'}).count(),0,'목표 탭에 고치기 버튼이 없어야 함');
  await page.screenshot({path:`${out}/unlinked-390.png`});
  ok('저장 후 카드 표시, 연결 전 안내와 연결 버튼');

  await press(page,'JLPT N2 합격 공부 연결하기',800);
  await page.screenshot({path:`${out}/links-390.png`});
  await press(page,'일본어',100);
  await press(page,'연결 저장',500);
  after=await visibleText(page);
  for(const t of ['0일 / 주 5일','다음 한 걸음','오늘 계획에 이 목표의 공부가 없어요','연결한 공부','일본어','2099년 12월 6일','시작한 날','지금까지 공부한 날'])assert.ok(after.includes(t),t);
  await page.screenshot({path:`${out}/detail-390.png`});
  let state=await saved(page);
  assert.deepEqual(state.goals[0].links,{subjects:['일본어'],deckIds:[]});assert.equal(state.primaryGoal.title,'JLPT N2 합격');assert.equal(state.primaryGoal.links,undefined);
  await page.reload({waitUntil:'networkidle'});await tab(page,'목표').click();await page.waitForTimeout(800);
  after=await visibleText(page);assert.ok(after.includes('0일 / 주 5일'),'새로고침 후 연결 유지');assert.ok(!after.includes('다음 한 걸음'),'탭에는 요약만');
  ok('공부 연결: 상세 표시, 저장 구조, 새로고침 유지');

  await card(page).click();await page.waitForTimeout(800);
  await press(page,'목표 고치기',300);
  await press(page,'취소',300);
  assert.ok((await visibleText(page)).includes('지금까지 공부한 날'),'취소하면 상세로 돌아옴');
  await press(page,'목표 고치기',300);
  assert.equal(await page.getByLabel('목표 이름').last().inputValue(),'JLPT N2 합격');
  await page.getByLabel('목표 날짜 (선택)').last().fill('');
  await page.getByLabel('목표 이름').last().fill('N2 합격');
  await press(page,'목표 저장',500);
  after=await visibleText(page);assert.ok(after.includes('N2 합격'));assert.ok(after.includes('일본어'),'고쳐도 연결 유지');assert.ok(!/D[-+]\d|D-DAY/.test(after),'날짜 없음이면 D-day 숨김');
  await press(page,'뒤로',800);
  after=await visibleText(page);assert.ok(after.includes('N2 합격'));assert.ok(after.includes('목표 추가'),'뒤로 가면 목표 탭');assert.ok(!/D[-+]\d|D-DAY/.test(after));
  ok('상세에서 고치기: 취소, 값 불러오기, 날짜 제거, 연결 유지, 탭 반영');
  assert.deepEqual(errors,[]);await context.close();
 }
 { // 옛 저장값 이전, 자동 쓰기 없음, 기록 불변 (금액 불변은 Jest에서 확인)
  const days={[today]:paid(10,0,0)};
  const {context,page,errors}=await open(browser,{data:base({primaryGoal:old(),boriStage:'growing',days,bookSessions:[{id:'s1',subject:'문법',startedAt:new Date().toISOString(),completedAt:new Date().toISOString(),seconds:900,note:'3쪽 끝',next:''}]})});
  const first=await saved(page);
  assert.equal(first.goals,undefined,'열기만 해서는 goals를 쓰지 않음');assert.equal(first.primaryGoal.id,'goal-1');
  let text=await visibleText(page);assert.ok(text.includes('JLPT N2 합격'));assert.ok(text.includes('공부를 연결하면'));assert.ok(!text.includes('일 / 주 5일'));
  await press(page,'JLPT N2 합격 공부 연결하기',800);
  await press(page,'문법',100);
  await press(page,'연결 저장',500);
  assert.ok((await visibleText(page)).includes('1일 / 주 5일'),'연결한 과목의 끝낸 공부를 셈');
  const next=await saved(page);
  assert.equal(next.goals[0].id,'goal-1');assert.equal(next.goals[0].createdAt,first.primaryGoal.createdAt);assert.equal(next.goals[0].why,first.primaryGoal.why);
  assert.equal(next.primaryGoal.id,'goal-1');
  assert.deepEqual(next.days[today].paid,days[today].paid);assert.equal(next.boriStage,'growing');
  await page.screenshot({path:`${out}/migrated-390.png`});
  ok('옛 primaryGoal: 자동 쓰기 없음, 연결로 수치 복구, 값·기록 보존');assert.deepEqual(errors,[]);await context.close();
 }
 { // 여러 목표: 3개 제한, 과목 중복 연결 막기, 목표별 집계
  const at=new Date().toISOString(),bookSessions=[{id:'s1',subject:'문법',startedAt:at,completedAt:at,seconds:900,note:'3쪽 끝',next:''}];
  const goals=[goal(),goal({id:'g2',title:'전기공사기사 합격',why:undefined,weeklyTargetDays:3,links:{subjects:['전기공사기사 실기'],deckIds:[]}}),goal({id:'g3',title:'영어 회화',why:undefined,weeklyTargetDays:2,links:{subjects:[],deckIds:[]}})];
  const {context,page,errors}=await open(browser,{data:base({goals,bookSessions})});
  const text=await visibleText(page);
  for(const t of ['JLPT N2 합격','전기공사기사 합격','영어 회화','1일 / 주 5일','0일 / 주 3일','진행 중인 목표는 3개까지'])assert.ok(text.includes(t),t);
  assert.equal(await page.getByRole('button',{name:'목표 추가',exact:true}).count(),0);
  await page.screenshot({path:`${out}/multi-390.png`,fullPage:true});
  await press(page,'영어 회화 공부 연결하기',800);
  const taken=button(page,'일본어');await taken.waitFor();
  const links=await visibleText(page);assert.ok(links.includes("'JLPT N2 합격' 목표에 연결됨")===true,'다른 목표 연결 표시');
  assert.equal(await page.getByRole('button',{name:'문법',exact:true}).last().isDisabled(),true,'이미 연결한 과목은 고를 수 없음');
  await page.screenshot({path:`${out}/links-taken-390.png`});
  await press(page,'영어',100);await press(page,'연결 저장',500);
  assert.deepEqual((await saved(page)).goals[2].links.subjects,['영어']);
  ok('여러 목표: 3개 제한, 목표별 집계, 과목 중복 연결 막기');assert.deepEqual(errors,[]);await context.close();
 }
 { // 끊긴 연결
  const {context,page,errors}=await open(browser,{data:base({decks:[{id:'d',name:'N2 단어',active:true}],goals:[goal({links:{subjects:['옛 과목'],deckIds:['gone','d']}})]})});
  assert.ok((await visibleText(page)).includes('연결이 끊긴 공부가 있어요'));
  await page.screenshot({path:`${out}/broken-tab-390.png`});
  await card(page).click();await page.waitForTimeout(800);
  const text=await visibleText(page);for(const t of ['옛 과목 (기록 없음)','없어진 단어장','N2 단어','연결을 다시 골라 주세요'])assert.ok(text.includes(t),t);
  await page.screenshot({path:`${out}/broken-detail-390.png`});
  await press(page,'연결 바꾸기',400);
  await page.getByRole('button',{name:'없어진 단어장 gone'}).last().click();await page.waitForTimeout(100);
  await press(page,'옛 과목',100);await press(page,'연결 저장',500);
  assert.ok(!(await visibleText(page)).includes('연결을 다시 골라 주세요'));
  assert.deepEqual((await saved(page)).goals[0].links,{subjects:[],deckIds:['d']});
  ok('끊긴 연결: 오류 없이 표시, 다시 골라 해결');assert.deepEqual(errors,[]);await context.close();
 }
 { // 끝내기, 다시 진행, 삭제
  const days={[today]:paid(10,0,0)};
  const {context,page,errors}=await open(browser,{data:base({goals:[goal(),goal({id:'g2',title:'둘째 목표',links:{subjects:[],deckIds:[]}})],days})});
  await card(page).click();await page.waitForTimeout(800);
  await press(page,'목표 끝내기',800);
  let text=await visibleText(page);assert.ok(text.includes('끝낸 목표 1개'));assert.ok(!text.includes('JLPT N2 합격'),'끝낸 목표는 접힘');
  assert.equal((await saved(page)).primaryGoal.id,'g2','옛 빌드용 값은 다음 진행 중 목표');
  await press(page,'끝낸 목표 1개',300);
  await card(page).click();await page.waitForTimeout(800);
  assert.ok((await visibleText(page)).includes('다시 진행하기'));
  await page.screenshot({path:`${out}/finished-390.png`});
  await press(page,'다시 진행하기',500);
  assert.equal((await saved(page)).goals[0].completedAt,undefined);
  await press(page,'목표 삭제',300);
  assert.equal((await saved(page)).goals.length,2,'확인 전에는 지우지 않음');
  assert.ok((await visibleText(page)).includes('공부 기록은 그대로 남아요'));
  await press(page,'삭제하기',800);
  const state=await saved(page);assert.deepEqual(state.goals.map(g=>g.id),['g2']);assert.deepEqual(state.days[today].paid,days[today].paid);
  ok('끝내기·다시 진행·삭제 확인, 기록 유지');assert.deepEqual(errors,[]);await context.close();
 }
 { // 날짜 지남
  const {context,page}=await open(browser,{data:base({goals:[goal({dueDate:'2026-01-01'})]})});
  const text=await visibleText(page);assert.match(text,/D\+\d+/);assert.ok(text.includes('정한 날짜가 지났어요'));
  await card(page).click();await page.waitForTimeout(800);
  await page.screenshot({path:`${out}/detail-passed-390.png`});
  await press(page,'날짜 고치기',300);
  assert.equal(await page.getByLabel('목표 날짜 (선택)').last().inputValue(),'2026-01-01');
  ok('날짜 지남: 탭에 D+N과 안내, 상세에서 날짜 고치기');await context.close();
 }
 { // 진행 계산: 연결한 공부만
  const days={};if(new Date(`${today}T12:00:00`).getDay()!==1)days[dayAgo(1)]=paid(10,0,30);
  const at=new Date().toISOString(),bookSessions=[{id:'s1',subject:'문법',startedAt:at,completedAt:at,seconds:900,note:'3쪽 끝',next:''},{id:'s2',subject:'영어',startedAt:at,completedAt:new Date(Date.now()-864e5).toISOString(),seconds:900,note:'다른 과목',next:''}];
  const handwritingReceipts=[];
  const {context,page,errors}=await open(browser,{data:base({goals:[goal()],days,bookSessions,handwritingReceipts})});
  assert.ok((await visibleText(page)).includes('1일 / 주 5일'),'아침·운동·다른 과목은 세지 않음');
  await page.screenshot({path:`${out}/records-390.png`});
  await card(page).click();await page.waitForTimeout(800);
  const week=await page.getByTestId('goal-week').last().locator('[data-testid^="goal-day-"]').evaluateAll(els=>els.map(e=>e.getAttribute('data-testid').slice(-10)));
  const first=new Date(`${week[0]}T12:00:00`);assert.equal(first.getDay(),1,'월요일 시작');assert.equal(week.length,7);assert.ok(week.includes(today));
  ok('이번 주: 월요일 시작, 연결한 공부만 셈');assert.deepEqual(errors,[]);await context.close();
 }
 { // 공부 시간: 연결한 과목만, 이번 주와 지난주, 보여 주기만
  const now=Date.now(),iso=ms=>new Date(ms).toISOString();
  const bookSessions=[
   {id:'t1',subject:'문법',startedAt:iso(now-1800e3),completedAt:iso(now),seconds:1800,note:'',next:''},
   {id:'t2',subject:'영어',startedAt:iso(now-900e3),completedAt:iso(now),seconds:900,note:'',next:''},
   {id:'t3',subject:'문법',startedAt:iso(now-7*864e5-3600e3),completedAt:iso(now-7*864e5),seconds:3600,note:'',next:''},
  ];
  // 메모 없는 집중 기록은 시간에는 들어가지만 오늘을 '끝낸 날'로 만들지 않아 복귀 축하가 뜨지 않는다.
  // 지난주 기록이 있으면 월요일 주간 점검이 먼저 열리므로, 이번 주 점검은 끝낸 것으로 둔다.
  const monday=(()=>{const d=new Date(`${today}T12:00:00`);d.setDate(d.getDate()-(d.getDay()+6)%7);return dateKey(d)})();
  const {context,page,errors}=await open(browser,{data:base({goals:[goal()],bookSessions,weeklyReviews:{[monday]:{doneAt:new Date().toISOString()}}})});
  assert.ok((await visibleText(page)).includes('공부 시간 이번 주 30분 · 지난주 1시간'),'탭 카드의 공부 시간');
  await card(page).click();await page.waitForTimeout(800);
  const box=page.getByTestId('goal-week-time').last();
  assert.equal(await box.getByLabel('이번 주 공부 시간 30분').count(),1,'이번 주 막대');
  assert.equal(await box.getByLabel('지난주 공부 시간 1시간').count(),1,'지난주 막대');
  const state=await saved(page);assert.equal(state.goals[0].weeklyTargetDays,5,'약속은 그대로');
  await box.scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/week-time-390.png`});
  await context.close();
  const empty=await open(browser,{data:base({goals:[goal()]})});
  assert.ok(!(await visibleText(empty.page)).includes('공부 시간 이번 주'),'시간이 없으면 탭 카드에 줄이 없음');
  await card(empty.page).click();await empty.page.waitForTimeout(800);
  assert.ok((await visibleText(empty.page)).includes('연결한 공부의 시간이 아직 없어요.'),'빈 상태 안내');
  ok('공부 시간: 연결한 과목만, 이번 주·지난주, 빈 상태');assert.deepEqual(errors,[]);assert.deepEqual(empty.errors,[]);await empty.context.close();
 }
 { // 다음 한 걸음
  const detail=async data=>{const run=await open(browser,{data});await card(run.page).click();await run.page.waitForTimeout(800);return run};
  let run=await detail(base({goals:[goal()]}));
  await press(run.page,'오늘 계획 정하기',800);
  assert.ok(await run.page.getByText('공부 준비').last().isVisible(),'계획 화면 이동');
  await run.context.close();
  run=await detail(base({goals:[goal()],priorityDays:plan([task({subject:'영어',action:'다른 공부'}),task({id:'t2',action:'3쪽 풀기'})])}));
  const text=await visibleText(run.page);assert.ok(text.includes('3쪽 풀기'));assert.ok(!text.includes('다른 공부'),'연결하지 않은 과목은 보이지 않음');
  const before=JSON.stringify((await saved(run.page)).priorityDays);
  await press(run.page,'오늘 탭에서 이어 가기',800);
  assert.ok(!(await shown(run.page.getByTestId('goal-summary'))),'오늘 탭으로 이동');
  assert.equal(JSON.stringify((await saved(run.page)).priorityDays),before,'이동만으로 계획이 시작되면 안 됨');
  await run.context.close();
  run=await detail(base({goals:[goal()],days:{[today]:paid(0,0,0)},priorityDays:plan([task({startedAt:new Date(Date.now()-300000).toISOString(),baseline:0,completedAt:new Date().toISOString(),receiptId:'r1'})]),handwritingReceipts:[{id:'r1',imageHash:'a'.repeat(64),subject:'문법',at:new Date().toISOString(),day:today,lines:['3쪽'],languages:['ko'],units:2,duplicateUnits:0,minutes:0,policyVersion:1}]}));
  const done=await visibleText(run.page);assert.ok(done.includes('오늘 이 목표의 공부를 모두 끝냈어요'));assert.ok(done.includes('1일 / 주 5일'),'끝낸 중요한 공부를 셈');
  await press(run.page,'내일 계획 준비하기',800);
  assert.ok(await run.page.getByText('공부 준비').last().isVisible(),'내일 계획 화면 이동');
  await run.context.close();
  run=await detail(base({decks:[{id:'d',name:'N2 단어',active:true}],goals:[goal({links:{subjects:[],deckIds:['d']}})]}));
  await press(run.page,'학습 탭으로 가기',800);
  assert.ok(!(await shown(run.page.getByTestId('goal-summary'))),'학습 탭으로 이동');
  await run.context.close();
  ok('다음 한 걸음: 목표별 표시와 이동, 이동만으로 계획이 시작되지 않음');
 }
 { // 잘못된 값, 기존 저장값 유지
  const data=base({primaryGoal:{title:''},boriStage:'growing',days:{[today]:paid(10,0,0)}});
  const {context,page,errors}=await open(browser,{data});
  assert.ok((await visibleText(page)).includes('저장된 목표를 읽지 못했어요'));
  assert.deepEqual((await saved(page)).primaryGoal,{title:''},'새 저장 전까지 원본 유지');
  await tab(page,'기록').click();await page.waitForTimeout(500);
  assert.ok((await visibleText(page)).includes('우리의 기록'));
  await tab(page,'목표').click();await page.waitForTimeout(400);
  await press(page,'목표 다시 정하기',300);
  await page.getByLabel('목표 이름').fill('새 목표');await press(page,'일주일에 3일',100);
  await press(page,'목표 저장',500);
  const state=await saved(page);assert.equal(state.primaryGoal.title,'새 목표');assert.equal(state.goals[0].title,'새 목표');assert.equal(state.boriStage,'growing');assert.equal(state.days[today].paid.morning,10);
  ok('깨진 primaryGoal: 앱은 열리고 다시 정할 수 있으며 다른 기록 유지');assert.deepEqual(errors,[]);await context.close();
 }
 { // goals 안의 깨진 항목
  const broken={title:''},{context,page,errors}=await open(browser,{data:base({goals:[broken,goal()]})});
  const text=await visibleText(page);assert.ok(text.includes('읽지 못한 목표가 1개'));assert.ok(text.includes('JLPT N2 합격'));
  await card(page).click();await page.waitForTimeout(800);
  await press(page,'목표 고치기',300);await page.getByLabel('목표 이름').last().fill('고친 목표');await press(page,'목표 저장',500);
  const state=await saved(page);assert.deepEqual(state.goals[0],broken,'깨진 항목 원본 유지');assert.equal(state.goals[1].title,'고친 목표');
  ok('깨진 항목: 개수 안내, 다른 목표 저장 시 원본 유지');assert.deepEqual(errors,[]);await context.close();
 }
 { // 설정의 친구 선택과 터치
  const {context,page,errors}=await open(browser,{data:base({goals:[goal()]})});
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
  const {context,page}=await open(browser,{reduced:true,data:base({goals:[goal()]})});
  const mascot=page.getByTestId('goal-summary').locator('[data-testid^="animal-"]');await mascot.waitFor();
  assert.notEqual(await mascot.locator('[data-still-frame]').getAttribute('data-still-frame'),'');
  assert.equal(await mascot.locator('[data-active]').getAttribute('data-active'),'false');
  ok('모션 줄이기: 대표 프레임 정지');await context.close();
 }
 { // 저녁 시간
  let off=(20-new Date().getUTCHours()+24)%24;if(off>14)off-=24;
  const {context,page}=await open(browser,{timezoneId:'Etc/GMT'+(off>=0?'-'+off:'+'+(-off)),data:base({goals:[goal()]})});
  await page.screenshot({path:`${out}/evening-390.png`});ok('저녁 시간 화면 캡처');await context.close();
 }
 { // iPhone 13 Pro 크기, 긴 이름
  const viewport={width:390,height:844},longTitle='JLPT N2 시험에 합격해서 일본에서 일하기 위한 긴 목표 이름';
  const {context,page}=await open(browser,{viewport,data:base({goals:[goal({title:longTitle,dueDate:'2099-12-06'})]})});
  const over=()=>page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert.ok(await over()<=0);
  await page.screenshot({path:`${out}/long-title-390.png`});
  await card(page,longTitle).click();await page.waitForTimeout(800);assert.ok(await over()<=0);
  await page.screenshot({path:`${out}/long-title-detail-390.png`,fullPage:true});
  ok('가로 넘침 없음','390x844');await context.close();
 }
 console.log('ALL PASS',results.length,'· 웹 미리보기 결과이며 iOS 실기기 검증이 아님');
}finally{await browser.close()}})().catch(e=>{console.error('FAIL after',results.length,e.message);process.exit(1)});
