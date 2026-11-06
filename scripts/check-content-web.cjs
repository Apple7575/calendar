// 콘텐츠 검수: 오늘의 업로드, 링크 인증, 하루 1번, 같은 링크, 아이디어 단계, 참고 링크·메모, 달력, 하루 기록을 390x844, 844x390에서 찍고 잰다.
// 격리된 브라우저 컨텍스트와 예시 데이터만 사용한다. 외부 호출이 없다. iOS 실기기 검증을 대신하지 않는다.
// 사용: $env:PREVIEW_PORT='8123'; node scripts/check-content-web.cjs
const {previewUrl}=require('./lib/preview-url.cjs');
const fs=require('fs');
const {chromium}=require('C:/Users/SSAFY/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const out='.expo/content';
fs.mkdirSync(out,{recursive:true});
const DEMO='routine.v1.web-priority-demo',SIZES=[[390,844],[844,390]];
const errors=[],report=[];
const check=(ok,message)=>{if(!ok)errors.push(message)};
const REEL='https://www.instagram.com/reel/CheckReel_1/?igsh=abc',REEL_SAME='instagram.com/reel/CheckReel_1',REEL_TWO='https://www.instagram.com/reel/CheckReel_2/',SHORT='https://youtube.com/shorts/CheckShort_1';

async function measure(page,name){
 const r=await page.evaluate(()=>{
  const seen=e=>{const b=e.getBoundingClientRect();return b.width>0&&b.height>0&&!e.closest('[aria-hidden=true]')};
  const buttons=[...document.querySelectorAll('[role=button],[role=link]')].filter(seen).map(e=>({label:(e.getAttribute('aria-label')||e.textContent||'').trim().slice(0,24),b:e.getBoundingClientRect()}));
  const small=buttons.filter(x=>x.b.height<43.5&&x.label!=='예시 초기화').map(x=>x.label+' '+Math.round(x.b.height));
  return {wide:document.documentElement.scrollWidth>innerWidth,small};
 });
 report.push({name,...r});
 check(!r.wide,name+': 가로 넘침');check(!r.small.length,name+': 작은 버튼 '+r.small.join(', '));
}
async function shots(page,name,full=false){
 for(const [width,height] of SIZES){
  await page.setViewportSize({width,height});await page.waitForTimeout(250);
  await page.screenshot({path:`${out}/${name}-${width}x${height}.png`,fullPage:full});
  await measure(page,`${name} ${width}x${height}`);
 }
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);
}
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const open=async()=>{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',permissions:['clipboard-read','clipboard-write']});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  await page.goto(previewUrl('/?priorityDemo=1'),{waitUntil:'networkidle',timeout:300000});
  return page;
 };
 const btn=(p,name)=>p.getByRole('button',{name,exact:true});
 const state=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),DEMO);
 const toTab=async p=>{await p.getByRole('tab',{name:'학습',exact:true}).click();await p.waitForTimeout(300);await p.getByText('콘텐츠',{exact:true}).first().click();await p.getByTestId('content-today').waitFor();};
 const link=p=>p.getByRole('textbox',{name:'링크 붙여넣기'});
 const send=async(p,url)=>{await link(p).fill(url);await btn(p,'인증하기').click();await p.waitForTimeout(500);};
 const back=async p=>{await p.getByRole('button',{name:/다음 공부 준비하기/}).click();await p.getByTestId('content-today').waitFor();await p.waitForTimeout(200);};
 const step=async(name,fn)=>{try{await fn();}catch(e){errors.push(name+': '+String(e.message).split('\n')[0]);}};
 const today=async p=>{const s=await state(p);return s.days[Object.keys(s.days).sort().pop()]};

 await step('tabs fit',async()=>{
  const p=await open();await p.getByRole('tab',{name:'학습',exact:true}).click();await p.waitForTimeout(300);
  for(const width of [390]){
   await p.setViewportSize({width,height:844});await p.waitForTimeout(200);
   const r=await p.evaluate(()=>['단어','집중','말하기','콘텐츠'].map(t=>{const e=[...document.querySelectorAll('div[dir=auto]')].filter(x=>x.textContent===t&&x.getBoundingClientRect().width).pop();if(!e)return null;return {t,fits:e.scrollWidth<=e.clientWidth+1,h:e.getBoundingClientRect().height}}));
   check(r.every(x=>x&&x.fits&&x.h<30),width+'폭 탭: '+JSON.stringify(r));
  }
  await p.screenshot({path:`${out}/tabs-390x844.png`});
  await p.context().close();
 });

 await step('verify',async()=>{
  const p=await open();await toTab(p);
  await shots(p,'empty',true);
  await send(p,'https://www.instagram.com/p/abc/');
  check(await p.getByText(/릴스나 유튜브 쇼츠 링크/).count()>=1,'잘못된 링크 안내가 없다');
  check(((await state(p)).contentUploads??[]).length===0,'잘못된 링크가 저장됐다');
  await shots(p,'bad-link');
  await send(p,REEL);
  await p.getByTestId('earned-reward-page').waitFor({timeout:15000});await p.waitForTimeout(300);
  await shots(p,'earned-reels');
  check((await today(p)).bonus?.content===60,'릴스 60분이 아니다');
  await back(p);
  await send(p,REEL_SAME);
  check(await p.getByText(/이미 인증한 링크/).count()>=1,'같은 링크 안내가 없다');
  check((await state(p)).contentUploads.length===1,'같은 링크가 또 저장됐다');
  await send(p,'https://www.instagram.com/reels/CheckReel_1/');
  check((await state(p)).contentUploads.length===1,'reels 표기로 같은 링크가 저장됐다');
  await send(p,REEL_TWO);
  check(await p.getByText(/오늘 이미 보상을 받았어요/).count()>=1,'두 번째 릴스 안내가 없다');
  check((await today(p)).bonus?.content===60,'두 번째 릴스에 보상이 붙었다');
  check((await state(p)).contentUploads[1].rewarded===false,'두 번째 릴스가 보상으로 저장됐다');
  await send(p,SHORT);
  await p.getByTestId('earned-reward-page').waitFor({timeout:15000});
  check((await today(p)).bonus?.content===180,'쇼츠까지 180분이 아니다');
  await back(p);
  await shots(p,'done',true);
  await p.reload({waitUntil:'networkidle'});await toTab(p);
  await send(p,REEL_SAME);
  check((await state(p)).contentUploads.length===3,'새로고침 뒤 같은 링크가 저장됐다');
  await p.getByRole('tab',{name:'기록',exact:true}).click();await p.waitForTimeout(300);
  await p.getByRole('button',{name:/^오늘 하루 전체 보기/}).click();
  await p.getByText('콘텐츠 업로드',{exact:true}).last().waitFor({timeout:15000});
  await shots(p,'day-record',true);
  await p.context().close();
 });

 await step('ideas',async()=>{
  const p=await open();await toTab(p);
  const field=p.getByRole('textbox',{name:'한 줄 아이디어'});
  await field.fill('회로 쉽게 외우는 법');await btn(p,'창고에 넣기').click();await p.waitForTimeout(300);
  await field.fill('시험 전날 루틴');await btn(p,'창고에 넣기').click();await p.waitForTimeout(300);
  await shots(p,'ideas',true);
  await btn(p,'오늘 만들기').first().click();await p.waitForTimeout(300);
  check((await state(p)).contentIdeas.filter(i=>i.stage==='making').length===1,'오늘 만들기가 안 된다');
  await btn(p,'아이디어로 되돌리기').click();await p.waitForTimeout(300);
  check((await state(p)).contentIdeas.every(i=>i.stage==='idea'),'되돌리기가 안 된다');
  await btn(p,'오늘 만들기').first().click();await p.waitForTimeout(300);
  await send(p,REEL);await p.getByTestId('earned-reward-page').waitFor({timeout:15000});
  await back(p);
  const s=await state(p);
  check(s.contentIdeas.filter(i=>i.stage==='posted').length===1&&s.contentUploads[0].ideaId,'올림으로 넘어가지 않았다');
  await btn(p,'지우기').click();await p.waitForTimeout(300);
  check((await state(p)).contentIdeas.length===1,'지우기가 안 된다');
  await shots(p,'idea-posted',true);
  await p.context().close();
 });

 await step('idea refs',async()=>{
  const p=await open();await toTab(p);
  // 참고 링크가 없는 예전 기록과 깨진 refs·why가 섞인 기록: 불러올 때 아이디어는 남고 깨진 칸만 빠져야 한다.
  await p.evaluate(k=>{const s=JSON.parse(localStorage.getItem(k));s.contentIdeas=[
   {id:'old',text:'예전 아이디어',at:'2026-11-01T00:00:00.000Z',stage:'idea'},
   {id:'bad',text:'깨진 참고 링크',at:'2026-11-01T00:00:00.000Z',stage:'idea',refs:['javascript:alert(1)',7,'https://evil.example/reel/x'],why:{x:1}},
  ];localStorage.setItem(k,JSON.stringify(s));},DEMO);
  await p.reload({waitUntil:'networkidle'});await toTab(p);
  check(await p.getByText('예전 아이디어',{exact:true}).isVisible(),'예전 기록이 안 보인다');
  check(await p.getByText('깨진 참고 링크',{exact:true}).isVisible(),'깨진 칸 때문에 아이디어가 사라졌다');
  check(!(await p.getByTestId('idea-refs-bad').count()),'깨진 참고 링크가 보인다');
  const row=p.getByTestId('idea-old');
  await row.getByRole('button',{name:'참고 링크·메모',exact:true}).click();await p.waitForTimeout(200);
  const editor=p.getByTestId('idea-editor-old');
  await editor.getByRole('textbox',{name:'왜 좋았나 (선택)'}).fill('첫 3초에 질문을 던져서');
  await editor.getByRole('button',{name:'메모 저장',exact:true}).click();await p.waitForTimeout(300);
  check(!(await editor.getByRole('button',{name:'메모 저장',exact:true}).count()),'저장한 뒤에도 메모 저장 버튼이 남는다');
  check(!(await editor.getByRole('button',{name:'링크 넣기',exact:true}).count()),'빈 링크 칸인데 링크 넣기가 보인다');
  await p.evaluate(t=>navigator.clipboard.writeText(t),'https://www.instagram.com/reel/RefReel_1/?igsh=abc');
  await editor.getByRole('button',{name:'복사한 링크 붙이기',exact:true}).click();await p.waitForTimeout(400);
  await editor.getByRole('textbox',{name:'참고 링크'}).fill('https://evil.example/reel/x');
  await editor.getByRole('button',{name:'링크 넣기',exact:true}).click();await p.waitForTimeout(200);
  check(await editor.getByText('인스타·유튜브·틱톡·스레드 영상 링크만 붙일 수 있어요.').isVisible(),'허용 안 된 주소에 안내가 없다');
  await editor.getByRole('textbox',{name:'참고 링크'}).fill('https://www.tiktok.com/@maker/video/7301234567890');
  await editor.getByRole('button',{name:'링크 넣기',exact:true}).click();await p.waitForTimeout(300);
  await editor.getByRole('textbox',{name:'참고 링크'}).fill('https://www.threads.net/@maker/post/C1abc');
  await p.screenshot({path:`${out}/idea-refs-editor-390x844.png`});await measure(p,'idea-refs-editor 390x844');
  await editor.getByRole('button',{name:'링크 넣기',exact:true}).click();await p.waitForTimeout(300);
  let idea=(await state(p)).contentIdeas.find(i=>i.id==='old');
  check(idea.why==='첫 3초에 질문을 던져서','메모가 저장되지 않았다: '+idea.why);
  check(JSON.stringify(idea.refs)===JSON.stringify(['https://www.instagram.com/reel/RefReel_1/','https://www.tiktok.com/@maker/video/7301234567890','https://www.threads.com/@maker/post/C1abc']),'참고 링크가 다르다: '+JSON.stringify(idea.refs));
  check((await state(p)).contentIdeas.length===2,'예전 기록이 저장 중에 사라졌다');
  await row.getByRole('button',{name:'닫기',exact:true}).click();await p.waitForTimeout(200);
  await row.getByRole('button',{name:'오늘 만들기',exact:true}).click();await p.waitForTimeout(300);
  const making=p.getByTestId('idea-old'),refsBox=await making.getByTestId('idea-refs-old').boundingBox(),textBox=await making.getByText('예전 아이디어',{exact:true}).boundingBox();
  check(refsBox&&textBox&&refsBox.y>textBox.y,'만드는 중인데 참고 링크가 제목 아래가 아니다');
  const whyBox=await making.getByText(/^왜 좋았나 · /).boundingBox();
  check(refsBox&&whyBox&&refsBox.y<whyBox.y,'만드는 중인데 참고 링크가 메모보다 아래다');
  await p.evaluate(()=>{window.__opened=[];window.open=u=>{window.__opened.push(String(u));return null};});
  await making.getByRole('link',{name:'인스타 릴스 1 열기'}).click();await p.waitForTimeout(300);
  const opened=await p.evaluate(()=>window.__opened);
  check(opened[0]==='https://www.instagram.com/reel/RefReel_1/','링크를 열지 않았다: '+JSON.stringify(opened));
  await making.evaluate(e=>e.scrollIntoView({block:'center'}));
  await shots(p,'idea-refs-making',false);
  await p.context().close();
 });

 await browser.close();
 fs.writeFileSync(`${out}/report.json`,JSON.stringify(report,null,1));
 for(const r of report)console.log(r.name,JSON.stringify({wide:r.wide,small:r.small}));
 console.log('errors',errors.length);errors.forEach(e=>console.log(' -',e));
 process.exit(errors.length?1:0);
})();
