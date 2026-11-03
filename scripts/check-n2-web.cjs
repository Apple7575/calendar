const fs=require('fs'),assert=require('assert/strict');
const {chromium}=require('C:/Users/SSAFY/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const n2=require('../assets/decks/n2-vocabulary.json'),n3=require('../assets/decks/n3-vocabulary.json');
const out='.expo/n2-20261102';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 const page=await context.newPage(),errors=[],audio=[];
 await page.addInitScript(()=>{
  localStorage.setItem('routine.studyAudio.auto.v1','false');
  window.__n2Plays=[];
  const play=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(...args){
   const result=play.apply(this,args);
   if(result?.then)result.then(()=>{if(decodeURIComponent(this.src).includes('n2_hk_'))window.__n2Plays.push(this.src)}).catch(()=>{});
   return result;
  };
 });
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')console.log('Browser error:',message.text().slice(0,1000))});
 page.on('requestfailed',request=>console.log('Request failed:',request.url().slice(0,200),request.failure()?.errorText));
 page.on('response',response=>{if(response.status()>=400)console.log('HTTP error:',response.status(),response.url().slice(0,200))});
 page.on('response',response=>{if(decodeURIComponent(response.url()).includes('n2-cedar'))audio.push({url:response.url(),status:response.status()})});
 const button=name=>page.getByRole('button',{name,exact:true});
 try{
  await page.goto('http://localhost:8082/?manage=1',{waitUntil:'networkidle',timeout:300000});
  await button(`JLPT N2 · ${n2.notes.length}개`).click();
  await page.getByText(n2.name,{exact:true}).waitFor();
  await page.getByText(`${n2.notes[0].Word} · ${n2.notes[0].Word_Reading}`,{exact:true}).waitFor();
  assert(await button('내 아이폰으로 보내기').isDisabled());
  await page.screenshot({path:out+'/manager-n2-desktop.png'});
  await button(`JLPT N3 · ${n3.notes.length}개`).click();
  await page.getByText(n3.name,{exact:true}).waitFor();
  for(const width of [768,390]){
   await page.setViewportSize({width,height:width===390?844:900});
   await button(`JLPT N2 · ${n2.notes.length}개`).click();
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:`${out}/manager-n2-${width}.png`});
  }
  await page.goto('http://localhost:8082/?n2Demo=1',{waitUntil:'networkidle',timeout:300000});
  await button('정답 보기').waitFor({timeout:30000});
  const initial=JSON.parse(await page.evaluate(()=>localStorage.getItem('routine.v1.web-n2-demo')));
  assert.equal(initial.decks.length,1);assert.equal(initial.decks[0].id,'pc:'+n2.id);
  assert.equal(initial.words.length,1774);
  const first=await page.getByTestId('study-word-title').innerText();
  assert(n2.notes.some(note=>note.Word===first));
  await page.screenshot({path:out+'/study-n2-front.png'});
  await button('정답 보기').click();
  await button('단어 듣기').waitFor();await button('단어 듣기').click();
  await page.waitForFunction(()=>window.__n2Plays.length>=1);
  await page.getByTestId('study-sentence').waitFor();
  await button('예문 듣기').click();
  await page.waitForFunction(()=>performance.getEntriesByType('resource').filter(entry=>decodeURIComponent(entry.name).includes('n2-cedar')).length>=2);
  await page.waitForFunction(()=>new Set(window.__n2Plays).size>=2);
  await page.screenshot({path:out+'/study-n2-answer.png'});
  await button('좋음').click();
  await button('정답 보기').waitFor();
  const after=JSON.parse(await page.evaluate(()=>localStorage.getItem('routine.v1.web-n2-demo')));
  assert(after.reviewHistory?.length>=1);assert(after.words.some(word=>word.card.reps>=1));
  assert(after.words.every(word=>word.deckId==='pc:'+n2.id));
  assert(audio.length>=2&&audio.every(item=>item.status===200||item.status===206));
  assert.deepEqual(errors,[]);
  const result={managerSwitchesN2AndN3:true,n2Notes:after.words.length,isolatedPreviewStorage:true,n2WordAndSentenceAudioLoaded:true,n2DistinctAudioPlayed:await page.evaluate(()=>new Set(window.__n2Plays).size),ratingSaved:true,widths:[1440,768,390],errors};
  fs.writeFileSync(out+'/web-qa.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }catch(error){console.log(JSON.stringify({errors}));console.log((await page.locator('body').innerText()).slice(-1800));await page.screenshot({path:out+'/web-error.png'});throw error;}
 finally{await browser.close();}
})().catch(error=>{console.error(error.stack);process.exitCode=1});
