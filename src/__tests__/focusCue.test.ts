import {emptyData} from '../lib/routineModel';
import {skipBookBreak,startBookTimer,takeEarnedBreak} from '../lib/bookStudy';
import {canStartBreak,claimFocusPlan} from '../lib/focusRamp';
import {startOutputStudy} from '../lib/handwriting';
import {timerCueKind} from '../lib/focusCue';

jest.mock('../lib/supabase',()=>({supabase:{}}));
// S1-07 교차 검토(Felix): 휴식 보상 차임은 휴식 버튼이 실제로 열릴 때만. 휴식에서 돌아온 공부는 시계가 끝나도 휴식이 아직 안 열릴 수 있다.
const at=new Date(2026,10,1,9).getTime(),sec=1000,subject='전기기사 실기';
const when=(s:number)=>at+s*sec;
const running=()=>startBookTimer(startOutputStudy(claimFocusPlan(emptyData(),'plan',subject,'기출 1번',at),'draft',subject,new Date(at)),'run',subject,at,120,'output');

describe('집중 끝 신호의 소리',()=>{
 test('휴식 버튼이 열리면 휴식 보상 차임',()=>{
  const d=running(),t=when(600);
  expect(canStartBreak(d,t)).toBe(true);
  expect(timerCueKind('focus',d,t)).toBe('break');
 });
 test('휴식에서 돌아와 시계는 끝났지만 휴식이 아직 안 열렸으면 짧은 소리',()=>{
  const d=skipBookBreak(takeEarnedBreak(running(),when(130)),'run','back',when(140)),t=when(141);
  expect(canStartBreak(d,t)).toBe(false);
  expect(timerCueKind('focus',d,t)).toBe('timer');
 });
 test('휴식이 끝난 신호는 늘 짧은 소리',()=>{
  const d=running();
  expect(timerCueKind('break',d,when(600))).toBe('timer');
 });
});
