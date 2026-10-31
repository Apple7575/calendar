export type LearningSummary={schema:'routine.learning-summary.v1';eventId:string;revision:number;date:string;title:string;summary:string;topics:string[];questions:string[];nextAction:string;sourceUrl:string};
export function validateLearningSummary(input:unknown):LearningSummary{
 const v=input as LearningSummary;
 if(!v||v.schema!=='routine.learning-summary.v1'||!(/^[a-zA-Z0-9_-]{1,100}$/).test(v.eventId)||!Number.isInteger(v.revision)||v.revision<1||v.revision>99999999||!/^\d{4}-\d{2}-\d{2}$/.test(v.date))throw new Error('요약 ID·버전·날짜를 확인해 주세요.');
 const date=new Date(`${v.date}T00:00:00Z`);
 if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==v.date)throw new Error('실제로 존재하는 날짜를 입력해 주세요.');
 for(const [key,max]of [['title',200],['summary',12000],['nextAction',2000],['sourceUrl',2000]]as const)if(typeof v[key]!=='string'||v[key].length>max)throw new Error('요약 항목이 없거나 너무 길어요.');
 if(!v.summary.trim()||!v.title.trim())throw new Error('제목과 요약을 입력해 주세요.');
 if([v.topics,v.questions].some(a=>!Array.isArray(a)||a.length>30||a.some(item=>typeof item!=='string'||item.length>1000)))throw new Error('주제와 질문 목록을 확인해 주세요.');
 if(v.sourceUrl){try{const url=new URL(v.sourceUrl);if(url.protocol!=='https:'||url.username||url.password)throw new Error();}catch{throw new Error('원문 링크는 올바른 HTTPS 주소여야 해요.');}}
 return {schema:v.schema,eventId:v.eventId,revision:v.revision,date:v.date,title:v.title.trim(),summary:v.summary.trim(),topics:v.topics,questions:v.questions,nextAction:v.nextAction.trim(),sourceUrl:v.sourceUrl};
}
export function mergeLearningSummaries(current:LearningSummary[],incoming:LearningSummary[]):LearningSummary[]{
 const map=new Map(current.map(s=>[s.eventId,s]));for(const raw of incoming){const s=validateLearningSummary(raw),old=map.get(s.eventId);if(!old||s.revision>old.revision)map.set(s.eventId,s);else if(s.revision===old.revision&&JSON.stringify(s)!==JSON.stringify(old))throw new Error('같은 요약 버전의 내용이 달라요. 버전을 올려 다시 보내 주세요.');}
 return [...map.values()].sort((a,b)=>b.date.localeCompare(a.date)||a.eventId.localeCompare(b.eventId));
}
