import {addDays,weekStartOf} from './dateUtils';
import {routineDay,type RoutineData} from './routineModel';
import type {Goal} from './routineGoals';
import {reviewEvents} from './studyHistory';

/**
 * Study time for a goal (build 53, S1-13). It is only shown: the weekly promise still counts days, so ten minutes and
 * three hours are each one day there. Time is the focus sessions of the linked subjects plus the answered cards of the
 * linked decks, by the 04:00 day. Nothing new is recorded.
 */
export function goalSecondsOn(data:RoutineData,goal:Goal,key:string){
 const subjects=goal.links.subjects,decks=goal.links.deckIds.filter(id=>data.decks.some(d=>d.id===id));
 let seconds=0;
 if(subjects.length)for(const s of Array.isArray(data.bookSessions)?data.bookSessions:[]){
  const end=Date.parse(s?.completedAt);
  if(s&&subjects.includes(s.subject)&&Number.isFinite(end)&&s.seconds>0&&routineDay(new Date(end))===key)seconds+=s.seconds;
 }
 if(decks.length)for(const e of reviewEvents(data,{day:key}))if(decks.includes(e.deckId)&&Number.isFinite(e.seconds)&&e.seconds>0)seconds+=e.seconds;
 return seconds;
}
/** This week from Monday to today, and all of last week to set it beside. */
export function goalWeekTime(data:RoutineData,goal:Goal,today:string){
 const monday=weekStartOf(today),sum=(from:string,days:number)=>Array.from({length:days},(_,i)=>goalSecondsOn(data,goal,addDays(from,i))).reduce((a,b)=>a+b,0);
 const daysSoFar=Array.from({length:7},(_,i)=>addDays(monday,i)).filter(k=>k<=today).length;
 return {seconds:sum(monday,daysSoFar),lastWeekSeconds:sum(addDays(monday,-7),7)};
}
