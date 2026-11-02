import {Rating} from 'ts-fsrs';
import {addDeck,answerWord,answerAdditionalWord,emptyData,getDay,planStudy,routineDay,nextStudyWord,nextAdditionalWord,startAdditionalStudy,earned} from '../lib/routineModel';
import {initializeWordRewards,wordRewardStatus,reconcileAdditionalRewards} from '../lib/studyRewards';
import {undoStudyAnswer,validateStudyState} from '../lib/studyHistory';
const now=new Date(2026,10,1,9),key=routineDay(now);
function seed(count=200){let data=addDeck(emptyData(),'test',Array.from({length:count},(_,i)=>({front:`w${i}`,back:'meaning'})),'test',now);data.newLimit=count;return planStudy(data,key);}
function finish(data:ReturnType<typeof seed>,count:number){for(let i=0;i<count;i++)data=answerWord(data,key,nextStudyWord(data,key,'full',now)!.id,Rating.Easy,now,1);return data;}
test('each successive five-minute award needs exactly five more cards: 10,15,20,25',()=>{
 let data=seed();for(const required of [10,15,20,25]){
  expect(wordRewardStatus(data,key).required).toBe(required);const earned=wordRewardStatus(data,key).earned;
  data=finish(data,required-1);expect(wordRewardStatus(data,key).earned).toBe(earned);
  data=finish(data,1);expect(wordRewardStatus(data,key).earned).toBe(earned+5);
 }
});
test('daily cards pay at cumulative 10,25,45,70,100,135,175; no fixed goal award',()=>{
 let data=seed();const milestones=new Map([[9,0],[10,5],[24,5],[25,10],[45,15],[70,20],[100,25],[135,30],[175,35],[200,35]]);
 for(let i=1;i<=200;i++){data=finish(data,1);if(milestones.has(i))expect(earned(getDay(data,key))).toBe(milestones.get(i));}
 expect(wordRewardStatus(data,key)).toMatchObject({required:45,pending:25,untilNext:20,rounds:7});
 validateStudyState(JSON.parse(JSON.stringify(data)));
});
test('daily and additional decks share one counter and survive restarts',()=>{
 let data=seed(40);data.newLimit=7;delete data.days[key].plan;data=planStudy(data,key);data=finish(data,7);
 data=startAdditionalStudy(data,key,'new',18,now);
 for(let i=0;i<18;i++){data=JSON.parse(JSON.stringify(data));data=reconcileAdditionalRewards(data,key);data=answerAdditionalWord(data,key,nextAdditionalWord(data,key,now)!.id,Rating.Easy,now,1);}
 expect(wordRewardStatus(data,key)).toMatchObject({earned:10,rounds:2,pending:0,required:20});
 expect(reconcileAdditionalRewards(data,key)).toBe(data);
});
test('Again and same-day re-learning never inflate counted cards',()=>{
 let data=seed(20);const id=nextStudyWord(data,key,'full',now)!.id;
 data=answerWord(data,key,id,Rating.Again,now,1);
 expect(wordRewardStatus(data,key).pending).toBe(0);
 data=finish(data,1);const counted=getDay(data,key).wordRewards!.countedIds[0];
 const same=answerWord(data,key,counted,Rating.Easy,now,1);
 expect(same).toBe(data);expect(wordRewardStatus(same,key).pending).toBe(1);
});
test('undo at a tier restores both minutes and tier progress, answering again pays once',()=>{
 let data=finish(seed(20),10);expect(getDay(data,key).paid.words).toBe(5);
 data=undoStudyAnswer(data,key,now);expect(wordRewardStatus(data,key)).toMatchObject({earned:0,pending:9,rounds:0});
 data=finish(data,1);expect(wordRewardStatus(data,key)).toMatchObject({earned:5,pending:0,rounds:1});validateStudyState(data);
});
test('migration retains existing money, excludes old completions and preserves unpaid remainder',()=>{
 let data=seed(30);data.days[key]={...getDay(data,key),paid:{morning:5,words:20,gym:0},complete:['test:0','test:1'],bonus:{words:40},extraPendingIds:['test:1']};
 data=initializeWordRewards(data,key);expect(earned(getDay(data,key))).toBe(65);
 expect(wordRewardStatus(data,key)).toMatchObject({pending:1,rounds:0,required:10});
 data=finish(data,9);expect(wordRewardStatus(data,key).earned).toBe(65);
});
test('new learning day starts at 10 while past records remain, and grants exceed 60',()=>{
 let data=seed(2000);data=finish(data,600);expect(earned(getDay(data,key))).toBeGreaterThan(60);
 const next='2026-11-02';expect(wordRewardStatus(data,next)).toMatchObject({required:10,pending:0,earned:0});expect(getDay(data,key).paid.words).toBeGreaterThan(60);
});
