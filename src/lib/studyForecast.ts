import {State} from 'ts-fsrs';
import type {RoutineData,Word} from './routineModel';
import {routineDay} from './routineModel';
import {addDays} from './dateUtils';
export type ForecastDay={key:string;total:number;review:number;learning:number;relearning:number;overdue:number;words:Word[]};
/** Each studied card is counted once at its currently scheduled next review, not a simulated future grade. */
export function studyForecast(data:RoutineData,today:string,span=30,deckId?:string){
 const days:ForecastDay[]=Array.from({length:Math.max(1,Math.min(365,span))},(_,i)=>({key:addDays(today,i),total:0,review:0,learning:0,relearning:0,overdue:0,words:[]}));
 const byKey=new Map(days.map(day=>[day.key,day])),active=new Set(data.decks.filter(d=>d.active&&(!deckId||d.id===deckId)).map(d=>d.id));
 let fresh=0,later=0,hidden=0,buried=0;
 for(const word of data.words){
  if(!active.has(word.deckId))continue;
  if(word.active===false||word.suspended||word.issue){hidden++;continue;}
  if(word.card.state===State.New){fresh++;continue;}
  if(!Number.isFinite(Date.parse(word.card.due)))continue;
  let key=routineDay(new Date(word.card.due));const overdue=key<today;
  if(key<today)key=today;
  if(word.buriedOn===today&&key===today){key=addDays(today,1);buried++;}
  const day=byKey.get(key);if(!day){later++;continue;}
  day.words.push(word);day.total++;
  if(word.card.state===State.Review)day.review++;else if(word.card.state===State.Relearning)day.relearning++;else day.learning++;
  if(overdue&&key===today)day.overdue++;
 }
 for(const day of days)day.words.sort((a,b)=>a.card.due.localeCompare(b.card.due)||a.id.localeCompare(b.id));
 return {days,fresh,later,hidden,buried,total:days.reduce((n,d)=>n+d.total,0)};
}
