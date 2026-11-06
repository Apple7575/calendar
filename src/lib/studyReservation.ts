import {startBookTimer} from './bookStudy';
import {focusRampStatus} from './focusRamp';
import {startOutputStudy} from './handwriting';
import {routineDay} from './routineModel';
import type {RoutineData} from './routineModel';

/**
 * 마칠 때 다음 공부 예약 (S1-10, 2차 회의 팀장 결정: 처음엔 알림만, 보상·벌점 없음).
 * 공부를 마치면 한 번 묻고, 고른 시각에 알림을 한 번 보낸다. 알림을 누르면 같은 과목 타이머가 열린다.
 * 예약을 어겨도 아무것도 깎지 않는다. 저장한 줄은 나중에 "예약한 비율·예약대로 다시 시작한 비율"을 재는 데 쓴다.
 */
export type NextStudyChoice='10m'|'30m'|'evening'|'none';
export type StudyReservation={id:string;subject:string;askedAt:number;choice?:NextStudyChoice;answeredAt?:number;at?:number;closedAt?:number};
export type NextStudyOption={choice:NextStudyChoice;label:string;at?:number};

export const RESERVATION_POLICY={
 /** 하루(04:00 기준)에 걸 수 있는 알림 수 (2차 발표 제안). */
 remindersPerDay:5,
 /** 마친 뒤 이 시간 안에만 묻는다. 앱을 오래 닫았다 열면 묻지 않는다. */
 askWindowMs:10*60000,
 eveningHour:20,
 /** 저녁 선택은 이 시각 전까지만 보인다. */
 eveningLastPick:{hour:19,minute:50},
 /** 예약 시각이 이만큼 지나면 그 예약은 끝난 것으로 본다. */
 expireMs:6*3600000,
 keep:60,
};
const CHOICES:NextStudyChoice[]=['10m','30m','evening','none'];
const timed=(c:NextStudyChoice|undefined)=>c==='10m'||c==='30m'||c==='evening';
const num=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);

/** 저장된 줄을 읽는다. 모양이 틀린 줄은 건너뛰고, 불러오기를 막지 않는다. */
export function studyReservations(data:RoutineData):StudyReservation[]{
 const raw=(data as {studyReservations?:unknown}).studyReservations;
 if(!Array.isArray(raw))return [];
 return raw.filter((r):r is StudyReservation=>{
  if(!r||typeof r!=='object')return false;
  const o=r as Record<string,unknown>;
  if(typeof o.id!=='string'||!o.id||typeof o.subject!=='string'||!o.subject.trim()||!num(o.askedAt))return false;
  if(o.closedAt!==undefined&&!num(o.closedAt))return false;
  if(o.choice===undefined)return true;
  if(!CHOICES.includes(o.choice as NextStudyChoice)||!num(o.answeredAt))return false;
  return o.choice==='none'||num(o.at);
 });
}
const save=(data:RoutineData,rows:StudyReservation[]):RoutineData=>({...data,studyReservations:rows.slice(-RESERVATION_POLICY.keep)});

/** 공부를 마친 직후 부른다. 타이머가 멈춰 있고 과목이 있을 때만 질문 한 줄을 남긴다. */
export function askNextStudy(data:RoutineData,id:string,now=Date.now()):RoutineData{
 const t=data.bookTimer,subject=t?.subject?.trim();
 if(!t||t.phase!=='idle'||!subject)return data;
 return save(data,[...studyReservations(data),{id,subject,askedAt:now}]);
}

/** 지금 보여 줄 질문. 마친 뒤 10분 안이고, 아직 답하지 않았고, 새 공부·휴식이 시작되지 않았을 때만. */
export function pendingNextStudyAsk(data:RoutineData,now=Date.now()):StudyReservation|null{
 const last=studyReservations(data).at(-1);
 if(!last||last.choice!==undefined||last.closedAt!==undefined||now-last.askedAt>RESERVATION_POLICY.askWindowMs||now<last.askedAt)return null;
 const t=data.bookTimer;
 if(t&&t.phase!=='idle')return null;
 return last;
}

