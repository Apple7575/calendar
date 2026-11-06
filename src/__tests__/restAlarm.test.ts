import {breakAlarmAt} from '../lib/breakAlarm';
import {REST_ALARM_POLICY,restAlarmArm,restAlarmEnd,restAlarmRinging} from '../lib/restAlarm';

const NOW=1_000_000,min=60000;
const t=(over:object={})=>({id:'t',subject:'회로',startedAt:'',phase:'break',endsAt:NOW+min,remaining:60,running:true,...over}) as any;

describe('when the rest ends',()=>{
 test('a running rest ends at its end, the same moment the notification uses',()=>{
  expect(restAlarmEnd(t())).toBe(NOW+min);
  expect(restAlarmEnd(t())).toBe(breakAlarmAt(t(),NOW));
 });
 test('a rest that already ran out keeps its end',()=>expect(restAlarmEnd(t({phase:'idle',running:false,restEndedAt:NOW-5}))).toBe(NOW-5));
 test('a paused rest, study, or no timer has no end',()=>{
  expect(restAlarmEnd(t({running:false}))).toBeNull();
  expect(restAlarmEnd(t({phase:'focus'}))).toBeNull();
  expect(restAlarmEnd(t({phase:'idle',running:false}))).toBeNull();
  expect(restAlarmEnd(undefined)).toBeNull();
 });
});

describe('arming: only a rest running while the app is open',()=>{
 test('a running rest in the open app arms its own key',()=>expect(restAlarmArm(t(),NOW,true)).toBe('t:'+(NOW+min)));
 test('the app in the background does not arm',()=>expect(restAlarmArm(t(),NOW,false)).toBeNull());
 test('paused, or already over, does not arm',()=>{
  expect(restAlarmArm(t({running:false}),NOW,true)).toBeNull();
  expect(restAlarmArm(t(),NOW+min,true)).toBeNull();
 });
 test('adjusting the rest changes the key, so the alarm follows the new end',()=>expect(restAlarmArm(t({endsAt:NOW+2*min}),NOW,true)).not.toBe(restAlarmArm(t(),NOW,true)));
});

describe('ringing',()=>{
 const armed='t:'+(NOW+min);
 test('rings from the end of an armed rest, also once the timer has settled to idle',()=>{
  expect(restAlarmRinging(t(),NOW+min-1,armed,'')).toBe(false);
  expect(restAlarmRinging(t(),NOW+min,armed,'')).toBe(true);
  expect(restAlarmRinging(t({phase:'idle',running:false,restEndedAt:NOW+min}),NOW+min+1000,armed,'')).toBe(true);
 });
 test('stops on "알람 끄기", on starting study, or by itself after 5 minutes',()=>{
  expect(restAlarmRinging(t(),NOW+min,armed,armed)).toBe(false);
  expect(restAlarmRinging(t({phase:'focus',endsAt:NOW+5*min}),NOW+min+1000,armed,'')).toBe(false);
  expect(restAlarmRinging(t(),NOW+min+REST_ALARM_POLICY.autoStopMs,armed,'')).toBe(false);
 });
 test('a rest that ended while the app was away does not ring on return',()=>expect(restAlarmRinging(t({phase:'idle',running:false,restEndedAt:NOW+min}),NOW+min+1000,'','')).toBe(false));
 test('a skipped or paused rest does not ring',()=>{
  expect(restAlarmRinging(t({running:false}),NOW+min,armed,'')).toBe(false);
  expect(restAlarmRinging(undefined,NOW+min,armed,'')).toBe(false);
 });
});
