import {Rating} from 'ts-fsrs';
import {addDeck,answerWord,emptyData,getDay,planStudy,routineDay} from '../lib/routineModel';
import {advanceHabitOrder,HabitGoal,initializeHabitOrder,saveHabitOrderPolicy,validHabitSequence} from '../lib/habitOrder';
import {saveBookNote,settleBookTimer,startBookTimer,startBookBreak} from '../lib/bookStudy';
import {canUndoStudy,undoStudyAnswer,validateStudyState} from '../lib/studyHistory';
const now=new Date(2026,10,1,9),key=routineDay(now),sequence:HabitGoal[]=['focus:전기공사기사 실기','focus:수능','words'];
function seed(){let data=planStudy(addDeck(emptyData(),'일본어',[{front:'本',back:'책'}],'ja',now),key);data.habitOrderPolicy={enabled:true,sequence};data=initializeHabitOrder(data,key);data.days[key].orderProgress!.focusBasis=undefined;return data;}
function transition(data:ReturnType<typeof seed>,fn:(s:ReturnType<typeof seed>)=>ReturnType<typeof seed>){return advanceHabitOrder(data,fn(data),key)}
function book(data:ReturnType<typeof seed>,id:string,subject:string,time:number,seconds=1500){data=transition(data,s=>startBookTimer(s,id,subject,time,seconds,'standard'));data=transition(data,s=>startBookBreak(s,time+seconds*1000));data=transition(data,s=>saveBookNote(s,id,'기출을 풀었어요','다음 5번',new Date(time+seconds*1000)));return transition(data,s=>settleBookTimer(s,time+(seconds+300)*1000));}
test('different subjects each require an actual completed session and note, then award exactly 60 once',()=>{
 let data=book(seed(),'electric','전기공사기사 실기',now.getTime());expect(getDay(data,key).orderProgress?.step).toBe(1);expect(getDay(data,key).bonus?.order??0).toBe(0);
 data=book(data,'exam','수능',now.getTime()+1800000);expect(getDay(data,key).orderProgress?.step).toBe(2);
 data=answerWord(data,key,'ja:0',Rating.Easy,new Date(now.getTime()+3600000),1);expect(getDay(data,key).bonus?.order).toBe(60);expect(getDay(data,key).paid.words).toBe(0);expect(getDay(data,key).orderProgress?.status).toBe('complete');
 data=transition(data,s=>({...s}));expect(getDay(data,key).bonus?.order).toBe(60);expect(()=>validateStudyState(JSON.parse(JSON.stringify(data)))).not.toThrow();
});
test('starting a later subject first preserves ordinary rewards but cannot recover the order bonus that day',()=>{
 let data=book(seed(),'exam','수능',now.getTime());data=book(data,'electric','전기공사기사 실기',now.getTime()+1800000);data=answerWord(data,key,'ja:0',Rating.Easy,new Date(now.getTime()+3600000),1);
 expect(getDay(data,key).bonus?.order??0).toBe(0);expect(getDay(data,key).paid.words).toBe(0);expect(getDay(data,key).bonus?.book).toBe(10);expect(getDay(data,key).orderProgress?.status).toBe('outOfOrder');
});
test('Again counts as beginning vocabulary, not completing it or bypassing earlier hard study',()=>{
 const data=answerWord(seed(),key,'ja:0',Rating.Again,now,1);expect(getDay(data,key).orderProgress?.status).toBe('outOfOrder');expect(getDay(data,key).paid.words).toBe(0);expect(getDay(data,key).bonus?.order??0).toBe(0);
});
test('a short focus session and timer expiration without a note never advance the order',()=>{
 let data=book(seed(),'short','전기공사기사 실기',now.getTime(),900);expect(getDay(data,key).orderProgress?.step).toBe(0);data=transition(data,s=>startBookTimer(s,'long','전기공사기사 실기',now.getTime()+1200000));data=transition(data,s=>settleBookTimer(s,now.getTime()+2700000));expect(getDay(data,key).orderProgress?.step).toBe(0);
});
test('editing a sequence after starting applies next day and cannot restart or duplicate today rewards',()=>{
 let data=book(seed(),'electric','전기공사기사 실기',now.getTime()),snapshot=getDay(data,key).orderProgress;data=saveHabitOrderPolicy(data,key,{enabled:true,sequence:['focus:수능','words']});expect(getDay(data,key).orderProgress).toEqual(snapshot);
 const tomorrow='2026-11-02';data=initializeHabitOrder(data,tomorrow);expect(getDay(data,tomorrow).orderProgress?.sequence).toEqual(['focus:수능','words']);expect(getDay(data,tomorrow).bonus?.order??0).toBe(0);
});
test('legacy practice is not assigned invented chronological order or retroactive 60 minutes',()=>{
 let data=seed();delete data.days[key].orderProgress;data.days[key].responses=1;data=initializeHabitOrder(data,key);expect(getDay(data,key).orderProgress?.status).toBe('untracked');expect(getDay(data,key).bonus?.order??0).toBe(0);
});
test('undo reverses the final vocabulary reward and order bonus together; grading again pays once',()=>{
 let data=book(seed(),'electric','전기공사기사 실기',now.getTime());data=book(data,'exam','수능',now.getTime()+1800000);const at=new Date(now.getTime()+3600000);data=answerWord(data,key,'ja:0',Rating.Easy,at,1);expect(canUndoStudy(data,key)).toBe(true);
 const before=data;data=undoStudyAnswer(data,key,at);data=advanceHabitOrder(before,data,key);expect(getDay(data,key).bonus?.order??0).toBe(0);expect(getDay(data,key).paid.words).toBe(0);expect(getDay(data,key).orderProgress?.step).toBe(2);
 data=answerWord(data,key,'ja:0',Rating.Easy,at,1);expect(getDay(data,key).bonus?.order).toBe(60);expect(()=>validateStudyState(data)).not.toThrow();
});
test('sequence validation supports a custom subject while blocking duplicate or ambiguous focus steps',()=>{
 expect(validHabitSequence(['focus:수학 기출','words'])).toBe(true);expect(validHabitSequence(['morning','words'])).toBe(false);expect(validHabitSequence(['book','focus:수능'])).toBe(false);expect(validHabitSequence(['focus:수능','focus:수능'])).toBe(false);
});
