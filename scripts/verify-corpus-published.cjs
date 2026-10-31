const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createClient}=require('@supabase/supabase-js');const {sessionClient,loadTokens}=require('./dot-learning-mcp.cjs');
const root=path.resolve(__dirname,'../..'),folder=path.join(root,'output/corpus-audio');
(async()=>{const {api,user}=await sessionClient(loadTokens()),storage=api.storage.from('diary-photos'),manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'),'utf8')),deck=JSON.parse(fs.readFileSync(path.join(folder,'n3-vocabulary.json'),'utf8')),found=new Set();
 for(let offset=0;;offset+=1000){const {data,error}=await storage.list(`${user.id}/study-audio`,{offset,limit:1000});if(error)throw error;for(const f of data??[])if(f.id)found.add(f.name);console.log(JSON.stringify({remoteAudioNamesChecked:found.size}));if((data??[]).length<1000)break;}
 if(manifest.jobs.some(j=>!found.has(path.basename(j.file))))throw Error('Some recordings are missing from private storage');
 const {data,error}=await storage.download(`${user.id}/study-decks-v2/${deck.id}--${deck.revision}.json`);if(error||!data||JSON.stringify(JSON.parse(await data.text()))!==JSON.stringify(deck))throw Error('Published deck readback differs');
 const bridge=await storage.download(`${user.id}/study-decks/${deck.id}--20261031_legacy97_bridge01.json`);if(bridge.error||!bridge.data||JSON.parse(await bridge.data.text()).notes.length!==97)throw Error('Legacy delivery compatibility check failed');
 const samples=[manifest.jobs[0],manifest.jobs[1],manifest.jobs.find(j=>j.kind==='word'&&j.word==='完成'),manifest.jobs[Math.floor(manifest.jobs.length/2)],manifest.jobs.at(-1)].filter(Boolean);
 for(const j of samples){const {data,error}=await storage.download(`${user.id}/study-audio/${path.basename(j.file)}`);if(error||!data||crypto.createHash('sha256').update(Buffer.from(await data.arrayBuffer())).digest('hex')!==j.audioHash)throw Error('Remote audio readback SHA mismatch');}
 const config=require('../app.json').expo.extra,anon=createClient(config.supabaseUrl,config.supabaseAnonKey,{auth:{persistSession:false,autoRefreshToken:false}}),privatePath=`${user.id}/study-audio/${path.basename(manifest.jobs[0].file)}`;
 const anonymous=await anon.storage.from('diary-photos').download(privatePath);if(!anonymous.error)throw Error('An unauthenticated request could read private audio');
 console.log(JSON.stringify({notes:deck.notes.length,allExpectedAudioPresent:manifest.jobs.length,deckReadbackMatches:true,audioHashReadbackSamples:samples.length,anonymousAccessBlocked:true,privateOwnerVerified:true,legacyDeliveryPreserved:true}));
})().catch(e=>{console.error(e.message);process.exitCode=1});
