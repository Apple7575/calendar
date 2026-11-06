// 오늘 탭 다듬기 검수 (S1-25): ⑩ 시간 사용 스위치의 누르는 영역이 44pt 이상인지, 겹치지 않는지 390x844, 360x740에서 잰다.
// ⑨ 당겨서 새로고침은 웹에서 동작하지 않아 jest(useRefresh)와 iOS 실기기에서 확인한다. 격리된 브라우저·예시 데이터만 쓴다.
// 사용: $env:PREVIEW_PORT='8123'; node scripts/check-today-polish-web.cjs
const {previewUrl}=require('./lib/preview-url.cjs');
const fs=require('fs');
const {chromium}=require('C:/Users/SSAFY/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out='.expo/today-polish';fs.mkdirSync(out,{recursive:true});
const errors=[];const check=(ok,m)=>{if(!ok)errors.push(m)};
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const p=await (await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'})).newPage();
 p.on('pageerror',e=>errors.push('pageerror: '+e.message));
 await p.goto(previewUrl('/?priorityDemo=1'),{waitUntil:'networkidle',timeout:300000});
 for(const [width,height] of [[390,844],[360,740]]){
  await p.setViewportSize({width,height});await p.waitForTimeout(400);
  const area=p.getByTestId('reward-use-switch-area').first();
  await area.waitFor();
  const r=await area.evaluate(e=>{const b=e.getBoundingClientRect(),hits=[];for(const o of document.querySelectorAll('[role=button],[role=switch],button,input')){if(e.contains(o)||o.contains(e))continue;const c=o.getBoundingClientRect();if(c.width&&b.left<c.right&&c.left<b.right&&b.top<c.bottom&&c.top<b.bottom)hits.push(o.textContent||o.getAttribute('aria-label'));}return {w:Math.round(b.width),h:Math.round(b.height),hits,wide:document.documentElement.scrollWidth>innerWidth};});
  console.log(`switch ${width}x${height}`,JSON.stringify(r));
  check(r.h>=44&&r.w>=44,`${width}: 누르는 영역 ${r.w}x${r.h} < 44`);check(!r.hits.length,`${width}: 겹침 ${r.hits}`);check(!r.wide,`${width}: 가로 넘침`);
  await p.screenshot({path:`${out}/today-${width}x${height}.png`});
 }
 await browser.close();
 console.log('errors',errors.length);for(const e of errors)console.log(' -',e);
 process.exit(errors.length?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
