const {previewUrl}=require('./lib/preview-url.cjs');
const fs=require('node:fs'),assert=require('node:assert/strict');
const ts=require('typescript');require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const legacySeed={...require('../src/lib/conceptLab.ts').createLab(),studyVocabulary:true};
const {chromium}=require('C:/Users/SSAFY/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out='.expo/concept-lab-20261102',key='routine.concept-lab.v1.web-concept-demo';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 const state=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
 const button=name=>page.getByRole('button',{name,exact:true});
 try{
  await page.addInitScript(({key,legacySeed})=>{
   if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(legacySeed));
   window.__conceptAudioPlays=0;const original=HTMLMediaElement.prototype.play;
   HTMLMediaElement.prototype.play=function(...args){const media=this;return original.apply(media,args).then(()=>{if(!media.paused)window.__conceptAudioPlays++;});};
  },{key,legacySeed});
  await page.goto(previewUrl('/?conceptDemo=1'),{waitUntil:'networkidle',timeout:300000});
  await button('오늘 학습 시작').waitFor({timeout:30000});
  const routineBefore=await page.evaluate(()=>localStorage.getItem('routine.v1.web-concept-demo'));
  await button('오늘 학습 시작').click();
  assert.equal(await page.getByRole('textbox').count(),0);assert.equal(await page.getByText('きゅうじつ',{exact:true}).count(),0);
  assert.equal(await page.getByTestId('study-card-surface').count(),1);await page.getByText('休日',{exact:true}).waitFor();
  await page.screenshot({path:`${out}/shared-card-front-390.png`});
  await button('정답 보기').click();await page.getByText('きゅうじつ',{exact:true}).waitFor();
  await page.reload({waitUntil:'networkidle'});await button('중단한 학습 이어 하기').click();
  await page.getByText('きゅうじつ',{exact:true}).waitFor();assert.equal(await page.getByRole('textbox').count(),0);
  await page.screenshot({path:`${out}/shared-card-back-390.png`});
  await button('좋음').click();await button('정답 보기').waitFor();
  assert.equal((await state()).attempts.length,1);assert.equal((await state()).attempts[0].mode,'self');
  // The next card arrives without going back to the home or entering any answer.
  await button('정답 보기').click();await button('다시').click();await button('정답 보기').waitFor();
  assert.equal(await page.getByRole('textbox').count(),0);assert.equal(await button('다시 복습할게요 · 다음 카드').count(),0);
  assert.equal((await state()).attempts.length,2);assert.equal((await state()).attempts[1].grade,1);
  for(let i=0;i<4;i++){await button('정답 보기').click();await button('좋음').click();}
  await button('오답으로 AI 새 문제 만들기').waitFor();
  let saved;
  // Test only this isolated QA account with the entire sample pool enabled.
  await page.evaluate(key=>{const s=JSON.parse(localStorage.getItem(key));s.settings.dailyNew=30;localStorage.setItem(key,JSON.stringify(s));},key);
  await page.reload({waitUntil:'networkidle'});await button('카드 찾기·오류 신고').click();
  await page.getByText('시청에서 답장이 온 요일은 언제인가요? 한국어 또는 일본어로 답하세요.',{exact:true}).locator('..').getByRole('button',{name:'이 표본 학습',exact:true}).click();
  await button('떠올렸어요 · 다음 질문').click();
  assert.equal(await button('좋음').count(),0);assert.equal(await page.getByText(/답장이 금요일에 왔다는 정보는/).count(),0);
  assert.equal(await page.getByRole('textbox').count(),0);
  await button('묶음 정답 보기').click();assert.equal(await button('좋음').count(),2);
  await button('좋음').nth(0).click();await button('좋음').nth(1).click();await button('평가 저장 · 다음 카드').click();
  await button('중단').click();await button('학습 현황·평가 수정').click();
  for(const width of [360,390,768]){await page.setViewportSize({width,height:900});await page.screenshot({path:`${out}/flashcard-stats-${width}.png`});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
  await button('학습으로').click();await button('카드 찾기·오류 신고').click();
  await page.getByText('음성으로 들은 명사의 한국어 뜻을 답하세요.',{exact:true}).locator('..').getByRole('button',{name:'이 표본 학습',exact:true}).click();
  assert.equal(await page.getByRole('textbox').count(),0);assert.equal(await page.getByText('휴일',{exact:true}).count(),0);
  await button('문제 음성 듣기').click();await page.waitForTimeout(3500);assert(await page.evaluate(()=>window.__conceptAudioPlays>0));
  assert.equal(await page.getByText('휴일',{exact:true}).count(),0);assert.equal(await button('정답 보기').count(),1);
  assert.equal(await page.evaluate(()=>localStorage.getItem('routine.v1.web-concept-demo')),routineBefore);
  saved=await state();const result={sharedStudyCardSurface:true,sharedStudyRatingBar:true,flashcardOnly:true,noAnswerTyping:true,oneTapRatingAdvances:true,againAdvancesWithoutConfirmation:true,answerHidden:true,persistedResume:true,fsrsSaved:true,bundleFeedbackDelayed:true,audioPlayedWithoutRevealingAnswer:true,isolatedRoutinePreserved:true,attempts:saved.attempts.length,errors};
  fs.writeFileSync(`${out}/shared-card-web-qa.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
