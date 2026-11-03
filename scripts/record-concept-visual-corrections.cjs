// Specific corrections compared against the rendered source by the working model.
// This is not a claim of human review and does not rewrite paid raw responses.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve('../output/concept-lab/n3-20261102/corpus'),file=path.join(root,'visual-corrections.json');
const rows=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):[];
function add(job,item,reason){const png=path.join(root,'../pages',`${item.page}.png`);const row={job,item,reason,visualCompared:true,reviewer:'working-model direct page comparison; not human',imageSHA256:crypto.createHash('sha256').update(fs.readFileSync(png)).digest('hex')};const i=rows.findIndex(r=>r.job===job&&r.item.key===item.key);if(i<0)rows.push(row);else rows[i]=row;}
add('g-concept-166-169',{key:'g167-kedo',kind:'concept',page:167,printedPage:167,anchor:'빈출 조사 · けれど/けど',sourceText:'けれど/けど　~지만\n下手だけれど、ピアノを弾くのは楽しい。',status:'ready',label:'けれど/けど',meaning:'~지만',connection:'보통형 + けれど/けど'},'합쳐 적힌 표현을 실제 인쇄 표기로 분리');
add('g-concept-166-169',{key:'g167-kke',kind:'concept',page:167,printedPage:167,anchor:'빈출 조사 · っけ',sourceText:'っけ　~던가\n今日は木下さんの発表じゃなかったっけ？',status:'ready',label:'っけ',meaning:'~던가',connection:'기억을 되짚어 확인'},'누락된 표 항목과 예문을 원본에서 직접 확인');
const original=JSON.parse(fs.readFileSync(path.join(root,'l-task-340-343-draft.json'),'utf8')).items.find(i=>i.page===342);
const corrected=structuredClone(original);corrected.status='ready';delete corrected.reason;corrected.transcript=corrected.transcript.replace('女: いいねえ。そこにしましょう。','女: いいわね。そこにしましょう。');corrected.questions[0].prompt='두 사람의 저녁 식사 장소는?';corrected.questions[0].answer='4 · ホテルのすし屋へ行く';delete corrected.questions[0].cue;
add('l-task-340-343',corrected,'342쪽의 마지막 발화 표기를 대조하고 원음 없는 상태와 대본 오류를 구분');
add('l-expression-362-365',{key:'visual362-offer',kind:'listening',page:362,printedPage:362,anchor:'핵심 전략 2 · 선배에게 도움 제안',sourceText:'忙しい先輩を手伝いたいです。先輩に何と言いますか。\n① あの、手伝いましょうか。\n② あの、手伝ってくれませんか。',status:'ready',text:'',transcript:'忙しい先輩を手伝いたいです。先輩に何と言いますか。',questions:[{key:'visual362-offer-q',prompt:'선배에게 도움을 제안하는 말은?',answer:'あの、手伝いましょうか。',accepted:['手伝いましょうか','あの、手伝いましょうか'],choices:['あの、手伝いましょうか。','あの、手伝ってくれませんか。'],type:'audio',ability:'listening',explanation:'도움 제안 → 〜しましょうか\n〜てくれませんか → 도움 요청'}]},'그림 없이도 상황이 완전히 제시된 인쇄 예문을 질문 음성으로 사용');
fs.writeFileSync(file,JSON.stringify(rows,null,2));
fs.writeFileSync(path.join(root,'page-language-corrections.json'),JSON.stringify([{page:362,kind:'japanese_source',proof:'忙しい先輩を手伝いたいです。',reviewer:'working-model direct page comparison; not human'}],null,2));console.log(JSON.stringify({visualCorrections:rows.length}));
