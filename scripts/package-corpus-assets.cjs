const fs=require('node:fs'),path=require('node:path');
module.exports=function packageLegacyAudio(root,manifest,deck){
 const legacy=JSON.parse(fs.readFileSync(path.join(root,'output/deck-audio/manifest.json'),'utf8')),assets=path.join(root,'calendar/assets/decks'),entries=new Map();
 for(const job of manifest.jobs){
  const old=legacy.jobs.find(j=>j.noteId===job.noteId&&j.kind===job.kind)??{file:job.file},note=deck.notes.find(n=>n.ID===job.noteId);if(!note)throw Error('Bundled note ID missing in the full corpus');
  const name=path.basename(job.file),destination=path.join(assets,'audio/cedar',name);fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(path.join(root,'output/corpus-audio',job.file),destination);
  const entry=entries.get(note.ID)??{Word:note.Word,Word_Reading:note.Word_Reading,Sentence:note.Sentence};entry[job.kind]={name,aliases:[...new Set([path.basename(old.file),...(job.untrimmedFile?[path.basename(job.untrimmedFile)]:[]),...(job.previousAudioFiles??[]).map(f=>path.basename(f)),...(old.legacyAudioNames??[])])].filter(n=>n!==name)};entries.set(note.ID,entry);
 }
 const rows=[...entries].map(([id,n])=>`${JSON.stringify(id)}: {Word:${JSON.stringify(n.Word)},Word_Reading:${JSON.stringify(n.Word_Reading)},Sentence:${JSON.stringify(n.Sentence)},word:{name:${JSON.stringify(n.word.name)},aliases:${JSON.stringify(n.word.aliases)},source:require(${JSON.stringify('./audio/cedar/'+n.word.name)})},sentence:{name:${JSON.stringify(n.sentence.name)},aliases:${JSON.stringify(n.sentence.aliases)},source:require(${JSON.stringify('./audio/cedar/'+n.sentence.name)})}}`);
 fs.writeFileSync(path.join(assets,'studyAudioAssets.ts'),`// Generated from reviewed corpus; legacy audio aliases preserve existing imports.\nexport const studyAudioAssets: Record<string,{Word:string;Word_Reading:string;Sentence:string;word:{name:string;aliases?:string[];source:number};sentence:{name:string;aliases?:string[];source:number}}>={\n${rows.join(',\n')}\n};\n`);
};
