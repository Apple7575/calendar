const {test}=require('node:test'),assert=require('node:assert/strict');
const {readPreviewPort,previewUrl,previewOrigins}=require('./preview-url.cjs');
const {createPairingServer}=require('../dot-learning-mcp.cjs');

test('default and assigned ports preserve paths and query strings',()=>{
 assert.equal(readPreviewPort(undefined),8082);
 for(const port of [8082,8092,8093,8123]){
  assert.equal(readPreviewPort(String(port)),port);
  assert.equal(previewUrl('/?conceptDemo=1',port),`http://localhost:${port}/?conceptDemo=1`);
 }
});
test('invalid configuration fails instead of testing another server',()=>{
 for(const value of ['', '0','65536','-1','8092x','8092/path','8082,8092','http://localhost:8092','8092.5'])assert.throws(()=>readPreviewPort(value),/PREVIEW_PORT/);
 assert.throws(()=>previewUrl('https://example.com/',8092));
 assert.throws(()=>previewUrl('//example.com/',8092));
});
test('PREVIEW_PORT controls the default URL and origin configuration',()=>{
 const previous=process.env.PREVIEW_PORT;
 try{process.env.PREVIEW_PORT='8093';assert.equal(previewUrl('/?animals=1'),'http://localhost:8093/?animals=1');assert(previewOrigins().has('http://localhost:8093'));}
 finally{if(previous===undefined)delete process.env.PREVIEW_PORT;else process.env.PREVIEW_PORT=previous;}
});
test('only the selected loopback origins are allowed, including default-port normalization',()=>{
 assert.deepEqual([...previewOrigins(8092)],['http://localhost:8092','http://127.0.0.1:8092']);
 assert(previewOrigins(80).has('http://localhost'));
 assert(!previewOrigins(8092).has('http://localhost:8082'));
});
test('pairing HTTP boundary rejects other ports and outside origins before credentials',async()=>{
 const previous=process.env.PREVIEW_PORT;process.env.PREVIEW_PORT='8092';
 const server=createPairingServer();
 if(previous===undefined)delete process.env.PREVIEW_PORT;else process.env.PREVIEW_PORT=previous;
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;
 try{
  for(const origin of [undefined,'null','http://localhost:8082','http://localhost:8092.evil.test','https://example.com','http://192.168.0.2:8092']){
   const r=await fetch(base+'/status',{headers:origin?{Origin:origin}:{}});assert.equal(r.status,403);assert.equal(r.headers.get('access-control-allow-origin'),null);
  }
  for(const origin of previewOrigins(8092)){
   const r=await fetch(base+'/status',{headers:{Origin:origin}});assert.equal(r.status,200);assert.equal(r.headers.get('access-control-allow-origin'),origin);assert.equal(typeof(await r.json()).ready,'boolean');
   const options=await fetch(base+'/pair',{method:'OPTIONS',headers:{Origin:origin}});assert.equal(options.status,204);
  }
  const invalid=await fetch(base+'/pair',{method:'POST',headers:{Origin:'http://localhost:8092','Content-Type':'application/json'},body:'{}'});assert.equal(invalid.status,400);
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
