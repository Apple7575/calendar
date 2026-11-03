import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {n2Root} from './n2-budget.mjs';
const partial=process.argv.includes('--partial'),notes=[],known=new Map(),duplicates=[],flags=[],pages=[],provenance=[];
const normalize=s=>s.normalize('NFKC').replace(/\s/g,'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
const meaning=s=>s.normalize('NFKC').replace(/[\s,，、/／·・.。]/g,'');
const fields=['Word','Word_Reading','Word_Meaning','Hint','Sentence','Sentence_Reading','Sentence_Meaning','Grammar_Note'];
for(let page=2;page<=43;page++){
 const canonical=path.join(n2Root,'reconciled-pages',`page-${String(page).padStart(3,'0')}.json`);
 const file=fs.existsSync(canonical)?canonical:path.join(n2Root,'source-pages',`page-${String(page).padStart(2,'0')}-MODEL-REVIEWED.json`);
 if(!partial&&!fs.existsSync(canonical))throw Error('Independent source reconciliation is required before audio.');
 if(!fs.existsSync(file)){if(partial)continue;throw Error(`N2 page ${page} is not reviewed.`);}
 const source=JSON.parse(fs.readFileSync(file,'utf8'));
 if(!fs.existsSync(canonical)&&source.status!=='SOURCE_MODEL_REVIEWED')throw Error(`Unexpected review state on ${page}`);
 const image=path.resolve(n2Root,'../../../tmp/pdfs/n2-20261102',`word-page-${String(page).padStart(3,'0')}.png`);
 if(crypto.createHash('sha256').update(fs.readFileSync(image)).digest('hex')!==source.sourceHash)throw Error('Source image hash differs.');
 pages.push({pdfPage:page,printedPage:page,sourceRows:source.notes.length,sourceHash:source.sourceHash,model:source.model});
 for(const [i,raw] of source.notes.entries()){
  const id=`n2_hk_p${String(page).padStart(3,'0')}_${String(i+1).padStart(3,'0')}`;
  if(raw.uncertain||fields.some(f=>typeof raw[f]!=='string'||!raw[f].trim())||/[一-龠々]/.test(raw.Sentence_Reading)){
   flags.push({id,page,row:i+1,word:raw.Word,reason:raw.reason||'Invalid/uncertain content',note:raw});continue;
  }
  const key=normalize(raw.Word)+'|'+normalize(raw.Word_Reading),variants=known.get(key)??[];
  // Only merge identical glosses or glosses already fully contained in one another.
  // Distinct meanings remain separate source notes rather than being silently removed.
  const duplicate=variants.find(n=>meaning(n.Word_Meaning)===meaning(raw.Word_Meaning)||meaning(n.Word_Meaning).includes(meaning(raw.Word_Meaning))||meaning(raw.Word_Meaning).includes(meaning(n.Word_Meaning)));
  if(duplicate){
   if(meaning(raw.Word_Meaning).includes(meaning(duplicate.Word_Meaning)))duplicate.Word_Meaning=raw.Word_Meaning.trim();
   duplicate.Tags=[...new Set([...duplicate.Tags,`pdf_page${String(page).padStart(3,'0')}`])];
   duplicates.push({page,row:i+1,word:raw.Word,reading:raw.Word_Reading,meaning:raw.Word_Meaning,keptId:duplicate.ID});
   provenance.push({sourceId:id,noteId:duplicate.ID,pdfPage:page,sourceRow:i+1,merged:true});continue;
  }
  const note={ID:id,...Object.fromEntries(fields.map(f=>[f,raw[f].trim()])),Card_Level:'core',Make_Sentence_Card:false,Word_Audio:'',Sentence_Audio:'',Tags:['N2',`pdf_page${String(page).padStart(3,'0')}`,`book_page${String(page).padStart(3,'0')}`,'source_model_reviewed']};
  notes.push(note);known.set(key,[...variants,note]);provenance.push({sourceId:id,noteId:id,pdfPage:page,sourceRow:i+1,merged:false});
 }
}
const folder=path.join(n2Root,'content');fs.mkdirSync(folder,{recursive:true});
const rows=pages.reduce((n,p)=>n+p.sourceRows,0);
if(rows!==notes.length+duplicates.length+flags.length)throw Error('N2 source count does not reconcile.');
const audit={pages,sourceRows:rows,notes:notes.length,duplicatesMerged:duplicates.length,flags,duplicates,provenance,distinctMeaningGroups:[...known].filter(([,v])=>v.length>1).map(([key,v])=>({key,ids:v.map(n=>n.ID),meanings:v.map(n=>n.Word_Meaning)})),humanAllPageReview:false,complete:pages.length===42&&!flags.length};
fs.writeFileSync(path.join(n2Root,'content-audit.json'),JSON.stringify(audit,null,2));
if(flags.length&&!partial)throw Error(`${flags.length} source flags need review. No complete N2 deck written.`);
const deck={schema:'routine.japanese-deck.v1',id:'hk-n2-vocabulary',name:'JLPT N2 단어장',revision:'20261102_n2_content01',notes};
fs.writeFileSync(path.join(folder,partial?'n2-content-PARTIAL.json':'n2-vocabulary-content.json'),JSON.stringify(deck,null,2));
console.log(JSON.stringify({pages:pages.length,sourceRows:rows,notes:notes.length,duplicates:duplicates.length,flags:flags.length,complete:audit.complete,appChanged:false}));
