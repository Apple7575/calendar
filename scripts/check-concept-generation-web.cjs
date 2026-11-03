// Browser contract test. Auth/model responses are explicit fixtures; no paid AI call is made.
const fs=require('fs'),ts=require('typescript'),assert=require('assert/strict');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
const model=require('../src/lib/conceptLab.ts'),{sampleBook}=require('../src/lib/conceptLabContent.ts'),{Rating}=require('ts-fsrs');
const {chromium}=require('C:/Users/SSAFY/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const now=new Date(),key='routine.concept-lab.v1.web-concept-demo';let seed=model.beginLab(model.createLab(now),['lab_sou_form'],now);seed=model.answerLab(seed,'',1000,false);seed=model.revealLab(seed);seed=model.finishLab(seed,[{correct:false,grade:Rating.Again}],now);
const event=seed.attempts[0];seed.attempts=[event,...Array.from({length:3},(_,i)=>({...event,id:`previous-${i}`,at:new Date(+now-10*86400000).toISOString()})),...Array.from({length:3},(_,i)=>({...event,id:`recent-${i}`,correct:true,grade:Rating.Good,at:new Date(+now-86400000).toISOString()}))];
const fixture={...sampleBook.variants.find(c=>c.id==='lab_sou_variant'),id:'lab_ai_qa_selected_only',quality:{natural:true,unambiguous:true,level:true,grounded:true,reviewer:'QA fixture; not live model'}};
const user={id:'00000000-0000-4000-8000-000000000001',email:'qa@example.invalid',aud:'authenticated',role:'authenticated',is_anonymous:false,app_metadata:{provider:'email'},user_metadata:{},created_at:now.toISOString()};
const base=v=>Buffer.from(JSON.stringify(v)).toString('base64url'),expires=Math.floor(Date.now()/1000)+3600;
const auth={access_token:`${base({alg:'HS256',typ:'JWT'})}.${base({sub:user.id,role:'authenticated',aud:'authenticated',exp:expires})}.qa-fixture`,refresh_token:'qa-refresh',expires_at:expires,expires_in:3600,token_type:'bearer',user};
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:390,height:900},reducedMotion:'reduce'}),requests=[],errors=[];page.on('pageerror',e=>errors.push(e.message));try{
 const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'POST, GET, OPTIONS','Content-Type':'application/json'};
 await page.route('https://qlurqptsnvxvlbsvpjie.supabase.co/**',async route=>{
  const request=route.request(),url=request.url();if(request.method()==='OPTIONS')return route.fulfill({status:200,headers,body:'{}'});
  if(url.includes('/functions/v1/concept-lab')){
   const body=request.postDataJSON();requests.push(body);
   if(body.task==='status')return route.fulfill({status:200,headers,body:JSON.stringify({result:{ready:true,model:'mock-model',limitUSD:5,estimatedUsedUSD:0,remainingUSD:5,reservationUSD:.4,billVerified:false}})});
   assert.equal(body.task,'generate');assert.equal(body.input.strategy,'form');assert.equal(body.input.parent.id,'lab_sou_form');
   return route.fulfill({status:200,headers,body:JSON.stringify({result:fixture,cached:false,estimatedCostUSD:.01})});
  }
  return route.fulfill({status:200,headers,body:JSON.stringify(url.includes('/auth/v1/user')?user:[])});
 });
 await page.addInitScript(({key,seed,auth})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(seed));localStorage.setItem('sb-qlurqptsnvxvlbsvpjie-auth-token',JSON.stringify(auth));},{key,seed,auth});
 await page.goto('http://localhost:8082/?conceptDemo=1',{waitUntil:'networkidle',timeout:300000});const button=name=>page.getByRole('button',{name,exact:true});
 await button('오답으로 AI 새 문제 만들기').click();await page.getByText('만들 항목을 직접 골라요',{exact:true}).waitFor();
 const checkbox=page.getByRole('checkbox',{name:'추측과 전달의 そうだ · 접속·활용 연습',exact:true});await checkbox.waitFor();
 assert.equal(await page.getByRole('checkbox',{checked:true}).count(),0);assert.equal(requests.filter(r=>r.task==='generate').length,0);
 await button('전체 선택').click();assert.equal(await page.getByRole('checkbox',{checked:true}).count(),2);assert.equal(requests.filter(r=>r.task==='generate').length,0);
 await button('전체 해제').click();assert.equal(await page.getByRole('checkbox',{checked:true}).count(),0);
 await checkbox.check();assert.equal(requests.filter(r=>r.task==='generate').length,0);await button('선택한 1개 생성').waitFor();
 await page.screenshot({path:'.expo/concept-lab-20261102/generation-selection-390.png'});
 await button('선택한 1개 생성').click();await button('문제·정답 검토').waitFor();
 let stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);assert.equal(requests.filter(r=>r.task==='generate').length,1);assert(!stored.cards[fixture.id]);assert.equal(stored.generatedDrafts.length,1);
 await button('문제·정답 검토').click();assert.equal(await button('이 문제를 학습에 추가').count(),0);await button('정답·해설 확인').click();await button('이 문제를 학습에 추가').click();
 await button('닫기').click();stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);assert(stored.cards[fixture.id]);assert.equal(stored.generatedDrafts[0].status,'added');assert.deepEqual(stored.schedules,seed.schedules);assert.deepEqual(stored.attempts,JSON.parse(JSON.stringify(seed.attempts)));
 await button('학습 현황·평가 수정').click();await page.getByText('개념별 변화',{exact:true}).waitFor();await page.getByText(/향상/).first().waitFor();
 for(const width of [360,390,768]){await page.setViewportSize({width,height:900});await page.screenshot({path:`.expo/concept-lab-20261102/concept-trends-${width}.png`});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await page.evaluate(({key,seed})=>localStorage.setItem(key,JSON.stringify({...seed,settings:{...seed.settings,dailyVariants:1}})),{key,seed});await page.reload({waitUntil:'networkidle'});
 await button('오답으로 AI 새 문제 만들기').click();await button('전체 선택').click();assert.equal(await page.getByRole('checkbox',{checked:true}).count(),1);await page.getByText('전체 선택은 오늘 남은 한도 1개까지 추천 순서대로 선택해요.',{exact:true}).waitFor();await button('전체 해제').click();assert.equal(await page.getByRole('checkbox',{checked:true}).count(),0);
 const result={mockedModel:true,paidCalls:0,nothingPreselected:true,selectAllAndClear:true,selectAllRespectsDailyLimit:true,noGenerationOnOpenOrCheck:true,onlySelectedTargetRequested:true,generatedCardNotAutomaticallyLearnable:true,answerReviewRequired:true,manualAddPreservesHistory:true,conceptTrendVisible:true,generateRequests:requests.filter(r=>r.task==='generate').length,errors};assert.deepEqual(errors,[]);fs.writeFileSync('.expo/concept-lab-20261102/generation-web-qa.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close();}})().catch(e=>{console.error(e.stack);process.exitCode=1});
