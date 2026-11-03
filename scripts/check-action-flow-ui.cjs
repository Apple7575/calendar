const {previewUrl}=require('./lib/preview-url.cjs');
// Isolated browser fixture only. Never calls paid OCR or uses the user's browser storage.
const fs = require('fs');
const assert = require('assert/strict');
const {chromium} = require('C:/Users/SSAFY/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out = '.expo/action-flow-after';
fs.mkdirSync(out, {recursive:true});

(async () => {
 const browser = await chromium.launch({channel:'chrome',headless:true});
 const context = await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const page = await context.newPage(), errors = [], measurements = [];
 page.on('pageerror', e => errors.push(e.message));
 const button = name => page.getByRole('button',{name,exact:true});
 const capture = async name => page.screenshot({path:`${out}/${name}.png`});
 const inViewport = async name => {
  const b = await button(name).boundingBox(), v = page.viewportSize();
  assert(b && b.y >= 0 && b.y+b.height <= v.height && b.x >= 0 && b.x+b.width <= v.width, `${name} must be fully visible`);
  assert(b.height >= 44, `${name} touch target`);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  measurements.push({name,viewport:`${v.width}x${v.height}`,y:Math.round(b.y),height:Math.round(b.height)});
 };
 try {
  await page.goto(previewUrl('/?priorityDemo=1'),{waitUntil:'networkidle'});
  await button('2분, 이 행동부터 시작').waitFor();
  for (const [width,height] of [[390,844],[360,740]]) {
   await page.setViewportSize({width,height});
   await inViewport('2분, 이 행동부터 시작');
   await capture(`home-${width}`);
  }
  await button('오늘의 다른 공부 보기').click();
  assert(await button('2순위 수학 열기').count() || await page.getByRole('button',{name:/2순위 .* 열기/}).count());
  await button('오늘의 다른 공부 보기').click();
  await page.setViewportSize({width:390,height:844});
  await button('2분, 이 행동부터 시작').focus();
  await capture('home-keyboard-focus');
  await page.keyboard.press('Enter');
  await page.getByTestId('earned-reward-page').waitFor();
  await inViewport('공부 시작하기');
  await capture('plan-reward-390');
  await button('공부 시작하기').click();
  await page.getByTestId('focus-clock').waitFor();
  for (const [width,height] of [[390,844],[844,390],[360,740]]) {
   await page.setViewportSize({width,height});
   await inViewport('일시정지');
   assert.equal(await button('필기 사진 제출').count(),0,'No photo before the study time is met');
   assert.equal(await button('+1분').count(),0);
   await capture(`study-${width}`);
  }
  await button('타이머 시간 조정').click();
  await button('+1분').click();
  await button('타이머 시간 조정').click();
  await page.setViewportSize({width:390,height:844});
  const meetStudyTime = async () => {
   await page.evaluate(() => {const key='routine.v1.web-priority-demo',s=JSON.parse(localStorage.getItem(key)),now=Date.now();s.bookTimer={...s.bookTimer,focusElapsed:121,focusResumedAt:now};localStorage.setItem(key,JSON.stringify(s));});
   await page.reload({waitUntil:'networkidle'});
   await button('집중 공부로 시간 모으기').click();
   await page.getByTestId('focus-clock').waitFor();
  };
  await meetStudyTime();
  await button('필기 사진 제출').click();
  await inViewport('노트 사진 찍기');
  await button('큰 타이머로 돌아가기').click();
  await page.getByTestId('focus-clock').waitFor();
  await button('필기 사진 제출').click();
  await inViewport('노트 사진 찍기');
  await capture('submit-empty-390');
  // Exercise picker loading and local authentication failure without uploading a photo.
  const imagePage = await context.newPage();
  await imagePage.setContent('<div style="padding:32px;font-size:28px">Local QA image / 12345</div>');
  await imagePage.screenshot({path:`${out}/qa-note.png`});
  await imagePage.close();
  const chooserPromise = page.waitForEvent('filechooser');
  await button('노트 사진 찍기').click();
  const chooser = await chooserPromise;
  assert(await button('노트 사진 찍기').isDisabled());
  await capture('submit-loading-390');
  await chooser.setFiles(`${out}/qa-note.png`);
  await button('AI로 읽기').waitFor();
  await capture('submit-preview-390');
  await button('AI로 읽기').click();
  await page.getByText('공부 사진을 읽으려면 계정에 로그인해 주세요.',{exact:true}).waitFor();
  const errorBox = await page.getByText('공부 사진을 읽으려면 계정에 로그인해 주세요.',{exact:true}).boundingBox();
  assert(errorBox && errorBox.y+errorBox.height<page.viewportSize().height, 'Recognition error must be visible without scrolling');
  assert(await button('AI로 읽기').isEnabled());
  await capture('submit-error-390');
  assert.equal(await page.getByText('단계 완료마다 +5분 · 필기 100자당 500원',{exact:true}).count(),0);
  await button('보상 기준·사진 안내').click();
  await page.getByText('단계 완료마다 +5분 · 필기 100자당 500원',{exact:true}).waitFor();
  await button('보상 기준·사진 안내').click();

  const fixture = async seconds => {
   await page.evaluate(seconds => {
    const key='routine.v1.web-priority-demo',s=JSON.parse(localStorage.getItem(key)),now=Date.now();
    s.bookTimer={...s.bookTimer,focusElapsed:seconds,focusResumedAt:now,running:false,remaining:Math.max(0,120-seconds),endsAt:now};
    s.handwritingPending={id:'action-flow-qa',imageHash:'c'.repeat(64),subject:s.bookTimer.subject,analysis:{lines:['검수용 새 필기 전압과 전류의 관계를 공부하고 풀이 과정을 정리했습니다.'.repeat(10)],languages:['ko'],quality:'readable',message:''}};
    localStorage.setItem(key,JSON.stringify(s));
   },seconds);
   await page.reload({waitUntil:'networkidle'});
   await button('집중 공부로 시간 모으기').click();
  };
  await fixture(0);
  await page.getByText('읽은 내용을 확인해 주세요',{exact:true}).waitFor();
  await capture('submit-waiting-390');
  await fixture(121);
  for (const [width,height] of [[390,844],[360,740]]) {
   await page.setViewportSize({width,height});
   await inViewport('이번 단계 완료 · +5분 받기');
   await capture(`submit-ready-${width}`);
  }
  await button('이번 단계 완료 · +5분 받기').click();
  await page.getByTestId('earned-reward-page').waitFor();
  await inViewport('이어서 공부하기');
  await capture('earned-360');
  const paid = await page.evaluate(() => JSON.parse(localStorage.getItem('routine.v1.web-priority-demo')).handwritingReceipts.length);
  await button('이어서 공부하기').click();
  await page.getByTestId('focus-clock').waitFor();
  assert.equal(await button('필기 사진 제출').count(),0,'The next stage starts without a photo button');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('routine.v1.web-priority-demo')).handwritingReceipts.length), paid);
  await page.evaluate(()=>localStorage.setItem('theme.id.v2','dark'));
  await page.reload({waitUntil:'networkidle'});
  await button('집중 공부로 시간 모으기').click();
  await page.getByTestId('focus-clock').waitFor(); // An active timer is the study page.
  await capture('timer-dark-360');
  // A naturally ended break counts up, then the button restarts the whole stage.
  await page.evaluate(() => {const key='routine.v1.web-priority-demo',s=JSON.parse(localStorage.getItem(key)),now=Date.now();s.bookTimer={...s.bookTimer,phase:'break',running:true,remaining:300,endsAt:now-5000};localStorage.setItem(key,JSON.stringify(s));});
  await page.reload({waitUntil:'networkidle'});
  await button('집중 공부로 시간 모으기').click();
  await page.getByTestId('focus-clock').waitFor();
  await page.getByText('휴식 끝',{exact:true}).waitFor();
  const overtime = await page.getByRole('timer').innerText();
  assert(/^\+00:\d\d$/.test(overtime), `Rest overtime must count up: ${overtime}`);
  await capture('rest-ended-360');
  await inViewport('이 과목 공부 마치기');
  await button('5분 집중 시작').click();
  await page.getByText('집중 시간',{exact:true}).waitFor();
  const restarted = await page.getByRole('timer').innerText();
  assert(/^0[45]:\d\d$/.test(restarted), `The whole stage must restart: ${restarted}`);
  assert.deepEqual(errors,[]);
  fs.writeFileSync(`${out}/measurements.json`,JSON.stringify({measurements,errors},null,2));
  console.log(JSON.stringify({primaryActionsVisible:true,secondaryControlsWork:true,rewardContinuesToTimer:true,noDuplicateReceipt:true,errors}));
 } catch(e) {
  await capture('failure');
  console.error((await page.locator('body').innerText()).slice(-2000));
  throw e;
 } finally { await browser.close(); }
})().catch(e => {console.error(e);process.exitCode=1;});
