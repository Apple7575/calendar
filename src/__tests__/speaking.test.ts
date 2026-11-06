import {emptyData,earned,getDay,routineDay} from '../lib/routineModel';
import {startBookTimer,startBookBreak} from '../lib/bookStudy';
import {claimFocusPlan} from '../lib/focusRamp';
import {startOutputStudy} from '../lib/handwriting';
import {rewardSyncExtras} from '../lib/focusPenalty';
import {moneySummary,PROPOSED_MONEY_RATES,reconcileMoneyRewards,startMoneyRewards} from '../lib/moneyRewards';
import {makeBackup,validateBackup} from '../lib/routineBackup';
import {answerForAi,attachSpeakingFeedback,canStartSpeaking,isRepetitiveSpeech,isSimilarSpeech,nextSpeakingQuestion,saveSpeakingAnswer,saveSpeakingFollowUp,settleSpeaking,SPEAKING_POLICY,speakingRecords,speakingStepChars,speakingToday,spokenChars} from '../lib/speaking';
import {SPEAKING_TOPICS,speakingTopic} from '../lib/speakingTopics';
import {timeWallet} from '../lib/timeWallet';
import {studyLedger} from '../lib/studyHistory';
import {dailyTimeline} from '../lib/dailyTimeline';
import type {RoutineData} from '../lib/routineModel';

jest.mock('../lib/supabase',()=>({supabase:{}}));
const at=new Date(2026,10,5,9).getTime(),key=routineDay(new Date(at)),user='00000000-0000-4000-8000-000000000000';
const topic=speakingTopic('executive-interview')!,Q=topic.questions!;
let seed=0;
/** n spoken characters that never repeat, and differ between calls, so length alone decides. */
const speech=(n:number)=>{const base=0xAC00+(seed++)*811%9000;return Array.from({length:n},(_,i)=>String.fromCharCode(0xAC00+(base-0xAC00+i*i*7+i)%11172)).join('')};
const feedback={good:'좋았어요',missed:'빠졌어요',followUp:'더 말해 주실래요?'},fine={relevant:true,repetitive:false};
const answered=(d:RoutineData,id:string,chars:number,verdict=fine,now=at,question=Q[0])=>saveSpeakingAnswer(d,{id,topicId:topic.id,topicTitle:topic.title,question,answer:speech(chars),seconds:60,feedback,verdict},now);
const done=(d:RoutineData,id:string,chars:number,now=at)=>settleSpeaking(answered(d,id,chars,fine,now),id,undefined,now);
const record=(d:RoutineData,id:string)=>speakingRecords(d).find(r=>r.id===id)!;
const natural='저는 지난 프로젝트에서 디자인 팀과 일정이 어긋나는 문제를 겪었습니다. 먼저 양쪽이 생각하는 완료 기준을 적어 비교했고, 달랐던 부분을 회의에서 하나씩 맞췄습니다. 그 뒤로는 주간 공유 문서를 만들어 변경 사항을 바로 알렸고, 출시 일정도 지킬 수 있었습니다. 이 경험으로 협업에서는 기대를 먼저 맞추는 일이 가장 중요하다고 배웠습니다.';

describe('the topic list',()=>{
 test('executive interview has the five questions word for word',()=>{
  expect(Q).toEqual([
   'AI가 개발 업무를 대체하는 상황에서 개발자의 역할은 무엇이라고 보십니까',
   '조직 내에서 다른 팀이나 부서가 협력하는 과정에서 발생한 어려움을 해결한 경험이 있나요?',
   '지원 직무에 필요한 역량 중 어떤 부분에서 특히 강점을 발휘할 수 있을지 설명해 주세요.',
   '업무 방식이 다른 상사/팀원과의 의견 차이를 좁히기 위해 노력했던 경험이 있나요?',
   '당신의 강점을 지원 직무에서 어떻게 활용할 수 있을지 설명해 주세요.',
  ]);
 });
 test('every topic has fixed questions or a brief for the AI, and ids are unique',()=>{
  for(const t of SPEAKING_TOPICS)expect(!!t.questions?.length||!!t.aiBrief||!!t.askTopic).toBe(true);
  expect(new Set(SPEAKING_TOPICS.map(t=>t.id)).size).toBe(SPEAKING_TOPICS.length);
 });
});

