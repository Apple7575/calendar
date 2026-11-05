/**
 * Topics of the speaking tab. To add or rename one, change a row here and nothing else.
 * - questions: asked word for word, and the AI never rewrites them.
 * - aiBrief, with no questions: the AI writes the question from this brief.
 * - askTopic: the user types what to talk about, and the AI writes the question from that.
 * - language: what is spoken and recognised. charWeight counts its characters more (see below).
 * - coach: 'reflect' is for questions with no right answer. missedLabel names the gap in the AI's reply. notice is a small line.
 */
export type SpeakingLanguage='ko-KR'|'ja-JP';
export type SpeakingTopic={id:string;title:string;description:string;questions?:readonly string[];aiBrief?:string;askTopic?:boolean;language?:SpeakingLanguage;charWeight?:number;coach?:'reflect';missedLabel?:string;notice?:string};
export const SPEAKING_TOPICS:readonly SpeakingTopic[]=[
 {id:'executive-interview',title:'임원 면접',description:'임원 면접에서 받는 질문에 말로 답해 봐요',questions:[
  'AI가 개발 업무를 대체하는 상황에서 개발자의 역할은 무엇이라고 보십니까',
  '조직 내에서 다른 팀이나 부서가 협력하는 과정에서 발생한 어려움을 해결한 경험이 있나요?',
  '지원 직무에 필요한 역량 중 어떤 부분에서 특히 강점을 발휘할 수 있을지 설명해 주세요.',
  '업무 방식이 다른 상사/팀원과의 의견 차이를 좁히기 위해 노력했던 경험이 있나요?',
  '당신의 강점을 지원 직무에서 어떻게 활용할 수 있을지 설명해 주세요.',
 ]},
 {id:'tech-interview',title:'기술 면접',description:'개발 직군 기술 면접 질문에 설명해 봐요',aiBrief:'Technical interview question for a software developer: fundamentals, design decisions or trade-offs, asked so it can be explained out loud.'},
 /** Spoken Japanese packs more into each character and a learner goes slowly, so a character counts double toward the same steps. */
 {id:'japanese',title:'일본어 말하기',description:'일본어로 묻고 일본어로 답해요',language:'ja-JP',charWeight:2,aiBrief:'A short, everyday spoken question written in Japanese for a Korean learner at about JLPT N3 level, answerable in a few sentences.'},
 {id:'electrical-engineer',title:'전기공사기사',description:'실기 공부한 내용을 말로 설명해요',aiBrief:'A question asking to explain a concept for the Korean electrical construction engineer (전기공사기사) practical exam, such as wiring methods, calculations, or inspection standards.',notice:'AI가 만든 질문이라 내용이 틀릴 수 있어요.'},
 {id:'life',title:'삶과 생각',description:'사랑, 행복, 성숙함 같은 주제를 말로 풀어 봐요',coach:'reflect',missedLabel:'더 생각해 볼 관점',aiBrief:'An open reflective question about life, such as love, happiness or maturity. It has no right answer and is not about personal problems.'},
 {id:'other',title:'기타',description:'말하고 싶은 주제를 직접 적어요',askTopic:true},
];
export const speakingTopic=(id:string)=>SPEAKING_TOPICS.find(t=>t.id===id);
/** How strongly a topic's characters count. Broken or missing means 1. */
export const speakingCharWeight=(id:string)=>speakingTopic(id)?.charWeight??1;
