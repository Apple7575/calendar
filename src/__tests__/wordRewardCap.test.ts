import {Rating} from 'ts-fsrs';
import {addDeck,answerAdditionalWord,emptyData,getDay,nextAdditionalWord,planStudy,routineDay,startAdditionalStudy} from '../lib/routineModel';
import {wordRewardBudget,wordDailyCap} from '../lib/studyRewards';
const now=new Date(2026,10,1,9),key=routineDay(now);
test('legacy 60-minute cap is ignored and 700 additional completions keep earning',()=>{
 let data=addDeck(emptyData(),'d',Array.from({length:701},(_,i)=>({front:`w${i}`,back:'m'})),'d',now);data.newLimit=1;data=planStudy(data,key);
 data.studyRewardPolicy={extraEnabled:false,quickEnabled:false,wordDailyCap:20};data.days[key].wordRewardCap=20;
 data=startAdditionalStudy(data,key,'new',700,now);
 for(let i=0;i<700;i++)data=answerAdditionalWord(data,key,nextAdditionalWord(data,key,now)!.id,Rating.Easy,now,1);
 expect(wordDailyCap(data,key)).toBe(0);expect(wordRewardBudget(data,key)).toMatchObject({cap:Infinity,earned:75,remaining:Infinity});expect(getDay(data,key).additional?.complete).toHaveLength(700);
});
