// 긴급 해제 검수: 시간대별 입구, 내 목표 카드, 벌점 표시, 이유와 10초 대기, 횟수별 벌점, 공부 중 차단, 하루 기록을 390x844, 844x390에서 찍고 잰다.
// 브라우저 시계를 밤으로 맞추고 예시 데이터만 쓴다. 실제 잠금과 재잠금은 웹에서 확인되지 않는다. iOS 실기기 검증을 대신하지 않는다.
// 사용: $env:PREVIEW_PORT='8123'; node scripts/check-emergency-web.cjs
const {previewUrl}=require('./lib/preview-url.cjs');
const fs=require('fs');
const {chromium}=require('C:/Users/SSAFY/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const out='.expo/emergency';
fs.mkdirSync(out,{recursive:true});
const DEMO='routine.v1.web-priority-demo',SIZES=[[390,844],[844,390]];
const errors=[],report=[];
const check=(ok,message)=>{if(!ok)errors.push(message)};
const night=()=>{const d=new Date();d.setHours(22,0,0,0);return d};
const noon=()=>{const d=new Date();d.setHours(12,0,0,0);return d};

async function measure(page,name){
 const r=await page.evaluate(()=>{
  const seen=e=>{const b=e.getBoundingClientRect();return b.width>0&&b.height>0&&!e.closest('[aria-hidden=true]')};
  const small=[...document.querySelectorAll('[role=button]')].filter(seen).map(e=>({l:(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,24),h:e.getBoundingClientRect().height})).filter(x=>x.h<43.5&&x.l!=='예시 초기화').map(x=>x.l+' '+Math.round(x.h));
  return {wide:document.documentElement.scrollWidth>innerWidth,small};
 });
 report.push({name,...r});
 check(!r.wide,name+': 가로 넘침');check(!r.small.length,name+': 작은 버튼 '+r.small.join(', '));
}
async function shots(page,name){
 for(const [width,height] of SIZES){
  await page.setViewportSize({width,height});await page.waitForTimeout(250);
  await page.screenshot({path:`${out}/${name}-${width}x${height}.png`});
  await measure(page,`${name} ${width}x${height}`);
 }
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);
}
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const open=async time=>{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  await page.clock.install({time});
  await page.goto(previewUrl('/?priorityDemo=1'),{waitUntil:'networkidle',timeout:300000});
  await page.waitForFunction(k=>!!localStorage.getItem(k),DEMO,{timeout:30000});
  return page;
 };
 const btn=(p,name)=>p.getByRole('button',{name,exact:true});
 const state=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),DEMO);
 const wallet=async p=>{await p.getByRole('button',{name:'사용 시간 상세'}).first().click();await p.getByText('시간 보관함',{exact:true}).waitFor();await p.waitForTimeout(200);};
 const LINK='꼭 써야 하나요? 긴급 해제';
 const unlock=async(p,reason)=>{
  await p.getByRole('textbox',{name:'왜 지금 필요한가요?'}).fill(reason);
  await p.getByRole('button',{name:/초 뒤에 누를 수 있어요/}).waitFor();
  await p.clock.fastForward(10500);await p.waitForTimeout(500);
  await btn(p,'벌점 받고 15분 열기').click();
  await p.getByText('제한 앱이 열려 있어요',{exact:true}).waitFor({timeout:10000});
 };
 const step=async(name,fn)=>{try{await fn();}catch(e){errors.push(name+': '+String(e.message).split('\n')[0]);}};

 await step('daytime',async()=>{
  const p=await open(noon());await wallet(p);
  check(await btn(p,LINK).count()===0,'낮에 입구가 보인다');
  await p.context().close();
 });

 await step('flow',async()=>{
  const p=await open(night());await wallet(p);
  await shots(p,'wallet');
  await btn(p,LINK).click();
  await p.getByText('제한 앱을 15분 열어요',{exact:true}).waitFor();
  check(await p.getByText(/오늘 1번째 · 벌점 30분/).count()===1,'첫 벌점 표시가 없다');
  check(await p.getByText(/되돌릴 수 없어요/).count()===1,'되돌릴 수 없다는 안내가 없다');
  check(await p.getByText(/머스크/).count()===0,'머스크 질문이 있다');
  await shots(p,'confirm');
  const empty=btn(p,'이유를 적어 주세요');
  check(await empty.isDisabled()||await empty.getAttribute('aria-disabled')==='true','이유 없이 버튼이 켜졌다');
  const field=p.getByRole('textbox',{name:'왜 지금 필요한가요?'});
  await field.fill('가족 연락');
  const waiting=p.getByRole('button',{name:/초 뒤에 누를 수 있어요/});
  await waiting.waitFor();
  check((await waiting.getAttribute('aria-disabled'))==='true'||await waiting.isDisabled(),'대기 중 버튼이 켜졌다');
  await shots(p,'waiting');
  await p.clock.fastForward(5000);await p.waitForTimeout(300);
  check(await btn(p,'벌점 받고 15분 열기').count()===0,'5초 만에 버튼이 켜졌다');
  check(((await state(p)).emergencyUnlocks??[]).length===0,'누르기 전에 기록됐다');
  await field.fill('');await p.waitForTimeout(200);
  await field.fill('가족 연락');await p.clock.fastForward(5000);await p.waitForTimeout(300);
  check(await btn(p,'벌점 받고 15분 열기').count()===0,'이유를 지웠는데 대기가 이어졌다');
  await p.clock.fastForward(5500);await p.waitForTimeout(500);
  await shots(p,'ready');
  await btn(p,'벌점 받고 15분 열기').click();
  await p.getByText('제한 앱이 열려 있어요',{exact:true}).waitFor({timeout:10000});
  await shots(p,'open');
  const s=await state(p),u=s.emergencyUnlocks[0];
  check(u&&u.minutes===30&&u.reason==='가족 연락'&&u.order===1,'기록이 다르다: '+JSON.stringify(u));
  check(!s.emergencyPending,'임시 기록이 남았다');
  await p.clock.fastForward(15*60*1000+1000);await p.waitForTimeout(500);
  await p.getByText('제한 앱을 15분 열어요',{exact:true}).waitFor({timeout:10000});
  check(await p.getByText(/오늘 2번째 · 벌점 60분/).count()===1,'두 번째 벌점 표시가 없다');
  await unlock(p,'두 번째');
  await p.clock.fastForward(15*60*1000+1000);await p.waitForTimeout(500);
  await p.getByText(/오늘 3번째 · 벌점 120분/).waitFor({timeout:10000});
  await unlock(p,'세 번째');
  await p.clock.fastForward(15*60*1000+1000);await p.waitForTimeout(500);
  await p.getByText(/오늘 4번째 · 벌점 120분/).waitFor({timeout:10000});
  const after=await state(p);
  check(after.emergencyUnlocks.map(x=>x.minutes).join()==='30,60,120','횟수별 벌점: '+after.emergencyUnlocks.map(x=>x.minutes).join());
  await btn(p,'닫기').last().click();await p.waitForTimeout(200);await btn(p,'닫기').last().click();await p.waitForTimeout(300);
  await p.getByRole('tab',{name:'기록',exact:true}).click();await p.waitForTimeout(300);
  await p.getByRole('button',{name:/^오늘 하루 전체 보기/}).click();
  await p.getByText('가족 연락',{exact:true}).waitFor({timeout:15000});
  check(await p.getByText(/210분/).count()>=1,'하루 기록 벌점 합계가 없다');
  await shots(p,'day-record');
  await p.context().close();
 });

 await step('goal card',async()=>{
  const p=await open(night());
  const key=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const due=night();due.setDate(due.getDate()+20);
  const made=new Date(night().getTime()-30*864e5).toISOString();
  const g=(id,title,over)=>({id,title,weeklyTargetDays:5,createdAt:made,updatedAt:made,links:{subjects:[],deckIds:[]},...over});
  // 뒤처진 목표(연결 공부 0일)가 앞선 목표보다 먼저 나와야 한다.
  await p.evaluate(([k,goals])=>{const s=JSON.parse(localStorage.getItem(k));s.goals=goals;delete s.primaryGoal;localStorage.setItem(k,JSON.stringify(s));},[DEMO,[
   g('plain','연결 없는 목표',{}),
   g('behind','자격증 합격',{why:'합격해서 다음 일을 고르려고',dueDate:key(due),links:{subjects:['검수용 과목'],deckIds:[]}}),
  ]]);
  await p.reload({waitUntil:'networkidle'});await wallet(p);
  await btn(p,LINK).click();await p.getByText('제한 앱을 15분 열어요',{exact:true}).waitFor();
  const card=p.getByTestId('emergency-goal');
  check(await card.isVisible(),'목표 카드가 없다');
  check(await card.getByText('자격증 합격',{exact:true}).count()===1,'뒤처진 목표가 먼저 나오지 않았다');
  check(await card.getByText('합격해서 다음 일을 고르려고',{exact:true}).count()===1,'내가 적은 이유가 없다');
  check(await card.getByText('내 목표 · D-20',{exact:true}).count()===1,'남은 날이 없다');
  check(await card.getByText(/^이번 주 0일 \/ 주 5일$/).count()===1,'이번 주 진행이 없다');
  const cardBox=await card.boundingBox(),priceBox=await p.getByText('제한 앱을 15분 열어요',{exact:true}).boundingBox();
  check(cardBox&&priceBox&&cardBox.y<priceBox.y,'목표 카드가 벌점 위에 있지 않다');
  check(await p.getByText(/오늘 1번째 · 벌점 30분/).count()===1,'벌점 표시가 바뀌었다');
  await shots(p,'goal-card');
  await p.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k));s.goals=[];localStorage.setItem(k,JSON.stringify(s));},DEMO);
  await p.reload({waitUntil:'networkidle'});await wallet(p);
  await btn(p,LINK).click();await p.getByText('제한 앱을 15분 열어요',{exact:true}).waitFor();
  check(await p.getByTestId('emergency-goal').count()===0,'목표가 없는데 카드가 있다');
  await p.context().close();
 });

 await step('studying',async()=>{
  const p=await open(night());
  await btn(p,'2분, 이 행동부터 시작').click();await p.getByTestId('focus-clock').waitFor();
  await p.reload({waitUntil:'networkidle'});await wallet(p);
  check(await btn(p,LINK).count()===1,'안내 입구가 없다');
  await btn(p,LINK).click();
  await p.getByText(/공부 잠금은 여기서 풀리지 않아요/).waitFor();
  check(await p.getByRole('textbox',{name:'왜 지금 필요한가요?'}).count()===0,'공부 중에 입력칸이 있다');
  await shots(p,'studying');
  await p.context().close();
 });

 await browser.close();
 fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,1));
 for(const r of report)console.log(r.name,JSON.stringify({wide:r.wide,small:r.small}));
 console.log('errors',errors.length);errors.forEach(e=>console.log(' -',e));
 process.exit(errors.length?1:0);
})();
