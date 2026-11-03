import type {LabBook,LabCard,Extraction,Concept} from './conceptLabTypes';
import {conceptUnits} from './conceptLabUnits';
import {expansionCards,expansionConcepts,expansionExtractions,expansionBundles} from './conceptLabExpansion';
import {sourceCorpus} from './conceptLabCorpus';
const evidence=(pdfPage:number,region:string)=>({pdfPage,printedPage:pdfPage,region,status:'model_visual_reviewed' as const});
const extractions:Extraction[]=[
 {id:'ex-holiday',unitId:'v-read',source:evidence(38,'단어 표 첫째 행 왼쪽'),representation:'verbatim',kind:'vocabulary',text:'休日',reading:'きゅうじつ',meaning:'휴일'},
 {id:'ex-date',unitId:'v-read',source:evidence(38,'단어 표 둘째 행 왼쪽'),representation:'verbatim',kind:'vocabulary',text:'日時',reading:'にちじ',meaning:'일시'},
 {id:'ex-sou',unitId:'g-concept',source:evidence(180,'1. そうだ, 추측·전언 접속표 및 예문'),representation:'structured_excerpt',kind:'grammar',text:'추측: おいしそうだ・行きそうだ / 전언: おいしいそうだ・行くそうだ'},
 {id:'ex-give',unitId:'g-concept',source:evidence(182,'수수 동사 표 및 2·3번 설명'),representation:'structured_excerpt',kind:'grammar',text:'あげる: 나→상대 / くれる: 상대→나 / もらう: 상대에게서 받다'},
 {id:'ex-connect',unitId:'g-text',source:evidence(260,'문제 풀이 Step 적용, 선택지 4와 해설'),representation:'model_summary',kind:'passage',text:'인터넷으로 신청한 결과 카드 회사의 답장이 온 흐름에서 すると를 선택한다.'},
 {id:'ex-read',unitId:'r-short',source:evidence(280,'문제 풀이 Step 적용, 본문과 질문·선택지 2'),representation:'verbatim',kind:'passage',text:'招待状をもらったら、行くか行かないか、必ず返事を出さなければなりません。そのときに、お祝いの言葉を一言書くのもいいでしょう。'},
 {id:'ex-listen',unitId:'l-task',source:evidence(342,'문제지·음성 대본·Step 해설'),representation:'model_summary',kind:'dialogue',text:'최종 결정: ホテルのすし屋へ行く. 앞서 제안된 식당은 제외된다.',uncertain:['원본 MP3 미첨부; 대본을 원음으로 간주하지 않음']},
];
const concepts:Concept[]=[
 {id:'concept-holiday',label:'休日의 읽기와 의미',domain:'vocabulary',unitId:'v-read',evidenceIds:['ex-holiday'],tags:['N3','多読音']},
 {id:'concept-date',label:'日時의 읽기와 의미',domain:'vocabulary',unitId:'v-read',evidenceIds:['ex-date'],tags:['N3','多読音']},
 {id:'concept-sou',label:'추측과 전달의 そうだ',domain:'grammar',unitId:'g-concept',evidenceIds:['ex-sou'],tags:['N3','추측','전달']},
 {id:'concept-give',label:'수수 표현의 방향',domain:'grammar',unitId:'g-concept',evidenceIds:['ex-give'],tags:['N3','수수']},
];
const quality={natural:true,unambiguous:true,level:true,grounded:true,reviewer:'model_review_pass_20261102; human review pending'};
function card(part:Partial<LabCard>&Pick<LabCard,'id'|'prompt'|'answer'|'accepted'>):LabCard{
 const choices=part.id==='lab_give'?['あげる','くれる','もらう']:part.id==='lab_read_q2'?['ところが','そのうえ','すると']:part.id==='lab_holiday_context_variant'?['休日','日時']:undefined;
 return {unitId:'g-concept',conceptId:'concept-sou',type:'basic',ability:'grammar',rubric:'표시된 평가 목표와 허용 답안을 확인합니다. 목록 밖의 자연스러운 동등 표현은 자기 평가로 인정할 수 있습니다.',explanation:'',hint:'판단의 근거와 말하는 목적을 생각해 보세요.',origin:'ai',novel:false,status:'ready',evidenceIds:['ex-sou'],difficulty:'N3',assessment:'exact',quality,choices,...part};
}
const cards:LabCard[]=[
 card({id:'lab_holiday_read',unitId:'v-read',conceptId:'concept-holiday',type:'basic',ability:'reading',prompt:'休日의 읽기를 가나로 답하세요.',answer:'きゅうじつ',accepted:['きゅうじつ'],origin:'textbook',evidenceIds:['ex-holiday'],explanation:'日는 이 단어에서 じつ로 읽습니다. 뜻은 휴일입니다.',hint:'앞의 休는 きゅう로 읽어요.'}),
 card({id:'lab_holiday_reverse',unitId:'v-read',conceptId:'concept-holiday',type:'reverse',ability:'meaning',prompt:'‘휴일’을 뜻하는 일본어 명사를 답하세요. 한자 또는 가나로 써도 됩니다.',answer:'休日（きゅうじつ）',accepted:['休日','きゅうじつ'],origin:'textbook',evidenceIds:['ex-holiday'],explanation:'표기 평가가 아니라 의미 회상 문제이므로 가나도 인정합니다.',hint:'일하지 않고 쉬는 날이에요.'}),
 card({id:'lab_sou_form',type:'transform',ability:'form',prompt:'직접 본 음식이 맛있어 보입니다. おいしい를 추측 표현으로 바꾸세요. 보통체로 답하세요.',answer:'おいしそうだ',accepted:['おいしそうだ','おいしそう'],explanation:'추측은 い형용사 끝의 い를 빼고 붙입니다. 전달은 보통형 뒤에 붙입니다.'}),
 card({id:'lab_sou_cloze',type:'cloze',ability:'form',prompt:'검은 구름을 직접 보았습니다. 추측 표현을 완성하세요: 雨が（　）。降る를 바꾸어 보통체로 쓰세요.',answer:'降りそうだ',accepted:['降りそうだ','ふりそうだ'],explanation:'직접 관찰한 징후에 근거한 추측: 동사 ます형 어간 + そうだ.'}),
 card({id:'lab_sou_compare',type:'compare',ability:'grammar',assessment:'open',prompt:'① おいしそうだ ② おいしいそうだ. 다른 사람의 평가를 전달하는 쪽을 고르고, 판단 근거의 차이를 한 문장으로 설명하세요.',answer:'②는 들은 평가의 전달, ①은 직접 본 모습에 근거한 추측입니다.',accepted:[],explanation:'끝의 い 유무가 다릅니다. 단순히 맛있다는 의미만 말하면 근거의 차이는 평가하지 못합니다.',rubric:'②를 전달로 고르고, 들은 정보와 직접 관찰의 차이를 설명하면 인정. 표현이 예상 문장과 같을 필요는 없음.'}),
 card({id:'lab_sou_apply',type:'apply',ability:'grammar',assessment:'open',prompt:'일기예보에서 내일 비가 온다고 들었습니다. 전달의 そうだ로 친구에게 한 문장을 말하세요.',answer:'天気予報によると、明日は雨が降るそうです。',accepted:[],explanation:'들은 내용의 전달이므로 降る의 보통형 뒤에 붙입니다. 降りそう는 관찰에 근거한 추측입니다.',rubric:'예보라는 정보 출처와 내일 비가 온다는 의미, 보통형+そうだ/そうです가 맞으면 인정. 조사·어순의 자연스러운 차이 허용.'}),
 card({id:'lab_give',conceptId:'concept-give',type:'cloze',ability:'usage',prompt:'친구가 나에게 책을 줍니다. あげる / くれる / もらう 중 골라 빈칸을 채우세요: 友だちが私に本を（　）。',answer:'くれる',accepted:['くれる'],evidenceIds:['ex-give'],explanation:'주는 방향이 친구→나이므로 くれる를 씁니다.',hint:'주는 사람과 받는 사람을 화살표로 떠올려 보세요.'}),
 card({id:'lab_audio',unitId:'v-read',conceptId:'concept-holiday',type:'audio',ability:'listening',prompt:'음성으로 들은 명사의 한국어 뜻을 답하세요.',answer:'휴일',accepted:['휴일','쉬는 날','쉬는날'],evidenceIds:['ex-holiday'],audioNoteId:'n3_hk_p005_017',audioKind:'word',explanation:'休日（きゅうじつ）: 휴일. 기존에 저장된 음성을 재사용한 AI 학습 문제입니다.',hint:'일하는 날과 대비되는 날이에요.'}),
 card({id:'lab_read_q1',unitId:'g-text',conceptId:undefined,bundleId:'bundle-read',ability:'comprehension',type:'basic',prompt:'시청에서 답장이 온 요일은 언제인가요? 한국어 또는 일본어로 답하세요.',answer:'금요일',accepted:['금요일','金曜日','きんようび'],evidenceIds:['ex-connect'],explanation:'답장이 금요일에 왔다는 정보는 지문에 명시되어 있습니다.',hint:'지문의 시간 표현을 찾아보세요.'}),
 card({id:'lab_read_q2',unitId:'g-text',conceptId:undefined,bundleId:'bundle-read',ability:'cohesion',type:'cloze',prompt:'지문의（　）에 들어갈 연결 표현: ところが / そのうえ / すると 중 하나를 고르세요.',answer:'すると',accepted:['すると'],evidenceIds:['ex-connect'],explanation:'신청 후 답장이 왔다는 사건의 결과를 잇습니다. ところが는 반전, そのうえ는 추가입니다.',hint:'앞 사건 이후 어떤 결과가 생겼는지 보세요.'}),
 card({id:'lab_comprehension',unitId:'r-short',conceptId:undefined,bundleId:'bundle-read-source',ability:'comprehension',type:'basic',assessment:'open',prompt:'지문의 そのとき는 어떤 때를 가리키나요? 한국어로 답해도 됩니다.',answer:'결혼식 초대장에 대한 답장을 보낼 때',accepted:[],origin:'textbook',evidenceIds:['ex-read'],rubric:'초대를 받는 순간이나 결혼식 참석 시점이 아니라 초대장에 대한 답장을 보낼 때라고 설명하면 인정.',explanation:'そのとき는 바로 앞 문장의 返事を出す 상황을 가리킵니다.',hint:'지시어 바로 앞 문장에서 행동을 찾아보세요.'}),
 card({id:'lab_date_read',unitId:'v-read',conceptId:'concept-date',type:'basic',ability:'reading',prompt:'日時의 읽기를 가나로 답하세요.',answer:'にちじ',accepted:['にちじ'],origin:'textbook',evidenceIds:['ex-date'],explanation:'이 단어의 日는 にち로 읽습니다.',hint:'時는 じ로 읽어요.'}),
 card({id:'lab_date_meaning',unitId:'v-read',conceptId:'concept-date',type:'basic',ability:'meaning',prompt:'日時의 한국어 뜻을 답하세요.',answer:'일시 · 날짜와 시간',accepted:['일시','날짜와 시간','날짜와시간'],origin:'textbook',evidenceIds:['ex-date'],explanation:'행사가 열리는 날짜와 시간을 나타냅니다.',hint:'언제 열리는지 확인할 때 필요한 두 정보예요.'}),
 card({id:'lab_listen_original',unitId:'l-task',conceptId:undefined,bundleId:'bundle-listen-source',ability:'listening',type:'audio',prompt:'두 사람은 저녁을 어떻게 하기로 했나요?',answer:'호텔의 초밥집에 간다',accepted:['호텔의 초밥집에 간다'],origin:'textbook',status:'needs_review',evidenceIds:['ex-listen'],explanation:'최종 합의는 호텔의 초밥집입니다. 원본 음성이 없어 학습에 내보내지 않습니다.',hint:'마지막 합의에 주의하세요.'}),
];
const variants:LabCard[]=[
 card({id:'lab_holiday_context_variant',unitId:'v-read',conceptId:'concept-holiday',type:'cloze',ability:'context',prompt:'우체국 안내: 평일은 영업하지만 쉬는 날에는 문을 닫습니다. 休日 / 日時 중 골라 채우세요: この郵便局は（　）に営業しません。',answer:'休日',accepted:['休日','きゅうじつ'],parentId:'lab_holiday_read',novel:true,evidenceIds:['ex-holiday'],explanation:'날짜와 시간을 묻는 것이 아니라 영업하지 않는 날을 구분합니다. 日時는 일시입니다.',hint:'영업일과 쉬는 날을 대비하고 있어요.'}),
 card({id:'lab_sou_variant',type:'cloze',ability:'form',prompt:'선생님에게 다음 주 시험이 있다고 들었습니다. 전달의 そうだ로 완성하세요: 先生の話では、来週は試験が（　）。ある를 보통체로 바꾸세요.',answer:'あるそうだ',accepted:['あるそうだ'],parentId:'lab_sou_form',novel:true,explanation:'들은 사실을 전달하므로 보통형 ある 뒤에 붙입니다. ありそうだ는 있을 것 같다는 추측입니다.'}),
 card({id:'lab_sou_step_variant',type:'transform',ability:'form',prompt:'작은 단계 연습: 行く의 ます형에서 ます를 뺀 부분만 쓰세요.',answer:'行き',accepted:['行き','いき'],parentId:'lab_sou_form',novel:true,explanation:'行きます에서 ます를 빼면 行き입니다. 이 뒤에 추측의 표현을 붙일 수 있습니다.'}),
 card({id:'lab_audio_variant',unitId:'v-read',conceptId:'concept-holiday',type:'audio',ability:'listening',prompt:'문장을 듣고 화자가 언제 쉬는지 한국어로 답하세요.',answer:'휴일에',accepted:['휴일','휴일에','쉬는 날','쉬는 날에'],parentId:'lab_audio',novel:true,audioNoteId:'n3_hk_p005_017',audioKind:'sentence',evidenceIds:['ex-holiday'],explanation:'休日はゆっくり休みます。쉬는 때는 休日, 즉 휴일입니다. 이 문장은 이전 단어장의 AI 예문을 재사용합니다.',rubric:'쉬는 방식이 아니라 쉬는 때인 휴일을 이해했는지 평가한다.',hint:'쉬는 때를 나타내는 말을 들어보세요.'}),
];
export const sampleBook:LabBook={id:'n3-concept-lab',title:'해커스 JLPT N3 한권합격 · 개념 실험',sourceHash:'d3bd647c12f1d5843ee7693f022b9859dc804025d9e861761d9b22de46e4a003',totalPages:374,units:conceptUnits,extractions:[...extractions,...expansionExtractions,...sourceCorpus.extractions],concepts:[...concepts,...expansionConcepts,...sourceCorpus.concepts],cards:[...cards,...expansionCards,...sourceCorpus.cards],variants,bundles:[...expansionBundles,...sourceCorpus.bundles,
 {id:'bundle-read',unitId:'g-text',kind:'reading',origin:'ai',text:'木曜日に、市の日本語教室にインターネットで申し込みました。（　）、金曜日に市役所から返事が来ました。授業は図書館で行われるそうです。',questionIds:['lab_read_q1','lab_read_q2']},
 {id:'bundle-read-source',unitId:'r-short',kind:'reading',origin:'textbook',text:'招待状をもらったら、行くか行かないか、必ず返事を出さなければなりません。そのときに、お祝いの言葉を一言書くのもいいでしょう。',questionIds:['lab_comprehension']},
 {id:'bundle-listen-source',unitId:'l-task',kind:'listening',origin:'textbook',text:'',transcript:'最終決定：ホテルのすし屋へ行く。',questionIds:['lab_listen_original'],blockedReason:'교재 원본 MP3가 첨부되지 않았어요. 대본을 원음으로 대체하지 않았어요.'},
]};