describe('the other topics',()=>{
 test('are in the order asked, with a question source each',()=>{
  expect(SPEAKING_TOPICS.map(t=>t.title)).toEqual(['임원 면접','기술 면접','일본어 말하기','전기공사기사','삶과 생각','기타']);
 });
 test('Japanese is spoken and recognised in Japanese and counts double',()=>{
  const ja=speakingTopic('japanese')!;
  expect(ja.language).toBe('ja-JP');
  const d=settleSpeaking(saveSpeakingAnswer(emptyData(),{id:'a',topicId:'japanese',topicTitle:ja.title,question:'q',answer:speech(250),seconds:60,feedback,verdict:fine},at),'a',undefined,at);
  expect(record(d,'a')).toMatchObject({answerChars:250,creditedChars:500,minutes:5});
 });
 test('a Japanese follow-up counts double on top',()=>{
  const ja=speakingTopic('japanese')!,base=saveSpeakingAnswer(emptyData(),{id:'a',topicId:'japanese',topicTitle:ja.title,question:'q',answer:speech(10),seconds:60,feedback,verdict:fine},at);
  expect(record(settleSpeaking(saveSpeakingFollowUp(base,'a',speech(10)),'a',fine,at),'a').creditedChars).toBe(60);
 });
 test('Japanese characters are counted, kana and kanji alike',()=>{
  expect(spokenChars('私は、週末に 散歩します。')).toBe(10);
 });
 test('a topic that has been removed since still counts plainly',()=>{
  const d=settleSpeaking(saveSpeakingAnswer(emptyData(),{id:'a',topicId:'gone',topicTitle:'x',question:'q',answer:speech(100),seconds:60,feedback,verdict:fine},at),'a',undefined,at);
  expect(record(d,'a').creditedChars).toBe(100);
 });
 test('the reflective topic names the gap differently and warns the AI off counselling',()=>{
  expect(speakingTopic('life')).toMatchObject({title:'삶과 생각',coach:'reflect',missedLabel:'더 생각해 볼 관점'});
  const source=require('fs').readFileSync(require('path').join(__dirname,'../../supabase/functions/speaking-coach/index.ts'),'utf8');
  expect(source).toMatch(/Do not counsel, diagnose/);
 });
 test('the exam topic says its questions may be wrong',()=>{
  expect(speakingTopic('electrical-engineer')!.notice).toMatch(/틀릴 수 있어요/);
 });
 test('other asks what to talk about',()=>{
  expect(speakingTopic('other')!.askTopic).toBe(true);
 });
});

