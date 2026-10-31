const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {sessionClient,loadTokens}=require('./dot-learning-mcp.cjs'),packageLegacyAudio=require('./package-corpus-assets.cjs');
const root=path.resolve(__dirname,'../..'),folder=path.join(root,'output/corpus-audio');
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
(async()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'),'utf8')),audit=JSON.parse(fs.readFileSync(path.join(folder,'file-audit.json'),'utf8'));
 if(!manifest.reviewed||manifest.ready!==manifest.planned||audit.errors.length||audit.checked!==manifest.planned)throw Error('Every selected recording must pass pronunciation and file checks before publication.');
 const verified=new Map(audit.results.map(r=>[r.file,r.audioHash]));
 for(const j of manifest.jobs)if(j.status!=='ready'||verified.get(j.file)!==j.audioHash)throw Error('The file audit does not match the selected audio manifest.');
 const deck=JSON.parse(fs.readFileSync(path.join(root,'output/book-pages/n3-corpus-content.json'),'utf8')),index={};
 for(const note of deck.notes){const word=manifest.jobs.find(j=>j.noteId===note.ID&&j.kind==='word'),sentence=manifest.jobs.find(j=>j.noteId===note.ID&&j.kind==='sentence');if(!word||!sentence)throw Error('Missing audio entry');note.Word_Audio=`[sound:${path.basename(word.file)}]`;note.Sentence_Audio=`[sound:${path.basename(sentence.file)}]`;index[note.ID]={Word:note.Word,Word_Reading:note.Word_Reading,Sentence:note.Sentence,word:path.basename(word.file),sentence:path.basename(sentence.file),wordAliases:[...new Set([...((word.untrimmedFile)?[path.basename(word.untrimmedFile)]:[]),...(word.previousAudioFiles??[]).map(f=>path.basename(f))])],sentenceAliases:[...new Set([...((sentence.untrimmedFile)?[path.basename(sentence.untrimmedFile)]:[]),...(sentence.previousAudioFiles??[]).map(f=>path.basename(f))])]};}
 deck.revision=`20261030_n3_corpus_${digest(JSON.stringify(deck.notes)).slice(0,12)}`;
 if(process.argv.includes('--upload')){
  const {api,user}=await sessionClient(loadTokens()),storage=api.storage.from('diary-photos'),prefix=`${user.id}/study-audio`,checkpoint=path.join(folder,'uploads.json');
  const old=fs.existsSync(checkpoint)?JSON.parse(fs.readFileSync(checkpoint,'utf8')):null,confirmed=old?.owner===user.id?old.files:{};const existing=new Set();
  for(let offset=0;;offset+=100){const {data,error}=await storage.list(prefix,{offset,limit:100});if(error)throw error;for(const f of data??[])if(f.id)existing.add(f.name);if((data??[]).length<100)break;}
  const pending=[...manifest.jobs];let completed=0,failed=false;
  const save=()=>fs.writeFileSync(checkpoint,JSON.stringify({owner:user.id,files:confirmed}));
  await Promise.all(Array.from({length:4},async()=>{while(pending.length&&!failed){const j=pending.shift();try{
   const bytes=fs.readFileSync(path.join(folder,j.file)),name=path.basename(j.file);if(digest(bytes)!==j.audioHash)throw Error('Audio SHA mismatch');
   if(!(existing.has(name)&&confirmed[name]===j.audioHash)){
    const target=`${prefix}/${name}`,{error}=await storage.upload(target,bytes,{contentType:name.endsWith('.wav')?'audio/wav':'audio/mpeg',upsert:false});
    if(error){if(String(error.statusCode)==='409'||/already exists/i.test(error.message)){const {data,error:readError}=await storage.download(target);if(readError||!data||digest(Buffer.from(await data.arrayBuffer()))!==j.audioHash)throw Error('Previously uploaded recording differs');}else throw error;}
    confirmed[name]=j.audioHash;
   }
   completed++;if(completed%50===0){save();console.log(JSON.stringify({uploadedOrVerified:completed,total:manifest.planned}));}
  }catch(e){failed=true;console.error(`Audio upload stopped: ${e.message}`);}}}));save();
  if(failed)throw Error('Audio upload incomplete. The published study deck has not been changed.');
  const body=JSON.stringify(deck),file=`${user.id}/study-decks-v2/${deck.id}--${deck.revision}.json`,{error}=await storage.upload(file,body,{contentType:'application/json',upsert:false});
  if(error){if(String(error.statusCode)==='409'||/already exists/i.test(error.message)){const {data,error:readError}=await storage.download(file);if(readError||!data||JSON.stringify(JSON.parse(await data.text()))!==body)throw Error('Published revision conflict');}else throw error;}
  const {data:readback,error:verifyError}=await storage.download(file);if(verifyError||!readback||JSON.stringify(JSON.parse(await readback.text()))!==body)throw Error('Full deck readback failed');
  const first=require('../assets/decks/n3-reading-01.json'),second=require('../assets/decks/n3-reading-p003.json'),bridge={schema:deck.schema,id:deck.id,name:deck.name,revision:'20261031_legacy97_bridge01',notes:[...first.notes,...second.notes]};
  const bridgePath=`${user.id}/study-decks/${deck.id}--${bridge.revision}.json`,bridgeBody=JSON.stringify(bridge),legacyUpload=await storage.upload(bridgePath,bridgeBody,{contentType:'application/json',upsert:false});
  if(legacyUpload.error){if(String(legacyUpload.error.statusCode)==='409'||/already exists/i.test(legacyUpload.error.message)){const {data,error}=await storage.download(bridgePath);if(error||!data||JSON.stringify(JSON.parse(await data.text()))!==bridgeBody)throw Error('Legacy compatibility revision differs');}else throw legacyUpload.error;}
 }
 if(process.argv.includes('--upload')||process.argv.includes('--package')){
  packageLegacyAudio(root,manifest,deck);
  fs.writeFileSync(path.join(root,'calendar/assets/decks/n3-vocabulary.json'),JSON.stringify(deck,null,2));fs.writeFileSync(path.join(root,'calendar/assets/decks/remoteStudyAudio.json'),JSON.stringify(index));fs.writeFileSync(path.join(folder,'n3-vocabulary.json'),JSON.stringify(deck,null,2));
 }
 console.log(JSON.stringify({notes:deck.notes.length,audioFiles:manifest.planned,uploaded:process.argv.includes('--upload'),localPackaged:process.argv.includes('--upload')||process.argv.includes('--package'),nativeBuildStarted:false}));
})().catch(e=>{console.error(e.message);process.exitCode=1});
