import {Rating,State} from 'ts-fsrs';
import {addDeck,additionalProgress,answerAdditionalWord,answerWord,canStudyWord,emptyData,flagWord,getDay,nextAdditionalWord,nextStudyWord,pendingWords,planStudy,reconcileStudyExclusions,routineDay,setWordStudyStatus,startAdditionalStudy,studyProgress} from '../lib/routineModel';
const now=new Date(2026,10,1,9),key=routineDay(now);
function seed(n=3){return planStudy(addDeck(emptyData(),'단어',Array.from({length:n},(_,i)=>({front:`w${i}`,back:'뜻'})),'deck',now),key)}
test('one report immediately removes an already planned card without answering or paying',()=>{
 let data=seed(),card=data.words[0].card,plan=getDay(data,key).plan;data=flagWord(data,'deck:0',['wordAudio'],'',now);
 expect(getDay(data,key).plan).toEqual(plan);expect(data.words[0].card).toEqual(card);expect(nextStudyWord(data,key,'full',now)?.id).toBe('deck:1');expect(getDay(data,key).responses).toBe(0);expect(getDay(data,key).paid.words).toBe(0);expect(studyProgress(getDay(data,key))).toMatchObject({total:2,done:0,excluded:1,full:false});
 expect(answerWord(data,key,'deck:0',Rating.Easy,now,1)).toBe(data);
});
test('all reported or suspended cards do not create a completed goal or free reward',()=>{
 let data=seed();for(const word of data.words)data=setWordStudyStatus(data,word.id,'suspend',key);
 expect(pendingWords(data,key,'full')).toHaveLength(0);expect(studyProgress(getDay(data,key))).toMatchObject({total:0,done:0,excluded:3,full:false,min:false});expect(getDay(data,key).paid.words).toBe(0);
});
test('bury lasts through 03:59 and returns at 04:00 without changing due or FSRS',()=>{
 let data=seed(1),card=data.words[0].card;data=setWordStudyStatus(data,'deck:0','bury',key);
 expect(canStudyWord(data.words[0],routineDay(new Date(2026,10,2,3,59)))).toBe(false);
 const nextKey=routineDay(new Date(2026,10,2,4));expect(canStudyWord(data.words[0],nextKey)).toBe(true);expect(nextStudyWord(planStudy(data,nextKey),nextKey,'full',new Date(2026,10,2,4))?.id).toBe('deck:0');expect(data.words[0].card).toEqual(card);
});
test('clearing a report never silently clears a separate manual suspension',()=>{
 let data=setWordStudyStatus(seed(1),'deck:0','suspend',key);data=flagWord(data,'deck:0',['meaning'],'',now);data=flagWord(data,'deck:0',[],'',now);
 expect(canStudyWord(data.words[0],key)).toBe(false);data=setWordStudyStatus(data,'deck:0','restore',key);expect(nextStudyWord(data,key,'full',now)?.id).toBe('deck:0');expect(getDay(data,key).excludedStudyIds).toEqual([]);
});
test('reporting in an additional batch advances the queue but never counts as a completion',()=>{
 let data=seed(13);data.newLimit=1;data.days[key].plan={ids:['deck:0'],reviewIds:[],newLimit:1};data=startAdditionalStudy(data,key,'new',10,now);
 const id=nextAdditionalWord(data,key,now)!.id;data=flagWord(data,id,['example'],'',now);expect(nextAdditionalWord(data,key,now)?.id).not.toBe(id);expect(additionalProgress(data,key)).toMatchObject({total:9,done:0,excluded:1});
 for(let i=0;i<9;i++)data=answerAdditionalWord(data,key,nextAdditionalWord(data,key,now)!.id,Rating.Easy,now,1);
 expect(additionalProgress(data,key)).toMatchObject({done:9,full:true});expect(getDay(data,key).bonus?.words??0).toBe(0);expect(getDay(data,key).wordRewards?.pendingIds).toHaveLength(9);
});
test('previously saved reports are excluded on hydration, including current relearning queues',()=>{
 let data=seed(1);data.words[0]={...data.words[0],card:{...data.words[0].card,state:State.Relearning},issue:{categories:['audio'],note:'기존 신고',updatedAt:now.toISOString()}};
 data=reconcileStudyExclusions(JSON.parse(JSON.stringify(data)),key);expect(nextStudyWord(data,key,'full',now)).toBeUndefined();expect(getDay(data,key).excludedStudyIds).toEqual(['deck:0']);
});