describe('characters add up like word cards, and each step asks for more',()=>{
 test('spaces and punctuation do not count',()=>{
  expect(spokenChars('안녕 하세요, 반갑습니다.\n네!')).toBe(11);
 });
 test('the steps are 500, 1,000, 1,500 and go on with no limit',()=>{
  expect([0,1,2,3,10].map(speakingStepChars)).toEqual([500,1000,1500,2000,5500]);
 });
 test('short of the first step nothing is paid and the count is kept',()=>{
  const d=done(emptyData(),'a',499);
  expect(record(d,'a')).toMatchObject({creditedChars:499,stepsPaid:0,minutes:0});
  expect(earned(getDay(d,key))).toBe(0);
  expect(speakingToday(d,key)).toMatchObject({moreChars:1,required:500,steps:0});
 });
 test('the first step pays 5 minutes',()=>{
  const d=done(emptyData(),'a',500);
  expect(record(d,'a')).toMatchObject({stepsPaid:1,minutes:5});
  expect(getDay(d,key).bonus?.speaking).toBe(5);
  expect(speakingToday(d,key)).toMatchObject({steps:1,minutes:5,won:500,moreChars:1000});
 });
 test('what is left over carries to the next step',()=>{
  const d=done(emptyData(),'a',700);
  expect(getDay(d,key).speakingRewards).toEqual({chars:200,steps:1});
  expect(speakingToday(d,key).moreChars).toBe(800);
 });
 test('answers add up across sessions',()=>{
  const d=done(done(emptyData(),'a',300),'b',300);
  expect(record(d,'b').minutes).toBe(5);
  expect(getDay(d,key).speakingRewards).toEqual({chars:100,steps:1});
 });
 test('one long answer crosses as many steps as it reaches, with no limit',()=>{
  const d=done(emptyData(),'a',3000);
  expect(record(d,'a')).toMatchObject({creditedChars:3000,stepsPaid:3,minutes:15});
  expect(getDay(d,key).speakingRewards).toEqual({chars:0,steps:3});
 });
 test('there is no daily limit on sessions',()=>{
  let d=emptyData();for(let i=0;i<8;i++)d=done(d,'r'+i,1000);
  expect(getDay(d,key).bonus?.speaking).toBeGreaterThan(0);
  expect(speakingToday(d,key).steps).toBe(5);
  expect(getDay(d,key).speakingRewards).toEqual({chars:500,steps:5});
 });
 test('the count on screen includes what is being said now',()=>{
  expect(speakingToday(emptyData(),key,400).moreChars).toBe(100);
  expect(speakingToday(emptyData(),key,1100)).toMatchObject({moreChars:400,upcomingSteps:1});
 });
 test('seconds are never read: a long silence earns nothing',()=>{
  const d=settleSpeaking(saveSpeakingAnswer(emptyData(),{id:'a',topicId:topic.id,topicTitle:topic.title,question:Q[0],answer:speech(10),seconds:3600,feedback,verdict:fine},at),'a',undefined,at);
  expect(record(d,'a').creditedChars).toBe(10);
 });
 test('settling twice pays once',()=>{
  const once=done(emptyData(),'a',1000);
  expect(settleSpeaking(once,'a',undefined,at)).toBe(once);
 });
});

describe('the question asked back',()=>{
 test('counts double, and can be skipped',()=>{
  const said=speech(300),d=saveSpeakingFollowUp(answered(emptyData(),'a',500),'a',said);
  expect(record(settleSpeaking(d,'a',fine,at),'a').creditedChars).toBe(1100);
  expect(record(settleSpeaking(answered(emptyData(),'b',500),'b',undefined,at),'b').creditedChars).toBe(500);
 });
 test('off the topic loses only its own characters',()=>{
  const d=settleSpeaking(saveSpeakingFollowUp(answered(emptyData(),'a',500),'a',speech(300)),'a',{relevant:false,repetitive:false},at);
  expect(record(d,'a').creditedChars).toBe(500);
 });
 test('saying the answer again as the follow-up does not count double',()=>{
  const words=speech(300),base=saveSpeakingAnswer(emptyData(),{id:'a',topicId:topic.id,topicTitle:topic.title,question:Q[0],answer:words,seconds:60,feedback,verdict:fine},at);
  expect(record(settleSpeaking(saveSpeakingFollowUp(base,'a',words),'a',fine,at),'a').creditedChars).toBe(300);
 });
 test('an uncounted answer takes its follow-up with it',()=>{
  const d=settleSpeaking(saveSpeakingFollowUp(answered(emptyData(),'a',500,{relevant:false,repetitive:false}),'a',speech(300)),'a',fine,at);
  expect(record(d,'a')).toMatchObject({creditedChars:0,uncounted:'off-topic'});
 });
});

describe('what is not counted',()=>{
 test('off the topic',()=>{
  const d=settleSpeaking(answered(emptyData(),'a',1000,{relevant:false,repetitive:false}),'a',undefined,at);
  expect(record(d,'a')).toMatchObject({creditedChars:0,minutes:0,uncounted:'off-topic'});
  expect(getDay(d,key).speakingRewards).toBeUndefined();
 });
 test('the AI calling it padding',()=>{
  expect(record(settleSpeaking(answered(emptyData(),'a',1000,{relevant:true,repetitive:true}),'a',undefined,at),'a').uncounted).toBe('repeat');
 });
 test('repeating inside one answer, even past what is stored',()=>{
  const padded=('네 그렇습니다 정말 그렇게 생각합니다 ').repeat(800),d=settleSpeaking(saveSpeakingAnswer(emptyData(),{id:'a',topicId:topic.id,topicTitle:topic.title,question:Q[0],answer:padded,seconds:60,feedback,verdict:fine},at),'a',undefined,at);
  expect(record(d,'a').uncounted).toBe('repeat');
 });
 test('no AI reply',()=>{
  const d=settleSpeaking(saveSpeakingAnswer(emptyData(),{id:'a',topicId:topic.id,topicTitle:topic.title,question:Q[0],answer:speech(2000),seconds:60},at),'a',undefined,at);
  expect(record(d,'a')).toMatchObject({creditedChars:0,uncounted:'unchecked'});
  expect(record(d,'a').answer).toHaveLength(2000);
 });
});

