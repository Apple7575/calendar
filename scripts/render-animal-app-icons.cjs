// OS launcher/splash images only. In-app characters continue to use Lottie JSON.
const fs=require('fs'),path=require('path'),{PNG}=require('pngjs');
const {chromium}=require('C:/Users/SSAFY/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.join(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/animals/runtime/manifest.json'),'utf8'));
function write(file,bytes,opaque=false){const png=PNG.sync.read(bytes);fs.writeFileSync(path.join(root,'assets',file),PNG.sync.write(png,{colorType:opaque?2:6,inputHasAlpha:true}));}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await browser.newPage({viewport:{width:1024,height:1024},deviceScaleFactor:1});
 await p.setContent('<html><head><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}#grid{position:absolute;inset:58px;display:grid;grid-template-columns:1fr 1fr;gap:26px}.tile{display:flex;align-items:center;justify-content:center;border-radius:96px}.animal{width:90%;height:90%}</style></head><body style="background:#FFF8EB"><div id="grid"></div></body></html>');
 await p.addScriptTag({path:path.join(root,'node_modules/lottie-web/build/player/lottie.min.js')});
 for(const [index,character]of manifest.entries()){
  const clip=character.actions.A01,source=JSON.parse(fs.readFileSync(path.join(root,'assets/animals/runtime',clip.json),'utf8'));
  await p.evaluate(async({source,frame,index})=>{const tile=document.createElement('div');tile.className='tile';tile.style.background=['#DDEFF5','#FBE6D7','#E2EDD8','#ECE5F4'][index];const container=document.createElement('div');container.className='animal';tile.append(container);document.querySelector('#grid').append(tile);let animation;await new Promise((resolve,reject)=>{animation=lottie.loadAnimation({container,renderer:'svg',loop:false,autoplay:false,animationData:source});animation.addEventListener('DOMLoaded',resolve);animation.addEventListener('data_failed',reject);});animation.goToAndStop(frame,true);const svg=container.querySelector('svg'),box=svg.querySelector('g').getBBox(),pad=18;svg.setAttribute('viewBox',[box.x-pad,box.y-pad,box.width+pad*2,box.height+pad*2].join(' '));},{source,frame:clip.poster_frame,index});
 }
 await p.screenshot({path:path.join(root,'.expo/animal-quartet-icon.png')});write('icon.png',await p.screenshot(),true);
 await p.setViewportSize({width:256,height:256});await p.addStyleTag({content:'#grid{inset:14px;gap:6px}.tile{border-radius:24px}'});write('favicon.png',await p.screenshot(),true);
 await p.setViewportSize({width:1024,height:1024});await p.addStyleTag({content:'html,body{background:transparent!important}#grid{inset:100px;gap:20px}.tile{background:transparent!important;border-radius:0}'});write('splash-icon.png',await p.screenshot({omitBackground:true}));
 await p.addStyleTag({content:'#grid{inset:220px;gap:16px}'});write('android-icon-foreground.png',await p.screenshot({omitBackground:true}));
 await p.setContent('<body style="margin:0;background:#FFF8EB"></body>');write('android-icon-background.png',await p.screenshot(),true);
 await p.setContent('<body style="margin:0;background:transparent"><svg width="1024" height="1024" viewBox="0 0 1024 1024"><g fill="#000"><ellipse cx="512" cy="610" rx="170" ry="135"/><ellipse cx="340" cy="415" rx="65" ry="85" transform="rotate(-25 340 415)"/><ellipse cx="450" cy="330" rx="65" ry="85"/><ellipse cx="580" cy="330" rx="65" ry="85"/><ellipse cx="690" cy="415" rx="65" ry="85" transform="rotate(25 690 415)"/></g></svg></body>');write('android-icon-monochrome.png',await p.screenshot({omitBackground:true}));
 console.log('Rendered 4 provided animal vectors into OS icons/splash; iOS icon is 1024 RGB without alpha.');
}finally{await browser.close()}})().catch(e=>{console.error(e.stack);process.exitCode=1});
