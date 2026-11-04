import {emptyData,getDay} from '../lib/routineModel';
import {completeGuidedStep,currentGuidedIndex,previousGuidedIndex,startGuidedStep,undoGuidedStep} from '../lib/dailyPlan';

const key='2026-11-01';
const steps=(n:number)=>Array.from({length:n},(_,i)=>({id:'s'+i,title:'s'+i,detail:'',minimum:i===0,minutes:5}));
const withSteps=(n=3)=>{const data=emptyData();data.morningSteps=steps(n);return data};

test('undo unchecks only the chosen step and clears its timer',()=>{
 let data=completeGuidedStep(withSteps(),key,'morning',0,'full');
 data=completeGuidedStep(data,key,'morning',1,'full');
 data=startGuidedStep(data,key,'morning','s2',1000);
 data=undoGuidedStep(data,key,'morning',1);
 expect(getDay(data,key).morning).toEqual([true,false,false]);
 expect(getDay(data,key).guidedTimer).toBeUndefined();
});

test('undo works on evening steps',()=>{
 const base=emptyData();base.eveningSteps=steps(2);
 let data=completeGuidedStep(base,key,'evening',0,'full');
 data=undoGuidedStep(data,key,'evening',0);
 expect(getDay(data,key).evening?.[0]).toBe(false);
});

test('undoing a step mid-routine pays nothing, and finishing again pays once',()=>{
 let data=completeGuidedStep(withSteps(2),key,'morning',0,'full');
 data=undoGuidedStep(data,key,'morning',0);
 expect(getDay(data,key).paid.morning).toBe(0);
 data=completeGuidedStep(data,key,'morning',0,'full');
 data=completeGuidedStep(data,key,'morning',1,'full');
 const paid=getDay(data,key).paid.morning;
 expect(paid).toBeGreaterThan(0);
 data=undoGuidedStep(data,key,'morning',1);
 expect(getDay(data,key).paid.morning).toBe(paid);
 data=completeGuidedStep(data,key,'morning',1,'full');
 expect(getDay(data,key).paid.morning).toBe(paid);
});

test('skipping never marks a step done, so the reward still needs every step',()=>{
 const data=completeGuidedStep(withSteps(2),key,'morning',1,'full');
 expect(getDay(data,key).morning).toEqual([false,true]);
 expect(getDay(data,key).paid.morning).toBe(0);
});

test('current step passes over skipped steps and returns to them at the end',()=>{
 const required=[0,1,2];
 expect(currentGuidedIndex(required,[false,false,false],[])).toBe(0);
 expect(currentGuidedIndex(required,[false,false,false],['s0'],['s0','s1','s2'])).toBe(1);
 expect(currentGuidedIndex(required,[false,true,true],['s0'],['s0','s1','s2'])).toBe(0);
 expect(currentGuidedIndex(required,[true,true,true],[])).toBeUndefined();
});

test('previous step is the closest finished step before the current one',()=>{
 const required=[0,1,2,3];
 expect(previousGuidedIndex(required,[true,true,false,false],2)).toBe(1);
 expect(previousGuidedIndex(required,[true,false,false,false],2)).toBe(0);
 expect(previousGuidedIndex(required,[false,false,false,false],0)).toBeUndefined();
 expect(previousGuidedIndex(required,[false,false,true,false],0)).toBe(2);
});
