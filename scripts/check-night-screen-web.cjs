// 밤 화면(S1-09): 시계를 20:58에 두고 21:00을 넘기면 다시 열지 않아도 밤 화면 색으로 바뀌는지, 04:30이 지나면 돌아오는지,
// 밤에는 큰 축하가 작은 축하(알약)로만 나오는지, 설정의 화면 모드가 고른 값 그대로이고 안내가 보이는지 390x844에서 본다.
// 웹 미리보기 검사이며 iOS 실기기 검증을 대신하지 않는다.
// 사용: $env:PREVIEW_PORT='8094'; node scripts/check-night-screen-web.cjs
const {previewUrl}=require('./lib/preview-url.cjs');
const fs=require('fs');
const {chromium}=require('C:/Users/SSAFY/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const out='.expo/night-screen';
fs.mkdirSync(out,{recursive:true});
const DEMO='routine.v1.web-priority-demo';
const NIGHT_BG='rgb(14, 12, 9)',DARK_BG='rgb(0, 0, 0)',LIGHT_BG='rgb(248, 245, 238)';
const errors=[],report=[];
const check=(ok,message)=>{if(!ok)errors.push(message)};

// 화면에서 가장 넓게 칠해진 배경색(= surface).
const pageBg=page=>page.evaluate(()=>{const count={};for(const e of document.querySelectorAll('div')){const b=e.getBoundingClientRect();if(b.width<300||b.height<300)continue;const c=getComputedStyle(e).backgroundColor;if(c&&c!=='rgba(0, 0, 0, 0)')count[c]=(count[c]||0)+b.width*b.height;}return Object.entries(count).sort((a,b)=>b[1]-a[1])[0]?.[0]??null;});

(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const open=async(time,{theme}={})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  await page.clock.install({time});
  await page.goto(previewUrl('/?priorityDemo=1'),{waitUntil:'networkidle',timeout:300000});
  await page.waitForFunction(k=>!!localStorage.getItem(k),DEMO,{timeout:30000});
  if(theme){await page.evaluate(id=>localStorage.setItem('theme.id.v2',id),theme);await page.reload({waitUntil:'networkidle'});}
  await page.waitForTimeout(1000);
  // 그 주 처음 열면 주간 점검이 자동으로 열린다(Grace). 이 검사와 관계없으니 닫는다.
  const week=page.getByRole('heading',{name:'주간 점검',exact:true});
  if(await week.waitFor({timeout:3000}).then(()=>true,()=>false)){await page.getByRole('button',{name:'닫기',exact:true}).last().click();await page.waitForTimeout(400);}
  return {page,context};
 };
 const step=async(name,fn)=>{try{await fn()}catch(e){errors.push(name+': '+String(e.message).split('\n')[0])}};

 await step('21:00에 저절로 밤 화면',async()=>{
  const {page,context}=await open(new Date(2026,10,7,20,58),{theme:'routine'});
  const before=await pageBg(page);
  check(before===LIGHT_BG,'20:58 라이트 테마인데 배경 '+before);
  await page.clock.runFor(3*60_000);await page.waitForTimeout(800);
  const after=await pageBg(page);
  check(after===NIGHT_BG,'21:01 밤 화면이 아님 '+after);
  await page.screenshot({path:out+'/today-2101-390x844.png'});
  report.push({step:'21:00',before,after});
  await context.close();
 });

 await step('04:30이 지나면 고른 테마로',async()=>{
  const {page,context}=await open(new Date(2026,10,8,4,28),{theme:'dark'});
  const before=await pageBg(page);
  check(before===NIGHT_BG,'04:28 밤 화면이 아님 '+before);
  await page.clock.runFor(3*60_000);await page.waitForTimeout(800);
  const after=await pageBg(page);
  check(after===DARK_BG,'04:31 다크로 돌아오지 않음 '+after);
  report.push({step:'04:30',before,after});
  await context.close();
 });

 await step('밤에는 축하가 작게',async()=>{
  const {page,context}=await open(new Date(2026,10,7,22,0));
  await page.evaluate(()=>window.__celebrate({kind:'dayComplete'}));
  await page.getByTestId('celebration-pill').waitFor({timeout:10000});
  check(await page.locator('[data-testid^=celebration-big]').count()===0,'밤인데 큰 축하가 나옴');
  check(await page.locator('[data-testid^=celebration-toast]').count()===0,'밤인데 중간 축하가 나옴');
  await page.screenshot({path:out+'/celebration-2200-390x844.png'});
  await page.waitForTimeout(1500);
  await page.evaluate(()=>window.__celebrate({kind:'streak',n:7}));
  await page.getByTestId('celebration-pill').waitFor({timeout:10000});
  check(await page.locator('[data-testid^=celebration-big]').count()===0,'밤인데 연속 기념일이 큰 축하로 나옴');
  report.push({step:'celebration',night:'pill only'});
  await context.close();
 });

 await step('낮에는 축하가 그대로',async()=>{
  const {page,context}=await open(new Date(2026,10,7,13,0));
  await page.evaluate(()=>window.__celebrate({kind:'dayComplete'}));
  await page.getByTestId('celebration-big-dayComplete').waitFor({timeout:10000});
  report.push({step:'celebration',day:'big'});
  await context.close();
 });

 await step('설정의 화면 모드는 고른 값 그대로 + 안내',async()=>{
  const {page,context}=await open(new Date(2026,10,7,22,0),{theme:'routine'});
  // 오늘 탭은 머리줄이 없어 프로필 버튼이 없다. 목표 탭 머리줄에서 연다.
  await page.getByRole('tab',{name:'목표',exact:true}).click();await page.waitForTimeout(600);
  await page.getByRole('button',{name:'프로필·설정',exact:true}).first().click();
  await page.getByRole('button',{name:'소리·진동·모션·화면',exact:true}).click();
  await page.getByText('화면 모드',{exact:true}).waitFor({timeout:15000});
  await page.getByText('지금은 밤 화면이에요.',{exact:false}).waitFor({timeout:5000});
  // 화면 모드는 Segments(role=tab, aria-selected)다.
  const selected=await page.getByRole('tab',{name:'라이트',exact:true}).first().getAttribute('aria-selected');
  check(selected==='true','밤인데 고른 라이트가 선택돼 보이지 않음 ('+selected+')');
  await page.getByText('화면 모드',{exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:out+'/settings-2200-390x844.png'});
  report.push({step:'settings',lightSelected:selected});
  await context.close();
 });

 await browser.close();
 console.log(JSON.stringify(report,null,1));
 if(errors.length){console.error('FAIL\n'+errors.join('\n'));process.exit(1)}
 console.log('PASS check-night-screen-web');
})();
