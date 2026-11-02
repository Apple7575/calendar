import {Rating} from 'ts-fsrs';
import {addDeck,answerAdditionalWord,answerWord,emptyData,getDay,nextAdditionalWord,planStudy,routineDay,startAdditionalStudy} from '../lib/routineModel';
import {additionalRewardStatus,reconcileAdditionalRewards,initializeWordRewards} from '../lib/studyRewards';
const now=new Date(2026,9,30,9),key=routineDay(now);
function seed(){let data=addDeck(emptyData(),'d',Array.from({length:100},(_,i)=>({front:`w${i}`,back:'m'})),'d',now);data.newLimit=1;return planStudy(data,key);}
function batch(data:ReturnType<typeof seed>,count:number,deck?:string){data=startAdditionalStudy(data,key,'new',count,now,deck);for(let i=0;i<count;i++)data=answerAdditionalWord(data,key,nextAdditionalWord(data,key,now,deck)!.id,Rating.Easy,now,1,deck);return data;}
test('custom batches retain remainder and do not overwrite the frozen daily goal',()=>{
 let data=seed();const plan=getDay(data,key).plan;data=batch(data,7);expect(additionalRewardStatus(data,key)).toMatchObject({pending:7,earned:0});data=batch(data,3);expect(additionalRewardStatus(data,key)).toMatchObject({pending:0,earned:5,required:15});expect(getDay(data,key).plan).toEqual(plan);expect(()=>startAdditionalStudy(data,key,'new',1.5,now)).toThrow();
});
test('normal and per-deck additional queues share a tier with the base goal',()=>{
 let data=answerWord(seed(),key,'d:0',Rating.Easy,now,1);data=batch(data,9,'d');expect(additionalRewardStatus(data,key)).toMatchObject({earned:5,pending:0,required:15});data=batch(data,15);expect(additionalRewardStatus(data,key).earned).toBe(10);
 const saved=JSON.parse(JSON.stringify(data));expect(reconcileAdditionalRewards(saved,key)).toBe(saved);
});
test('legacy completions across decks are marked counted without issuing retroactive money',()=>{
 let data=seed();const ids=Array.from({length:10},(_,i)=>`d:${i+1}`);data.days[key].additional={kind:'new',ids,complete:ids,completedIds:ids,responses:10};data=reconcileAdditionalRewards(data,key);expect(additionalRewardStatus(data,key).earned).toBe(0);expect(getDay(data,key).wordRewards?.countedIds).toEqual(ids);expect(reconcileAdditionalRewards(data,key)).toBe(data);
});
test('completed cards cannot be rewarded twice even if selected again',()=>{
 let data=batch(seed(),10);const id=getDay(data,key).additional!.ids[0];expect(answerAdditionalWord(data,key,id,Rating.Easy,now,1)).toBe(data);expect(additionalRewardStatus(data,key).earned).toBe(5);
});
test('legacy unpaid remainder survives initialization without duplicating completed cards',()=>{
 let data=seed();data.days[key].extraPendingIds=['d:1','d:2'];data=initializeWordRewards(data,key);expect(additionalRewardStatus(data,key)).toMatchObject({pending:2,untilNext:8});
});
