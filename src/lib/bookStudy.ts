import type { RoutineData } from './routineModel';
import { getDay,routineDay,withDay } from './routineModel';
import { toDateKey } from './dateUtils';
import {freeStudyStatus,FREE_STUDY_REWARD_MINUTES} from './freeStudy';
import {bookFocusSeconds,bookRemaining} from './bookTimerTime';
import {canStartBreak,claimFocusPlan,focusCarryInto,focusRampStatus,focusRestedInto,focusRunCredit} from './focusRamp';
import {acceptHandwriting,startOutputStudy} from './handwriting';
import type {HandwritingAnalysis} from './handwriting';
import {recordQuitPenalty} from './focusPenalty';
import {payBreakStage} from './focusBreakReward';
export const SUBJECTS=['전기공사기사 실기','수능','일본어','영어'] as const;
export type StudyRewardMode='standard'|'free'|'output';
export type BookSession={id:string;subject:string;startedAt:string;completedAt:string;seconds:number;note:string;next:string;savedAt?:string;rewardMode?:StudyRewardMode};
export type BookTimer={id:string;subject:string;startedAt:string;phase:'focus'|'break'|'idle';endsAt:number;remaining:number;running:boolean;duration?:number;rewardMode?:StudyRewardMode;focusElapsed?:number;focusResumedAt?:number;targetSeconds?:number;restEndedAt?:number;carrySeconds?:number;creditMark?:number;awaitingChoice?:boolean;restedCredit?:number};
export function settleBookTimer(data:RoutineData,now=Date.now()):RoutineData{
 const timer=data.bookTimer;if(!timer||!timer.running||now<timer.endsAt)return data;
 // Reaching the target is a cue, not consent to stop studying or start a break.
 if(timer.phase==='focus')return data;
 return {...data,bookTimer:{...timer,phase:'idle',remaining:0,running:false,restEndedAt:timer.endsAt}};
}
export function startBookTimer(data:RoutineData,id:string,subject:string,now=Date.now(),duration=1500,rewardMode:StudyRewardMode='output'):RoutineData{
 if(![120,300,600,900,1500,3000].includes(duration))throw new Error('집중 시간을 확인해 주세요.');
 if(rewardMode==='output'&&data.focusRamp&&focusRampStatus(data,now).needsPlan)throw new Error('공부를 2시간 쉬었어요. 계획 한 줄부터 다시 시작해 주세요.');
 const next=settleBookTimer(data,now);
 if(next.bookTimer&&next.bookTimer.phase!=='idle')throw new Error('진행 중인 공부·휴식을 마치거나 종료해 주세요.');
 if(!subject.trim()||subject.trim().length>80)throw new Error('공부 주제를 1~80자로 입력해 주세요.');
 if((next.bookSessions??[]).some(s=>s.id===id))throw new Error('이미 기록된 공부예요. 새 타이머로 시작해 주세요.');
 if(!['standard','free','output'].includes(rewardMode))throw new Error('공부 보상 모드를 확인해 주세요.');
 if(rewardMode==='free'&&!freeStudyStatus(next,routineDay(new Date(now))).unlocked)throw new Error('오늘 기본 실천을 마친 뒤 자유 공부를 시작해 주세요.');
 const carry=rewardMode==='output'&&next.focusRamp&&focusRampStatus(next,now).required===duration?focusCarryInto(next,subject.trim(),duration,now):0,left=Math.max(0,duration-carry),rested=focusRestedInto(next,carry);
 return {...next,bookTimer:{id,subject:subject.trim(),startedAt:new Date(now).toISOString(),phase:'focus',endsAt:now+left*1000,remaining:left,running:true,duration,rewardMode,focusElapsed:0,focusResumedAt:now,targetSeconds:left,...(carry>0?{carrySeconds:carry}:{}),...(rested>0?{restedCredit:rested}:{})}};
}
export function pauseBookTimer(data:RoutineData,now=Date.now()):RoutineData{
 const next=settleBookTimer(data,now),t=next.bookTimer;if(!t||!t.running)return next;
 return {...next,bookTimer:{...t,running:false,remaining:bookRemaining(t,now),...(t.phase==='focus'?{focusElapsed:bookFocusSeconds(t,now),focusResumedAt:now}:{})}};
}
export function resumeBookTimer(data:RoutineData,now=Date.now()):RoutineData{
 const t=data.bookTimer;if(!t||t.running||t.phase==='idle')return data;
 if(t.phase==='focus'&&t.rewardMode==='output'&&data.focusRamp&&focusRampStatus(data,now).needsPlan)throw new Error('공부를 2시간 쉬었어요. 계획 한 줄부터 다시 시작해 주세요.');
 return {...data,bookTimer:{...t,running:true,endsAt:now+t.remaining*1000,...(t.phase==='focus'?{focusElapsed:bookFocusSeconds(t,now),focusResumedAt:now}:{})}};
}
export function saveFocusPlan(data:RoutineData,id:string,subject:string,text:string,now=Date.now()):RoutineData{
 if(data.focusPlans?.some(p=>p.id===id))return data;
 return claimFocusPlan(stopBookTimer(data,now),id,subject,text,now);
}
/** Preserve only elapsed focus time, including a deliberately stopped partial session. */
export function stopBookTimer(data:RoutineData,now=Date.now()):RoutineData{
 const next=settleBookTimer(data,now),t=next.bookTimer;if(!t)return next;
 const {restEndedAt:_ended,awaitingChoice:_waiting,...rest}=t,seconds=bookFocusSeconds(t,now);
 const rows=next.bookSessions??[];
 const completedAt=t.running?now:t.focusResumedAt??now;
 return {...next,bookSessions:seconds>0&&!rows.some(s=>s.id===t.id)?[...rows,{id:t.id,subject:t.subject,startedAt:t.startedAt,completedAt:new Date(completedAt).toISOString(),seconds,note:'',next:'',rewardMode:t.rewardMode}]:rows,bookTimer:{...rest,phase:'idle',remaining:0,running:false}};
}
/** The user ending a run: charged if the stage is unmet (user decision 2026-11-04). Timer bookkeeping keeps using stopBookTimer. */
export function finishFocusRun(data:RoutineData,now=Date.now()):RoutineData{
 return stopBookTimer(recordQuitPenalty(settleBookTimer(data,now),now),now);
}
/** "다 했어요": study ends here and a photo with at least 100 new letters settles it. No penalty applies. */
export function acceptDeclaredFinish(data:RoutineData,id:string,hash:string,subject:string,analysis:HandwritingAnalysis,now=new Date()):RoutineData{
 return acceptHandwriting(stopBookTimer(data,now.getTime()),id,hash,subject,analysis,now,'ramp-v2',true);
}
/** Only an explicit user action starts a break; preserve all real focus time first. */
export function startBookBreak(data:RoutineData,now=Date.now()):RoutineData{
 const t=data.bookTimer;if(!t||t.phase!=='focus')return data;
 const next=stopBookTimer(data,now),rested=t.rewardMode==='output'?focusRunCredit(data,now):0;
 return {...next,bookTimer:{...next.bookTimer!,phase:'break',endsAt:now+300000,remaining:300,running:true,...(rested>0?{restedCredit:rested}:{})}};
}
/** What the app calls. startBookBreak is the bare state change underneath it and has no other caller. */
export function takeEarnedBreak(data:RoutineData,now=Date.now()):RoutineData{
 // The stage is paid first, without a photo (user decision 2026-11-06), then the rest starts.
 return canStartBreak(data,now)?startBookBreak(payBreakStage(data,now),now):data;
}
/**
 * Leave a break early, whether it is running or paused. Keyed to the break's timer so a repeated
 * press or a press racing the break's natural end moves to study once. Rest never becomes focus
 * time: real time stays in bookSessions and the countdown restarts the whole stage, like a natural end.
 */