function remindersToday(data:RoutineData,now:number){
 const day=routineDay(new Date(now));
 return studyReservations(data).filter(r=>timed(r.choice)&&routineDay(new Date(r.answeredAt!))===day).length;
}
function eveningAt(now:number){
 const d=new Date(now),{hour,minute}=RESERVATION_POLICY.eveningLastPick;
 if(d.getHours()<5||d.getHours()*60+d.getMinutes()>=hour*60+minute)return undefined;
 return new Date(d.getFullYear(),d.getMonth(),d.getDate(),RESERVATION_POLICY.eveningHour,0).getTime();
}

/** 고를 수 있는 것. 오늘 알림을 다 쓰면 "오늘은 끝"만 남는다. */
export function nextStudyOptions(data:RoutineData,now=Date.now()):NextStudyOption[]{
 const done:NextStudyOption={choice:'none',label:'오늘은 끝'};
 if(remindersToday(data,now)>=RESERVATION_POLICY.remindersPerDay)return [done];
 const evening=eveningAt(now);
 return [
  {choice:'10m',label:'10분 뒤',at:now+10*60000},
  {choice:'30m',label:'30분 뒤',at:now+30*60000},
  ...(evening===undefined?[]:[{choice:'evening' as const,label:'저녁 8시',at:evening}]),
  done,
 ];
}

/** 답을 저장한다. 보상·벌점·돈은 바꾸지 않는다. */
export function answerNextStudy(data:RoutineData,id:string,choice:NextStudyChoice,now=Date.now()):RoutineData{
 const rows=studyReservations(data),i=rows.findIndex(r=>r.id===id);
 if(i<0||rows[i].choice!==undefined)return data;
 const option=nextStudyOptions(data,now).find(o=>o.choice===choice);
 if(!option)throw new Error(choice==='evening'?'저녁 8시가 너무 가까워요. 다른 시각을 골라 주세요.':'오늘 알림은 다 썼어요. "오늘은 끝"을 골라 주세요.');
 const row:StudyReservation={...rows[i],choice,answeredAt:now,...(option.at===undefined?{}:{at:option.at})};
 return save(data,[...rows.slice(0,i),row,...rows.slice(i+1)]);
}

/** 고르지 않고 닫았다. 다시 묻지 않고, 알림도 없다. 재는 데는 "물었지만 고르지 않음"으로 남는다. */
export function dismissNextStudy(data:RoutineData,id:string,now=Date.now()):RoutineData{
 const rows=studyReservations(data),i=rows.findIndex(r=>r.id===id);
 if(i<0||rows[i].choice!==undefined||rows[i].closedAt!==undefined)return data;
 return save(data,[...rows.slice(0,i),{...rows[i],closedAt:now},...rows.slice(i+1)]);
}
/** 답한 뒤 공부를 시작했는지. 저장된 공부 기록과 지금 타이머의 시작 시각으로 본다. */
function startedSince(data:RoutineData,since:number){
 const t=data.bookTimer;
 if(t&&t.phase!=='idle'&&Date.parse(t.startedAt)>=since)return true;
 const starts=[...(Array.isArray(data.bookSessions)?data.bookSessions:[]).map(s=>Date.parse(s?.startedAt)),t?Date.parse(t.startedAt):NaN];
 return starts.some(s=>Number.isFinite(s)&&s>=since);
}

/** 살아 있는 예약: 가장 최근 답이 시각을 골랐고, 그 뒤로 공부를 시작하지 않았고, 6시간이 지나지 않았을 때. */
export function reservedStudy(data:RoutineData,now=Date.now()):StudyReservation|null{
 const last=[...studyReservations(data)].reverse().find(r=>r.choice!==undefined);
 if(!last||!timed(last.choice)||startedSince(data,last.answeredAt!))return null;
 return now>last.at!+RESERVATION_POLICY.expireMs?null:last;
}

/** 알림을 걸 시각. 이미 지났거나 예약이 없으면 null. */
export function reservationAlarmAt(data:RoutineData,now=Date.now()):number|null{
 const r=reservedStudy(data,now);
 return r&&r.at!>now?r.at!:null;
}

/** 알림으로 연 타이머의 시작 버튼: 예약한 과목으로 첫 단계(2분)부터 바로 시작한다. 살아 있는 예약이 없으면 그대로. */
export function startReservedStudy(data:RoutineData,id:string,now=Date.now()):RoutineData{
 const r=reservedStudy(data,now);
 if(!r)return data;
 const drafted=startOutputStudy(data,'draft-'+id,r.subject,new Date(now));
 return startBookTimer(drafted,id,r.subject,now,focusRampStatus(drafted,now).required||120,'output');
}
