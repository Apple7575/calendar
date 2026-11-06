import { Grade,Rating } from 'ts-fsrs';
import { addDeck,answerWord,checkMorning,DEFAULT_MORNING,emptyData,getDay,MORNING_WORD_SMALL,MORNING_WORD_TARGET,morningWords,morningWordTarget,planStudy,routineDay,settleMorningWords,withDay } from '../lib/routineModel';
import { activeWeeklyRules } from '../lib/commitments';

const now=new Date(2026,10,6,7),key=routineDay(now);
const seed=(count:number)=>planStudy(addDeck(emptyData(),'test',Array.from({length:count},(_,i)=>({front:`w${i}`,back:'뜻'})),'d',now),key);
const steps=(data:ReturnType<typeof emptyData>)=>checkMorning(checkMorning(data,key,'min',0),key,'min',1);
const study=(data:ReturnType<typeof emptyData>,count:number,grade:Grade=Rating.Easy)=>{for(let i=0;i<count;i++)data=answerWord(data,key,`d:${i}`,grade,now,3);return data;};

test('the morning target is one value, 10 cards for now',()=>{
 expect(MORNING_WORD_TARGET).toBe(10);
 expect(morningWords(seed(20),key)).toMatchObject({target:10,done:0,required:10,met:false,reduced:false});
});

test('finishing the steps alone does not finish the morning while cards are left',()=>{
 const data=steps(seed(20));
 expect(getDay(data,key).morning.slice(0,2)).toEqual([true,true]);
 expect(getDay(data,key).paid.morning).toBe(0);
});

test('10 finished cards complete the full morning with the same reward as before',()=>{
 let data=checkMorning(checkMorning(checkMorning(seed(20),key,'full',0),key,'full',1),key,'full',2);
 data=study(data,9);expect(getDay(checkMorning(data,key,'full'),key).paid.morning).toBe(0);
 data=study(data,10);expect(morningWords(data,key)).toMatchObject({done:10,met:true});
 expect(getDay(checkMorning(data,key,'full'),key).paid.morning).toBe(10);
});

test('cards studied before the steps count, so the last step finishes the morning',()=>{
 let data=study(seed(20),10);
 data=checkMorning(data,key,'min',0);expect(getDay(data,key).paid.morning).toBe(0);
 data=checkMorning(data,key,'min',1);expect(getDay(data,key).paid.morning).toBe(5);
});

test('Again answers do not count as finished cards',()=>{
 const data=study(seed(20),10,Rating.Again);
 expect(morningWords(data,key)).toMatchObject({done:0,met:false});
});

test('a small deck lowers the requirement instead of blocking the morning',()=>{
 let data=steps(seed(3));
 expect(morningWords(data,key)).toMatchObject({required:3,reduced:true,met:false});
 data=study(data,3);
 expect(morningWords(data,key)).toMatchObject({done:3,required:3,met:true});
 expect(getDay(checkMorning(data,key,'min'),key).paid.morning).toBe(5);
});

test('no study cards at all never blocks the morning',()=>{
 expect(morningWords(emptyData(),key)).toMatchObject({required:0,met:true});
 expect(getDay(steps(emptyData()),key).paid.morning).toBe(5);
 const paused=seed(5);paused.decks=paused.decks.map(d=>({...d,active:false}));
 expect(getDay(steps(paused),key).paid.morning).toBe(5);
});

test('a morning already paid is never taken back',()=>{
 let data=steps(emptyData());expect(getDay(data,key).paid.morning).toBe(5);
 data=addDeck(data,'later',Array.from({length:12},(_,i)=>({front:`x${i}`,back:'뜻'})),'later',now);
 expect(getDay(checkMorning(data,key,'min'),key).paid.morning).toBe(5);
});

test("'오늘은 작게' needs 5 cards and still pays the small reward",()=>{
 let data=steps(seed(20));
 expect(getDay(data,key).guidedLevels?.morning).toBe('min');
 expect(morningWords(data,key)).toMatchObject({target:MORNING_WORD_SMALL,required:5});
 data=study(data,4);expect(getDay(settleMorningWords(data,key),key).paid.morning).toBe(0);
 data=study(data,5);expect(getDay(settleMorningWords(data,key),key).paid.morning).toBe(5);
});

test('the weekly review rule (10·15·20) applies from the week after it was chosen, same as activeWeeklyRules',()=>{
 const monday='2026-11-02',nextWeek='2026-11-10';
 let data=seed(30);data={...data,weeklyReviews:{[monday]:{doneAt:'2026-11-02T09:00:00.000Z',rule:{kind:'morningWords',value:15}}}};
 expect(morningWordTarget(data,'2026-11-06','full')).toBe(10);
 expect(morningWordTarget(data,nextWeek,'full')).toBe(15);
 expect(morningWordTarget(data,nextWeek,'min')).toBe(5);
 for(const day of ['2026-11-06',nextWeek])expect(morningWordTarget(data,day,'full')).toBe(activeWeeklyRules(data,day).morningWords);
 const broken={...data,weeklyReviews:{[monday]:{doneAt:'x',rule:{kind:'morningWords',value:13}}}} as unknown as typeof data;
 expect(morningWordTarget(broken,nextWeek,'full')).toBe(10);
});

test('finishing the cards on the study screen pays the morning without going back to the morning screen',()=>{
 let data=checkMorning(checkMorning(checkMorning(seed(20),key,'full',0),key,'full',1),key,'full',2);
 expect(getDay(data,key).paid.morning).toBe(0);
 // Only study answers from here on, the way the provider's update runs them, never checkMorning.
 for(let i=0;i<10;i++)data=settleMorningWords(answerWord(data,key,`d:${i}`,Rating.Easy,now,3),key);
 expect(getDay(data,key).paid.morning).toBe(10);
});

test('settling leaves untouched data as the same object and never pays without the steps',()=>{
 const fresh=study(seed(20),10);
 expect(settleMorningWords(fresh,key)).toBe(fresh);
 const noLevel=withDay(study(seed(20),10),key,d=>({...d,morningPlan:DEFAULT_MORNING.map(s=>({...s})),morning:[true,true,false]}));
 expect(getDay(settleMorningWords(noLevel,key),key).paid.morning).toBe(5);
});