describe('telling repetition from practice',()=>{
 test('padding is caught',()=>{
  expect(isRepetitiveSpeech('네 그렇습니다 '.repeat(100))).toBe(true);
  expect(isRepetitiveSpeech('저는 협업을 중요하게 생각합니다. '.repeat(30))).toBe(true);
 });
 test('a sentence said twice is caught',()=>{
  expect(isRepetitiveSpeech(natural+' '+natural)).toBe(true);
 });
 test('natural speech is not, however long, with stock phrases in it',()=>{
  expect(isRepetitiveSpeech(natural)).toBe(false);
  expect(isRepetitiveSpeech(natural+' 그리고 저는 그렇게 생각합니다. 다음으로 일정 이야기를 드리면 저는 그렇게 생각합니다. 마지막으로 팀 이야기를 드리면 저는 그렇게 생각합니다.')).toBe(false);
 });
 test('too short to judge',()=>{
  expect(isRepetitiveSpeech('네네네')).toBe(false);
 });
 const edited=natural.replace('디자인 팀과 일정이 어긋나는 문제를','개발 팀과 기능 범위가 다른 문제를').replace('주간 공유 문서를 만들어 변경 사항을 바로 알렸고','매주 짧은 회의를 열어 바뀐 내용을 공유했고');
 test('saying the same again is nearly the same',()=>{
  expect(isSimilarSpeech(natural,natural)).toBe(true);
 });
 test('speech recognition slips on a re-read still count as nearly the same',()=>{
  const slipped=natural.replace('디자인','디자이너').replace('출시','출시의');
  expect(isSimilarSpeech(slipped,natural)).toBe(true);
 });
 test('reworking a couple of sentences is practice',()=>{
  expect(isSimilarSpeech(edited,natural)).toBe(false);
 });
 test('another answer is not similar',()=>{
  expect(isSimilarSpeech(speech(300),natural)).toBe(false);
 });
});

describe('the same question',()=>{
 const ask=(d:RoutineData,id:string,answer:string,now=at)=>settleSpeaking(saveSpeakingAnswer(d,{id,topicId:topic.id,topicTitle:topic.title,question:Q[0],answer,seconds:60,feedback,verdict:fine},now),id,undefined,now);
 test('counts again the same day when the answer is worked on',()=>{
  const d=ask(ask(emptyData(),'a',natural),'b',natural.replace('디자인 팀과 일정이 어긋나는 문제를','개발 팀과 기능 범위가 다른 문제를').replace('주간 공유 문서를 만들어 변경 사항을 바로 알렸고','매주 짧은 회의를 열어 바뀐 내용을 공유했고'));
  expect(record(d,'b').creditedChars).toBeGreaterThan(0);
 });
 test('does not count when it is the same answer, even for another question',()=>{
  const d=ask(ask(emptyData(),'a',natural),'b',natural);
  expect(record(d,'b')).toMatchObject({creditedChars:0,uncounted:'similar'});
 });
 test('the same answer counts again the next day',()=>{
  const d=ask(ask(emptyData(),'a',natural),'b',natural,at+24*60*60*1000);
  expect(record(d,'b').creditedChars).toBeGreaterThan(0);
 });
 test('an uncounted earlier answer is not held against this one',()=>{
  const first=settleSpeaking(saveSpeakingAnswer(emptyData(),{id:'a',topicId:topic.id,topicTitle:topic.title,question:Q[0],answer:natural,seconds:60,feedback,verdict:{relevant:false,repetitive:false}},at),'a',undefined,at);
  expect(record(ask(first,'b',natural),'b').creditedChars).toBeGreaterThan(0);
 });
});

