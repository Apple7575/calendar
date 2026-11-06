import { Rating } from 'ts-fsrs';
import { addDeck,answerAdditionalWord,answerWord,checkMorning,earn,emptyData,getDay,nextAdditionalWord,planStudy,routineDay,startAdditionalStudy } from '../lib/routineModel';
import { canUndoStudy,reviewEvents,undoStudyAnswer,validateStudyState } from '../lib/studyHistory';
import { completedStudyIds } from '../lib/routineModel';
import { reconcileAdditionalRewards } from '../lib/studyRewards';
const now=new Date(2026,9,30,9),key=routineDay(now);
function seed(count=1){return planStudy(addDeck(emptyData(),'test',Array.from({length:count},(_,i)=>({front:`w${i}`,back:'뜻'})),'d',now),key);}
test('Again is an event, not a completion; undo restores FSRS and aggregate counters after restart',()=>{
 const before=seed(),after=answerWord(before,key,'d:0',Rating.Again,now,7),e=reviewEvents(after)[0];
 expect(e).toMatchObject({grade:Rating.Again,phase:'new',completed:false,seconds:7});expect(completedStudyIds(getDay(after,key))).toEqual([]);
 const restored=JSON.parse(JSON.stringify(after));expect(canUndoStudy(restored,key)).toBe(true);
 const undone=undoStudyAnswer(restored,key,now);expect(undone.words[0].card).toEqual(before.words[0].card);expect(getDay(undone,key).responses).toBe(0);expect(getDay(undone,key).studySeconds).toBe(0);
 expect(reviewEvents(undone)).toHaveLength(0);expect(reviewEvents(undone,{includeVoided:true})[0].voidedAt).toBe(now.toISOString());expect(()=>undoStudyAnswer(undone,key,now)).toThrow();
});
test('undo reverses the last study reward but preserves gym, morning, book and card annotations',()=>{
 let data=answerWord(seed(),key,'d:0',Rating.Easy,now,4);data=earn(data,key,'gym','full');data=checkMorning(data,key,'full',0);
 data.days[key].bonus={...data.days[key].bonus,book:10};data.words[0]={...data.words[0],favorite:true,back:'수정한 뜻'};
 const undone=undoStudyAnswer(data,key,now);expect(getDay(undone,key).paid).toEqual({words:0,gym:30,morning:0});expect(getDay(undone,key).bonus?.book).toBe(10);expect(getDay(undone,key).morning[0]).toBe(true);expect(undone.words[0].favorite).toBe(true);expect(undone.words[0].back).toBe('수정한 뜻');
});
test('a tier-crossing additional completion can be undone and regraded without phantom rewards',()=>{
 let data=seed(11);data.newLimit=1;data.days={};data=planStudy(data,key);data=answerWord(data,key,'d:0',Rating.Easy,now,1);data=startAdditionalStudy(data,key,'new',9,now,'d');
 for(let i=0;i<9;i++)data=answerAdditionalWord(data,key,nextAdditionalWord(data,key,now,'d')!.id,Rating.Easy,now,1,'d');
 expect(getDay(data,key).bonus?.words).toBe(5);const id=data.studyUndo!.wordId;data=reconcileAdditionalRewards(undoStudyAnswer(data,key,now),key);
 expect(getDay(data,key).bonus?.words??0).toBe(0);expect(getDay(data,key).wordRewards?.pendingIds).toHaveLength(9);expect(getDay(data,key).additionalByDeck?.d.complete).toHaveLength(8);
 data=answerAdditionalWord(data,key,id,Rating.Easy,now,1,'d');expect(getDay(data,key).bonus?.words).toBe(5);expect(getDay(data,key).wordRewards?.countedIds).toHaveLength(10);expect(reviewEvents(data).filter(e=>e.mode==='additional')).toHaveLength(9);
});
test('a new batch or learning-day boundary invalidates the previous undo',()=>{
 let data=seed(12);data.newLimit=1;data.days={};data=planStudy(data,key);data=answerWord(data,key,'d:0',Rating.Easy,now,1);
 expect(()=>undoStudyAnswer(data,key,new Date(2026,9,31,4))).toThrow();data=startAdditionalStudy(data,key,'new',10,now);expect(canUndoStudy(data,key)).toBe(false);
});
test('history filters isolate decks and cards without altering saved events',()=>{
 let data=seed();data=addDeck(data,'English',[{front:'apple',back:'사과'}],'en',now);data.days={};data=planStudy(data,key);
 data=answerWord(data,key,'d:0',Rating.Easy,now,1);data=answerWord(data,key,'en:0',Rating.Easy,now,2);
 expect(reviewEvents(data,{deckId:'d'})).toHaveLength(1);expect(reviewEvents(data,{wordId:'en:0'})[0].seconds).toBe(2);expect(reviewEvents(data,{day:'2026-10-29'})).toHaveLength(0);
});
test('backup validation accepts real undo records and rejects forged rollback and duplicate events',()=>{
 const data=answerWord(seed(),key,'d:0',Rating.Easy,now,2);expect(()=>validateStudyState(JSON.parse(JSON.stringify(data)))).not.toThrow();
 const bad=JSON.parse(JSON.stringify(data));bad.studyUndo.before.responses=-1;expect(()=>validateStudyState(bad)).toThrow();
 const replay={...data,reviewHistory:[...data.reviewHistory!,data.reviewHistory![0]]};expect(()=>validateStudyState(replay)).toThrow();
 const undone=undoStudyAnswer(data,key,now);expect(()=>validateStudyState({...undone,pendingStudyAdjustment:{eventId:data.studyUndo!.eventId,day:key,from:{words:20,extra:0,quick:0},to:{words:0,extra:0,quick:0}}})).not.toThrow();
 expect(()=>validateStudyState({...undone,pendingStudyAdjustment:{eventId:'unrelated',day:key,from:{words:20,extra:0,quick:0},to:{words:0,extra:0,quick:0}}})).toThrow();
});
