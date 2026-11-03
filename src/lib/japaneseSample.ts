export type JapaneseAnswer={id:string;conceptId:string;kind:'familiar'|'novel'|'reading'|'speaking';correct:boolean;reason?:string;selected?:string;at?:string};
export type JapaneseRetry={id:string;correct:boolean;selected?:string;at:string};
export type JapaneseSample={id:string;stage:number;answers:JapaneseAnswer[];startedAt:string;completedAt?:string;retries?:JapaneseRetry[]};
export const newJapaneseSample=(id:string):JapaneseSample=>({id,stage:0,answers:[],startedAt:new Date().toISOString()});
export const recordJapaneseAnswer=(s:JapaneseSample,a:JapaneseAnswer):JapaneseSample=>({...s,answers:[...s.answers.filter(old=>old.id!==a.id),{...a,at:new Date().toISOString()}]});
export const moveJapaneseSample=(s:JapaneseSample,stage:number):JapaneseSample=>({...s,stage,completedAt:stage===4?s.completedAt??new Date().toISOString():s.completedAt});
/** 처음 응답은 그대로 두고 다시 풀기만 따로 남긴다. 덜 다시 푼 문제가 앞에 오므로 또 틀린 문제는 뒤로 밀린다. */
export function japaneseRetryQueue(s:JapaneseSample){
 const retries=s.retries??[];
 return s.answers
  .filter(a=>(a.kind==='familiar'||a.kind==='novel')&&!a.correct&&!retries.some(r=>r.id===a.id&&r.correct))
  .map(answer=>({answer,attempts:retries.filter(r=>r.id===answer.id).length}))
  .sort((x,y)=>x.attempts-y.attempts)
  .map(row=>row.answer);
}
export const recordJapaneseRetry=(s:JapaneseSample,r:Omit<JapaneseRetry,'at'>):JapaneseSample=>({...s,retries:[...(s.retries??[]),{...r,at:new Date().toISOString()}]});
export function japaneseSampleSummary(s:JapaneseSample){
 const count=(kind:JapaneseAnswer['kind'])=>{const rows=s.answers.filter(a=>a.kind===kind);return {correct:rows.filter(a=>a.correct).length,total:rows.length};};
 return {familiar:count('familiar'),novel:count('novel'),reading:count('reading'),speaking:count('speaking'),retried:new Set((s.retries??[]).filter(r=>r.correct).map(r=>r.id)).size};
}
export const japaneseSampleConcepts=[
 {id:'decision',sourceId:'concept-pdf-b5dd18f7d498',page:199,title:'〜ことにする',meaning:'스스로 생각하고 결정한 일을 말합니다.',example:'自分で考えて、毎朝走ることにした。',question:'화자는 자신의 결정을 말하고 있나요, 외부에서 정해진 일을 전달하고 있나요?',answer:'자신이 결정한 일을 말합니다.',explanation:'自分で考えて가 결정의 주체를 알려 줍니다. 동사 사전형·ない형 뒤에 ことにする를 붙입니다.',situation:'일본어 듣기 실력을 키우고 싶어서 직접 결정했습니다. 이번 주부터 매일 일본어 뉴스를 듣기로 했다고 말해 보세요.',application:'今週から毎日、日本語のニュースを聞くことにした。',criterion:'스스로 정한 계획이라는 뜻을 ことにした로 표현했다면 인정합니다. 어순이나 다른 자연스러운 부사 표현은 달라도 됩니다.'},
 {id:'arrangement',sourceId:'concept-pdf-a31555c0712f',page:200,title:'〜ことになる',meaning:'방침이나 주변 사정 등으로 정해진 일을 전달합니다.',example:'会社の方針で、来月から大阪で働くことになった。',question:'오사카에서 일하게 된 이유는 개인적인 결심인가요, 회사에서 정해진 방침인가요?',answer:'회사 방침에 따라 정해진 일입니다.',explanation:'会社の方針で가 단서입니다. 여기서는 자신의 결정을 강조하는 ことにした보다 ことになった가 알맞습니다.',situation:'학교가 새 규칙을 정했습니다. 다음 달부터 수업에서 태블릿을 사용하게 되었다고 친구에게 말해 보세요.',application:'学校の決まりで、来月から授業でタブレットを使うことになった。',criterion:'학교의 결정으로 정해진 일을 ことになった로 전달했다면 인정합니다. 学校が決めたので 등으로 이유를 표현해도 됩니다.'},
 {id:'habit',sourceId:'concept-pdf-a583131805d8',page:201,title:'〜ようにする',meaning:'어떤 행동을 하도록 의식적으로 노력하거나 습관으로 삼습니다.',example:'健康のために、毎日歩くようにしている。',question:'이 문장은 걷는 능력이 생겼다는 뜻인가요, 매일 걸으려고 노력한다는 뜻인가요?',answer:'매일 걸으려고 의식적으로 노력한다는 뜻입니다.',explanation:'ようにしている는 평소 지키려고 하는 행동을 나타냅니다. 능력의 변화는 보통 가능형과 ようになる로 표현합니다.',situation:'일본어를 잊지 않으려고 평소 실천하는 습관을 말합니다. 매일 일본어를 듣도록 노력한다고 말해 보세요.',application:'毎日、日本語を聞くようにしている。',criterion:'평소 의식적으로 실천하는 행동을 ようにしている로 표현하면 인정합니다.'},
 {id:'change',sourceId:'concept-pdf-ee23b83f446b',page:201,title:'〜ようになる',meaning:'이전과 달리 할 수 있게 되거나 행동·상태가 달라졌음을 말합니다.',example:'練習して、日本語のニュースが聞き取れるようになった。',question:'이전과 비교해서 화자에게 어떤 변화가 생겼나요?',answer:'일본어 뉴스를 알아들을 수 있게 되었습니다.',explanation:'聞き取れる는 가능형입니다. 가능형 + ようになった는 예전에는 못 하던 것을 할 수 있게 된 변화를 나타냅니다.',situation:'일본어를 배운 뒤 혼자 식당에서 주문할 수 있게 되었습니다. 달라진 능력을 말해 보세요.',application:'一人で日本語で注文できるようになった。',criterion:'능력의 변화를 가능형 + ようになった로 전달하면 인정합니다. 日本語で一人で注文できる 등 자연스러운 어순도 허용합니다.'},
 {id:'intention',sourceId:'concept-pdf-ae77d49e8e4d',page:200,title:'〜つもりだ',meaning:'자신이 앞으로 하려는 의도나 계획을 말합니다.',example:'夏休みに、日本へ旅行するつもりです。',question:'화자는 이미 여행을 마쳤나요, 앞으로 여행할 계획을 말하고 있나요?',answer:'앞으로 여행할 계획을 말하고 있습니다.',explanation:'동사 사전형 + つもりだ는 하려는 의도를 나타냅니다. 이 문장은 여행의 완료나 확정된 예약 여부까지 말하지는 않습니다.',situation:'친구가 주말 계획을 묻습니다. 토요일에 도서관에서 공부할 생각이라고 말해 보세요.',application:'土曜日は図書館で勉強するつもりです。',criterion:'자신의 앞으로의 계획을 つもりだ 또는 つもりです로 말하면 인정합니다.'},
];
const novelOrder=['habit','intention','decision','arrangement','change'];
/** 보기는 고정 순서로 두므로, 정답 위치가 1→5번으로 이어지지 않도록 상황 순서를 다르게 둔다. */
export const japaneseSampleNovelConcepts=novelOrder.map(id=>japaneseSampleConcepts.find(c=>c.id===id)!);
export const japaneseNovelCorrect=(selected:string,conceptId:string,selfRated:boolean)=>selfRated&&selected===conceptId;
export const japaneseSampleReading=[
 '来月から、日本語クラブの活動は火曜日に行うことになりました。',
 '参加したい人は、月曜日までにインターネットで予約してください。',
 'ただし、初めて参加する人は、予約しなくても参加できます。',
 '活動の前に、受付で名前を書いてください。',
];
export const japaneseSampleReadingQuestions=[
 {id:'reading-exception',conceptId:'reading-exception',question:'처음 참가하는 사람은 인터넷으로 예약하지 않아도 참가할 수 있나요? 답의 근거가 되는 문장을 선택하세요.',evidence:2,answer:'참가할 수 있습니다.',explanation:'ただし 뒤에 처음 참가하는 사람에게 적용되는 예외 조건이 나옵니다. 예약해야 한다는 앞 문장만 보고 답하면 이 조건을 놓치게 됩니다.'},
 {id:'reading-time',conceptId:'reading-timing',question:'참가자는 언제 접수처에서 이름을 써야 하나요? 답의 근거가 되는 문장을 선택하세요.',evidence:3,answer:'활동이 시작하기 전에 써야 합니다.',explanation:'活動の前に가 시점을 알려 줍니다. 월요일까지라는 기한은 인터넷 예약의 기한이므로 구분해야 합니다.'},
];
