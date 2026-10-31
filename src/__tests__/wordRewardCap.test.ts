import {Rating,State} from 'ts-fsrs';
import {addDeck,answerAdditionalWord,answerWord,emptyData,getDay,nextAdditionalWord,planStudy,routineDay,startAdditionalStudy} from '../lib/routineModel';
import {applyAdditionalReward,reconcileAdditionalRewards,wordRewardBudget} from '../lib/studyRewards';
const now=new Date(2026,10,1,9),key=routineDay(now);
function seed(){let data=addDeck(emptyData(),'단어',Array.from({length:120},(_,i)=>({front:`w${i}`,back:'뜻'})),'d',now);data.newLimit=1;return planStudy(data,key)}
function extra(data:ReturnType<typeof seed>,count=10){data=startAdditionalStudy(data,key,'new',count,now);for(let i=0;i<count;i++){const w=nextAdditionalWord(data,key,now);if(!w)break;data=answerAdditionalWord(data,key,w.id,Rating.Easy,now,1)}return data;}
test('default goal plus all extra vocabulary rewards stops at 60, while study continues',()=>{
 let data=answerWord(seed(),key,'d:0',Rating.Easy,now,1);data=extra(data,100);expect(wordRewardBudget(data,key)).toMatchObject({cap:60,earned:60,remaining:0});expect(getDay(data,key).additional?.complete).toHaveLength(100);
 const recovered=reconcileAdditionalRewards(JSON.parse(JSON.stringify(data)),key);expect(wordRewardBudget(recovered,key).earned).toBe(60);
});
test('doing extras first reserves the basic goal budget rather than allowing 60 plus 20',()=>{
 let data=extra(seed(),100);expect(wordRewardBudget(data,key)).toMatchObject({earned:40,remaining:0});data=answerWord(data,key,'d:0',Rating.Easy,now,1);expect(wordRewardBudget(data,key).earned).toBe(60);
});
test('quick review shares the vocabulary cap and cannot hide extra rewards above it',()=>{
 let data=seed();data.studyRewardPolicy={extraEnabled:true,quickEnabled:true};data.days[key].paid.words=20;data.days[key].bonus={words:35};data.words=data.words.map(w=>({...w,card:{...w.card,state:State.Review}}));
 for(const ids of [['d:1','d:2','d:3'],['d:4','d:5','d:6']]){const plan={kind:'quick' as const,ids,complete:ids,completedIds:ids,responses:3};data=applyAdditionalReward(data,key,ids[0],plan)}
 expect(wordRewardBudget(data,key)).toMatchObject({earned:59,remaining:1});const ids=Array.from({length:10},(_,i)=>`d:${i+10}`),plan={kind:'review' as const,ids,complete:ids,completedIds:ids,responses:10};for(const id of ids)data=applyAdditionalReward(data,key,id,plan);expect(wordRewardBudget(data,key).earned).toBe(59);
});
test('previously paid time above the new cap is preserved, but cannot keep earning extra',()=>{
 let data=seed();data.days[key].paid.words=20;data.days[key].bonus={words:70};data=extra(data,10);expect(getDay(data,key).bonus?.words).toBe(70);expect(wordRewardBudget(data,key).remaining).toBe(0);
});
