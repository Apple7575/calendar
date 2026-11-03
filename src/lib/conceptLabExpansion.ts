import type {Concept,Extraction,LabCard,ProblemBundle} from './conceptLabTypes';

// Each row was compared with the indicated PDF table. Practice sentences are new,
// not quotations of the textbook. One objective per flashcard; no answer typing.
const grammar=[
 ['shika',166,'〜しか〜ない','~밖에 없다','百円（　）持っていません。','しか','한정 + 부정 · しか 뒤에는 부정'],
 ['nagara',168,'〜ながら','~하면서','音楽を聞き（　）、料理をします。','ながら','동사 ます형 어간 + ながら · 동시 행동'],
 ['noni',168,'〜のに','~인데도','薬を飲んだ（　）、まだ頭が痛いです。','のに','예상과 다른 결과'],
 ['bakari',168,'〜ばかり','~만','弟は休みの日、ゲーム（　）しています。','ばかり','한쪽으로 치우친 반복'],
 ['hodo',168,'〜ほど','~할 정도로','今日は歩けない（　）疲れました。','ほど','피로의 정도'],
 ['kanarazu',174,'必ず','반드시','約束の時間には（　）来てください。','必ず','빠짐없이 지킬 일 · 반드시'],
 ['kesshite',174,'決して〜ない','결코 ~하지 않다','このことは（　）忘れません。','決して','강한 부정 · 뒤에 ない'],
 ['sorede',176,'それで','그래서 · 그 결과','電車が止まりました。（　）、会議に遅れました。','それで','앞 사건이 뒤 결과의 이유'],
 ['soredemo',178,'それでも','그런데도','雨が強くなりました。（　）、試合は続きました。','それでも','앞 조건에도 결과가 바뀌지 않음'],
 ['soredewa',178,'それでは','그러면','みなさん、準備はいいですか。（　）、始めます。','それでは','앞 상황을 받아 다음 행동으로'],
 ['passive',184,'수동형 · 書く','쓰이다','この本は百年前に（　）。書く → 수동·과거·정중체','書かれました','1그룹 · あ단 + れる'],
 ['potential',186,'가능형 · 読む','읽을 수 있다','この漢字は一人で（　）。読む → 가능·정중체','読めます','1그룹 · え단 + る'],
 ['honorific',188,'お〜になる','상대의 행동을 높이는 표현','先生はもう（　）。帰る → お〜になる·과거·정중체','お帰りになりました','お + ます형 어간 + になる'],
 ['toshite',190,'〜として','~로서','私は通訳（　）、会議に参加しました。','として','역할·자격'],
 ['nitsuite',192,'〜について','~에 관해서','日本の文化（　）調べています。','について','이야기·조사의 주제'],
 ['nitotte',192,'〜にとって','~에게는 · ~의 입장에서는','私（　）、家族が一番大切です。','にとって','평가하는 사람의 입장'],
 ['niyotte',192,'〜によって','~에 따라','国（　）、食事の習慣が違います。','によって','기준에 따른 차이 · 이 문장에서는 국가별 차이'],
 ['niyoreba',192,'〜によれば','~에 따르면','天気予報（　）、明日は雪だそうです。','によれば','정보의 출처'],
 ['yasui',196,'〜やすい','~하기 쉽다','このペンは（　）です。書く → 쉽다','書きやすい','ます형 어간 + やすい'],
 ['teoku',196,'〜ておく','미리 ~해 두다','旅行の前に、ホテルを予約し（　）。ておく → 정중체','ておきます','나중을 위한 준비'],
 ['tekara',196,'〜てから','~하고 나서','手を洗っ（　）、ご飯を食べます。','てから','앞 행동이 끝난 뒤 다음 행동'],
 ['takoto',198,'〜たことがある','~한 적이 있다','京都に一度行っ（　）。경험·정중체','たことがあります','た형 + ことがある · 과거 경험'],
 ['tatokoro',198,'〜たところだ','막 ~한 참이다','今、昼ご飯を食べ（　）。막 끝남·정중체','たところです','た형 + ところだ · 바로 직전 완료'],
 ['tabakari',198,'〜たばかりだ','~한 지 얼마 안 됐다','先月、この町に引っ越し（　）。얼마 안 됨·정중체','たばかりです','た형 + ばかりだ · 화자가 느끼는 짧은 경과'],
 ['zuni',198,'〜ずに','~하지 않고','今朝は朝ご飯を食べ（　）、出かけました。','ずに','ない형의 ない 대신 ずに · する → せずに'],
 ['kotoninaru',200,'〜ことになる','~하기로 정해지다','会社の決定で、来月転勤する（　）。정중·과거','ことになりました','외부 결정 · 스스로 정하면 ことにする'],
 ['kotowanai',200,'〜ことはない','~할 필요는 없다','時間は十分あります。急ぐ（　）よ。보통체','ことはない','사전형 + ことはない · 불필요'],
 ['tsumori',200,'〜つもりだ','~할 생각이다','来年、日本に留学する（　）。계획·정중체','つもりです','사전형 / ない형 + つもりだ'],
 ['kotode',202,'〜ことで','~함으로써','毎日声に出して読む（　）、発音がよくなりました。','ことで','행동이 수단·계기가 됨'],
 ['temo',204,'〜てもおかしくない','~해도 이상하지 않다','空が真っ黒です。今、雨が降っ（　）。보통체','てもおかしくない','상황상 충분히 가능한 일'],
 ['wakedehanai',204,'〜わけではない','반드시 ~인 것은 아니다','日本に住んでいても、全員が漢字を読める（　）。보통체','わけではない','전체를 단정하는 해석을 부정'],
 ['nara',208,'〜なら','~라면','京都へ行く（　）、この地図を持っていって。','なら','상대가 제시한 조건을 받아 조언'],
 ['to',208,'〜と','~하면 · 일정한 결과','このボタンを押す（　）、ドアが開きます。','と','조건 뒤에 자동적·반복적 결과'],
 ['toittemo',210,'〜といっても','~라고 해도','旅行と（　）、近くの町に一日行くだけです。','いっても','앞말에서 생길 과한 기대를 제한'],
 ['ueni',212,'〜うえに','~한 데다가','この店は安い（　）、量も多いです。','うえに','같은 방향의 장점을 추가'],
 ['kawarini',212,'〜かわりに','~대신에','今日は私が料理をする（　）、皿を洗ってください。','かわりに','역할을 교환하는 조건'],
 ['tameni',214,'〜ために','~하기 위해서','試験に合格する（　）、毎日勉強しています。','ために','의지가 있는 목표를 위한 행동'],
 ['toori',214,'〜とおりに','~대로','先生が言った（　）、練習しました。','とおりに','지시·설명과 같게'],
 ['nishitewa',216,'〜にしては','~치고는','初めて作った（　）、上手ですね。','にしては','기준에서 예상한 정도와 다름'],
 ['okagede',218,'〜おかげで','~덕분에','友だちが手伝ってくれた（　）、早く終わりました。','おかげで','좋은 결과의 원인 · 감사'],
 ['kamoshirenai',218,'〜かもしれない','~일지도 모른다','鍵は家にある（　）。불확실한 추측·보통체','かもしれない','가능성은 있지만 확정하지 않음'],
 ['darou',220,'〜だろう','~일 것이다','この雨は夜にはやむ（　）。추측·보통체','だろう','화자의 추측'],
 ['chigainai',220,'〜に違いない','~임에 틀림없다','毎日練習したから、彼は合格する（　）。강한 확신','に違いない','근거에 따른 강한 확신'],
 ['hazuganai',222,'〜はずがない','~할 리가 없다','今日は休館日だから、図書館が開いている（　）。보통체','はずがない','근거상 가능성을 강하게 부정'],
 ['nakereba',222,'〜なければならない','~해야 한다','明日は早いので、もう寝（　）。보통체','なければならない','ない형의 ない → なければならない · 의무'],
 ['ba',224,'〜ば','~하면','時間が（　）、一緒に行きましょう。ある → ば형','あれば','1그룹 · え단 + ば'],
 ['bayokatta',224,'〜ばよかった','~했더라면 좋았을 텐데','電車に遅れました。もっと早く起きれ（　）。','ばよかった','起きる → 起きれば · 하지 않은 일의 후회']
] as const;