describe('a failure loses nothing and pays nothing twice',()=>{
 const unchecked=(d:RoutineData,id='a')=>saveSpeakingAnswer(d,{id,topicId:topic.id,topicTitle:topic.title,question:Q[0],answer:speech(1000),seconds:60},at);
 test('the answer is kept before any AI reply',()=>{
  const r=record(unchecked(emptyData()),'a');
  expect(r).toMatchObject({status:'answered',answerChars:1000});expect(r.feedback).toBeUndefined();
 });
 test('saving the same id again changes nothing',()=>{
  const once=unchecked(emptyData());
  expect(unchecked(once)).toBe(once);
 });
 test('a retried reply replaces and still pays once',()=>{
  const d=attachSpeakingFeedback(attachSpeakingFeedback(unchecked(emptyData()),'a',feedback,fine),'a',feedback,fine),paid=settleSpeaking(d,'a',undefined,at);
  expect(getDay(paid,key).bonus?.speaking).toBe(5);
  expect(settleSpeaking(paid,'a',undefined,at)).toBe(paid);
  expect(attachSpeakingFeedback(paid,'a',feedback,fine)).toBe(paid);
 });
 test('a failed call counts nothing',()=>{
  expect(speakingToday(unchecked(emptyData()),key).steps).toBe(0);
  expect(getDay(unchecked(emptyData()),key).speakingRewards).toBeUndefined();
 });
 test('a follow-up said before a failure is still there',()=>{
  expect(record(saveSpeakingFollowUp(attachSpeakingFeedback(unchecked(emptyData()),'a',feedback,fine),'a',speech(120)),'a').followUpChars).toBe(120);
 });
});

describe('size limits, apart from how long one can talk',()=>{
 test('all that was said counts, while only part is stored',()=>{
  const long=speech(12000),d=settleSpeaking(saveSpeakingAnswer(emptyData(),{id:'a',topicId:topic.id,topicTitle:topic.title,question:Q[0],answer:long,seconds:3600,feedback,verdict:fine},at),'a',undefined,at),r=record(d,'a');
  expect(r.answer.length).toBe(SPEAKING_POLICY.storeAnswerChars);
  expect(r.answerChars).toBe(12000);
  expect(r.creditedChars).toBe(12000);
  expect(r.stepsPaid).toBeGreaterThan(3);
 });
 test('a follow-up longer than is stored counts in full',()=>{
  const r=record(settleSpeaking(saveSpeakingFollowUp(answered(emptyData(),'a',100),'a',speech(3000)),'a',fine,at),'a');
  expect(r.followUpAnswer!.length).toBe(SPEAKING_POLICY.storeFollowUpChars);
  expect(r.creditedChars).toBe(100+6000);
 });
 test('the AI gets the start and the end of a long answer',()=>{
  const long=speech(9000),sent=answerForAi(long);
  expect(sent.length).toBeLessThanOrEqual(3010);
  expect(sent.startsWith(long.slice(0,50))).toBe(true);
  expect(sent.endsWith(long.slice(-50))).toBe(true);
  expect(answerForAi('짧은 답')).toBe('짧은 답');
 });
 test('feedback text is cut to the limit',()=>{
  const long=speech(3000),r=record(attachSpeakingFeedback(answered(emptyData(),'a',10),'a',{good:long,missed:long,followUp:long},fine),'a');
  expect([r.feedback!.good.length,r.feedback!.missed.length,r.feedback!.followUp.length]).toEqual([SPEAKING_POLICY.maxFeedbackChars,SPEAKING_POLICY.maxFeedbackChars,SPEAKING_POLICY.maxFollowUpQuestionChars]);
 });
 test('only the most recent 100 are kept, an open one is never dropped, and rewards stay',()=>{
  let d=saveSpeakingAnswer(emptyData(),{id:'open',topicId:topic.id,topicTitle:topic.title,question:Q[0],answer:speech(300),seconds:60},at);
  for(let i=0;i<110;i++){const when=at+i*86400000;d=done(d,'r'+i,1000,when)}
  const rows=speakingRecords(d);
  expect(rows).toHaveLength(100);
  expect(rows.some(r=>r.id==='open')).toBe(true);
  expect(rows.some(r=>r.id==='r0')).toBe(false);
  expect(rows.some(r=>r.id==='r109')).toBe(true);
  expect(getDay(d,routineDay(new Date(at))).bonus?.speaking).toBe(5);
 });
 test('the largest full history stays small next to the 20MB backup limit',()=>{
  let d=emptyData();const long=speech(9000);
  for(let i=0;i<100;i++)d=attachSpeakingFeedback(saveSpeakingFollowUp(saveSpeakingAnswer(d,{id:'r'+i,topicId:topic.id,topicTitle:topic.title,question:Q[1],answer:long,seconds:300},at),'r'+i,long),'r'+i,{good:long,missed:long,followUp:long},fine);
  expect(new TextEncoder().encode(JSON.stringify(d.speakingRecords)).length).toBeLessThan(2000000);
 });
});

