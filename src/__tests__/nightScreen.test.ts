import {isNightScreen,nextNightChange,screenTheme,todayFriendAction} from '../lib/nightScreen';
import {getTheme,nightTheme} from '../theme/themes';
import {planCelebration} from '../lib/celebration';
import {inSleepWindow} from '../lib/emergencyUnlock';

// 팀장 결정(2026-11-07, 2차 회의): 밤 9시가 되면 밤 화면. 취침 잠금과 같은 시각(21:00~04:30)에 자동으로 바뀌고, 밤에는 축하를 진동만으로.
const at=(h:number,m=0,day=7)=>new Date(2026,10,day,h,m).getTime();

describe('밤 화면 시각은 취침 잠금과 같다',()=>{
 test('21:00부터 04:30 전까지가 밤이다',()=>{
  expect([at(20,59),at(21,0),at(23,30),at(2,0),at(4,29),at(4,30),at(12,0)].map(isNightScreen)).toEqual([false,true,true,true,true,false,false]);
 });
 test('취침 잠금 시각과 하나도 다르지 않다',()=>{
  for(let minute=0;minute<24*60;minute+=5){const t=at(0,minute);expect(isNightScreen(t)).toBe(inSleepWindow(t));}
 });
 test('다음에 바뀌는 시각: 낮이면 오늘 21:00, 밤이면 다음 04:30',()=>{
  expect(nextNightChange(at(10,0))).toBe(at(21,0));
  expect(nextNightChange(at(20,59))).toBe(at(21,0));
  expect(nextNightChange(at(21,0))).toBe(at(4,30,8));
  expect(nextNightChange(at(23,10))).toBe(at(4,30,8));
  expect(nextNightChange(at(2,0))).toBe(at(4,30));
  expect(nextNightChange(at(4,30))).toBe(at(21,0));
 });
});

describe('밤 화면 색',()=>{
 test('밤에는 고른 테마와 상관없이 밤 화면, 낮에는 고른 테마 그대로',()=>{
  expect(screenTheme('routine',true)).toBe(nightTheme);
  expect(screenTheme('dark',true)).toBe(nightTheme);
  expect(screenTheme('routine',false)).toBe(getTheme('routine'));
  expect(screenTheme('dark',false)).toBe(getTheme('dark'));
 });
 test('밤 화면은 어둡고, 저장된 테마 이름을 바꾸지 않는다(설정 목록에 없음)',()=>{
  expect(nightTheme.isDark).toBe(true);
  expect(nightTheme.statusBar).toBe('light');
  expect(['routine','dark']).toContain(nightTheme.id);
 });
 const lum=(hex:string)=>{const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=0.03928?v/12.92:((v+0.055)/1.055)**2.4);return 0.2126*r+0.7152*g+0.0722*b;};
 const contrast=(a:string,b:string)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+0.05)/(y+0.05);};
 test('글자는 배경·카드 위에서 읽힌다(본문 7:1, 흐린 글자·강조색 4.5:1 이상)',()=>{
  const c=nightTheme.colors;
  for(const bg of [c.background,c.card,c.inputBg]){
   expect(contrast(c.text,bg)).toBeGreaterThanOrEqual(7);
   expect(contrast(c.textMuted,bg)).toBeGreaterThanOrEqual(4.5);
   expect(contrast(c.primary,bg)).toBeGreaterThanOrEqual(4.5);
  }
 });
 test('밤 화면은 다크보다 덜 밝다(본문 글자가 순백에 가깝지 않다)',()=>{
  expect(lum(nightTheme.colors.text)).toBeLessThan(lum(getTheme('dark').colors.text));
  expect(lum(nightTheme.colors.primary)).toBeLessThan(lum(getTheme('dark').colors.primary));
 });
});

describe('밤에는 오늘 탭 친구가 저녁 동작',()=>{
 test('밤이면 A30, 낮이면 지금처럼(다 했으면 A23, 아니면 A31)',()=>{
  expect(todayFriendAction(at(21,5),false)).toBe('A30');
  expect(todayFriendAction(at(23,0),true)).toBe('A30');
  expect(todayFriendAction(at(13,0),false)).toBe('A31');
  expect(todayFriendAction(at(13,0),true)).toBe('A23');
 });
 test('친구 말 걸기가 있으면 그 동작을 따른다(말 걸기는 21시 전에만 나온다)',()=>{
  expect(todayFriendAction(at(20,40),false,'A35')).toBe('A35');
 });
});

describe('밤에는 축하를 진동만으로',()=>{
 const DAY='2026-11-07',NIGHT=at(22,0);
 test('큰·중간 축하도 밤에는 작은 축하(소리 없음, 효과 없음)로, 진동은 축하 진동 그대로',()=>{
  for(const kind of ['dayComplete','streak','wordStep','promiseKept'] as const){
   const {plan}=planCelebration({kind,n:7,minutes:5},null,DAY,NIGHT,{night:true});
   expect(plan).toMatchObject({tier:'small',sound:null,effect:undefined,haptic:'success'});
  }
 });
 test('밤에 작아진 축하는 하루 큰 축하 3번에 세지 않는다',()=>{
  const {log}=planCelebration({kind:'dayComplete'},null,DAY,NIGHT,{night:true});
  expect(log.big).toEqual([]);
 });
 test('원래 작은 축하는 밤에도 그대로(가벼운 진동)',()=>{
  expect(planCelebration({kind:'routineStep'},null,DAY,NIGHT,{night:true}).plan).toMatchObject({tier:'small',haptic:'light'});
 });
 test('낮에는 지금과 같다',()=>{
  expect(planCelebration({kind:'dayComplete'},null,DAY,at(13,0)).plan.tier).toBe('big');
  expect(planCelebration({kind:'dayComplete'},null,DAY,at(13,0),{night:false}).plan.tier).toBe('big');
 });
});