const quality={natural:true,unambiguous:true,level:true,grounded:true,reviewer:'source visually compared; independent gpt-5.4-mini linguistic review 20261103, 113 items; not human reviewed'};
export const expansionExtractions:Extraction[]=grammar.map(([id,page,label,meaning])=>({id:`ex-g-${id}`,unitId:'g-concept',kind:'grammar',representation:'structured_excerpt',text:`${label}: ${meaning}`,source:{pdfPage:page,printedPage:page,region:`빈출 문법 표 · ${label}`,status:'model_visual_reviewed'}}));
export const expansionConcepts:Concept[]=grammar.map(([id,,label])=>({id:`concept-g-${id}`,label,domain:'grammar',unitId:'g-concept',evidenceIds:[`ex-g-${id}`],tags:['N3','grammar',id]}));
export const expansionCards:LabCard[]=grammar.flatMap(([id,,label,meaning,prompt,answer,explanation])=>{
 const common={unitId:'g-concept',conceptId:`concept-g-${id}`,rubric:'핵심 뜻·목표 표현이 맞으면 인정. 같은 의미의 자연스러운 표현은 자기 평가로 인정.',explanation,hint:'표현의 뜻과 문장 앞뒤를 떠올려 보세요.',origin:'ai' as const,novel:false,status:'ready' as const,evidenceIds:[`ex-g-${id}`],difficulty:'N3' as const,assessment:'self' as const,quality};
 return [{...common,id:`lab_g_${id}_meaning`,type:'basic' as const,ability:'grammar' as const,prompt:`${label}\n핵심 뜻`,answer:meaning,accepted:[meaning]},
 {...common,id:`lab_g_${id}_apply`,type:'cloze' as const,ability:'form' as const,prompt,answer,accepted:[answer],rubric:`${label}를 써서 완성. ${answer} 또는 문장의 지정 문체·시제에 맞는 동등 표현. 다른 문법은 이번 목표의 정답으로 단정하지 않음.`}];
});

