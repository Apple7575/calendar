// 탭을 다시 누르면 맨 위로: 네 탭마다 스크롤을 내린 뒤 같은 탭을 누르면 scrollTop이 0이 되는지,
// 다른 탭으로 갔다 돌아올 때는 스크롤이 그대로인지 390x844에서 본다. 웹 미리보기 검사이며 iOS 실기기 검증을 대신하지 않는다.
// 사용: $env:PREVIEW_PORT='8094'; node scripts/check-tab-scroll-top-web.cjs
const {previewUrl}=require('./lib/preview-url.cjs');
const {chromium}=require('C:/Users/SSAFY/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const DEMO='routine.v1.web-priority-demo';
const errors=[],report=[];
const check=(ok,message)=>{if(!ok)errors.push(message)};
const TABS=['오늘','학습','목표','기록'];

// 화면 가운데에 실제로 보이는 요소에서 위로 올라가 첫 세로 스크롤 영역(= 지금 탭 Page의 ScrollView)을 찾는다.
// 다른 탭 화면도 붙어 있으므로 '가장 큰 스크롤 영역'으로 고르면 첫 탭 것을 잡는다.
const scrollerJs=`(()=>{let e=document.elementFromPoint(innerWidth/2,innerHeight/2);while(e&&!(/(auto|scroll)/.test(getComputedStyle(e).overflowY)&&e.scrollHeight>e.clientHeight+20))e=e.parentElement;return e})()`;
const readTop=page=>page.evaluate(`(()=>{const e=${scrollerJs};return e?{top:Math.round(e.scrollTop),max:e.scrollHeight-e.clientHeight}:null})()`);
const scrollDown=page=>page.evaluate(`(()=>{const e=${scrollerJs};if(!e)return false;e.scrollTop=Math.min(400,e.scrollHeight-e.clientHeight);e.dispatchEvent(new Event('scroll'));return true})()`);

(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 for(const reducedMotion of ['no-preference','reduce']){
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push('pageerror: '+e.message));
  await page.clock.install({time:new Date(2026,10,6,13,0)});
  await page.goto(previewUrl('/?priorityDemo=1'),{waitUntil:'networkidle',timeout:300000});
  await page.waitForFunction(k=>!!localStorage.getItem(k),DEMO,{timeout:30000});
  await page.waitForTimeout(800);
  // 그 주 처음 열면 주간 점검이 자동으로 열린다(Grace). 이 검사와 관계없으니 닫는다.
  const week=page.getByRole('heading',{name:'주간 점검',exact:true});
  if(await week.waitFor({timeout:3000}).then(()=>true,()=>false)){await page.getByRole('button',{name:'닫기',exact:true}).last().click();await page.waitForTimeout(400);}
  const tab=name=>page.getByRole('tab',{name,exact:true});
  for(const name of TABS){
   const label=`${name}(${reducedMotion})`;
   try{
    await tab(name).click();await page.waitForTimeout(600);
    // 예시 데이터로는 844 높이에 다 들어가는 탭이 있다. 그 탭은 세로만 줄여서 스크롤이 생기게 본다(폭 390은 그대로).
    let short=false;
    if(!(await scrollDown(page))){await page.setViewportSize({width:390,height:480});await page.waitForTimeout(500);short=true;
     if(!(await scrollDown(page))){report.push({tab:label,skipped:'480 높이에서도 스크롤 없음'});await page.setViewportSize({width:390,height:844});continue;}}
    await page.waitForTimeout(300);
    const down=await readTop(page);
    check(down&&down.top>0,label+': 스크롤이 내려가지 않음');
    // 다른 탭에 갔다 돌아오면 그대로 둔다.
    const other=TABS[(TABS.indexOf(name)+1)%TABS.length];
    await tab(other).click();await page.waitForTimeout(500);await tab(name).click();await page.waitForTimeout(600);
    const back=await readTop(page);
    check(back&&back.top===down.top,label+': 다른 탭에서 돌아왔는데 위치가 바뀜 '+JSON.stringify({down,back}));
    // 같은 탭을 한 번 더 누르면 맨 위로.
    await tab(name).click();await page.waitForTimeout(reducedMotion==='reduce'?150:900);
    const top=await readTop(page);
    check(top&&top.top===0,label+': 다시 눌렀는데 맨 위가 아님 '+JSON.stringify(top));
    // 이미 맨 위에서 또 누르면 아무 일도 없다.
    await tab(name).click();await page.waitForTimeout(400);
    const again=await readTop(page);
    check(again&&again.top===0,label+': 맨 위에서 다시 눌렀는데 움직임');
    report.push({tab:label,height:short?480:844,down:down&&down.top,back:back&&back.top,top:top&&top.top});
    if(short){await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);}
   }catch(e){errors.push(label+': '+String(e.message).split('\n')[0])}
  }
  await context.close();
 }
 await browser.close();
 console.log(JSON.stringify(report,null,1));
 if(errors.length){console.error('FAIL\n'+errors.join('\n'));process.exit(1)}
 console.log('PASS check-tab-scroll-top-web');
})();
