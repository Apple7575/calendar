// Page references stay in tags; all reviewed N3 notes belong to one study deck.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const source=path.join(root,'output/deck-audio');
const parts=['n3-reading-01.json','n3-reading-p003.json'].map(file=>JSON.parse(fs.readFileSync(path.join(source,file),'utf8')));
const notes=parts.flatMap(p=>p.notes);
const canonical=path.join(root,'calendar/assets/decks/n3-vocabulary.json');
if(fs.existsSync(canonical)&&JSON.parse(fs.readFileSync(canonical,'utf8')).notes.length>notes.length)throw Error('The full N3 corpus is already packaged. Refusing to replace it with the legacy 97-note pack.');
if(notes.length!==97||new Set(notes.map(n=>n.ID)).size!==97)throw Error('N3 note identity/count check failed');
const deck={schema:'routine.japanese-deck.v1',id:'hk-n3-kanji-01',name:'JLPT N3 단어장',revision:'20261030_n3_unified02',notes};
const body=JSON.stringify(deck,null,2);
fs.writeFileSync(path.join(source,'n3-vocabulary.json'),body);
fs.writeFileSync(path.join(root,'calendar/assets/decks/n3-vocabulary.json'),body);
console.log(JSON.stringify({deck:deck.name,id:deck.id,notes:notes.length,audioFields:notes.filter(n=>n.Word_Audio&&n.Sentence_Audio).length}));
