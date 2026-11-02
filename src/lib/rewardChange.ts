import {RoutineData,earned,getDay} from './routineModel';
import {reconcileMoneyRewards} from './moneyRewards';

/** Same money reconciliation as the provider; projection only, no side effects. */
export function rewardChange(before:RoutineData,after:RoutineData,day:string){
 const settled=reconcileMoneyRewards(before,after,day),ids=new Set(before.money?.entries.map(e=>e.id)??[]);
 const cash=(settled.money?.entries??[]).filter(e=>!ids.has(e.id)&&(e.kind==='reward'||e.kind==='adjustment')).reduce((n,e)=>n+e.amount,0);
 return {minutes:Math.max(0,earned(getDay(settled,day))-earned(getDay(before,day))),cash,cashEnabled:!!settled.money};
}
