import type { RoutineData,MorningStep } from './routineModel';
import { checkMorning,DEFAULT_MORNING,getDay,morningSteps,saveMorningSteps,withDay } from './routineModel';
export type GuidedTimer={slot:'morning'|'evening';stepId:string;endsAt:number;remaining:number;running:boolean;alerted?:boolean};
export function guidedSeconds(timer:GuidedTimer,now=Date.now()){return timer.running?Math.min(timer.remaining,Math.ceil((timer.endsAt-now)/1000)):timer.remaining;}
export function formatGuidedTime(seconds:number){const n=Math.abs(seconds);return `${seconds<0?'+':''}${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
export const SUGGESTED_MORNING:MorningStep[]=[
 {id:'bed',title:'이불 정리',detail:'침대에서 일어나 이불을 정리해요.',minimum:true,minutes:2},
 {id:'wash',title:'씻기·양치',detail:'상쾌하게 하루를 준비해요.',minimum:true,minutes:15},
 {id:'medicine',title:'복약 확인',detail:'처방된 복용법과 시각에 맞춰 확인해요.',minimum:true,minutes:1},
 {id:'move',title:'가벼운 아침 운동',detail:'몸을 깨우는 간단한 움직임.',minimum:false,minutes:7},
 {id:'meditation',title:'명상',detail:'잠깐 호흡에 집중해요.',minimum:false,minutes:5},
 {id:'read',title:'책 읽기',detail:'정한 책을 조금씩 읽어요.',minimum:false,minutes:10},
 {id:'write',title:'아침 글쓰기',detail:'오늘 먼저 할 일과 생각을 적어요.',minimum:false,minutes:5},
 {id:'study',title:'아침 공부',detail:'전기공사기사 우선 · 25분 집중 / 5분 휴식.',minimum:false,minutes:60},
 {id:'clean',title:'가벼운 정리',detail:'나가기 전 주변을 정리해요.',minimum:false,minutes:5},
];
export const SUGGESTED_EVENING:MorningStep[]=[
 {id:'tomorrow',title:'내일 준비',detail:'옷·가방과 첫 공부할 위치를 준비해요.',minimum:true,minutes:5},
 {id:'review',title:'하루 정리',detail:'사진과 음성·글로 오늘을 남겨요.',minimum:true,minutes:10},
 {id:'wash-night',title:'씻기·양치',detail:'잠자리에 들 준비를 해요.',minimum:true,minutes:15},
 {id:'wind-down',title:'화면 없이 쉬기',detail:'22시 취침을 준비해요.',minimum:false,minutes:20},
];
export function previousDay(key:string){const d=new Date(`${key}T12:00:00`);d.setDate(d.getDate()-1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function isReturnDay(data:RoutineData,key:string){const prev=data.days[previousDay(key)];return Object.keys(data.days).some(k=>k<key)&&!prev?.paid.morning;}
export function planTimeline(steps:MorningStep[],start='04:30'){
 let minute=Number(start.slice(0,2))*60+Number(start.slice(3));return steps.map(step=>{const at=minute;minute+=step.minutes??5;return {step,start:`${String(Math.floor(at/60)%24).padStart(2,'0')}:${String(at%60).padStart(2,'0')}`,end:`${String(Math.floor(minute/60)%24).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`};});
}
export function eveningSteps(data:RoutineData,key:string){return getDay(data,key).eveningPlan??data.eveningSteps??SUGGESTED_EVENING;}
export function saveEveningSteps(data:RoutineData,steps:MorningStep[]):RoutineData{
 const valid=saveMorningSteps(data,steps);return {...data,eveningSteps:valid.morningSteps};
}
export function startGuidedStep(data:RoutineData,key:string,slot:'morning'|'evening',stepId:string,now=Date.now()):RoutineData{
 const steps=slot==='morning'?morningSteps(data,key):eveningSteps(data,key),step=steps.find(s=>s.id===stepId);
 if(!step)throw new Error('실행할 행동을 찾지 못했어요.');
 const remaining=(step.minutes??5)*60;
 return withDay(data,key,d=>({...d,...(slot==='morning'?{morningPlan:steps.map(s=>({...s}))}:{eveningPlan:steps.map(s=>({...s}))}),guidedTimer:{slot,stepId,endsAt:now+remaining*1000,remaining,running:true}}));
}
export function pauseGuidedStep(data:RoutineData,key:string,now=Date.now()):RoutineData{
 return withDay(data,key,d=>{const t=d.guidedTimer;return t?{...d,guidedTimer:{...t,running:false,remaining:guidedSeconds(t,now)}}:d;});
}
export function resumeGuidedStep(data:RoutineData,key:string,now=Date.now()):RoutineData{
 return withDay(data,key,d=>{const t=d.guidedTimer;return t?{...d,guidedTimer:{...t,running:true,endsAt:now+t.remaining*1000}}:d;});
}
export function completeGuidedStep(data:RoutineData,key:string,slot:'morning'|'evening',index:number,level:'full'|'min'):RoutineData{
 if(slot==='morning')return withDay(checkMorning(data,key,level,index),key,d=>({...d,guidedTimer:undefined}));
 const steps=eveningSteps(data,key);if(!steps[index])return data;
 return withDay(data,key,d=>({...d,eveningPlan:steps.map(s=>({...s})),evening:steps.map((_,i)=>!!d.evening?.[i]||i===index),guidedTimer:undefined}));
}

export function migrateDailyPlan(data:RoutineData):RoutineData{
 if(data.morningSteps)return data;
 const days=Object.fromEntries(Object.entries(data.days).map(([key,day])=>[key,(!day.morningPlan&&(day.morning.some(Boolean)||day.paid.morning>0))?{...day,morningPlan:DEFAULT_MORNING.map(s=>({...s}))}:day]));
 return {...data,days,morningSteps:SUGGESTED_MORNING.map(s=>({...s}))};
}
