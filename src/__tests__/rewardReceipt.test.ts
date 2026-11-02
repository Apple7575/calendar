import {Rating} from 'ts-fsrs';
import {addDeck,answerAdditionalWord,answerWord,emptyData,getDay,nextAdditionalWord,planStudy,routineDay,startAdditionalStudy,flagWord,additionalProgress} from '../lib/routineModel';
import {wordRewardStatus} from '../lib/studyRewards';
import {extraReceipt,goalReceipt} from '../lib/rewardReceipt';
import {undoStudyAnswer,validateStudyState} from '../lib/studyHistory';
const now=new Date(2026,9,31,9),key=routineDay(now);
function seed(){let d=addDeck(emptyData(),'d',Array.from({length:150},(_,i)=>({front:`w${i}`,back:'m'})),'d',now);d.newLimit=1;return answerWord(planStudy(d,key),key,'d:0',Rating.Easy,now,1);}
function run(d:ReturnType<typeof seed>,count:number){d=startAdditionalStudy(d,key,'new',count,now);for(let i=0;i<count;i++)d=answerAdditionalWord(d,key,nextAdditionalWord(d,key,now)!.id,Rating.Easy,now,1);return d;}
test('receipt shows actual progressive batch grant and survives reload',()=>{let d=run(seed(),100);expect(extraReceipt(d,key,getDay(d,key).additional)).toMatchObject({granted:25,withheld:0,budget:{earned:25,cap:Infinity}});d=JSON.parse(JSON.stringify(d));expect(extraReceipt(d,key,getDay(d,key).additional).reason).toContain('34장');validateStudyState(d);});
test('batch without a threshold shows zero and how many cards remain',()=>{const d=run(seed(),3);expect(extraReceipt(d,key,getDay(d,key).additional)).toMatchObject({granted:0,withheld:0});expect(extraReceipt(d,key,getDay(d,key).additional).reason).toContain('6장');});
test('undo at the threshold reverses receipt and tier, then pays exactly once',()=>{let d=run(seed(),9);expect(getDay(d,key).additional?.reward?.granted).toBe(5);d=undoStudyAnswer(d,key,now);expect(getDay(d,key).additional?.reward?.granted).toBe(0);d=answerAdditionalWord(d,key,nextAdditionalWord(d,key,now)!.id,Rating.Easy,now,1);expect(getDay(d,key).additional?.reward?.granted).toBe(5);});
test('morning small-to-full receipt retains the difference rule; words describe the next tier',()=>{const d=seed();d.days[key].paid.morning=10;expect(goalReceipt(d,key,'morning','full',5).reason).toContain('차액');expect(goalReceipt(d,key,'morning','full',0).reason).toContain('이미 받았어요');expect(goalReceipt(d,key,'words','full',0).reason).toContain('9장');});
test('two excluded cards in a 20-card tier leave two to earn, even when the batch is finished',()=>{
 let d=run(seed(),24);expect(wordRewardStatus(d,key)).toMatchObject({required:20,pending:0,earned:10});
 d=startAdditionalStudy(d,key,'new',20,now);const ids=getDay(d,key).additional!.ids;
 for(const id of ids.slice(0,2))d=flagWord(d,id,['wordAudio'],'',now,key);
 for(let i=0;i<18;i++)d=answerAdditionalWord(d,key,nextAdditionalWord(d,key,now)!.id,Rating.Easy,now,1);
 expect(additionalProgress(d,key)).toMatchObject({full:true,done:18,excluded:2});
 expect(wordRewardStatus(d,key)).toMatchObject({required:20,pending:18,untilNext:2,earned:10});
 expect(extraReceipt(d,key,getDay(d,key).additional)).toMatchObject({granted:0,withheld:0});
 expect(extraReceipt(d,key,getDay(d,key).additional).reason).toContain('2장');
 d=run(JSON.parse(JSON.stringify(d)),2);expect(wordRewardStatus(d,key)).toMatchObject({required:25,pending:0,untilNext:25,earned:15});
});