// New passages exercise the textbook's strategies. They are not textbook quotations.
const readings=[
 {id:'notice',unit:'r-short',page:278,text:'図書館からのお知らせ\n来週の月曜日は館内の点検のため、休館します。本の返却期限がその日の方は、火曜日に返してください。入り口の返却ボックスは、点検中も利用できます。',questions:[['월요일에 도서관이 쉬는 이유','관내 점검','館内の点検のため · 날짜와 이유를 분리'],['반납 기한이 월요일이면 언제 반납하나요?','화요일','火曜日に返してください · 예외 안내']]},
 {id:'email',unit:'r-short',page:278,text:'田中さんへ\n明日の打ち合わせは、午後二時から三時に変更になりました。場所は予定どおり二階の会議室です。資料は私が印刷しますので、パソコンだけ持ってきてください。\n山田',questions:[['변경된 회의 시작 시간','오후 3시','二時から三時に変更 · 바뀐 뒤 시간'],['가져가야 할 것','컴퓨터','パソコンだけ · 자료는 발신자가 인쇄']]},
 {id:'pen',unit:'r-short',page:286,text:'以前は、書けなくなったボールペンをそのまま捨てていた。最近、近くの店で替え芯を見つけた。芯だけを交換すれば、使い慣れたペンを長く使える。新しいペンを買うより安く、ごみも減らせるので、これからも替え芯を使いたい。',questions:[['필자가 앞으로도 교체용 심을 쓰려는 이유','비용과 쓰레기를 줄이면서 익숙한 펜을 계속 쓸 수 있어서','가격·환경·재사용 · 지문 안의 이유만'],['글에서 달라진 행동','펜을 버리는 대신 심을 교체함','以前は ↔ 最近 · 전후 비교']]},
 {id:'umbrella',unit:'r-medium',page:296,text:'駅の出口には、無料で借りられる傘が置いてある。雨の日、傘を持たない人は自由に使い、次に駅を利用するときに返せばよい。しかし、最近は返す人が少なくなった。そこで駅は、返却場所を出口だけでなく、すべての改札の近くにも増やした。利用者に返却を思い出してもらい、返しやすくするためだ。傘を借りた人が少し気をつければ、この便利な仕組みを長く続けられる。',questions:[['반납 장소를 늘린 목적','반납을 떠올리고 쉽게 돌려주게 하려고','返却を思い出す + 返しやすくする'],['이 제도를 유지하려면 이용자가 해야 할 일','빌린 우산을 반납한다','빌릴 수 있는 조건과 유지 조건 구분']]},
 {id:'handle',unit:'r-medium',page:308,text:'新しい折り畳み傘を買った。小さくて軽いが、持ち手が細く、長く持つと手が痛くなる。友人に相談したところ、持ち手に柔らかい布を巻くとよいと教えてくれた。試してみると、以前より持ちやすい。軽さだけを見て道具を選んでいたが、これからは実際に手に持って、使い心地も確かめたい。',questions:[['글에서 새로 중요하게 생각하게 된 선택 기준','실제로 쥐었을 때의 사용감','軽さだけ ↔ 使い心地も'],['친구의 조언으로 바뀐 점','손잡이가 잡기 편해짐','布を巻く → 持ちやすい · 글 안의 결과']]},
 {id:'class',unit:'r-long',page:314,text:'町の料理教室では、参加者の数は多いのに、二回目も来る人が少なかった。担当者は、難しい料理が原因だと思い、簡単なメニューに変えた。しかし、状況はあまり変わらなかった。そこで参加者に話を聞くと、料理よりも、初対面の人と同じグループで作業することが不安だという声が多かった。担当者は、最初に短い自己紹介の時間を設け、役割もはっきり決めることにした。その後、続けて参加する人が増えた。担当者は、問題を解決するには、自分の想像だけで決めず、利用する人の声を聞くことが大切だと感じた。',questions:[['메뉴를 쉽게 바꿔도 해결되지 않은 이유','주된 불안이 요리 난도가 아니라 낯선 사람과의 공동 작업이어서','가설과 조사 결과를 구분'],['필자가 강조하는 문제 해결 방식','이용자의 목소리를 듣고 원인을 확인하기','마지막 문장의 주장']]},
 {id:'hiking',unit:'r-search',page:330,text:'秋のハイキング\n開催日：10月18日（日）\n参加費：一般 5,000円／小中学生 3,000円\n申し込み：インターネットは10日前まで。ABC旅行センターの窓口は前日まで。\n※18歳未満の方は保護者と一緒に参加してください。',questions:[['10월 13일에 신청하려면 어떤 방법을 쓰나요?','ABC 여행센터 창구','인터넷 마감은 10월 8일 · 창구는 전날까지'],['중학생 1명과 보호자 1명의 참가비 합계','8,000엔','3,000 + 5,000 · 조건별 요금']]}
];
export const expansionBundles:ProblemBundle[]=readings.map(r=>({id:`bundle-exp-${r.id}`,unitId:r.unit,kind:'reading',origin:'ai',text:r.text,questionIds:r.questions.map((_,i)=>`lab_r_${r.id}_${i+1}`)}));
for(const r of readings){
 expansionExtractions.push({id:`ex-r-${r.id}`,unitId:r.unit,kind:'passage',representation:'model_summary',text:'해당 단원의 근거 확인·지시어·핵심 주장·정보 검색 전략. 아래 지문은 새로 작성한 적용 자료.',source:{pdfPage:r.page,printedPage:r.page,region:'단원 학습 전략 또는 제시 지문 구조',status:'model_visual_reviewed'}});
 r.questions.forEach(([prompt,answer,explanation],i)=>expansionCards.push({id:`lab_r_${r.id}_${i+1}`,unitId:r.unit,bundleId:`bundle-exp-${r.id}`,ability:'comprehension',type:'basic',prompt,answer,accepted:[],rubric:'지문에 있는 근거로 핵심 의미가 맞으면 인정. 한국어·자연스러운 다른 표현 허용.',explanation:r.unit==='r-long'?`${explanation} · 보류: 장문 목표 분량에 미달, 확장 후 재검수 필요`:explanation,hint:'질문이 묻는 조건과 지문의 근거를 연결해 보세요.',origin:'ai',novel:false,status:r.unit==='r-long'?'needs_review':'ready',evidenceIds:[`ex-r-${r.id}`],difficulty:'N3',assessment:'self',quality:{...quality,level:r.unit!=='r-long'}}));
}