describe('the pay day',()=>{
 test('coming back after 04:00, it counts toward the day it settles on',()=>{
  const late=new Date(2026,10,6,3,50).getTime(),after=new Date(2026,10,6,4,10).getTime();
  const d=settleSpeaking(answered(emptyData(),'a',1000,fine,late),'a',undefined,after);
  expect(record(d,'a')).toMatchObject({day:'2026-11-05',rewardDay:'2026-11-06',minutes:5});
  expect(getDay(d,'2026-11-06').bonus?.speaking).toBe(5);
  expect(getDay(d,'2026-11-05').bonus?.speaking).toBeUndefined();
 });
 test('each new day starts again at 500 and nothing carries over',()=>{
  const d=done(emptyData(),'a',1800),next=at+24*60*60*1000;
  expect(speakingToday(d,routineDay(new Date(next)))).toMatchObject({steps:0,required:500,moreChars:500});
 });
});

describe('every path that adds up time includes it',()=>{
 const fs=require('fs'),path=require('path');
 const read=(f:string)=>fs.readFileSync(path.join(__dirname,'../..',f),'utf8') as string;
 const paid=done(emptyData(),'a',1000);
 const native={supported:true,authorized:true,enabled:true,rewardMode:true,day:key,grantedMinutes:5,consumedMinutes:0,morningComplete:true,usingRewards:true,policyVersion:2,locked:false} as any;
 test('earned and the wallet: nothing left pending once the device has it',()=>{
  const day=getDay(paid,key);
  expect(earned(day)).toBe(5);
  expect(timeWallet(day,key,native)).toMatchObject({localEarned:5,pending:0,credited:5,balance:5});
 });
 test('the wallet shows it pending until the device has it',()=>{
  expect(timeWallet(getDay(paid,key),key,{...native,grantedMinutes:0}).pending).toBe(5);
 });
 test('a broken bonus is never sent to the device, which would fail the whole sync',()=>{
  for(const bad of [1.5,-5,'x',7]){
   const broken={...paid,days:{...paid.days,[key]:{...getDay(paid,key),bonus:{speaking:bad as number}}}},sent=rewardSyncExtras(broken,key,{supportsHandwritingRewards:true,supportsMinuteHandwriting:true,supportsSpeakingRewards:true}).speaking!;
   expect(sent%5).toBe(0);expect(sent).toBeGreaterThanOrEqual(0);
  }
 });
 test('the provider sends it again when it changes',()=>{
  expect(read('src/features/routine/RoutineProvider.tsx')).toMatch(/bonus\?\.handwriting,(bonus\?\.focusBreak,)?bonus\?\.speaking/);
  expect(read('src/features/routine/RoutineProvider.tsx')).toContain('native?.supportsSpeakingRewards');
 });
 test('Swift: the balance is the sum of every ledger entry, so it counts',()=>{
  expect(read('modules/routine-screen-time/ios/ScreenTimeState.swift')).toContain('(state.paid ?? [:]).values.reduce(0, +)');
 });
 test('undoing word study adjusts only its own entries and leaves it alone',()=>{
  expect(studyLedger(getDay(paid,key))).not.toHaveProperty('speaking');
 });
 test('the day record counts its minutes and shows what was said',()=>{
  expect(dailyTimeline(paid,key,null).totals.earnedMinutes).toBe(5);
  expect(read('src/features/routine/DailyTimeline.tsx')).toContain('SpeakingDayRecords');
 });
 test('the wallet screen and the rules list name it',()=>{
  expect(read('src/features/routine/TimeWalletScreen.tsx')).toContain('bonus?.speaking');
  expect(read('src/features/routine/RewardSourcesCard.tsx')).toContain("'말하기'");
 });
 test('speaking time is not study time',()=>{
  expect(dailyTimeline(paid,key,null).totals.studySeconds).toBe(0);
 });
});

