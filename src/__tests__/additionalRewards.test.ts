import { Rating,State } from 'ts-fsrs';
import { addDeck,additionalCandidates,answerAdditionalWord,answerWord,emptyData,getDay,nextAdditionalWord,planStudy,routineDay,startAdditionalStudy } from '../lib/routineModel';
import { additionalRewardStatus,reconcileAdditionalRewards } from '../lib/studyRewards';
const now=new Date(2026,9,30,9),key=routineDay(now);
function seed(count=55){let data=addDeck(emptyData(),'일본어',Array.from({length:count},(_,i)=>({front:`w${i}`,back:'뜻'})),'ja',now);data.newLimit=1;return planStudy(data,key);}
function finishBatch(data:ReturnType<typeof seed>,deckId?:string){for(let i=0;i<100;i++){const word=nextAdditionalWord(data,key,now,deckId);if(!word)return data;data=answerAdditionalWord(data,key,word.id,Rating.Easy,now,1,deckId);}throw Error('Queue failed to finish');}

test('custom batch sizes keep the daily goal and carry unfinished reward groups into the next batch',()=>{
 let data=seed(100);const original=getDay(data,key).plan;
 data=finishBatch(startAdditionalStudy(data,key,'new',7,now));
 expect(getDay(data,key).bonus?.words??0).toBe(0);expect(additionalRewardStatus(data,key).pending).toBe(7);
 data=finishBatch(startAdditionalStudy(data,key,'new',3,now));
 expect(getDay(data,key).bonus?.words).toBe(5);expect(getDay(data,key).plan).toEqual(original);
 data=startAdditionalStudy(data,key,'new',60,now);expect(getDay(data,key).additional?.ids).toHaveLength(60);
 expect(()=>startAdditionalStudy(seed(),key,'new',1.5,now)).toThrow();
});
test('extra rewards work without hidden opt-in and sync in exact five-minute increments',()=>{
 let data=seed();data=answerWord(data,key,'ja:0',Rating.Easy,now,1);data=startAdditionalStudy(data,key,'new',10,now);
 for(let i=0;i<9;i++)data=answerAdditionalWord(data,key,nextAdditionalWord(data,key,now)!.id,Rating.Easy,now,1);
 expect(additionalRewardStatus(data,key)).toMatchObject({enabled:true,minutes:0,pending:9,untilNext:1});
 data=finishBatch(data);expect(getDay(data,key).bonus?.words).toBe(5);expect(getDay(data,key).paid.words).toBe(20);
 for(let batch=0;batch<4;batch++)data=finishBatch(startAdditionalStudy(data,key,'new',10,now));
 expect(getDay(data,key).bonus?.words).toBe(25);expect(getDay(data,key).additional?.completedIds).toHaveLength(50);
 expect(reconcileAdditionalRewards(JSON.parse(JSON.stringify(data)),key)).toEqual(data);
});
test('stored extra completions recover across batches and decks without replay or duplicate rewards',()=>{
 let data=seed();data=addDeck(data,'영어',Array.from({length:6},(_,i)=>({front:`e${i}`,back:'뜻'})),'en',now);
 const ja=Array.from({length:6},(_,i)=>`ja:${i+1}`),en=Array.from({length:4},(_,i)=>`en:${i}`);
 data.days[key]={...getDay(data,key),additional:{kind:'review',ids:ja.slice(4),complete:ja.slice(4),completedIds:ja,responses:8},additionalByDeck:{en:{kind:'new',ids:en,complete:en,completedIds:en,responses:4}}};
 const recovered=reconcileAdditionalRewards(data,key);expect(getDay(recovered,key).bonus?.words).toBe(5);expect(getDay(recovered,key).rewardedStudyIds).toHaveLength(10);
 expect(recovered.words).toBe(data.words);expect(reconcileAdditionalRewards(recovered,key)).toBe(recovered);
});
test('daily cards and repeated cards never earn extra; unused review cards come first',()=>{
 let data=seed(22);data.words=data.words.map(w=>({...w,card:{...w.card,state:State.Review}}));
 data.days[key]={...getDay(data,key),rewardedStudyIds:['ja:1'],extraPendingIds:['ja:2']};
 const candidates=additionalCandidates(data,key,'review');expect(candidates.slice(0,19).every(w=>!['ja:0','ja:1','ja:2'].includes(w.id))).toBe(true);
 const ids=['ja:0',...Array.from({length:10},(_,i)=>`ja:${i+3}`)];data.days[key].additional={kind:'review',ids,complete:ids,completedIds:ids,responses:11};
 data=reconcileAdditionalRewards(data,key);expect(getDay(data,key).bonus?.words).toBe(5);expect(getDay(data,key).rewardedStudyIds).not.toContain('ja:0');
});
test('explicitly disabled rewards stay disabled; quick cards never leak into normal bonus',()=>{
 let data=seed();const ids=Array.from({length:10},(_,i)=>`ja:${i+1}`);data.days[key].additional={kind:'new',ids,complete:ids,completedIds:ids,responses:10};
 data.studyRewardPolicy={extraEnabled:false,quickEnabled:false};expect(reconcileAdditionalRewards(data,key)).toBe(data);
 delete data.studyRewardPolicy;data.days[key].additional={kind:'quick',ids:ids.slice(0,3),complete:ids.slice(0,3),completedIds:ids.slice(0,3),responses:3};
 expect(reconcileAdditionalRewards(data,key)).toBe(data);
});
test('Again and same-day Good repetitions do not count as completed cards or rewards',()=>{
 let data=startAdditionalStudy(seed(),key,'new',10,now);
 data=answerAdditionalWord(data,key,nextAdditionalWord(data,key,now)!.id,Rating.Again,now,1);
 expect(getDay(data,key).additional?.complete).toHaveLength(0);expect(getDay(data,key).extraPendingIds??[]).toHaveLength(0);
 const current=nextAdditionalWord(data,key,now)!;data=answerAdditionalWord(data,key,current.id,Rating.Good,now,1);
 expect(getDay(data,key).additional?.complete).toHaveLength(0);expect(getDay(data,key).additional?.responses).toBe(2);
 data=finishBatch(data);expect(getDay(data,key).additional?.complete).toHaveLength(10);expect(getDay(data,key).bonus?.words).toBe(5);
});
test('Again at the 04:00 boundary does not become a completion merely because its due crosses the day',()=>{
 const late=new Date(2026,9,31,3,59,45);let data=startAdditionalStudy(seed(),key,'new',10,late);
 const id=nextAdditionalWord(data,key,late)!.id;data=answerAdditionalWord(data,key,id,Rating.Again,late,1);
 expect(getDay(data,key).additional?.complete).toHaveLength(0);expect(getDay(data,key).bonus?.words??0).toBe(0);
 let daily=seed();daily=answerWord(daily,key,'ja:0',Rating.Again,late,1);expect(getDay(daily,key).complete).toHaveLength(0);expect(getDay(daily,key).paid.words).toBe(0);
});
