import {supabase} from './supabase';
import {validateHandwritingAnalysis} from './handwriting';
export async function recognizeHandwriting(base64:string,signal?:AbortSignal){
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)throw new Error('공부 사진을 읽으려면 계정에 로그인해 주세요.');
 const {data,error}=await supabase.functions.invoke('handwriting-study',{body:{image:base64},signal});
 if(error){let message=error.context?.status===404?'사진 인식 서버가 아직 연결되지 않았어요. 서버 배포 후 다시 시도해 주세요.':'사진을 읽지 못했어요. 연결을 확인하고 다시 시도해 주세요.';try{const body=await error.context?.json();if(typeof body?.message==='string')message=body.message;}catch{}throw new Error(message);}
 return {analysis:validateHandwritingAnalysis(data?.analysis),ownerId:user.id};
}
