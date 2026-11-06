import {CELEBRATION_LIMITS,planCelebration,streakFriends,streakMilestone,type CelebrationLog} from '../lib/celebration';
import {settlementNews} from '../lib/settlementNews';
import {emptyData,type RoutineData} from '../lib/routineModel';

const DAY='2026-11-06',T=Date.UTC(2026,10,6,10);

describe('축하 단계와 한도 (팀장 결정 2026-11-06)',()=>{
 test('큰 축하는 하루 3번, 넘으면 중간으로 낮춘다',()=>{
  let log:CelebrationLog=null;const tiers:string[]=[];
  for(const kind of ['dayComplete','streak','stakeWon','comeback'] as const){const r=planCelebration({kind,n:7},log,DAY,T);tiers.push(r.plan.tier);log=r.log;}
  expect(CELEBRATION_LIMITS.bigPerDay).toBe(3);
  expect(tiers).toEqual(['big','big','big','medium']);
 });
 test('같은 큰 축하는 하루 1번, 다음 날은 다시 크다',()=>{
  const a=planCelebration({kind:'dayComplete'},null,DAY,T);
  expect(planCelebration({kind:'dayComplete'},a.log,DAY,T+11*60_000).plan.tier).toBe('medium');
  // 10분 안에 같은 축하가 또 오면 작은 축하로 더 낮춘다.
  expect(planCelebration({kind:'dayComplete'},a.log,DAY,T+1000).plan.tier).toBe('small');
  expect(planCelebration({kind:'dayComplete'},a.log,'2026-11-07',T+86_400_000).plan.tier).toBe('big');
 });
 test('같은 중간 축하는 10분에 1번, 그 안이면 작은 축하로 낮춘다',()=>{
  const a=planCelebration({kind:'wordStep',minutes:5},null,DAY,T);
  expect(a.plan.tier).toBe('medium');
  expect(planCelebration({kind:'wordStep',minutes:5},a.log,DAY,T+5*60_000).plan.tier).toBe('small');
  expect(planCelebration({kind:'wordStep',minutes:5},a.log,DAY,T+11*60_000).plan.tier).toBe('medium');
 });
 test('바로 전과 같은 동작·같은 문구를 되도록 다시 쓰지 않는다',()=>{
  let log:CelebrationLog=null;const seen:{action:string;title:string}[]=[];
  for(let i=0;i<3;i++){const r=planCelebration({kind:'routineStep'},log,DAY,T+i*60_000);seen.push({action:r.plan.action,title:r.plan.title});log=r.log;}
  expect(seen[1].action).not.toBe(seen[0].action);expect(seen[2].action).not.toBe(seen[1].action);
  expect(new Set(seen.map(s=>s.title)).size).toBe(3);
 });
 test('단계마다 소리·진동이 정해져 있다: 큰=완료 소리, 중간=짧은 소리(말하기 중엔 없음), 작은=진동만',()=>{
  expect(planCelebration({kind:'dayComplete'},null,DAY,T).plan).toMatchObject({sound:'complete',haptic:'success',effect:'effect_confetti'});
  expect(planCelebration({kind:'wordStep',minutes:5},null,DAY,T).plan).toMatchObject({sound:'milestone',haptic:'success',effect:'effect_bookmark'});
  expect(planCelebration({kind:'speakingStep',minutes:5},null,DAY,T).plan.sound).toBeNull();
  expect(planCelebration({kind:'routineStep'},null,DAY,T).plan).toMatchObject({tier:'small',sound:null,haptic:'light',effect:undefined});
 });
 test('숫자가 문구에 들어간다',()=>{
  expect(planCelebration({kind:'streak',n:7},null,DAY,T).plan.title).toContain('7');
  expect(planCelebration({kind:'wordStep',minutes:5},null,DAY,T).plan.title).toContain('5');
 });
});

describe('연속 실천 기념일 3·7·14·30',()=>{
 test('오늘 실천해서 기념일 숫자에 닿은 날만',()=>{
  expect([1,2,3,4,7,10,14,30,31].map(n=>streakMilestone(n,true))).toEqual([null,null,3,null,7,null,14,30,null]);
  expect(streakMilestone(7,false)).toBeNull();
 });
 test('기념일마다 함께 나오는 친구 수가 다르다',()=>{
  expect([3,7,14,30].map(streakFriends)).toEqual([1,2,4,4]);
 });
});

describe('정산 소식 (앱을 열 때 모아서 한 번)',()=>{
 const at='2026-11-02T05:00:00.000Z';
 const data:RoutineData={...emptyData(),
  weeklyStakes:{'2026-10-26':{amount:10000,targetDays:5,placedAt:'2026-10-26T01:00:00.000Z',status:'won',payoutWon:11000,studyDays:5,settledAt:at}},
  dayPromises:{'2026-11-05':{startAt:'09:00',setAt:'2026-11-04T12:00:00.000Z',outcome:{status:'kept',at:'2026-11-05T00:05:00.000Z',day:'2026-11-05',minutes:10,won:1000}}},
  interestDays:{'2026-11-04':{unusedMinutes:20,won:600,emergency:false},'2026-11-05':{unusedMinutes:10,won:300,emergency:false},'2026-11-03':{unusedMinutes:0,won:0,emergency:true}},
 } as RoutineData;
 test('지난주 예치금 성공, 어제 지킨 약속, 이자를 모아 보여 준다',()=>{
  const items=settlementNews(data,'2026-11-06',[]);
  expect(items.map(i=>i.kind)).toEqual(['stakeWon','promiseKept','interest']);
 });
 test('월요일에는 지난주 예치금 성공도 보인다',()=>{
  const monday={...data,dayPromises:{}} as RoutineData;
  const items=settlementNews(monday,'2026-11-02',[]);
  expect(items[0]).toMatchObject({kind:'stakeWon',won:11000,id:'stake:2026-10-26'});
 });
 test('본 소식은 다시 보여 주지 않는다',()=>{
  const first=settlementNews(data,'2026-11-06',[]),seen=first.flatMap(i=>i.ids);
  expect(settlementNews(data,'2026-11-06',seen)).toEqual([]);
 });
 test('이자는 여러 날을 한 줄로 합친다(0원·긴급 해제 날 제외)',()=>{
  const interest=settlementNews(data,'2026-11-06',[]).find(i=>i.kind==='interest')!;
  expect(interest.won).toBe(900);expect(interest.ids.sort()).toEqual(['interest:2026-11-04','interest:2026-11-05']);
 });
 test('정산할 것이 없으면 빈 목록',()=>{
  expect(settlementNews(emptyData(),'2026-11-06',[])).toEqual([]);
 });
});

describe('숫자를 두 번 쓰지 않는다',()=>{
 const {rewardParts}=require('../lib/celebration');
 test('제목에 분이 있으면 아래 줄에서 분을 뺀다(모든 kind)',()=>{
  for(let i=0;i<4;i++){
   const {plan}=planCelebration({kind:'wordStep',minutes:5},null,'2026-11-0'+(i+1),T);
   expect(plan.title).toContain('5');
   expect(rewardParts(plan)).toEqual([]);
  }
 });
 test('제목에 없는 숫자는 그대로 보여 준다',()=>{
  const {plan}=planCelebration({kind:'promiseKept',minutes:10,won:1000},null,DAY,T);
  expect(rewardParts(plan)).toEqual(['+10분','+1,000원']);
  expect(rewardParts({...plan,title:'1,000원 받았어요'})).toEqual(['+10분']);
 });
});
