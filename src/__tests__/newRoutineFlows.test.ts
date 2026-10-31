jest.mock('../lib/supabase',()=>({supabase:{}}));
import { makeBackup,validateBackup } from '../lib/routineBackup';
import { emptyData,getDay,routineDay,addDeck,planStudy,answerWord,answerAdditionalWord,startAdditionalStudy,nextAdditionalWord } from '../lib/routineModel';
import { pauseBookTimer,resumeBookTimer,saveBookNote,settleBookTimer,startBookTimer } from '../lib/bookStudy';
import { completeGuidedStep,startGuidedStep,SUGGESTED_EVENING,saveEveningSteps } from '../lib/dailyPlan';
import { mergeLearningSummaries,validateLearningSummary } from '../lib/learningSummary';
import { Rating } from 'ts-fsrs';
const now=new Date(2026,9,30,9),key=routineDay(now);
test('a legacy focus and break survive relaunch and preserve the former note reward once',()=>{
 let data=startBookTimer(emptyData(),'s1','공사기사',now.getTime(),1500,'standard');
 data=pauseBookTimer(data,now.getTime()+600000);expect(data.bookTimer?.remaining).toBe(900);
 data=resumeBookTimer(JSON.parse(JSON.stringify(data)),now.getTime()+900000);
 data=settleBookTimer(data,now.getTime()+1800000);expect(data.bookTimer?.phase).toBe('break');expect(getDay(data,key).bonus?.book).toBeUndefined();
 expect(()=>saveBookNote(data,'s1','','',now)).toThrow();data=saveBookNote(data,'s1','2024년 기출 풀이','9번부터',now);expect(getDay(data,key).bonus?.book).toBe(5);
 data=saveBookNote(data,'s1','기록 수정','10번부터',now);expect(getDay(data,key).bonus?.book).toBe(5);
 data=settleBookTimer(data,now.getTime()+2100000);expect(data.bookTimer?.phase).toBe('idle');expect(data.bookSessions).toHaveLength(1);
});
test('legacy book reward remains 20 without discarding its older study records',()=>{
 let data=emptyData();for(let i=0;i<6;i++){const at=now.getTime()+i*1800000;data=startBookTimer(data,`s${i}`,'공사기사',at,1500,'standard');data=settleBookTimer(data,at+1800000);data=saveBookNote(data,`s${i}`,'한 회독 공부','',new Date(at+1800000));}
 expect(data.bookSessions).toHaveLength(6);expect(getDay(data,key).bonus?.book).toBe(20);
});
test('guided timers do not complete a routine by merely expiring; evening never creates money',()=>{
 let data=saveEveningSteps(emptyData(),SUGGESTED_EVENING);data=startGuidedStep(data,key,'evening',SUGGESTED_EVENING[0].id,now.getTime());
 expect(getDay(data,key).evening).toBeUndefined();data=completeGuidedStep(data,key,'evening',0,'full');expect(getDay(data,key).evening?.[0]).toBe(true);expect(getDay(data,key).paid).toEqual({morning:0,words:0,gym:0});
});
test('backup roundtrips marks and rejects another owner and broken cards',()=>{
 const backup=makeBackup(addDeck(emptyData(),'deck',[{front:'語',back:'단어'}],'id',now),'owner');expect(validateBackup(JSON.parse(JSON.stringify(backup)),'owner').data.words).toHaveLength(1);
 expect(()=>validateBackup(backup,'someone-else')).toThrow();expect(()=>validateBackup({...backup,data:{...backup.data,words:[{}]}},'owner')).toThrow();
});
test('learning summary imports are versioned and cannot overwrite by conflicting replay',()=>{
 const s=validateLearningSummary({schema:'routine.learning-summary.v1',eventId:'daily-1',revision:1,date:key,title:'접지',summary:'학습한 내용을 정리함',topics:[],questions:[],nextAction:'',sourceUrl:''});
 expect(mergeLearningSummaries([s],[s])).toHaveLength(1);expect(()=>mergeLearningSummaries([s],[{...s,summary:'다른 내용'}])).toThrow();expect(mergeLearningSummaries([s],[{...s,revision:2,summary:'수정'}])[0].revision).toBe(2);
 expect(()=>validateLearningSummary({...s,sourceUrl:'javascript:alert(1)'})).toThrow();
});
test('extra rewards count distinct additional cards and remain opt-in',()=>{
 let data=addDeck(emptyData(),'단어',Array.from({length:21},(_,i)=>({front:`w${i}`,back:'뜻'})),'d',now);data.newLimit=1;data=planStudy(data,key);data=answerWord(data,key,'d:0',Rating.Easy,now,10);
 data={...data,studyRewardPolicy:{extraEnabled:true,quickEnabled:false}};data=startAdditionalStudy(data,key,'new',10,now);
 for(let i=0;i<10;i++){const w=nextAdditionalWord(data,key,now)!;data=answerAdditionalWord(data,key,w.id,Rating.Easy,now,10);}
 expect(getDay(data,key).bonus?.words).toBe(5);expect(getDay(data,key).rewardedStudyIds).toHaveLength(10);expect(getDay(data,key).paid.words).toBe(20);
 const backup=JSON.parse(JSON.stringify(data));expect(answerAdditionalWord(backup,key,getDay(data,key).additional!.ids[0],Rating.Easy,now,10)).toBe(backup);
});
