import { LearningSummary,validateLearningSummary } from './learningSummary';
import { supabase } from './supabase';
export async function receiveLearningSummaries(userId:string):Promise<LearningSummary[]>{
 const {data:auth,error:authError}=await supabase.auth.getUser();if(authError||auth.user?.id!==userId)throw new Error('같은 계정으로 로그인해 주세요.');
 const storage=supabase.storage.from('diary-photos'),prefix=`${userId}/learning-inbox`;
 const latest=new Map<string,{name:string;revision:number}>();
 for(let offset=0;;offset+=100){const {data,error}=await storage.list(prefix,{limit:100,offset});if(error)throw new Error(error.message);for(const file of data??[]){const match=/^([a-zA-Z0-9_-]+)--(\d{8})\.json$/.exec(file.name);if(match&&Number(match[2])>(latest.get(match[1])?.revision??0))latest.set(match[1],{name:file.name,revision:Number(match[2])});}if((data?.length??0)<100)break;}
 const summaries:LearningSummary[]=[];
 for(const [id,file]of latest){const {data,error}=await storage.createSignedUrl(`${prefix}/${file.name}`,60);if(error||!data?.signedUrl)throw new Error('요약을 읽을 권한을 확인해 주세요.');const response=await fetch(data.signedUrl);if(!response.ok)throw new Error('요약을 내려받지 못했어요.');const text=await response.text();if(text.length>64000)throw new Error('요약이 너무 커요.');const summary=validateLearningSummary(JSON.parse(text));if(summary.eventId!==id||summary.revision!==file.revision)throw new Error('요약 파일과 버전이 일치하지 않아요.');summaries.push(summary);}
 return summaries;
}
