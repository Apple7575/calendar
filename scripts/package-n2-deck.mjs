import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {n2Root} from './n2-budget.mjs';
const app=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),folder=path.join(n2Root,'audio');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const protectedFiles=JSON.parse(fs.readFileSync(path.join(n2Root,'n3-before.json'),'utf8'));
for(const [file,hash]of Object.entries(protectedFiles))if(digest(fs.readFileSync(path.join(app,file)))!==hash)throw Error('Existing N3 asset changed: '+file);
const manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'),'utf8')),audit=JSON.parse(fs.readFileSync(path.join(folder,'file-audit.json'),'utf8'));
if(!manifest.reviewed||manifest.ready!==manifest.planned||audit.errors.length||audit.checked!==manifest.planned)throw Error('All N2 recordings must pass review and the final file audit before packaging.');
const durationReport=JSON.parse(fs.readFileSync(path.join(folder,'word-duration-after.json'),'utf8'));
if(durationReport.checked!==1774||durationReport.candidates.length)throw Error('Long word recordings still need review before packaging.');
const deck=JSON.parse(fs.readFileSync(path.join(n2Root,'content/n2-vocabulary-content.json'),'utf8'));
if(deck.id!=='hk-n2-vocabulary'||deck.notes.some(n=>!n.ID.startsWith('n2_hk_')))throw Error('N2 identity guard failed.');
const n3Ids=new Set(JSON.parse(fs.readFileSync(path.join(app,'assets/decks/n3-vocabulary.json'),'utf8')).notes.map(note=>note.ID));
if(deck.notes.length!==1774||new Set(deck.notes.map(note=>note.ID)).size!==1774||deck.notes.some(note=>n3Ids.has(note.ID)||!note.Word||!note.Word_Reading||!note.Word_Meaning||!note.Sentence||!note.Sentence_Reading||!note.Sentence_Meaning||!note.Hint||!note.Grammar_Note))throw Error('N2 content completeness or separation failed.');
const byJob=new Map(manifest.jobs.map(j=>[`${j.noteId}:${j.kind}`,j])),checked=new Map(audit.results.map(r=>[r.file,r.audioHash]));
const entries={},remote={},assets=path.join(app,'assets/decks'),destination=path.join(assets,'audio/n2-cedar');fs.mkdirSync(destination,{recursive:true});
for(const note of deck.notes){
 const entry={Word:note.Word,Word_Reading:note.Word_Reading,Sentence:note.Sentence};
 for(const kind of ['word','sentence']){
  const job=byJob.get(`${note.ID}:${kind}`);if(!job||job.status!=='ready'||job.audioHash!==checked.get(job.file))throw Error('N2 audio/audit association mismatch.');
  const bytes=fs.readFileSync(path.join(folder,job.file));if(digest(bytes)!==job.audioHash)throw Error('N2 file SHA mismatch.');
  const name=path.basename(job.file);if(!/^[a-zA-Z0-9_-]+\.(mp3|wav)$/.test(name))throw Error('Unexpected N2 recording name.');
  fs.writeFileSync(path.join(destination,name),bytes);
  const aliases=[...new Set([...(job.previousAudioFiles??[]),...(job.untrimmedFile?[job.untrimmedFile]:[])].map(f=>path.basename(f)))].filter(f=>f!==name);
  note[kind==='word'?'Word_Audio':'Sentence_Audio']=`[sound:${name}]`;
  entry[kind]={name,aliases};
 }
 entries[note.ID]=entry;
 remote[note.ID]={Word:entry.Word,Word_Reading:entry.Word_Reading,Sentence:entry.Sentence,word:entry.word.name,sentence:entry.sentence.name,wordAliases:entry.word.aliases,sentenceAliases:entry.sentence.aliases};
}
deck.revision='20261102_n2_'+digest(JSON.stringify(deck.notes)).slice(0,12);
const type="Record<string,{Word:string;Word_Reading:string;Sentence:string;word:{name:string;aliases?:string[];source:number};sentence:{name:string;aliases?:string[];source:number}}>";
const ts=Object.entries(entries).map(([id,n])=>`${JSON.stringify(id)}:{Word:${JSON.stringify(n.Word)},Word_Reading:${JSON.stringify(n.Word_Reading)},Sentence:${JSON.stringify(n.Sentence)},word:{...${JSON.stringify(n.word)},source:require(${JSON.stringify('./audio/n2-cedar/'+n.word.name)})},sentence:{...${JSON.stringify(n.sentence)},source:require(${JSON.stringify('./audio/n2-cedar/'+n.sentence.name)})}}`);
fs.writeFileSync(path.join(assets,'n2StudyAudioAssets.ts'),`// Generated from reviewed N2 recordings. Existing N3 files are not rewritten.\nexport const n2StudyAudioAssets:${type}={\n${ts.join(',\n')}\n};\n`);
fs.writeFileSync(path.join(assets,'n2RemoteStudyAudio.json'),JSON.stringify(remote));
fs.writeFileSync(path.join(assets,'n2-vocabulary.json'),JSON.stringify(deck,null,2));
const delivery=path.join(n2Root,'delivery');fs.mkdirSync(delivery,{recursive:true});fs.writeFileSync(path.join(delivery,'n2-vocabulary.json'),JSON.stringify(deck,null,2));
for(const [file,hash]of Object.entries(protectedFiles))if(digest(fs.readFileSync(path.join(app,file)))!==hash)throw Error('N3 preservation check failed after packaging.');
console.log(JSON.stringify({deckId:deck.id,notes:deck.notes.length,audioFiles:manifest.planned,n3OriginalFilesUnchanged:Object.keys(protectedFiles).length,revision:deck.revision,nativeBuildStarted:false}));
