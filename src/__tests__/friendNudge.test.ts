import {FRIEND_NUDGE_TIMES,friendNudge,nudgeSlot} from '../lib/friendNudge';
import {stickerFor} from '../lib/calendarSticker';
import {streakWidgetView} from '../lib/streakWidget';

const DAY='2026-11-06';
const at=(h:number,m=0)=>new Date(2026,10,6,h,m);

describe('친구가 먼저 말 걸기 (팀장 결정 2026-11-06)',()=>{
 test('시각은 한 곳의 상수다: 18:00, 20:30, 21:00 잠금',()=>{
  expect(FRIEND_NUDGE_TIMES).toEqual({evening:'18:00',lastCall:'20:30',lock:'21:00'});
 });
 test('18:00~20:29는 첫 번째, 20:30~20:59는 두 번째, 그 밖은 없다',()=>{
  expect(nudgeSlot(at(17,59))).toBeNull();
  expect(nudgeSlot(at(18,0))).toBe('evening');
  expect(nudgeSlot(at(20,29))).toBe('evening');
  expect(nudgeSlot(at(20,30))).toBe('lastCall');
  expect(nudgeSlot(at(20,59))).toBe('lastCall');
  expect(nudgeSlot(at(21,0))).toBeNull();
  expect(nudgeSlot(at(2,0))).toBeNull();
 });
 test('오늘 공부 전일 때만 말을 건다',()=>{
  expect(friendNudge({now:at(18,30),dayKey:DAY,todayDone:true,closed:null})).toBeNull();
  const n=friendNudge({now:at(18,30),dayKey:DAY,todayDone:false,closed:null});
  expect(n?.slot).toBe('evening');
  expect(n?.action).toBe('A32');
  const last=friendNudge({now:at(20,40),dayKey:DAY,todayDone:false,closed:null});
  expect(last?.slot).toBe('lastCall');
  expect(last?.action).toBe('A35');
 });
 test('닫은 칸은 그날 다시 뜨지 않고, 다른 칸과 다음 날은 뜬다 (하루 최대 2번)',()=>{
  const closed={day:DAY,slots:['evening' as const]};
  expect(friendNudge({now:at(19),dayKey:DAY,todayDone:false,closed})).toBeNull();
  expect(friendNudge({now:at(20,45),dayKey:DAY,todayDone:false,closed})?.slot).toBe('lastCall');
  expect(friendNudge({now:new Date(2026,10,7,19),dayKey:'2026-11-07',todayDone:false,closed})?.slot).toBe('evening');
  const both={day:DAY,slots:['evening' as const,'lastCall' as const]};
  expect(friendNudge({now:at(20,45),dayKey:DAY,todayDone:false,closed:both})).toBeNull();
 });
 test('문구는 칸 안의 어느 시각에 열어도 맞는다(고정된 지금 시각을 말하지 않는다)',()=>{
  for(const now of [at(18,0),at(19,45),at(20,29),at(20,30),at(20,59)]){
   const n=friendNudge({now,dayKey:DAY,todayDone:false,closed:null})!;
   expect(n.title+n.detail).not.toMatch(/6시|30분 뒤/);
  }
  expect(friendNudge({now:at(20,50),dayKey:DAY,todayDone:false,closed:null})!.title).toContain('9시');
 });
 test('깨진 닫기 기록은 무시한다',()=>{
  expect(friendNudge({now:at(19),dayKey:DAY,todayDone:false,closed:{day:DAY,slots:'x' as any}})?.slot).toBe('evening');
 });
});

describe('기록 달력 친구 스티커',()=>{
 test('동물과 포즈는 연속 실천 위젯과 같은 날짜 순서다',()=>{
  for(let i=0;i<16;i++){
   const key=`2026-11-${String(i+1).padStart(2,'0')}`,view=streakWidgetView(null,key,12);
   expect(stickerFor(key)).toEqual({animal:view.animal,pose:view.pose});
  }
 });
});
