import {addDays} from './dateUtils';
import {dailyTimeline} from './dailyTimeline';
import {emergencyUnlocks} from './emergencyUnlock';
import {getDay,routineDay,type RoutineData} from './routineModel';
import {COMMITMENT_POLICY,activeWeeklyRules,studyDayKeys,weekKeyOf,weeklyInterest,weeklyStake,type WeeklyReview,type WeeklyRule,type WeeklyRuleKind} from './weeklyCommitments';

/** 저장 필드는 Felix가 routineModel에 둔다(weeklyReviews). 합치기 전에도 읽을 수 있게 모양만 맞춘다. */
export const weeklyReviews=(data:RoutineData):Record<string,WeeklyReview>=>(data as {weeklyReviews?:Record<string,WeeklyReview>}).weeklyReviews??{};
/** 예치금·이자는 따로 보여 주므로 받은 돈에서 뺀다. */
const separateMoney=(id:string)=>id.startsWith('stake')||id.startsWith('interest:');

export type WeeklySummary={
 weekKey:string;days:string[];
 studySeconds:number;studyDays:number;
 earnedMinutes:number;earnedWon:number;
 penaltyMinutes:number;penaltyWon:number;
 emergencies:{day:string;reason:string}[];
 interestWon:number;
 stake:ReturnType<typeof weeklyStake>['stake'];
 empty:boolean;
};

const weekOf=(weekKey:string)=>Array.from({length:7},(_,i)=>addDays(weekKey,i));

/** 지난 한 주를 기존 기록에서 읽는다. 돈·벌점·이자·예치금은 담당 함수의 값을 그대로 옮긴다. */
export function weeklySummary(data:RoutineData,weekKey:string,now=Date.now()):WeeklySummary{
 const days=weekOf(weekKey),inWeek=new Set(days);
 let studySeconds=0,earnedMinutes=0,penaltyMinutes=0,penaltyWon=0;
 for(const key of days){
  const t=dailyTimeline(data,key,null,now).totals;
  studySeconds+=t.studySeconds;earnedMinutes+=t.earnedMinutes;penaltyMinutes+=t.penaltyMinutes;penaltyWon+=t.penaltyWon;
 }
 const earnedWon=(data.money?.entries??[]).filter(e=>e.kind==='reward'&&!separateMoney(e.id)&&inWeek.has(e.day??routineDay(new Date(e.at)))).reduce((n,e)=>n+(Number.isFinite(e.amount)?e.amount:0),0);
 const emergencies=emergencyUnlocks(data).filter(u=>inWeek.has(u.day)).map(u=>({day:u.day,reason:u.reason}));
 const studyDays=studyDayKeys(data,weekKey).length,interestWon=weeklyInterest(data,weekKey).won,stake=weeklyStake(data,weekKey).stake;
 return {weekKey,days,studySeconds,studyDays,earnedMinutes,earnedWon,penaltyMinutes,penaltyWon,emergencies,interestWon,stake,
  empty:!studySeconds&&!studyDays&&!earnedMinutes&&!earnedWon&&!penaltyMinutes&&!emergencies.length&&!stake};
}

/** 월요일 아침 루틴을 마쳤고 이번 주 점검을 아직 안 했으면 연다. */
export function shouldOpenWeekCheck(data:RoutineData,dayKey:string){
 const weekKey=weekKeyOf(dayKey);
 return dayKey===weekKey&&getDay(data,dayKey).paid.morning>0&&!weeklyReviews(data)[weekKey];
}

export const RULE_OPTIONS:{kind:WeeklyRuleKind;title:string;values:number[];label:(value:number)=>string}[]=[
 {kind:'stakeDays',title:'예치금 목표 일수',values:[...COMMITMENT_POLICY.rules.stakeDays],label:v=>`${v}일`},
 {kind:'morningWords',title:'아침 단어 장수',values:[...COMMITMENT_POLICY.rules.morningWords],label:v=>`${v}장`},
 {kind:'reflectTime',title:'밤 돌아보기 알림',values:[...COMMITMENT_POLICY.rules.reflectTime],label:v=>hhmmLabel(v)},
];
export const hhmmLabel=(value:number)=>`${Math.floor(value/100)}:${String(value%100).padStart(2,'0')}`;
export function ruleLabel(rule:WeeklyRule){
 const option=RULE_OPTIONS.find(o=>o.kind===rule.kind);
 return option?`${option.title} ${option.label(rule.value)}`:'';
}

export function wonLabel(won:number){return `${won<0?'−':''}${Math.abs(won).toLocaleString('ko-KR')}원`;}

/** 밤 돌아보기 알림 시각. 오늘 내일 약속을 이미 했으면 오늘은 건너뛴다. */
export function reflectAlarmTimes(data:RoutineData,dayKey:string,promised:boolean,now=Date.now(),count=3):number[]{
 const times:number[]=[];
 for(let i=0;times.length<count&&i<count+1;i++){
  const key=addDays(dayKey,i),value=activeWeeklyRules(data,key).reflectTime,[y,m,d]=key.split('-').map(Number);
  const at=new Date(y,m-1,d,Math.floor(value/100),value%100).getTime();
  if(at<=now||(i===0&&promised))continue;
  times.push(at);
 }
 return times;
}
