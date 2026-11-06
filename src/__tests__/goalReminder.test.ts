import {emptyData,type RoutineData} from '../lib/routineModel';
import {emergencyGoal} from '../lib/goalReminder';
import type {Goal} from '../lib/routineGoals';

jest.mock('../lib/supabase',()=>({supabase:{}}));
const TODAY='2026-11-07';
const goal=(id:string,over:Partial<Goal>={}):Goal=>({id,title:id+' 목표',weeklyTargetDays:5,createdAt:'2026-11-01T00:00:00.000Z',updatedAt:'2026-11-01T00:00:00.000Z',links:{subjects:[],deckIds:[]},...over});
const session=(subject:string,day:string)=>({id:subject+day,subject,startedAt:day+'T01:00:00.000Z',completedAt:day+'T01:30:00.000Z',seconds:1800,note:'한 것',next:''});
const withGoals=(goals:Goal[],extra:Partial<RoutineData>={})=>({...emptyData(),goals,...extra}) as RoutineData;

describe('the goal shown at the emergency unlock',()=>{
 test('nothing without an active goal',()=>{
  expect(emergencyGoal(emptyData(),TODAY)).toBeNull();
  expect(emergencyGoal(withGoals([goal('a',{completedAt:'2026-11-05T00:00:00.000Z'})]),TODAY)).toBeNull();
 });
 test('shows the title, the why, the days left and this week',()=>{
  const r=emergencyGoal(withGoals([goal('a',{why:'합격해서 이직하려고',dueDate:'2026-11-27',links:{subjects:['수학'],deckIds:[]}})],{bookSessions:[session('수학','2026-11-03')]} as Partial<RoutineData>),TODAY)!;
  expect(r.goal.why).toBe('합격해서 이직하려고');
  expect(r.dueLabel).toBe('D-20');
  expect(r.duePassed).toBe(false);
  expect(r.week).toEqual({count:1,target:5});
 });
 test('without linked study there is no week line',()=>{
  const r=emergencyGoal(withGoals([goal('a')]),TODAY)!;
  expect(r.week).toBeUndefined();expect(r.dueLabel).toBeUndefined();
 });
 test('the goal furthest behind this week comes first',()=>{
  const goals=[goal('ahead',{weeklyTargetDays:2,links:{subjects:['영어'],deckIds:[]}}),goal('behind',{weeklyTargetDays:5,links:{subjects:['수학'],deckIds:[]}})];
  const r=emergencyGoal(withGoals(goals,{bookSessions:[session('영어','2026-11-03'),session('수학','2026-11-04')]} as Partial<RoutineData>),TODAY)!;
  expect(r.goal.id).toBe('behind');
 });
 test('on a tie the nearest date wins, then the tab order; a passed date does not jump ahead',()=>{
  const linked={links:{subjects:['수학'],deckIds:[]}};
  expect(emergencyGoal(withGoals([goal('far',{...linked,dueDate:'2026-12-31'}),goal('near',{...linked,dueDate:'2026-11-20'})]),TODAY)!.goal.id).toBe('near');
  expect(emergencyGoal(withGoals([goal('first',linked),goal('second',linked)]),TODAY)!.goal.id).toBe('first');
  const passed=emergencyGoal(withGoals([goal('old',{...linked,dueDate:'2026-11-01'}),goal('soon',{...linked,dueDate:'2026-11-10'})]),TODAY)!;
  expect(passed.goal.id).toBe('soon');
  expect(emergencyGoal(withGoals([goal('old',{dueDate:'2026-11-01'})]),TODAY)!.duePassed).toBe(true);
 });
 test('linked goals come before goals with nothing linked',()=>{
  expect(emergencyGoal(withGoals([goal('plain'),goal('linked',{links:{subjects:['수학'],deckIds:[]}})]),TODAY)!.goal.id).toBe('linked');
 });
});