describe('money',()=>{
 const wallet=()=>startMoneyRewards(emptyData(),key,'w',PROPOSED_MONEY_RATES,new Date(at));
 test('500 won a step, once',()=>{
  const before=wallet(),after=reconcileMoneyRewards(before,done(before,'a',2500),key,new Date(at));
  expect(after.money!.entries.find(e=>e.id==='speaking:a')?.amount).toBe(1000);
  expect(moneySummary(after).balance).toBe(1000);
  expect(reconcileMoneyRewards(after,after,key,new Date(at)).money!.entries).toHaveLength(after.money!.entries.length);
 });
 test('characters with no step crossed pay no money',()=>{
  const before=wallet(),after=reconcileMoneyRewards(before,done(before,'a',10),key,new Date(at));
  expect(after.money!.entries.some(e=>e.id==='speaking:a')).toBe(false);
 });
 test('it stays out of the focus and letter tables',()=>{
  const d=done(emptyData(),'a',1000);
  expect(getDay(d,key).bonus?.handwriting).toBeUndefined();
  expect(d.bookSessions).toBeUndefined();
 });
});

describe('when it can start',()=>{
 const studying=()=>startBookTimer(startOutputStudy(claimFocusPlan(emptyData(),'plan','수능','기출',at),'draft','수능',new Date(at)),'run','수능',at,120,'output');
 test('not while the study timer runs',()=>expect(canStartSpeaking(studying())).toBe(false));
 test('not while it is paused either, since the run is still open',()=>{
  const t=studying();
  expect(canStartSpeaking({...t,bookTimer:{...t.bookTimer!,running:false}})).toBe(false);
 });
 test('during a rest',()=>expect(canStartSpeaking(startBookBreak(studying(),at+130000))).toBe(true));
 test('with no timer and after study',()=>{
  expect(canStartSpeaking(emptyData())).toBe(true);
  const t=studying();
  expect(canStartSpeaking({...t,bookTimer:{...t.bookTimer!,phase:'idle',running:false}})).toBe(true);
 });
});

describe('which question comes next',()=>{
 test('moves on from what was answered today and rotates by day',()=>{
  const today=nextSpeakingQuestion(emptyData(),topic,key)!,paid=settleSpeaking(answered(emptyData(),'a',600,fine,at,today),'a',undefined,at);
  expect(Q).toContain(today);
  expect(nextSpeakingQuestion(paid,topic,key)).not.toBe(today);
  expect(nextSpeakingQuestion(emptyData(),topic,'2026-11-06')).not.toBe(today);
 });
 test('once all five are done it still gives one',()=>{
  let d=emptyData();Q.forEach((q,i)=>{d=settleSpeaking(answered(d,'r'+i,600,fine,at,q),'r'+i,undefined,at)});
  expect(Q).toContain(nextSpeakingQuestion(d,topic,key));
 });
 test('a topic the AI writes for has none here',()=>{
  expect(nextSpeakingQuestion(emptyData(),{id:'x',title:'x',description:'',aiBrief:'b'},key)).toBeUndefined();
 });
});