const listening=[
 {id:'trip',asset:'lab_listening_trip',unit:'l-point',page:350,text:'来週の大阪旅行のことなんですが、急に出張が入って、行けなくなりました。予約したホテルはまだキャンセルしていません。明日、ホテルに電話して、日程を変えられるか確認します。変更の手数料は私が払います。ごめんなさい。',questions:[['여행에 갈 수 없게 된 이유','갑자기 출장이 생겨서','急に出張が入って · 호텔 취소는 아직'],['내일 할 일','호텔에 전화해 일정 변경 가능 여부 확인','明日 → ホテルに電話 · 시간과 행동']]},
 {id:'library',asset:'lab_listening_library',unit:'l-gist',page:356,text:'図書館からのお知らせです。今週の土曜日は、本棚の入れ替え作業のため、図書館を休館します。本の返却は、入り口の返却ボックスをご利用ください。日曜日は、いつもどおり午前九時から開館します。',questions:[['방송의 주된 내용','토요일 도서관 휴관 안내','토요일 휴관이 핵심 · 일요일은 정상 개관'],['휴관일의 책 반납 방법','입구의 반납함 이용','入り口の返却ボックス']]},
 {id:'offer',asset:'lab_listening_offer',unit:'l-response',page:370,text:'この荷物、少し重いですね。よかったら、一緒に運びましょうか。',questions:[['도움을 받아들이는 말','お願いします。助かります。','함께 옮겨 주겠다는 제안 수락 · ありがとうございます도 자연스러움']]}
];
for(const r of listening){
 expansionExtractions.push({id:`ex-l-${r.id}`,unitId:r.unit,kind:'dialogue',representation:'model_summary',text:'교재의 듣기 목표만 참고한 새 AI 연습 대본. 원문 대본 복원이나 교재 원음이 아님.',source:{pdfPage:r.page,printedPage:r.page,region:'청해 유형·학습 전략',status:'model_visual_reviewed'}});
 expansionBundles.push({id:`bundle-listen-${r.id}`,unitId:r.unit,kind:'listening',origin:'ai',text:'',transcript:r.text,audioAssetId:r.asset,questionIds:r.questions.map((_,i)=>`lab_l_${r.id}_${i+1}`)});
 r.questions.forEach(([prompt,answer,explanation],i)=>expansionCards.push({id:`lab_l_${r.id}_${i+1}`,unitId:r.unit,bundleId:`bundle-listen-${r.id}`,ability:'listening',type:'audio',audioAssetId:r.asset,prompt,answer,accepted:[],rubric:'음성 내용과 질문 의도에 맞는 의미를 자기 평가. 예상 답안과 같은 문장일 필요 없음.',explanation,hint:'아직 대본을 보지 않고 핵심 정보와 질문의 목적을 들어보세요.',origin:'ai',novel:false,status:'ready',evidenceIds:[`ex-l-${r.id}`],difficulty:'N3',assessment:'self',quality}));
}
