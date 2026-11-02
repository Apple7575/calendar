const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.join(__dirname,'../assets/animals/runtime'),manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
let bytes=0,layers=0,clips=0,images=0,expressions=0;const types=new Set(),sizes=new Set();
function inspect(node){if(!node||typeof node!=='object')return;if(node.ty!==undefined)types.add(String(node.ty));if(node.p&&typeof node.p==='string'&&(node.u!==undefined||node.e!==undefined))images++;if(typeof node.x==='string')expressions++;if(Array.isArray(node.layers))layers=Math.max(layers,node.layers.length);for(const v of Object.values(node)){if(v&&typeof v==='object')inspect(v);}}
assert.deepEqual(manifest.map(c=>c.id),['C01','C02','C03','C04']);
for(const c of manifest){assert.equal(Object.keys(c.actions).length,60);for(const[id,a]of Object.entries(c.actions)){
 const file=path.join(root,a.json),buffer=fs.readFileSync(file),s=JSON.parse(buffer);assert(a.json.startsWith(c.id+'/'+id+'_'));assert.equal(typeof a.loop,'boolean');assert.equal(buffer.length,a.bytes);assert.equal(s.op-s.ip,a.frames);assert(Math.abs((s.op-s.ip)/s.fr-a.duration_seconds)<=.0011);assert(a.poster_frame>=s.ip&&a.poster_frame<s.op);assert(s.fr>0&&s.fr<=60);assert.equal(a.bitmap_assets,0);sizes.add(s.w+'x'+s.h);inspect(s);bytes+=buffer.length;clips++;
 if(/^A(2[4-9]|30)$/.test(id))assert.equal(a.loop,false,'completion must play once');
}}
const shared=fs.readdirSync(path.join(root,'shared'));assert.equal(shared.length,30);assert(shared.every(f=>f.endsWith('.json')));for(const f of shared)inspect(JSON.parse(fs.readFileSync(path.join(root,'shared',f))));
assert.equal(images,0);assert.equal(expressions,0);
console.log(JSON.stringify({characters:manifest.map(c=>({id:c.id,name:c.name})),clips,shared:shared.length,bytes,images,expressions,maxLayers:layers,canvas:[...sizes],types:[...types]}));
