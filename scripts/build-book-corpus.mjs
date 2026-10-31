import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),out=path.join(root,'output/book-pages');
const base=['n3-reading-01.json','n3-reading-p003.json'].flatMap(f=>JSON.parse(fs.readFileSync(path.join(root,'output/deck-audio',f),'utf8')).notes);
const key=n=>`${n.Word.normalize('NFKC')}|${n.Word_Reading.replace(/\s/g,'').normalize('NFKC').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96))}`;
const notes=base.map(n=>({...n,Tags:[...n.Tags]})),known=new Map(notes.map(n=>[key(n),n]));const pageReport=[],flags=[],duplicates=[];
for(let page=6;page<=43;page++){
 const file=path.join(out,`page-${String(page).padStart(2,'0')}-MODEL-REVIEWED.json`);if(!fs.existsSync(file))throw Error(`Page ${page} is not source-reviewed yet. No learning deck changed.`);
 const data=JSON.parse(fs.readFileSync(file,'utf8'));if(data.status!=='SOURCE_MODEL_REVIEWED')throw Error('Review status mismatch');
 for(let i=0;i<data.notes.length;i++){
  const raw={...data.notes[i]};
  // Manually checked against the supplied page 11 image: the book's na-adjective form is 新ただ.
  // 新ただな was an invalid generated example, not an error in the book's headword.
  if(page===11&&raw.Word==='新ただ')Object.assign(raw,{Word_Reading:'あらただ',Sentence:'新たなアイデアが必要だ。',Sentence_Reading:'あらたなアイデアがひつようだ。',Sentence_Meaning:'새로운 아이디어가 필요하다.',Grammar_Note:'「新た」는 な형용사로, 명사 앞에서는「新たな」로 쓴다.',uncertain:false,reason:'원본 이미지 직접 대조 및 생성 예문 수정'});
  if(page===24&&raw.Word==='アイデア / アイディア')Object.assign(raw,{Word_Reading:'アイデア',Hint:raw.Hint+' · アイディア라는 표기도 사용한다.',uncertain:false,reason:'원본의 두 표기는 보존하고 단어 음성은 대표 읽기 하나만 사용'});
  const kana=/^[\u3040-\u30ff\sー〜～・、。！？!?()（）0-9]+$/;
  if(raw.uncertain||!kana.test(raw.Word_Reading)||/[一-龠々]/.test(raw.Sentence_Reading)||raw.Word.endsWith('だ')&&raw.Sentence.includes(raw.Word+'な')){flags.push({page,index:i,word:raw.Word,reason:raw.reason,Word_Reading:raw.Word_Reading,Sentence:raw.Sentence,Sentence_Reading:raw.Sentence_Reading});continue;}
  const printed=page-2,tag=`pdf_page${String(page).padStart(2,'0')}`;
  const existing=known.get(key(raw));if(existing){existing.Tags=[...new Set([...existing.Tags,tag,`book_page${String(printed).padStart(3,'0')}`])];if(!existing.Word_Meaning.includes(raw.Word_Meaning))existing.Word_Meaning+=` / ${raw.Word_Meaning}`;duplicates.push({page,word:raw.Word,kept:existing.ID});continue;}
  const note={ID:`n3_hk_p${String(printed).padStart(3,'0')}_${String(i+1).padStart(3,'0')}`,...Object.fromEntries(['Word','Word_Reading','Word_Meaning','Hint','Sentence','Sentence_Reading','Sentence_Meaning','Grammar_Note'].map(f=>[f,raw[f].trim()])),Card_Level:'core',Make_Sentence_Card:false,Word_Audio:'',Sentence_Audio:'',Tags:['N3',tag,`book_page${String(printed).padStart(3,'0')}`,'source_model_reviewed']};
  notes.push(note);known.set(key(note),note);
 }
 pageReport.push({pdfPage:page,printedPage:page-2,sourceRows:data.notes.length,model:data.model});
}
fs.writeFileSync(path.join(out,'corpus-audit.json'),JSON.stringify({pages:40,originalVerifiedNotes:97,notes:notes.length,duplicatesMerged:duplicates.length,flags,pageReport,duplicates,humanAllPageReview:false},null,2));
if(flags.length)throw Error(`${flags.length} content flags need review. See corpus-audit.json. No learning deck changed.`);
const deck={schema:'routine.japanese-deck.v1',id:'hk-n3-kanji-01',name:'JLPT N3 단어장',revision:'20261030_n3_corpus01',notes};
fs.writeFileSync(path.join(out,'n3-corpus-content.json'),JSON.stringify(deck,null,2));
console.log(JSON.stringify({notes:notes.length,sourcePages:40,duplicateSourceRows:duplicates.length,unresolvedFlags:flags.length,original97IDsKept:true,appChanged:false,audioGenerated:false}));
