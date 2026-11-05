// 말하기 검수: 첫 안내 → 주제 → 질문 → 말하기 → AI 답변 → 되묻는 질문 → 보상을 390x844, 844x390에서 찍고 잰다.
// 웹 미리보기는 예시 답변이 자동 입력되고 서버를 부르지 않는다. 유료 호출이 없다. 실제 음성 인식과 iOS 실기기 검증을 대신하지 않는다.
// 사용: $env:PREVIEW_PORT='8123'; node scripts/check-speaking-web.cjs
const {previewUrl}=require('./lib/preview-url.cjs');
const fs=require('fs');
const {chromium}=require('C:/Users/SSAFY/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const out='.expo/speaking';
fs.mkdirSync(out,{recursive:true});
const DEMO='routine.v1.web-priority-demo',SIZES=[[390,844],[844,390]];
const errors=[],report=[];
const check=(ok,message)=>{if(!ok)errors.push(message)};
const QUESTION_ONE='AI가 개발 업무를 대체하는 상황에서 개발자의 역할은 무엇이라고 보십니까';

async function measure(page,name){
 const r=await page.evaluate(()=>{
  const seen=e=>{const b=e.getBoundingClientRect();return b.width>0&&b.height>0&&!e.closest('[aria-hidden=true]')};
  const buttons=[...document.querySelectorAll('[role=button]')].filter(seen).map(e=>({label:(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,24),b:e.getBoundingClientRect()}));
  const hits=[];for(let i=0;i<buttons.length;i++)for(let j=i+1;j<buttons.length;j++){const a=buttons[i].b,o=buttons[j].b;if(a.left<o.right-1&&o.left<a.right-1&&a.top<o.bottom-1&&o.top<a.bottom-1&&!(a.left<=o.left&&a.right>=o.right&&a.top<=o.top&&a.bottom>=o.bottom)&&!(o.left<=a.left&&o.right>=a.right&&o.top<=a.top&&o.bottom>=a.bottom))hits.push(buttons[i].label+'/'+buttons[j].label)}
  const small=buttons.filter(x=>x.b.height<43.5&&x.label!=='예시 초기화').map(x=>x.label+' '+Math.round(x.b.height));
  return {wide:document.documentElement.scrollWidth>innerWidth,hits,small};
 });
 report.push({name,...r});
 check(!r.wide,name+': 가로 넘침');check(!r.hits.length,name+': 버튼 겹침 '+r.hits.join(', '));check(!r.small.length,name+': 작은 버튼 '+r.small.join(', '));
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
 const open=async()=>{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  await page.goto(previewUrl('/?priorityDemo=1'),{waitUntil:'networkidle',timeout:300000});
  await page.waitForFunction(k=>!!localStorage.getItem(k),DEMO,{timeout:30000});
  return page;
 };
 const btn=(p,name)=>p.getByRole('button',{name:new RegExp('^\\W*'+name+'\\W*$')});
 const state=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),DEMO);
 const toTab=async p=>{await p.getByRole('tab',{name:'학습',exact:true}).click();await p.waitForTimeout(300);await p.getByText('말하기',{exact:true}).first().click();await p.waitForTimeout(300);};
 const step=async(name,fn)=>{try{await fn();}catch(e){errors.push(name+': '+String(e.message).split('\n')[0]);}};
 const speak=async(p,ms=3000)=>{await p.waitForTimeout(ms);await btn(p,'다 말했어요').click();};
 const topic=async p=>{await btn(p,'임원 면접').click();await btn(p,'말로 답하기').waitFor();};

 await step('flow',async()=>{
  const p=await open();await toTab(p);
  await btn(p,'확인했어요').waitFor();
  check(await p.getByText(/글자로 바뀐 내용만 서버를 거쳐 OpenAI로/).count()===1,'첫 사용 안내가 없다');
  check(await btn(p,'임원 면접').count()===0,'안내 전에 주제가 보인다');
  await shots(p,'consent');
  await btn(p,'확인했어요').click();await btn(p,'임원 면접').waitFor();
  check(await p.getByText('500자 더 말하면 +5분',{exact:true}).count()===1,'남은 글자 안내가 없다');
  await shots(p,'home');
  await topic(p);
  await shots(p,'question');
  await btn(p,'다른 질문').click();await p.waitForTimeout(100);
  await btn(p,'말로 답하기').click();await p.getByText('듣고 있어요',{exact:true}).waitFor();
  await p.waitForTimeout(1500);
  const partial=await p.getByTestId('speaking-live-text').innerText();
  check(partial.length>20,'실시간 글자가 나오지 않는다');
  check(await p.getByText(/자 더 말하면 \+5분/).last().isVisible(),'말하는 중 남은 글자가 없다');
  await shots(p,'listening');
  await speak(p,2500);
  await btn(p,'되묻는 질문에 답하기').waitFor({timeout:15000});
  check(await p.getByText('잘한 점',{exact:true}).count()===1&&await p.getByText('빠뜨린 점',{exact:true}).count()===1,'AI 답변이 비었다');
  await shots(p,'feedback');
  let s=await state(p);const saved=s.speakingRecords?.[0];
  check(saved?.status==='answered'&&saved.feedback&&saved.answerChars>100,'답변이 저장되지 않았다: '+JSON.stringify(saved)?.slice(0,120));
  await p.reload({waitUntil:'networkidle'});await toTab(p);
  await btn(p,'이어서 마치기').click();await btn(p,'되묻는 질문에 답하기').waitFor();
  await btn(p,'되묻는 질문에 답하기').click();await p.getByText('듣고 있어요',{exact:true}).waitFor();
  check(await p.getByText(/되묻는 답변은 2배로 인정해요/).count()===1,'2배 안내가 없다');
  await speak(p,1500);
  await p.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).speakingRecords?.[0]?.status==='settled',DEMO,{timeout:15000});await p.waitForTimeout(500);
  await shots(p,'after-follow-up');
  s=await state(p);const r=s.speakingRecords[0];
  check(r.status==='settled'&&r.creditedChars===r.answerChars+r.followUpChars*2,'2배 인정이 다르다: '+JSON.stringify({c:r.creditedChars,a:r.answerChars,f:r.followUpChars}));
  await p.context().close();
 });

 await step('reward',async()=>{
  const p=await open();
  await p.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k)),day=Object.keys(s.days).sort().pop();s.speakingConsentAt=new Date().toISOString();s.days[day].speakingRewards={chars:450,steps:0};localStorage.setItem(k,JSON.stringify(s));},DEMO);
  await p.reload({waitUntil:'networkidle'});await toTab(p);
  await btn(p,'임원 면접').waitFor();await topic(p);
  check(await p.getByText('50자 더 말하면 +5분',{exact:true}).last().isVisible(),'이어 쌓인 글자가 반영되지 않았다');
  await btn(p,'말로 답하기').click();await speak(p,2000);
  await btn(p,'건너뛰고 마치기').click({timeout:15000});
  await p.getByTestId('earned-reward-page').waitFor({timeout:15000});
  await p.waitForTimeout(400);
  await shots(p,'earned');
  const s=await state(p),day=Object.keys(s.days).sort().pop();
  check(s.days[day].bonus?.speaking===5,'5분이 지급되지 않았다: '+JSON.stringify(s.days[day].bonus));
  check(s.days[day].speakingRewards?.steps===1,'구간이 올라가지 않았다');
  await p.context().close();
 });

 await step('same answer',async()=>{
  const p=await open();
  await p.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k)),day=Object.keys(s.days).sort().pop();s.speakingConsentAt=new Date().toISOString();s.days[day].speakingRewards={chars:0,steps:20};localStorage.setItem(k,JSON.stringify(s));},DEMO);
  await p.reload({waitUntil:'networkidle'});await toTab(p);
  const round=async()=>{await btn(p,'임원 면접').click();await btn(p,'말로 답하기').click();await speak(p,5500);await btn(p,'건너뛰고 마치기').click({timeout:15000});};
  await round();await p.getByText(/자를 인정했어요/).waitFor({timeout:15000});await shots(p,'result');await p.getByRole('button',{name:'닫기',exact:true}).first().click();await p.waitForTimeout(300);
  await round();await p.getByText('이번 글자는 인정되지 않았어요',{exact:true}).waitFor({timeout:15000});
  check(await p.getByText(/오늘 말한 답변과 거의 같아서/).count()===1,'거의 같은 답변 안내가 없다');
  await shots(p,'similar');
  await p.context().close();
 });

 await step('other topics',async()=>{
  const p=await open();
  await p.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k));s.speakingConsentAt=new Date().toISOString();localStorage.setItem(k,JSON.stringify(s));},DEMO);
  await p.reload({waitUntil:'networkidle'});await toTab(p);
  for(const title of ['임원 면접','기술 면접','일본어 말하기','전기공사기사','삶과 생각','기타'])check(await p.getByRole('button',{name:title,exact:true}).count()===1,'주제가 없다: '+title);
  await p.screenshot({path:`${out}/topics-390x844.png`,fullPage:true});
  await btn(p,'일본어 말하기').click();await p.getByText(/週末/).first().waitFor({timeout:15000});
  check(await p.getByText(/글자를 2배로 인정해요/).count()===1,'일본어 2배 안내가 없다');
  await shots(p,'japanese');
  await btn(p,'말로 답하기').click();await p.waitForTimeout(1200);
  check(/[ぁ-んァ-ン一-龯]/.test(await p.getByTestId('speaking-live-text').innerText()),'일본어 글자가 나오지 않는다');
  await btn(p,'다 말했어요').click();await btn(p,'건너뛰고 마치기').waitFor({timeout:15000});
  const saved=(await state(p)).speakingRecords[0];check(saved.topicId==='japanese','일본어 주제로 저장되지 않았다');
  await btn(p,'건너뛰고 마치기').click();await p.waitForTimeout(500);
  await p.context().close();
  const q=await open();
  await q.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k));s.speakingConsentAt=new Date().toISOString();localStorage.setItem(k,JSON.stringify(s));},DEMO);
  await q.reload({waitUntil:'networkidle'});await toTab(q);
  await btn(q,'전기공사기사').click();await q.getByText(/내용이 틀릴 수 있어요/).waitFor({timeout:15000});
  await shots(q,'electrical');
  await q.getByRole('button',{name:'닫기',exact:true}).last().click();await q.waitForTimeout(400);
  await btn(q,'기타').click();
  const field=q.getByRole('textbox').first();await field.waitFor();
  check(await btn(q,'말로 답하기').count()===0,'주제를 적기 전에 시작할 수 있다');
  await shots(q,'custom');
  await field.fill('좋아하는 책');await btn(q,'질문 받기').click();
  await q.getByText(/좋아하는 책에 대해/).waitFor({timeout:15000});
  await q.context().close();
 });

 await step('timer blocks',async()=>{
  const p=await open();
  await p.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k));s.speakingConsentAt=new Date().toISOString();localStorage.setItem(k,JSON.stringify(s));},DEMO);
  await p.reload({waitUntil:'networkidle'});
  await btn(p,'2분, 이 행동부터 시작').click();await p.getByTestId('focus-clock').waitFor();
  await p.reload({waitUntil:'networkidle'});await toTab(p);
  check(await p.getByText(/공부 타이머가 진행 중이에요/).count()===1,'타이머 중 안내가 없다');
  check(await btn(p,'임원 면접').count()===0,'타이머 중에 시작할 수 있다');
  await shots(p,'blocked');
  await p.context().close();
 });

 await step('day record',async()=>{
  const p=await open();
  await p.evaluate(([k,q])=>{const s=JSON.parse(localStorage.getItem(k)),day=Object.keys(s.days).sort().pop(),at=new Date().toISOString();s.speakingConsentAt=at;s.speakingRecords=[{id:'r',at,day,topicId:'executive-interview',topicTitle:'임원 면접',question:q,answer:'말한 내용 예시입니다',answerChars:10,seconds:60,feedback:{good:'좋음',missed:'빠짐',followUp:'되물음'},verdict:{relevant:true,repetitive:false},status:'settled',rewardDay:day,creditedChars:1000,stepsPaid:1,minutes:5}];s.days[day].speakingRewards={chars:0,steps:1};s.days[day].bonus={...s.days[day].bonus,speaking:5};localStorage.setItem(k,JSON.stringify(s));},[DEMO,QUESTION_ONE]);
  await p.reload({waitUntil:'networkidle'});
  await p.getByRole('tab',{name:'기록',exact:true}).click();await p.waitForTimeout(300);
  await p.getByRole('button',{name:/^오늘 하루 전체 보기/}).click();
  await p.getByText(QUESTION_ONE,{exact:true}).waitFor({timeout:15000});
  await btn(p,'말한 내용 보기').click();
  await p.getByText('말한 내용 예시입니다',{exact:true}).waitFor();
  await shots(p,'day-record');
  await p.context().close();
 });

 await browser.close();
 fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,1));
 for(const r of report)console.log(r.name,JSON.stringify({wide:r.wide,hits:r.hits,small:r.small}));
 console.log('errors',errors.length);errors.forEach(e=>console.log(' -',e));
 process.exit(errors.length?1:0);
})();
