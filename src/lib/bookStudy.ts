import type { RoutineData } from './routineModel';
import { getDay,routineDay,withDay } from './routineModel';
import { toDateKey } from './dateUtils';
import {freeStudyStatus,FREE_STUDY_REWARD_MINUTES} from './freeStudy';
export const SUBJECTS=['전기공사기사 실기','수능','일본어','영어'] as const;
export type StudyRewardMode='standard'|'free'|'output';
export type BookSession={id:string;subject:string;startedAt:string;completedAt:string;seconds:number;note:string;next:string;savedAt?:string;rewardMode?:StudyRewardMode};
export type BookTimer={id:string;subject:string;startedAt:string;phase:'focus'|'break'|'idle';endsAt:number;remaining:number;running:boolean;duration?:number;rewardMode?:StudyRewardMode};
export function settleBookTimer(data:RoutineData,now=Date.now()):RoutineData{
 const timer=data.bookTimer;if(!timer||!timer.running||now<timer.endsAt)return data;
 if(timer.phase==='focus'){
  const sessions=data.bookSessions??[];
  const next={...data,bookSessions:sessions.some(s=>s.id===timer.id)?sessions:[...sessions,{id:timer.id,subject:timer.subject,startedAt:timer.startedAt,completedAt:new Date(timer.endsAt).toISOString(),seconds:timer.duration??1500,note:'',next:'',...(timer.rewardMode?{rewardMode:timer.rewardMode}:{})}]};
  const end=timer.endsAt+300000;return {...next,bookTimer:{...timer,phase:now<end?'break':'idle',endsAt:end,remaining:now<end?Math.ceil((end-now)/1000):0,running:now<end}};
 }
 return {...data,bookTimer:{...timer,phase:'idle',remaining:0,running:false}};
}
export function startBookTimer(data:RoutineData,id:string,subject:string,now=Date.now(),duration=1500,rewardMode:StudyRewardMode='output'):RoutineData{
 if(![900,1500,3000].includes(duration))throw new Error('집중 시간은 15·25·50분 중 선택해 주세요.');
 const next=settleBookTimer(data,now);
 if(next.bookTimer&&next.bookTimer.phase!=='idle')throw new Error('진행 중인 공부·휴식을 마치거나 종료해 주세요.');
 if(!subject.trim()||subject.trim().length>80)throw new Error('공부 주제를 1~80자로 입력해 주세요.');
 if((next.bookSessions??[]).some(s=>s.id===id))throw new Error('이미 기록된 공부예요. 새 타이머로 시작해 주세요.');
 if(!['standard','free','output'].includes(rewardMode))throw new Error('공부 보상 모드를 확인해 주세요.');
 if(rewardMode==='free'&&!freeStudyStatus(next,routineDay(new Date(now))).unlocked)throw new Error('오늘 기본 실천을 마친 뒤 자유 공부를 시작해 주세요.');
 return {...next,bookTimer:{id,subject:subject.trim(),startedAt:new Date(now).toISOString(),phase:'focus',endsAt:now+duration*1000,remaining:duration,running:true,duration,rewardMode}};
}
export function pauseBookTimer(data:RoutineData,now=Date.now()):RoutineData{
 const next=settleBookTimer(data,now),t=next.bookTimer;if(!t||!t.running)return next;
 return {...next,bookTimer:{...t,running:false,remaining:Math.max(0,Math.ceil((t.endsAt-now)/1000))}};
}
export function resumeBookTimer(data:RoutineData,now=Date.now()):RoutineData{
 const t=data.bookTimer;if(!t||t.running||t.phase==='idle')return data;
 return {...data,bookTimer:{...t,running:true,endsAt:now+t.remaining*1000}};
}
export function saveBookNote(data:RoutineData,id:string,note:string,nextLocation:string,now=new Date()):RoutineData{
 const session=data.bookSessions?.find(s=>s.id===id);if(!session)throw new Error('저장할 공부를 찾지 못했어요.');
 if(!note.trim())throw new Error('공부한 내용을 한 줄만 남겨 주세요.');
 if(note.length>5000||nextLocation.length>500)throw new Error('기록이 너무 길어요.');
 const sessions=data.bookSessions!.map(s=>s.id===id?{...s,note:note.trim(),next:nextLocation.trim(),savedAt:now.toISOString()}:s);
 const key=routineDay(new Date(session.completedAt));
 if(session.rewardMode==='output')return {...data,bookSessions:sessions};
 if(session.rewardMode==='free')return withDay({...data,bookSessions:sessions},key,d=>{
  const paid=new Set(d.rewardedFreeSessionIds??[]);if(session.seconds<1500||paid.has(session.id))return d;
  return {...d,bonus:{...d.bonus,freeStudy:(d.bonus?.freeStudy??0)+FREE_STUDY_REWARD_MINUTES},rewardedFreeSessionIds:[...paid,session.id]};
 });
 const eligible=sessions.filter(s=>s.rewardMode!=='free'&&s.rewardMode!=='output'&&s.savedAt&&s.note.trim()&&s.seconds>=1500&&routineDay(new Date(s.completedAt))===key);
 const minutes=Math.min(20,eligible.length*5);
 return withDay({...data,bookSessions:sessions},key,d=>({...d,bonus:{...d.bonus,book:Math.max(getDay(data,key).bonus?.book??0,minutes)}}));
}
export function bookNoteRewardPreview(data:RoutineData,session:BookSession):number{
 if(session.savedAt||session.seconds<1500||session.rewardMode==='output')return 0;
 const key=routineDay(new Date(session.completedAt)),day=getDay(data,key);
 if(session.rewardMode==='free')return day.rewardedFreeSessionIds?.includes(session.id)?0:FREE_STUDY_REWARD_MINUTES;
 const saved=(data.bookSessions??[]).filter(s=>s.rewardMode!=='free'&&s.rewardMode!=='output'&&s.savedAt&&s.note.trim()&&s.seconds>=1500&&routineDay(new Date(s.completedAt))===key).length;
 return Math.max(0,Math.min(20,(saved+1)*5)-(day.bonus?.book??0));
}
export function studyNotesOnDate(data:RoutineData,date:string){return (data.bookSessions??[]).filter(s=>s.savedAt&&toDateKey(new Date(s.completedAt))===date);}
