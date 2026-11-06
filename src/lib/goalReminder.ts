import {goalDueInfo} from './primaryGoal';
import type {RoutineData} from './routineModel';
import {activeGoals,goalWeek,hasGoalLinks,readGoals,type Goal} from './routineGoals';

export type GoalReminder={goal:Goal;dueLabel?:string;duePassed:boolean;week?:{count:number;target:number}};

/**
 * The goal to show when the sleep lock is about to be opened (build 53, S1-12). It only shows; prices, penalties and the
 * wait stay as they are. With several goals, the one furthest behind this week comes first: a goal with linked study and
 * the lowest share of its weekly days, then the nearest date, then the order on the goal tab. No goal, nothing to show.
 */
export function emergencyGoal(data:RoutineData,today:string):GoalReminder|null{
 const rows=activeGoals(readGoals(data).goals).map((goal,order)=>{
  const due=goalDueInfo(goal,today),week=hasGoalLinks(goal)?goalWeek(data,goal,today):undefined;
  return {goal,order,due,week:week?{count:week.count,target:week.target}:undefined,share:week?week.count/Math.max(1,week.target):Infinity};
 });
 if(!rows.length)return null;
 const dueRank=(r:typeof rows[number])=>r.due&&!r.due.passed?r.due.days:Infinity;
 rows.sort((a,b)=>a.share-b.share||dueRank(a)-dueRank(b)||a.order-b.order);
 const {goal,due,week}=rows[0];
 return {goal,...(due?{dueLabel:due.label}:{}),duePassed:!!due?.passed,...(week?{week}:{})};
}
