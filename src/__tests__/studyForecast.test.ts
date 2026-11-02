import {State} from 'ts-fsrs';
import {addDeck,emptyData,getDay,planStudy,answerWord,routineDay} from '../lib/routineModel';
import {studyForecast} from '../lib/studyForecast';
const now=new Date(2026,10,1,9),key=routineDay(now);
function seed(){return addDeck(emptyData(),'d',Array.from({length:9},(_,i)=>({front:`w${i}`,back:'m'})),'d',now);}
test('overdue and 03:59 belong to today; tomorrow begins at 04:00, each card once',()=>{
 let d=seed();const due=['2026-10-31T12:00:00','2026-11-01T20:00:00','2026-11-02T03:59:59','2026-11-02T04:00:00','2026-11-03T09:00:00','2027-01-01T09:00:00'];
 d.words=d.words.map((w,i)=>i<due.length?{...w,card:{...w.card,state:i===2?State.Relearning:State.Review,due:new Date(due[i]).toISOString()}}:w);
 const f=studyForecast(d,key,7);expect(f.days.slice(0,3).map(d=>d.total)).toEqual([3,1,1]);expect(f.days[0]).toMatchObject({overdue:1,relearning:1});expect(f.fresh).toBe(3);expect(f.later).toBe(1);
});
test('inactive/reported/suspended cards are excluded and today-buried cards return tomorrow',()=>{
 let d=seed();d.words=d.words.map(w=>({...w,card:{...w.card,state:State.Review}}));d.words[0].issue={categories:['wordAudio'],note:'',updatedAt:now.toISOString()};d.words[1].suspended=true;d.words[2].active=false;d.words[3].buriedOn=key;
 expect(studyForecast(d,key,7)).toMatchObject({hidden:3,buried:1,total:6});expect(studyForecast(d,key,7).days.slice(0,2).map(d=>d.total)).toEqual([5,1]);
 d.decks[0].active=false;expect(studyForecast(d,key,7).total).toBe(0);
});
test('grading moves an actual card to its next scheduled day without modifying any plan',()=>{
 let d=planStudy(seed(),key);const before=JSON.stringify(d);expect(studyForecast(d,key).fresh).toBe(9);expect(JSON.stringify(d)).toBe(before);
 d=answerWord(d,key,'d:0',4,now,1);expect(studyForecast(d,key).days[0].total).toBe(0);expect(studyForecast(d,key).total).toBe(1);expect(getDay(d,key).complete).toEqual(['d:0']);
});
