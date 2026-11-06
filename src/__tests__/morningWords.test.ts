import { Grade,Rating } from 'ts-fsrs';
import { addDeck,answerWord,checkMorning,emptyData,getDay,MORNING_WORD_TARGET,morningWords,planStudy,routineDay } from '../lib/routineModel';

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

test('10 finished cards complete the morning with the same reward as before',()=>{
 let data=steps(seed(20));
 data=study(data,9);expect(checkMorning(data,key,'min').days[key].paid.morning).toBe(0);
 data=study(data,10);expect(morningWords(data,key)).toMatchObject({done:10,met:true});
 expect(getDay(checkMorning(data,key,'min'),key).paid.morning).toBe(5);
 expect(getDay(checkMorning(data,key,'full',2),key).paid.morning).toBe(10);
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
