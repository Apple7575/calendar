import { Rating, State } from 'ts-fsrs';
import { addDeck, answerWord, dayEnd, decodeCard, emptyData, encodeCard, getDay, nextStudyWord, planStudy, routineDay, scheduler } from '../lib/routineModel';
const now=new Date(2026,9,30,9), key=routineDay(now);
const seed=(count=2)=>planStudy(addDeck(emptyData(),'study',Array.from({length:count},(_,i)=>({front:`word${i}`,back:`뜻${i}`})),'deck',now),key);
test('a future learning card waits behind ready/new cards, not behind a timer screen',()=>{
  let data=answerWord(seed(),key,'deck:0',Rating.Again,now,4);
  expect(new Date(data.words[0].card.due).getTime()).toBeGreaterThan(now.getTime());
  expect(nextStudyWord(data,key,'full',now)?.id).toBe('deck:1');
  expect(answerWord(data,key,'deck:0',Rating.Easy,now,4)).toBe(data);
  data=answerWord(data,key,'deck:1',Rating.Easy,now,4);
  expect(nextStudyWord(data,key,'full',now)?.id).toBe('deck:0');
  data=answerWord(data,key,'deck:0',Rating.Easy,now,4);
  expect(getDay(data,key).responses).toBe(3);expect(getDay(data,key).paid.words).toBe(20);
  expect(data.words[0].card.last_review).toBe(now.toISOString());
});
test('chooses the earliest remaining learning card and preserves its scheduled due time until answered',()=>{
  let data=seed();
  data={...data,words:data.words.map((w,i)=>({...w,card:{...w.card,state:State.Learning,reps:1,due:new Date(now.getTime()+(i?3:8)*60000).toISOString()}}))};
  const due=data.words[1].card.due;
  expect(nextStudyWord(data,key,'full',now)?.id).toBe('deck:1');expect(data.words[1].card.due).toBe(due);
});
test('relearning also continues immediately when the main queue is empty',()=>{
  let data=seed(1);data={...data,words:data.words.map(w=>({...w,card:{...encodeCard(scheduler.next(decodeCard(w.card),now,Rating.Easy).card),state:State.Relearning,reps:3,due:new Date(now.getTime()+180000).toISOString(),last_review:new Date(now.getTime()-60000).toISOString()}}))};
  expect(nextStudyWord(data,key,'full',now)?.id).toBe('deck:0');
  expect(getDay(answerWord(data,key,'deck:0',Rating.Good,now,4),key).responses).toBe(1);
});
test('when learning ahead, another remaining card is shown before repeating the just-answered card',()=>{
  let data=seed();data={...data,days:{[key]:{...getDay(data,key),lastStudyWordId:'deck:0'}},words:data.words.map((w,i)=>({...w,card:{...w.card,state:State.Learning,reps:1,due:new Date(now.getTime()+(i?3:1)*60000).toISOString()}}))};
  expect(nextStudyWord(data,key,'full',now)?.id).toBe('deck:1');
  data={...data,days:{[key]:{...getDay(data,key),complete:['deck:1']}}};
  expect(nextStudyWord(data,key,'full',now)?.id).toBe('deck:0');
});
test('daily review cards are available during the routine day, even before their wall-clock time',()=>{
  let data=seed(1);data={...data,words:data.words.map(w=>({...w,card:{...encodeCard(scheduler.next(decodeCard(w.card),now,Rating.Easy).card),state:State.Review,reps:2,due:new Date(now.getTime()+3600000).toISOString(),last_review:new Date(now.getTime()-86400000).toISOString()}}))};
  expect(nextStudyWord(data,key,'full',now)?.id).toBe('deck:0');
  expect(getDay(answerWord(data,key,'deck:0',Rating.Easy,now,4),key).responses).toBe(1);
});
test('does not pull tomorrow cards into today or pay a reward just for selecting a card',()=>{
  let data=seed(1);data={...data,words:data.words.map(w=>({...w,card:{...w.card,state:State.Learning,reps:1,due:dayEnd(key).toISOString()}}))};
  expect(nextStudyWord(data,key,'full',now)).toBeUndefined();
  expect(answerWord(data,key,'deck:0',Rating.Easy,now,4)).toBe(data);expect(getDay(data,key).paid.words).toBe(0);
});
test('minimum review sessions learn ahead within their own review queue',()=>{
  let data=answerWord(seed(),key,'deck:0',Rating.Again,now,4);data={...data,days:{[key]:{...getDay(data,key),plan:{...getDay(data,key).plan!,reviewIds:['deck:0']}}}};
  expect(nextStudyWord(data,key,'full',now)?.id).toBe('deck:1');expect(nextStudyWord(data,key,'min',now)?.id).toBe('deck:0');
  expect(getDay(answerWord(data,key,'deck:0',Rating.Easy,now,4,'min'),key).responses).toBe(2);
});
