const fs=require('fs'),path=require('path');
const folder=path.join(__dirname,'../assets/bori'),out=path.join(folder,'celebration-v1');fs.mkdirSync(out,{recursive:true});
const constant=k=>({a:0,k});
function keys(points){return {a:1,k:points.map(([t,s],i)=>({t,s:Array.isArray(s)?s:[s],...(i<points.length-1?{e:Array.isArray(points[i+1][1])?points[i+1][1]:[points[i+1][1]],i:{x:.58,y:1},o:{x:.25,y:0}}:{})}))};}
function transform(pivot){return {a:constant(pivot),p:constant(pivot),s:constant([100,100]),r:constant(0),o:constant(100)};}
for(const stage of ['sprout','growing','blooming']){
 const doc=JSON.parse(fs.readFileSync(path.join(folder,'growth-v3',`bori_${stage}_success.json`),'utf8'));doc.nm=`Bori ${stage}: anticipate / star jump / land / two-handed hooray`;doc.w=500;doc.h=560;doc.op=108;
 for(const layer of doc.layers)layer.op=108;
 const root=doc.layers.find(l=>l.nm==='Bori character root');root.parent=1000;root.ks.a=constant([200,360]);
 root.ks.p=keys([[0,[200,360]],[8,[200,374]],[18,[192,270]],[27,[200,254]],[38,[207,360]],[43,[200,371]],[50,[200,360]],[60,[194,307]],[69,[200,297]],[80,[200,360]],[85,[200,367]],[94,[200,360]],[108,[200,360]]]);
 root.ks.s=keys([[0,[100,100]],[8,[117,82]],[18,[88,117]],[27,[105,100]],[38,[122,78]],[45,[95,107]],[52,[100,100]],[60,[94,109]],[69,[104,101]],[80,[114,87]],[88,[97,104]],[98,[100,100]],[108,[100,100]]]);
 root.ks.r=keys([[0,0],[8,-4],[18,-12],[27,9],[38,3],[50,0],[60,-7],[69,7],[80,0],[108,0]]);
 const limbs=doc.layers.find(l=>l.nm==='feet and hands');doc.layers=doc.layers.filter(l=>l!==limbs);
 let index=200;
 for(const group of limbs.shapes){const isLeft=group.nm.startsWith('left'),hand=group.nm.includes('hand'),x=isLeft?75:325,pivot=hand?[x,303]:[isLeft?147:253,360],ks=transform(pivot);
  if(hand){ks.p=keys([[0,pivot],[8,[x,300]],[18,[isLeft?48:352,235]],[27,[isLeft?42:358,220]],[38,[x,293]],[50,[isLeft?53:347,248]],[60,[isLeft?38:362,214]],[69,[isLeft?48:352,229]],[80,[isLeft?60:340,251]],[90,pivot],[108,pivot]]);ks.r=keys([[0,0],[18,isLeft?35:-35],[27,isLeft?-22:22],[38,0],[60,isLeft?30:-30],[69,isLeft?-30:30],[80,isLeft?15:-15],[94,0],[108,0]]);ks.s=keys([[0,[100,100]],[18,[118,125]],[38,[100,100]],[60,[115,120]],[94,[100,100]],[108,[100,100]]]);}
  else{ks.r=keys([[0,0],[18,isLeft?-30:30],[27,isLeft?-20:20],[38,0],[60,isLeft?-15:15],[80,0],[108,0]]);}
  doc.layers.splice(doc.layers.findIndex(l=>l.nm==='peach body')+1,0,{ddd:0,ind:index++,ty:4,nm:`articulated ${group.nm}`,sr:1,parent:10,ks,ao:0,shapes:[group],ip:0,op:108,st:0,bm:0});
 }
 for(const layer of doc.layers.filter(l=>l.nm.includes('sprout leaf'))){const sign=layer.nm.startsWith('left')?1:-1;layer.ks.r=keys([[0,0],[8,sign*12],[18,sign*-24],[27,sign*17],[38,sign*-16],[50,sign*8],[60,sign*-20],[70,sign*15],[84,sign*-10],[98,0],[108,0]]);}
 const mouth=doc.layers.find(l=>l.nm==='state-specific mouth');mouth.ks.s=keys([[0,[100,75]],[16,[112,120]],[38,[100,100]],[60,[110,120]],[94,[100,100]],[108,[100,100]]]);
 doc.layers.push({ddd:0,ind:1000,ty:3,nm:'composition inset for full-body jump',sr:1,ks:{...transform([0,0]),p:constant([50,130])},ip:0,op:108,st:0,bm:0});
 fs.writeFileSync(path.join(out,`bori_${stage}_victory.json`),JSON.stringify(doc));
}
console.log('Three articulated 3.6s Bori celebrations generated; original growth-v3 files preserved.');
