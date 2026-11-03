const {previewUrl}=require('./lib/preview-url.cjs');
const fs=require('fs'),assert=require('assert/strict'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const model=require('../src/lib/conceptLab.ts'),{sampleBook}=require('../src/lib/conceptLabContent.ts'),{labCardSummary}=require('../src/lib/conceptLabPresentation.ts');
const {chromium}=require('C:/Users/SSAFY/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const key='routine.concept-lab.v1.web-concept-demo',seed=model.beginLab(model.createLab(),['lab_sou_form']),card=sampleBook.cards.find(c=>c.id==='lab_sou_form');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:390,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));const button=name=>page.getByRole('button',{name,exact:true});try{
 await page.addInitScript(({key,seed})=>localStorage.setItem(key,JSON.stringify(seed)),{key,seed});await page.goto(previewUrl('/?conceptDemo=1'),{waitUntil:'networkidle',timeout:300000});await button('중단한 학습 이어 하기').click();
 await page.getByText('눈앞의 음식이 맛있어 보임',{exact:true}).waitFor();await page.getByText('おいしい → そうだ',{exact:true}).waitFor();await page.getByText('추측 · 보통체',{exact:true}).waitFor();assert.equal(await page.getByText(card.prompt,{exact:true}).count(),0);assert.equal(await page.getByText(card.answer,{exact:true}).count(),0);
 for(const width of [360,390,768]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:`.expo/concept-lab-20261102/food-brief-${width}.png`});}
 await button('정답 보기').click();await page.getByText(card.answer,{exact:true}).waitFor();await button('중단').click();await button('카드 찾기·오류 신고').click();await page.getByText(labCardSummary(card),{exact:true}).waitFor();assert.equal(await page.getByText(card.prompt,{exact:true}).count(),0);assert.deepEqual(errors,[]);
 const result={essentialContext:true,targetAndRegister:true,answerHiddenBeforeFlip:true,sameShortWordingInList:true,widths:[360,390,768],errors};fs.writeFileSync('.expo/concept-lab-20261102/food-brief-qa.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}})().catch(e=>{console.error(e.stack);process.exitCode=1});
