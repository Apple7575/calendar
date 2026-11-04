// 아침 루틴 검수: 마치면 다음 타이머 시작, 이전으로 돌아가기, 건너뛰기, 재생·멈춤 아이콘, 보상 지급 시점.
// 격리된 브라우저 컨텍스트와 예시 데이터만 사용한다. iOS 실기기 검증을 대신하지 않는다.
const {previewUrl}=require('./lib/preview-url.cjs');
const assert=require('assert/strict'),fs=require('fs');
const {chromium}=require('C:/Users/SSAFY/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out='.expo/design-system/routine';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const b=await chromium.launch({channel:'chrome',headless:true});
 try{
  const c=await b.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(previewUrl('/?priorityDemo=1'),{waitUntil:'networkidle',timeout:280000});
  const btn=n=>p.getByRole('button',{name:n,exact:true}),time=()=>p.getByTestId('timer-face-time').textContent();
  const paid=()=>p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('routine.v1.web-priority-demo'));return Math.max(0,...Object.values(s.days).map(d=>d.paid.morning))});
  const checks=()=>p.evaluate(()=>{const s=JSON.parse(localStorage.getItem('routine.v1.web-priority-demo'));const d=Object.values(s.days).find(d=>d.guidedTimer||d.morning.some(Boolean));return d?d.morning.filter(Boolean).length:0});
  await btn('아침 루틴 시작·이어하기').click();await p.waitForTimeout(500);await p.screenshot({path:`${out}/start.png`});
  await p.getByRole('button',{name:/루틴 시작/}).click();await btn('타이머 멈추기').waitFor();await p.waitForTimeout(1600);
  await p.screenshot({path:`${out}/running.png`});
  const first=await p.getByRole('heading').last().textContent();
  await btn('타이머 멈추기').click();await btn('타이머 이어가기').waitFor();const held=await time();await p.waitForTimeout(1500);assert.equal(await time(),held,'멈추면 시간이 그대로');
  await btn('타이머 이어가기').click();await btn('타이머 멈추기').waitFor();
  await btn('이 행동 마쳤어요').click();await btn('타이머 멈추기').waitFor();const t1=await time();await p.waitForTimeout(2200);assert.notEqual(await time(),t1,'마치면 다음 타이머가 바로 돈다');
  const second=await p.getByRole('heading').last().textContent();assert.notEqual(second,first);assert.equal(await checks(),1);assert.equal(await paid(),0);
  await btn('이전 행동으로 돌아가기').click();await p.waitForTimeout(400);assert.equal(await p.getByRole('heading').last().textContent(),first,'이전 행동으로 돌아감');assert.equal(await checks(),0,'체크가 풀림');
  await btn('타이머 멈추기').waitFor();
  await btn('이 행동 건너뛰기').click();await p.waitForTimeout(400);assert.equal(await p.getByRole('heading').last().textContent(),second,'건너뜀');assert.equal(await checks(),0,'건너뛰어도 완료 아님');assert.equal(await paid(),0,'건너뛰어도 보상 없음');
  await p.screenshot({path:`${out}/skipped.png`});
  await btn('이전 행동으로 돌아가기').click();await p.waitForTimeout(400);assert.equal(await p.getByRole('heading').last().textContent(),first,'잘못 건너뛰어도 돌아감');assert.equal(await checks(),0);
  await btn('타이머 멈추기').waitFor();
  await p.evaluate(()=>{const k='routine.v1.web-priority-demo',s=JSON.parse(localStorage.getItem(k));for(const d of Object.values(s.days))if(d.guidedTimer){d.guidedTimer.remaining=0;d.guidedTimer.endsAt=Date.now()-65000}localStorage.setItem(k,JSON.stringify(s))});
  await p.reload({waitUntil:'networkidle'});await p.getByRole('button',{name:/^아침 루틴/}).first().click();await btn('이 행동 마쳤어요').waitFor();await p.waitForTimeout(900);await p.screenshot({path:`${out}/overtime.png`});
  const ink=await p.evaluate(()=>{const t=document.querySelector('[data-testid=timer-face-time]');const lit=[...document.querySelectorAll('div')].some(e=>getComputedStyle(e).backgroundColor==='rgb(196, 234, 137)'&&e.getBoundingClientRect().width>=380);return {time:t.textContent,color:getComputedStyle(t).color,lit}});
  assert.equal(ink.color,'rgb(0, 0, 0)','초과 시간은 검은 글자');assert.equal(ink.lit,true,'초과 시간은 연두 바탕');assert.match(ink.time,/^\+/,'초과 시간 표시');
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
  console.log('PASS routine flow: 마침→다음 타이머, 멈춤·이어가기, 이전, 건너뛰기, 건너뛰기 복구, 건너뛰기 보상 없음, 시간 초과 반전');
 }finally{await b.close()}
})().catch(e=>{console.error('FAIL',e.message.split('\n')[0]);process.exit(1)});
