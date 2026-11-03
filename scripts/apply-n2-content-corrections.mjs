import fs from 'node:fs';
import path from 'node:path';
import {n2Root} from './n2-budget.mjs';
const patches={
 n2_hk_p008_006:{Sentence:'この製品は作りが粗い。',Sentence_Reading:'このせいひんはつくりがあらい。',Sentence_Meaning:'이 제품은 만듦새가 조잡하다.'},
 n2_hk_p008_016:{Sentence:'この本には詳しい説明がある。',Sentence_Reading:'このほんにはくわしいせつめいがある。',Sentence_Meaning:'이 책에는 자세한 설명이 있다.'},
 n2_hk_p008_039:{Word_Meaning:'성미가 급하다'},
 n2_hk_p012_037:{Sentence_Meaning:'친구에게 영화를 보러 가자고 권했다.'},
 n2_hk_p014_046:{Sentence:'不正をした者を罪する。',Sentence_Reading:'ふせいをしたものをつみする。',Sentence_Meaning:'부정을 저지른 자를 처벌하다.',Grammar_Note:'「罪する」는 죄를 물어 처벌한다는 뜻의 문어적인 サ변동사다. 교재의 표기와 읽기를 보존한다.'},
 n2_hk_p024_019:{Word_Reading:'しや'},
 n2_hk_p025_001:{Grammar_Note:'「適度だ」는 な형용사다. 「～だと」는 어떤 조건에서 뒤의 결과가 나타남을 나타낸다.'},
 n2_hk_p026_002:{Sentence_Meaning:'컵에서 물이 쏟아졌다.',Grammar_Note:'「こぼれる」는 자동사로 액체 등이 밖으로 흘러넘치거나 쏟아지는 상태를 나타낸다. 교재의 뜻은 보존하고 자동사 용법을 함께 기억한다.'},
 n2_hk_p026_008:{Sentence:'この財布は長年使い込んでいる。',Sentence_Reading:'このさいふはながねんつかいこんでいる。',Sentence_Meaning:'이 지갑은 여러 해 동안 손에 익게 오래 쓰고 있다.',Grammar_Note:'「使い込む」는 이 항목에서는 오랫동안 충분히 사용한다는 뜻이다. 교재의 뜻에 맞춰 예문을 구성했다.'},
 n2_hk_p032_011:{Sentence:'父は息子に店を譲った。',Sentence_Reading:'ちちはむすこにみせをゆずった。',Sentence_Meaning:'아버지는 아들에게 가게를 물려주었다.'},
 n2_hk_p038_035:{Word_Meaning:'앉아서 졸기, 졸음',Sentence_Meaning:'수업 중에 꾸벅꾸벅 졸고 말았다.'},
};
const changes=[];
for(let page=2;page<=43;page++){
 const file=path.join(n2Root,'reconciled-pages',`page-${String(page).padStart(3,'0')}.json`),m=JSON.parse(fs.readFileSync(file,'utf8'));
 for(const note of m.notes){const patch=patches[note.ID];if(!patch)continue;changes.push({ID:note.ID,previous:Object.fromEntries(Object.keys(patch).map(k=>[k,note[k]])),patch});Object.assign(note,patch);}
 fs.writeFileSync(file,JSON.stringify(m,null,2));
}
const output=path.join(n2Root,'manual-language-corrections.json');
if(!fs.existsSync(output))fs.writeFileSync(output,JSON.stringify({changes,references:{tsumisuru:'https://kotobank.jp/word/罪する-572490',masshiroi:'https://kotobank.jp/word/真つ白い-3219150'},notes:'Automatic flags were individually reviewed; valid readings and source glossary variants were retained. Source pages 8/14/24/26/38 were visually inspected.'},null,2));
console.log(JSON.stringify({correctedNotes:changes.length}));