describe('saved data never blocks the app',()=>{
 test('earlier data has no records',()=>{
  expect(speakingRecords(emptyData())).toEqual([]);
  expect(speakingToday(emptyData(),key)).toMatchObject({steps:0,minutes:0,required:500});
 });
 test.each([['text'],[{}],[[null,5,{id:1}]]])('broken records %j are skipped',bad=>{
  const d={...emptyData(),speakingRecords:bad as never};
  expect(speakingRecords(d)).toEqual([]);
  expect(()=>validateBackup(makeBackup(d,user),user)).not.toThrow();
 });
 test.each([['text'],[-3],[NaN],[1.5]])('a broken bonus %j counts as nothing',bad=>{
  expect(earned({...getDay(emptyData(),key),bonus:{speaking:bad as number}})).toBe(0);
 });
 test.each([[{chars:'x',steps:-1}],[null],['text'],[{chars:1.5,steps:NaN}]])('broken day progress %j starts from 0',bad=>{
  const base=emptyData(),day={...getDay(base,key),speakingRewards:bad as never},d={...base,days:{...base.days,[key]:day}};
  expect(speakingToday(d,key)).toMatchObject({steps:0,moreChars:500});
  expect(()=>validateBackup(makeBackup(d,user),user)).not.toThrow();
 });
 test('goes through a backup',()=>{
  expect(()=>validateBackup(makeBackup(done(emptyData(),'a',1000),user),user)).not.toThrow();
 });
});

describe('the device',()=>{
 const d=done(emptyData(),'a',1000);
 test('a build that knows it gets the minutes',()=>{
  expect(rewardSyncExtras(d,key,{supportsHandwritingRewards:true,supportsMinuteHandwriting:true,supportsSpeakingRewards:true})).toMatchObject({speaking:5});
 });
 test('a build that does not is never sent them',()=>{
  expect(rewardSyncExtras(d,key,{supportsHandwritingRewards:true,supportsMinuteHandwriting:true})).not.toHaveProperty('speaking');
 });
 const fs=require('fs'),path=require('path');
 const read=(f:string)=>fs.readFileSync(path.join(__dirname,'../..',f),'utf8') as string;
 test('Swift adds it to the ledger in fives and says it can',()=>{
  const module=read('modules/routine-screen-time/ios/RoutineScreenTimeModule.swift');
  expect(module).toMatch(/ledger\["speaking"\] = max\(ledger\["speaking"\] \?\? 0, speaking\)/);
  expect(module).toContain('speaking % 5 == 0');
  expect(read('modules/routine-screen-time/ios/ScreenTimeState.swift')).toContain('"supportsSpeakingRewards": true');
  expect(read('targets/screentime/ScreenTimeState.swift')).toBe(read('modules/routine-screen-time/ios/ScreenTimeState.swift'));
 });
 test('the permission text names speaking practice',()=>{
  expect(read('app.json').match(/말하기 연습/g)!.length).toBeGreaterThanOrEqual(2);
 });
});

describe('the server function',()=>{
 const fs=require('fs'),path=require('path');
 const source=fs.readFileSync(path.join(__dirname,'../../supabase/functions/speaking-coach/index.ts'),'utf8') as string;
 test('checks the account, limits length and keeps the key on the server',()=>{
  expect(source).toContain('auth.getUser(');
  expect(source).toContain("Deno.env.get('OPENAI_API_KEY')");
  expect(source).toContain('store:false');
  expect(source).toMatch(/MAX_BODY/);
 });
 test('accepts what the app sends at its largest',()=>{
  const limit=(name:string)=>Number(source.match(new RegExp(name+':(\\d+)'))![1]);
  expect(limit('answer')).toBeGreaterThanOrEqual(answerForAi(speech(9000)).length);
  expect(limit('followUpAnswer')).toBeGreaterThanOrEqual(SPEAKING_POLICY.sendFollowUpChars);
  expect(Number(source.match(/MAX_BODY=(\d+)/)![1])).toBeGreaterThan(limit('answer')+limit('followUpAnswer')+limit('question')+limit('followUp'));
 });
 test('tells the model not to invent and not to obey the transcript',()=>{
  expect(source).toMatch(/never invent/i);
  expect(source).toMatch(/untrusted/i);
  expect(source).toMatch(/never judge.*correct/i);
 });
});
