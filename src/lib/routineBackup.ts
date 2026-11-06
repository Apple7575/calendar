import { supabase } from './supabase';
import { RoutineData } from './routineModel';
import { validateLearningSummary } from './learningSummary';
import { validateStudyState } from './studyHistory';
import { repairSavedData } from './commitments';

export type RoutineBackup={schema:'routine.backup.v1';userId:string;createdAt:string;data:RoutineData};
const LIMIT=20*1024*1024;
export const isCloudAccount=(id?:string)=>!!id&&/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id);
export function validateBackup(input:unknown,userId:string):RoutineBackup{
 const b=input as RoutineBackup;
 if(!b||b.schema!=='routine.backup.v1'||b.userId!==userId||!Number.isFinite(Date.parse(b.createdAt)))throw new Error('같은 계정에서 만든 백업 파일인지 확인해 주세요.');
 // Known build-50 money entries are repaired first, so restoring a backup made then does not fail (see repairSavedData).
 const d=b.data=b.data?repairSavedData(b.data):b.data;
 if(!d||d.version!==1||!Array.isArray(d.words)||!Array.isArray(d.decks)||!d.days||typeof d.days!=='object'||!Number.isInteger(d.newLimit)||d.newLimit<0||d.newLimit>100)throw new Error('백업 데이터 형식이 올바르지 않아요.');
 if(d.words.length>100000||d.decks.length>1000||Object.keys(d.days).length>50000)throw new Error('백업 파일이 너무 커요.');
 if(new Set(d.words.map(w=>w.id)).size!==d.words.length||d.words.some(w=>!w||typeof w.id!=='string'||typeof w.front!=='string'||typeof w.back!=='string'||!w.card||!Number.isFinite(Date.parse(w.card.due))||!Number.isFinite(w.card.reps)))throw new Error('카드 데이터를 확인하지 못했어요. 원래 기록은 보존했어요.');
 for(const [key,day]of Object.entries(d.days))if(!/^\d{4}-\d{2}-\d{2}$/.test(key)||!day||!day.paid||!Array.isArray(day.complete)||!Array.isArray(day.morning)||!Number.isFinite(day.responses)||Object.values(day.paid).some(n=>!Number.isFinite(n)||n<0))throw new Error('하루 기록을 확인하지 못했어요.');
 if(d.bookSessions&&(!Array.isArray(d.bookSessions)||d.bookSessions.some(s=>!s||typeof s.id!=='string'||typeof s.note!=='string'||typeof s.subject!=='string'||typeof s.next!=='string'||!Number.isFinite(Date.parse(s.completedAt))||!Number.isFinite(s.seconds)||s.seconds<0||s.seconds>86400)))throw new Error('공부 기록 형식을 확인해 주세요.');
 if(d.bookTimer&&(!['focus','break','idle'].includes(d.bookTimer.phase)||!Number.isFinite(d.bookTimer.endsAt)||!Number.isFinite(d.bookTimer.remaining)||d.bookTimer.remaining<0))throw new Error('타이머 기록을 확인해 주세요.');
 if(d.bookTimer?.duration!==undefined&&![120,180,300,600,900,1500,3000].includes(d.bookTimer.duration))throw new Error('집중 시간 설정을 확인해 주세요.');
 if(d.bookTimer?.breakSeconds!==undefined&&![60,120,180,300].includes(d.bookTimer.breakSeconds))throw new Error('쉬는 시간 기록을 확인해 주세요.');
 if(d.bookTimer&&([d.bookTimer.focusElapsed,d.bookTimer.targetSeconds].some(n=>n!==undefined&&(!Number.isSafeInteger(n)||n<0||n>86400))||d.bookTimer.focusResumedAt!==undefined&&!Number.isFinite(d.bookTimer.focusResumedAt)))throw new Error('실제 집중 시간 기록을 확인해 주세요.');
 for(const day of Object.values(d.days))if(day.guidedLevels&&Object.entries(day.guidedLevels).some(([slot,level])=>!['morning','evening'].includes(slot)||!['full','min'].includes(level)))throw new Error('루틴 목표 설정을 확인해 주세요.');
 if(d.learningSummaries){if(!Array.isArray(d.learningSummaries))throw new Error('요약 형식을 확인해 주세요.');d.learningSummaries.forEach(validateLearningSummary);}
 validateStudyState(d);
 return b;
}
export function makeBackup(data:RoutineData,userId:string):RoutineBackup{
 return validateBackup({schema:'routine.backup.v1',userId,createdAt:new Date().toISOString(),data},userId);
}
async function requireOwner(userId:string){
 const {data,error}=await supabase.auth.getUser();
 if(error||!data.user||data.user.id!==userId)throw new Error('백업할 계정에 다시 로그인해 주세요.');
}
const bucket=()=>supabase.storage.from('diary-photos');
export async function uploadRoutineBackup(data:RoutineData,userId:string):Promise<string>{
 await requireOwner(userId);
 const backup=makeBackup(data,userId),body=JSON.stringify(backup);
 if(new TextEncoder().encode(body).length>LIMIT)throw new Error('20MB 이하의 백업만 지원해요.');
 // Immutable snapshots: never overwrite an earlier recovery point.
 const name=`${Date.now()}-${Math.random().toString(36).slice(2,10)}.json`;
 const {error}=await bucket().upload(`${userId}/routine-backups/${name}`,body,{contentType:'application/json',upsert:false});
 if(error)throw new Error(`백업을 저장하지 못했어요: ${error.message}`);
 return backup.createdAt;
}
export async function latestRoutineBackup(userId:string):Promise<RoutineBackup|null>{
 await requireOwner(userId);
 const {data,error}=await bucket().list(`${userId}/routine-backups`,{limit:1,sortBy:{column:'name',order:'desc'}});
 if(error)throw new Error(`백업 목록을 받지 못했어요: ${error.message}`);
 const file=data?.find(f=>/^\d+-[a-z0-9]+\.json$/.test(f.name));if(!file)return null;
 const {data:signed,error:signError}=await bucket().createSignedUrl(`${userId}/routine-backups/${file.name}`,60);
 if(signError||!signed?.signedUrl)throw new Error('백업을 읽을 권한이 없어요.');
 const response=await fetch(signed.signedUrl);if(!response.ok)throw new Error('백업을 내려받지 못했어요.');
 const body=await response.text();if(body.length>LIMIT)throw new Error('백업 파일이 너무 커요.');
 return validateBackup(JSON.parse(body),userId);
}
