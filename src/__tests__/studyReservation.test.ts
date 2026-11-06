import {emptyData} from '../lib/routineModel';
import type {RoutineData} from '../lib/routineModel';
import {finishFocusRun,startBookTimer} from '../lib/bookStudy';
import {answerNextStudy,askNextStudy,dismissNextStudy,startReservedStudy,nextStudyOptions,pendingNextStudyAsk,RESERVATION_POLICY,reservationAlarmAt,reservedStudy,studyReservations} from '../lib/studyReservation';

const min=60000;
/** 2026-11-07 14:00 local: before the evening option closes. */
const at=new Date(2026,10,7,14,0).getTime();
function finished(now=at):RoutineData{
 const started=startBookTimer(emptyData(),'run1','전기기사',now-10*min,1500,'standard');
 return finishFocusRun(started,now);
}

describe('asking after a study ends',()=>{
 test('a finished run asks once, for its own subject',()=>{
  const d=askNextStudy(finished(),'ask1',at);
  expect(pendingNextStudyAsk(d,at+min)).toMatchObject({id:'ask1',subject:'전기기사'});
 });
 test('nothing is asked while a study or rest is still running',()=>{
  const running=startBookTimer(emptyData(),'run1','전기기사',at,1500,'standard');
  expect(askNextStudy(running,'ask1',at)).toBe(running);
 });
 test('the question goes away after 10 minutes, or once a new study starts',()=>{
  const d=askNextStudy(finished(),'ask1',at);
  expect(pendingNextStudyAsk(d,at+RESERVATION_POLICY.askWindowMs+1)).toBeNull();
  const again=startBookTimer(d,'run2','전기기사',at+min,120,'standard');
  expect(pendingNextStudyAsk(again,at+2*min)).toBeNull();
 });
 test('closing without choosing is remembered, sets no reminder, and is not asked again',()=>{
  const d=dismissNextStudy(askNextStudy(finished(),'ask1',at),'ask1',at+min);
  expect(pendingNextStudyAsk(d,at+2*min)).toBeNull();
  expect(reservationAlarmAt(d,at+2*min)).toBeNull();
  expect(studyReservations(d)[0]).toMatchObject({id:'ask1',closedAt:at+min});
  expect(studyReservations(d)[0].choice).toBeUndefined();
 });
 test('an answered question is not asked again',()=>{
  const d=answerNextStudy(askNextStudy(finished(),'ask1',at),'ask1','none',at+min);
  expect(pendingNextStudyAsk(d,at+2*min)).toBeNull();
 });
});

describe('the choices',()=>{
 test('10 minutes, 30 minutes, 8 in the evening, or done for today',()=>{
  const d=askNextStudy(finished(),'ask1',at);
  expect(nextStudyOptions(d,at).map(o=>o.choice)).toEqual(['10m','30m','evening','none']);
  expect(nextStudyOptions(d,at).find(o=>o.choice==='evening')!.at).toBe(new Date(2026,10,7,20,0).getTime());
 });
 test('the evening choice is gone from 19:50 on, and after midnight',()=>{
  const late=new Date(2026,10,7,19,50).getTime(),night=new Date(2026,10,8,1,0).getTime();
  expect(nextStudyOptions(emptyData(),late).map(o=>o.choice)).toEqual(['10m','30m','none']);
  expect(nextStudyOptions(emptyData(),night).map(o=>o.choice)).toEqual(['10m','30m','none']);
 });
 test('after 5 reminders in a day only "done for today" is left',()=>{
  let d=finished();
  for(let i=0;i<RESERVATION_POLICY.remindersPerDay;i++)d=answerNextStudy(askNextStudy({...d,bookTimer:{...d.bookTimer!,phase:'idle'}},'a'+i,at+i*min),'a'+i,'10m',at+i*min);
  expect(nextStudyOptions(d,at+10*min).map(o=>o.choice)).toEqual(['none']);
  expect(()=>answerNextStudy(askNextStudy(d,'a9',at+10*min),'a9','30m',at+10*min)).toThrow();
 });
});

describe('the reminder',()=>{
 test('rings at the chosen time for the same subject',()=>{
  const d=answerNextStudy(askNextStudy(finished(),'ask1',at),'ask1','30m',at+min);
  expect(reservationAlarmAt(d,at+2*min)).toBe(at+31*min);
  expect(reservedStudy(d,at+31*min)).toMatchObject({subject:'전기기사',at:at+31*min});
 });
 test('"done for today" sets no reminder and has no penalty',()=>{
  const before=askNextStudy(finished(),'ask1',at),d=answerNextStudy(before,'ask1','none',at+min);
  expect(reservationAlarmAt(d,at+2*min)).toBeNull();
  expect(d.money).toEqual(before.money);expect(d.days).toEqual(before.days);
  expect(d.focusPenalties).toEqual(before.focusPenalties);
 });
 test('starting early cancels the reminder',()=>{
  const d=answerNextStudy(askNextStudy(finished(),'ask1',at),'ask1','30m',at+min);
  const started=startBookTimer(d,'run2','영어',at+5*min,120,'standard');
  expect(reservationAlarmAt(started,at+6*min)).toBeNull();
  expect(reservedStudy(started,at+6*min)).toBeNull();
 });
 test('a missed reservation has no penalty and lapses after 6 hours',()=>{
  const d=answerNextStudy(askNextStudy(finished(),'ask1',at),'ask1','10m',at+min);
  expect(reservedStudy(d,at+11*min+RESERVATION_POLICY.expireMs)).not.toBeNull();
  expect(reservedStudy(d,at+12*min+RESERVATION_POLICY.expireMs)).toBeNull();
  expect(d.focusPenalties).toEqual(finished().focusPenalties);
 });
 test('a new answer replaces the earlier reminder',()=>{
  let d=answerNextStudy(askNextStudy(finished(),'ask1',at),'ask1','30m',at+min);
  d=answerNextStudy(askNextStudy(d,'ask2',at+2*min),'ask2','10m',at+2*min);
  expect(reservationAlarmAt(d,at+3*min)).toBe(at+12*min);
 });
});

describe('saved rows',()=>{
 test('broken rows are skipped, never block reading',()=>{
  const d={...emptyData(),studyReservations:[null,{id:1},{id:'ok',subject:'수학',askedAt:at,choice:'10m',answeredAt:at,at:at+10*min},{id:'bad',subject:'x',askedAt:at,choice:'soon'}]} as unknown as RoutineData;
  expect(studyReservations(d).map(r=>r.id)).toEqual(['ok']);
  expect(reservationAlarmAt(d,at+min)).toBe(at+10*min);
 });
 test('only the last 60 rows are kept',()=>{
  let d=finished();
  for(let i=0;i<70;i++)d=askNextStudy(d,'a'+i,at+i);
  expect(studyReservations(d).length).toBe(RESERVATION_POLICY.keep);
  expect(studyReservations(d)[0].id).toBe('a10');
 });
});

describe('opening the timer from the reminder',()=>{
 test('the start button begins the reserved subject at the first stage',()=>{
  const d=answerNextStudy(askNextStudy(finished(),'ask1',at),'ask1','10m',at+min);
  const t=startReservedStudy(d,'run2',at+11*min).bookTimer!;
  expect(t).toMatchObject({phase:'focus',running:true,subject:'전기기사',rewardMode:'output'});
  expect(reservedStudy(startReservedStudy(d,'run2',at+11*min),at+12*min)).toBeNull();
 });
 test('without a live reservation nothing starts',()=>{
  const d=askNextStudy(finished(),'ask1',at);
  expect(startReservedStudy(d,'run2',at+min)).toBe(d);
 });
});