export function skipBookBreak(data:RoutineData,breakTimerId:string,id:string,now=Date.now()):RoutineData{
 const t=data.bookTimer;if(!t||t.id!==breakTimerId||t.phase==='focus')return data;
 const idle:RoutineData={...data,bookTimer:{...t,phase:'idle',remaining:0,running:false}};
 if(t.rewardMode!=='output')return startBookTimer(idle,id,t.subject,now,t.duration??1500,t.rewardMode??'standard');
 if(focusRampStatus(data,now).needsPlan)throw new Error('공부를 2시간 쉬었어요. 계획 한 줄부터 다시 시작해 주세요.');
 const drafted=startOutputStudy(idle,'draft-'+id,t.subject,new Date(now)),subject=drafted.outputDraft!.subject;
 return startBookTimer(drafted,id,subject,now,focusRampStatus(drafted,now).required,'output');
}
export function adjustBookTimer(data:RoutineData,delta:number,now=Date.now()):RoutineData{
 if(![-300,-60,60,300].includes(delta))throw new Error('시간은 1분 또는 5분씩 조절해 주세요.');
 const next=settleBookTimer(data,now),t=next.bookTimer;if(!t||t.phase==='idle')return next;
 const left=bookRemaining(t,now),remaining=Math.max(1,Math.min(14400,left+delta)),elapsed=bookFocusSeconds(t,now);
 return {...next,bookTimer:{...t,remaining,endsAt:now+remaining*1000,targetSeconds:elapsed+remaining,...(t.phase==='focus'?{focusElapsed:elapsed,focusResumedAt:now}:{})}};
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
