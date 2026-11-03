import {Rating,Grade} from 'ts-fsrs';
import {sampleBook} from '../lib/conceptLabContent';
import {createLab,beginLab,answerLab,revealLab,finishLab,correctAttempt,addVariant,validateCard,labQueue,labStats,reportCard,reviseCard,validateLab,labStorageKey,adaptationNeeds,setDraftAI,variantCandidates,flipLab,finishAndAdvanceLab} from '../lib/conceptLab';

const now=new Date('2026-11-02T08:00:00Z');
function started(id='lab_holiday_read') {return beginLab(createLab(now),[id],now);}
function completed(id='lab_holiday_read',answer='きゅうじつ',grade:Grade=Rating.Good){
 let state=started(id);state=answerLab(state,answer,1200,false);state=revealLab(state);
 return finishLab(state,[{grade,correct:true}],now);
}
describe('isolated concept experiment',()=>{
 test('flashcard flips without typing and rating advances to the next due card',()=>{
  const revealed=flipLab(started(),2000,false);
  expect(revealed.session!.revealed).toBe(true);expect(revealed.session!.answers[0]).toMatchObject({text:'',mode:'self',elapsedMs:2000});
  const next=finishAndAdvanceLab(revealed,[{correct:true,grade:Rating.Good}],now);
  expect(next.attempts[0].mode).toBe('self');expect(next.session!.finished).not.toBe(true);expect(next.session!.ids).not.toContain('lab_holiday_read');
  const repeated=finishAndAdvanceLab(next,[{correct:true,grade:Rating.Good}],now,revealed.session!.id);expect(repeated).toBe(next);
 });
 test('flashcard bundle keeps all answers hidden until the last question; exhausted limit returns completion',()=>{
  let s=createLab(now);s.settings.dailyNew=30;s=beginLab(s,['lab_read_q1','lab_read_q2'],now);
  s=flipLab(s,1000,true);expect(s.session!.revealed).toBe(false);expect(s.session!.answers.length).toBe(1);
  s=flipLab(s,1000,false);expect(s.session!.revealed).toBe(true);
  s=started();s.settings.dailyNew=1;s=finishAndAdvanceLab(flipLab(s,500,false),[{correct:true,grade:Rating.Good}],now);
  expect(s.session!.finished).toBe(true);expect(s.attempts).toHaveLength(1);
 });
 test('sample covers seven card types and uncertain sources never enter queue',()=>{
  expect(new Set(sampleBook.cards.map(c=>c.type)).size).toBe(7);
  const state=createLab(now);expect(labQueue(state,now).every(id=>state.cards[id].status==='ready')).toBe(true);
  expect(Object.values(state.cards).some(c=>c.status==='needs_review')).toBe(true);
 });
 test('all published sample and bank cards pass structural quality gate',()=>{
  for(const c of [...sampleBook.cards,...sampleBook.variants].filter(c=>c.status==='ready'))expect(validateCard(c,sampleBook)).toEqual([]);
 });
 test('saving before feedback and answer leakage are rejected',()=>{
  expect(()=>finishLab(started(),[{grade:Rating.Good,correct:true}],now)).toThrow();
  const c={...sampleBook.cards[0],prompt:'きゅうじつ と入力',accepted:['きゅうじつ']};
  expect(validateCard(c,sampleBook)).toContain('answer_leak');
 });
 test('multiple exact answers accepted; unknown writing remains ungraded',()=>{
  const s=answerLab(started('lab_holiday_reverse'),'きゅうじつ。',2000,false);expect(s.session!.answers[0].exact).toBe(true);
  const other=answerLab(started('lab_sou_apply'),'雨が降りそうですね。',2000,false);expect(other.session!.answers[0].exact).toBeNull();
 });
 test('response, separate FSRS, hint and self grade recorded; no routine data',()=>{
  let s=answerLab(started(),'わからない',10000,true);s=revealLab(s);s=finishLab(s,[{grade:Rating.Easy,correct:false,reason:'confusion'}],now);
  const a=s.attempts[0];expect(a.hint).toBe(true);expect(a.grade).toBe(Rating.Again);expect(a.selfGrade).toBe(Rating.Easy);expect(a.ai).toBeUndefined();
  expect(s.schedules[a.cardId].reps).toBe(1);expect(s).not.toHaveProperty('words');expect(s).not.toHaveProperty('money');
 });
 test('new limit is per day and review cards retain priority',()=>{
  const s=completed();s.settings.dailyNew=1;
  expect(labQueue(s,now)).toHaveLength(0);
  expect(labQueue(s,new Date('2026-11-04T08:00:00Z'))[0]).toBe('lab_holiday_read');
 });
 test('a whole passage must be answered before any explanation; partial groups forbidden',()=>{
  let s=createLab(now);s.settings.dailyNew=30;expect(()=>beginLab(s,['lab_read_q1'],now)).toThrow();
  s=beginLab(s,['lab_read_q1','lab_read_q2'],now);s=answerLab(s,'金曜日',1000,false);
  expect(()=>revealLab(s)).toThrow();s=answerLab(s,'図書館',2000,false);expect(revealLab(s).session!.revealed).toBe(true);
 });
 test('double submission is idempotent and original history survives new variant failure',()=>{
  let s=completed();const schedule=JSON.stringify(s.schedules.lab_holiday_read);const count=s.attempts.length;
  s=finishLab(s,[{grade:Rating.Good,correct:true}],now);expect(s.attempts.length).toBe(count);
  s=addVariant(s,'lab_holiday_context_variant',now);expect(JSON.stringify(s.schedules.lab_holiday_read)).toBe(schedule);
  const v=s.cards.lab_holiday_context_variant;expect(v.conceptId).toBe(s.cards[v.parentId!].conceptId);
  s=beginLab(s,[v.id],now);s=answerLab(s,'',100,false);s=revealLab(s);s=finishLab(s,[{grade:Rating.Again,correct:false,reason:'vocabulary'}],now);
  expect(JSON.stringify(s.schedules.lab_holiday_read)).toBe(schedule);expect(labStats(s,now).original.total).toBe(1);expect(labStats(s,now).novel.total).toBe(1);
 });
 test('failed generation does not mutate; idempotency and daily generation cap',()=>{
  const s=completed(),snapshot=JSON.stringify(s);expect(()=>addVariant(s,'missing',now)).toThrow();expect(JSON.stringify(s)).toBe(snapshot);
  const next=addVariant(s,'lab_holiday_context_variant',now);expect(addVariant(next,'lab_holiday_context_variant',now)).toBe(next);
  next.settings.dailyVariants=0;expect(()=>addVariant(next,'lab_sou_variant',now)).toThrow();
 });
 test('correction keeps original assessment, replays only that card and recalculates stats',()=>{
  const s=completed();const corrected=correctAttempt(s,s.attempts[0].id,false,Rating.Again,'개념을 혼동했음');
  expect(corrected.attempts[0].correct).toBe(true);expect(corrected.corrections).toHaveLength(1);
  expect(corrected.schedules.lab_holiday_read.due).not.toBe(s.schedules.lab_holiday_read.due);
  expect(labStats(corrected,now).original.correct).toBe(0);
 });
 test('report disables without deleting history; revision keeps concept and schedule',()=>{
  const s=completed();let next=reportCard(s,'lab_holiday_read','읽기 확인 필요',now);expect(labQueue(next,now)).not.toContain('lab_holiday_read');
  expect(next.attempts).toEqual(s.attempts);next=reviseCard(next,{...next.cards.lab_holiday_read,prompt:'休日의 읽기를 가나로 답하세요.'},sampleBook,now);
  expect(next.cards.lab_holiday_read.status).toBe('ready');expect(next.schedules).toEqual(s.schedules);expect(next.revisions).toHaveLength(1);
 });
 test('storage identity and validation reject malformed records without migration into N3',()=>{
  expect(labStorageKey('one')).not.toBe(labStorageKey('two'));expect(labStorageKey()).not.toContain('routine.v1.');
  const s=completed();expect(validateLab(JSON.parse(JSON.stringify(s)))).toEqual(s);
  for(const raw of [null,{...s,version:2},{...s,settings:{...s.settings,dailyNew:-1}},{...s,settings:{...s.settings,variantCooldownDays:0}},{...s,schedules:{bad:{due:'invalid'}}},{...s,attempts:[{...s.attempts[0],cardId:'missing'}]},{...s,session:{ids:['missing'],answers:[]}}])expect(()=>validateLab(raw)).toThrow();
 });
 test('AI advice and speech response remain distinct from user final assessment',()=>{
  let s=answerLab(started('lab_sou_apply'),'天気予報によると雨が降るそうです。',22000,false,'speech');
  expect(()=>setDraftAI(s,'lab_sou_apply',{correct:true,feedback:'x',confidence:.9,model:'test',rubricVersion:'1'})).toThrow();
  s=revealLab(s);s=setDraftAI(s,'lab_sou_apply',{correct:true,feedback:'目標の接続が正しい',confidence:.9,model:'test',rubricVersion:'1'});
  s=finishLab(s,[{correct:false,grade:Rating.Again,reason:'interpretation'}],now);
  expect(s.attempts[0].ai!.correct).toBe(true);expect(s.attempts[0].correct).toBe(false);expect(s.attempts[0].mode).toBe('speech');
 });
 test('invalid operations and unreviewed cards fail before affecting schedule',()=>{
  const s=createLab(now);expect(()=>answerLab(s,'x',2,false)).toThrow();expect(()=>beginLab(s,['lab_listen_original'],now)).toThrow();expect(()=>reportCard(s,'bad','x')).toThrow();
  expect(()=>answerLab(started(),'x'.repeat(2001),2,false)).toThrow();expect(()=>answerLab(started(),'x',-1,false)).toThrow();
  const c=sampleBook.cards[0];expect(validateCard({...c,conceptId:'bad'},sampleBook)).toContain('unknown_concept');expect(validateCard({...c,unitId:'bad'},sampleBook)).toContain('unknown_unit');
  expect(validateCard({...c,evidenceIds:['bad']},sampleBook)).toContain('unreviewed_source');expect(validateCard({...c,quality:{...c.quality,natural:false}},sampleBook)).toContain('quality_rejected');
  expect(()=>reviseCard(s,{...c,conceptId:'bad'})).toThrow();expect(()=>correctAttempt(s,'bad',true,Rating.Good,'x')).toThrow();
 });
 test('same-concept cooldown, cap, invalid parent and duplicates block additions',()=>{
  let s=createLab(now);s=addVariant(s,'lab_sou_variant',now);
  expect(()=>addVariant(s,'lab_sou_step_variant',now)).toThrow();
  expect(addVariant(s,'lab_sou_step_variant',new Date('2026-11-04T08:00:00Z')).cards.lab_sou_step_variant).toBeDefined();
  const draft={...sampleBook.variants[0],id:'lab_invalid',parentId:'missing'};expect(()=>addVariant(s,draft.id,now,draft)).toThrow();
 });
 test('repeat errors, transfer gap and listening gap drive recommendations, never response speed',()=>{
  let s=completed();s=addVariant(s,'lab_holiday_context_variant',now);s=beginLab(s,['lab_holiday_context_variant'],now);s=answerLab(s,'wrong',25,false);s=revealLab(s);s=finishLab(s,[{grade:Rating.Again,correct:false,reason:'confusion'}],now);
  const event=s.attempts[1];s={...s,attempts:[...s.attempts,{...event,id:'second',ability:'listening'},{...event,id:'third',mode:'text'},{...s.attempts[0],id:'choice',mode:'choice'}]};
  const needs=adaptationNeeds(s).map(n=>n.label);expect(needs).toContain('개념 비교·작은 단계 연습');expect(needs).toContain('다른 상황 적용 연습');expect(needs).toContain('듣기 연습');expect(needs).toContain('선택지 없는 짧은 직접 응답 연습');
  expect(variantCandidates(s)[0].id).toBe('lab_audio_variant');
 });
 test('reporting the active card stops its draft from re-entering learning',()=>{
  const s=reportCard(answerLab(started(),'保存された応答',200,false),'lab_holiday_read','문제 확인');expect(s.session!.finished).toBe(true);expect(s.session!.ids).toEqual(['lab_holiday_read']);expect(s.attempts).toHaveLength(0);expect(s.archivedSessions![0].answers[0].text).toBe('保存された応答');
 });
});
