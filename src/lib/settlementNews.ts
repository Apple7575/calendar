import {addDays,promiseOutcomesOn,weekKeyOf,weeklyInterest,weeklyStake} from './commitments';
import type {RoutineData} from './routineModel';

/**
 * 정산 소식: 앱이 조용히 정산한 돈(예치금 성공, 약속 지킴, 안 쓴 시간 이자)을 앱을 열 때 모아서 한 번 보여 준다
 * (팀장 결정 2026-11-06). Felix의 공개 함수만 읽고 아무것도 정산하거나 저장하지 않는다.
 * id는 한 번만 보여 주기 위한 표시용 이름이다: stake:<주 월요일>, promise:<약속한 날>, interest:<날짜>.
 */
export type SettlementItem={id:string;kind:'stakeWon'|'promiseKept'|'interest';won:number;minutes?:number;ids:string[]};

export function settlementNews(data:RoutineData,today:string,seen:readonly string[]):SettlementItem[]{
 const shown=new Set(seen),items:SettlementItem[]=[];
 const lastWeek=addDays(weekKeyOf(today),-7),stake=weeklyStake(data,lastWeek).stake;
 if(stake?.status==='won'&&stake.payoutWon&&!shown.has('stake:'+lastWeek))items.push({id:'stake:'+lastWeek,kind:'stakeWon',won:stake.payoutWon,ids:['stake:'+lastWeek]});
 for(const day of [addDays(today,-1),today])for(const p of promiseOutcomesOn(data,day)){
  const id='promise:'+p.promiseDay;
  if(p.status==='kept'&&!shown.has(id)&&!items.some(i=>i.id===id))items.push({id,kind:'promiseKept',won:p.won,minutes:p.minutes,ids:[id]});
 }
 const interest=[lastWeek,weekKeyOf(today)].flatMap(week=>weeklyInterest(data,week).days).filter(d=>d.won>0&&!shown.has('interest:'+d.dayKey));
 if(interest.length){const ids=interest.map(d=>'interest:'+d.dayKey);items.push({id:ids[ids.length-1],kind:'interest',won:interest.reduce((n,d)=>n+d.won,0),ids});}
 return items;
}
