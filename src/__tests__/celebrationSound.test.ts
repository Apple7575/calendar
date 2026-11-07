import {planCelebration,type CelebrationKind} from '../lib/celebration';

// S1-07(팀장 2026-11-07 선택): 축하 순간마다 정해진 효과음 하나. 같은 순간에는 늘 같은 소리가 나야 기억에 남는다.
const DAY='2026-11-07',T=new Date(2026,10,7,13,0).getTime();
const sound=(kind:CelebrationKind,n?:number)=>planCelebration({kind,n},null,DAY,T).plan.sound;

describe('축하 순간별 효과음',()=>{
 test('큰 축하는 그 순간의 소리',()=>{
  expect(sound('dayComplete')).toBe('dayComplete');
  expect(sound('stakeWon')).toBe('stakeWon');
  expect(sound('comeback')).toBe('comeback');
 });
 test('연속 실천은 3·7일과 14·30일이 다른 소리',()=>{
  expect(sound('streak',3)).toBe('streak3');
  expect(sound('streak',7)).toBe('streak3');
  expect(sound('streak',14)).toBe('streak14');
  expect(sound('streak',30)).toBe('streak14');
 });
 test('중간 축하는 그 순간의 소리, 성장은 우선 과제와 같은 소리',()=>{
  for(const kind of ['promiseKept','interest','wordStep','weekCheck','priorityAll'] as const)expect(sound(kind)).toBe(kind);
  expect(sound('growth')).toBe('priorityAll');
 });
 test('말하기 500자는 말하는 중이라 소리 없음',()=>{
  expect(sound('speakingStep')).toBeNull();
 });
 test('루틴 한 단계·계획 저장은 아주 짧은 소리',()=>{
  expect(sound('routineStep')).toBe('routineStep');
  expect(sound('planSaved')).toBe('planSaved');
 });
});

describe('한도로 단계가 낮아지면 소리도 낮아진다',()=>{
 test('같은 큰 축하가 하루 두 번째면(10분 넘게 지나서) 중간 소리로',()=>{
  const first=planCelebration({kind:'dayComplete'},null,DAY,T);
  expect(planCelebration({kind:'dayComplete'},first.log,DAY,T+11*60_000).plan).toMatchObject({tier:'medium',sound:'priorityAll'});
  const won=planCelebration({kind:'stakeWon'},null,DAY,T);
  expect(planCelebration({kind:'stakeWon'},won.log,DAY,T+11*60_000).plan).toMatchObject({tier:'medium',sound:'interest'});
 });
 test('중간 축하가 10분 안에 또 오면 작은 축하로 내려가고 소리는 없다',()=>{
  const first=planCelebration({kind:'wordStep',minutes:5},null,DAY,T);
  expect(planCelebration({kind:'wordStep',minutes:5},first.log,DAY,T+60_000).plan).toMatchObject({tier:'small',sound:null});
 });
 test('루틴 한 단계는 몇 번이 와도 같은 짧은 소리',()=>{
  let log=planCelebration({kind:'routineStep'},null,DAY,T).log;
  for(let i=1;i<5;i++){const next=planCelebration({kind:'routineStep'},log,DAY,T+i*1000);expect(next.plan.sound).toBe('routineStep');log=next.log;}
 });
});

describe('밤에는 소리가 없다',()=>{
 test('밤에는 어떤 축하도 소리를 고르지 않는다',()=>{
  for(const kind of ['dayComplete','wordStep','routineStep','planSaved'] as const)
   expect(planCelebration({kind},null,DAY,T,{night:true}).plan.sound).toBeNull();
 });
});
