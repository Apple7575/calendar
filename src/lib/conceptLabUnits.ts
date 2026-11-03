import type {UnitSpec,Ability,CardType} from './conceptLabTypes';
// Boundaries read from PDF TOC 4–5; 374 is the actual file end, not the TOC end.
const unit=(id:string,name:string,domain:UnitSpec['domain'],pages:[number,number],abilities:Ability[],types:CardType[],extract:string,rubric:string,preserve:string,change:string,status:UnitSpec['status']='pending'):UnitSpec=>({id,name,domain,pages,abilities,types,extract,rubric,preserve,change,tags:[`N3`,domain,id],status});
export const conceptUnits:UnitSpec[]=[
 unit('v-read','한자 읽기','vocabulary',[30,59],['reading'],['basic','audio'],'표기·독음·뜻을 별도 열, 한자별 다독음 구분','해당 어휘 독음만 가나로 평가; 뜻 평가는 별도','어휘·독음·품사·N3 난이도','문맥과 발화 목적','sample_reviewed'),
 unit('v-spell','표기','vocabulary',[60,85],['spelling'],['reverse','cloze'],'가나와 대응 한자·동음이의어','문맥상 맞는 표기; 동음어 무조건 허용하지 않음','어휘 의미와 표기','주변 문장'),
 unit('v-context','문맥 규정','vocabulary',[86,113],['context'],['cloze','apply'],'문장·문맥·선택지·근거','빈칸은 복수 정답 검토 후 허용 답안 고정','목표 의미·어휘 수준','행위자보다 사건·상황'),
 unit('v-synonym','유의 표현','vocabulary',[114,137],['meaning','usage'],['compare','reverse'],'동의 범위와 문체·제약','의미만 비슷한 경우 용법까지 같다고 채점하지 않음','동의 관계·사용 제약','대화 목적'),
 unit('v-usage','용법','vocabulary',[138,165],['usage'],['apply','cloze'],'공기 표현·조사·문체','선택형과 직접 응답을 구분','목표 용법','장소·판단 상황'),
 unit('g-concept','빈출 문법 개념','grammar',[166,225],['grammar','form'],['basic','transform','compare','apply'],'의미·접속표(긍정/부정/품사)·예문·후리가나 별도','추측/전달의 근거와 접속을 분리해 평가','목표 문법·품사·시제·난이도','근거 정보·발화 상황','sample_reviewed'),
 unit('g-form','문법 형식 판단','grammar',[226,241],['form'],['cloze','transform'],'질문과 빈칸 앞뒤 접속','목표 문법을 지정하여 동등 표현의 무제한 정답 처리 방지','접속 요구','새 문맥'),
 unit('g-order','문장 만들기','grammar',[242,257],['order'],['apply'],'문장 조각·별표 위치·완성문','문장 전체와 지정 위치를 구분; 복수 배열 검토','문법 의존 관계','사건·목적'),
 unit('g-text','글의 문법','grammar',[258,277],['cohesion'],['cloze','compare'],'글 전체·지시어·담화 연결과 질문 묶음','지문 내 연결로 정답이 결정되는가','접속 관계·논리','내용·전개','sample_reviewed'),
 ...([['r-short','내용 이해 · 단문',278,295],['r-medium','내용 이해 · 중문',296,313],['r-long','내용 이해 · 장문',314,325],['r-search','정보 검색',326,339]] as const).map(([id,name,start,end])=>unit(id,name,'reading',[start,end],['comprehension'],['basic','apply'],'지문·질문·선택지·근거 범위를 하나의 묶음으로','지문만으로 정답 도출; 모든 답 제출 후 해설','목표 독해 능력·길이·어휘 수준','주제·조건·정보 위치',id==='r-short'?'sample_reviewed':'pending')),
 ...([['l-task','과제 이해',340,347],['l-point','포인트 이해',348,355],['l-gist','개요 이해',356,361],['l-expression','발화 표현',362,369],['l-response','즉시 응답',370,374]] as const).map(([id,name,start,end])=>unit(id,name,'listening',[start,end],['listening'],['audio'],'음성·질문·대본·해설 분리; 원본 MP3의 존재와 사용 가능성 확인','음성만으로 결정; 묶음 완료 전 대본·해설 비공개','목표 듣기 능력·화자 수·속도·어휘 수준','최종 결정·방해 정보·상황',id==='l-task'?'blocked_audio':'pending')),
];
