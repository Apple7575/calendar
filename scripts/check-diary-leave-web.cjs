// 일기 쓰다 나가기(S1-06 ①): 바뀐 게 없으면 묻지 않고 나가고, 글을 쓰면 '닫기'에서 "저장하지 않고 나갈까요?"를 묻는지,
// 취소하면 글이 남고, 확인하면 나가는지 390x844에서 본다. 웹은 window.confirm으로 묻는다(iOS는 Alert).
// 웹 미리보기 검사이며 iOS 실기기 검증(밀어서 뒤로 가기 포함)을 대신하지 않는다.
// 사용: $env:PREVIEW_PORT='8094'; node scripts/check-diary-leave-web.cjs
const {previewUrl}=require('./lib/preview-url.cjs');
const {chromium}=require('C:/Users/SSAFY/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const DEMO='routine.v1.web-priority-demo';
const errors=[],report=[];
const check=(ok,message)=>{if(!ok)errors.push(message)};

(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push('pageerror: '+e.message));
 const dialogs=[];let answer=false;
 page.on('dialog',async d=>{dialogs.push(d.message());answer?await d.accept():await d.dismiss();});
 await page.clock.install({time:new Date(2026,10,7,13,0)});
 await page.goto(previewUrl('/?priorityDemo=1'),{waitUntil:'networkidle',timeout:300000});
 await page.waitForFunction(k=>!!localStorage.getItem(k),DEMO,{timeout:30000});
 await page.waitForTimeout(1000);
 const week=page.getByRole('heading',{name:'주간 점검',exact:true});
 if(await week.waitFor({timeout:3000}).then(()=>true,()=>false)){await page.getByRole('button',{name:'닫기',exact:true}).last().click();await page.waitForTimeout(400);}
 const openEditor=async()=>{
  await page.getByRole('tab',{name:'기록',exact:true}).click();await page.waitForTimeout(500);
  await page.getByRole('tab',{name:'일기',exact:true}).click();await page.waitForTimeout(800);
  await page.getByRole('button',{name:'오늘 일기 남기기',exact:true}).click();
  await page.getByRole('button',{name:'닫기',exact:true}).last().waitFor({timeout:15000});
  await page.waitForTimeout(1500);
 };
 const onEditor=async()=>await page.getByRole('button',{name:'오늘 일기 남기기',exact:true}).isVisible().catch(()=>false)===false;
 try{
  // 1) 아무것도 안 쓰고 닫기 → 묻지 않고 나간다.
  await openEditor();
  await page.getByRole('button',{name:'닫기',exact:true}).last().click();await page.waitForTimeout(1000);
  check(dialogs.length===0,'바뀐 게 없는데 물음 '+JSON.stringify(dialogs));
  check(!(await onEditor()),'바뀐 게 없는데 나가지 못함');
  report.push({step:'unchanged',dialogs:dialogs.length});

  // 2) 글을 쓰고 닫기 → 묻고, 취소하면 남는다.
  await openEditor();
  const box=page.locator('textarea').first();
  await box.fill('오늘은 비가 와서 우산을 챙겼다');
  await page.getByRole('button',{name:'닫기',exact:true}).last().click();await page.waitForTimeout(800);
  check(dialogs.length===1&&dialogs[0].includes('저장하지 않고 나갈까요?'),'글을 썼는데 묻지 않음 '+JSON.stringify(dialogs));
  check(await onEditor(),'취소했는데 화면을 떠남');
  check((await box.inputValue())==='오늘은 비가 와서 우산을 챙겼다','취소했는데 글이 사라짐');
  report.push({step:'cancel',dialogs:dialogs.length,stayed:await onEditor()});

  // 3) 다시 닫고 확인 → 나간다.
  answer=true;
  await page.getByRole('button',{name:'닫기',exact:true}).last().click();await page.waitForTimeout(1000);
  check(dialogs.length===2,'두 번째 닫기에서 묻지 않음');
  check(!(await onEditor()),'나가기를 골랐는데 남아 있음');
  report.push({step:'leave',dialogs:dialogs.length,left:!(await onEditor())});
 }catch(e){errors.push(String(e.message).split('\n')[0])}
 await browser.close();
 console.log(JSON.stringify(report,null,1));
 if(errors.length){console.error('FAIL\n'+errors.join('\n'));process.exit(1)}
 console.log('PASS check-diary-leave-web');
})();
