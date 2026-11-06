import * as Notifications from 'expo-notifications';
import {BREAK_ALARM_ID,breakAlarmAt,syncBreakAlarm} from '../lib/breakAlarm';

jest.mock('expo-notifications',()=>({
 SchedulableTriggerInputTypes:{DATE:'date'},
 getPermissionsAsync:jest.fn(async()=>({granted:true,canAskAgain:true})),
 requestPermissionsAsync:jest.fn(async()=>({granted:true})),
 scheduleNotificationAsync:jest.fn(async()=>'id'),
 cancelScheduledNotificationAsync:jest.fn(async()=>{}),
}));
const N=Notifications as jest.Mocked<typeof Notifications>;
const NOW=1000000;
const timer=(over:object={})=>({id:'t',subject:'회로',startedAt:'',phase:'break',endsAt:NOW+60000,remaining:60,running:true,...over}) as any;

describe('when the rest alarm should ring',()=>{
 test('a running rest rings at its end',()=>expect(breakAlarmAt(timer(),NOW)).toBe(NOW+60000));
 test('a paused rest does not ring',()=>expect(breakAlarmAt(timer({running:false}),NOW)).toBeNull());
 test('study does not ring',()=>expect(breakAlarmAt(timer({phase:'focus'}),NOW)).toBeNull());
 test('a rest already over does not ring',()=>expect(breakAlarmAt(timer({endsAt:NOW}),NOW)).toBeNull());
 test('no timer or a broken end does not ring',()=>{
  expect(breakAlarmAt(undefined,NOW)).toBeNull();
  expect(breakAlarmAt(timer({endsAt:'soon'}),NOW)).toBeNull();
 });
});

describe('keeping one alarm on the phone',()=>{
 beforeEach(()=>jest.clearAllMocks());
 test('schedules at the end of the rest, replacing the old one',async()=>{
  await syncBreakAlarm(NOW+60000);
  expect(N.cancelScheduledNotificationAsync).toHaveBeenCalledWith(BREAK_ALARM_ID);
  const request=N.scheduleNotificationAsync.mock.calls[0][0];
  expect(request.identifier).toBe(BREAK_ALARM_ID);
  expect(request.trigger).toEqual({type:'date',date:new Date(NOW+60000)});
  expect(request.content.title).toBe('쉬는 시간이 끝났어요');
 });
 test('the bell on rings with our alarm sound; off is a silent notification (S1-21)',async()=>{
  await syncBreakAlarm(NOW+60000);
  expect(N.scheduleNotificationAsync.mock.calls[0][0].content.sound).toBe('rest_alarm.wav');
  await syncBreakAlarm(NOW+60000,false);
  expect(N.scheduleNotificationAsync.mock.calls[1][0].content.sound).toBe(false);
 });
 test('leaving the rest only cancels and never asks for permission',async()=>{
  await syncBreakAlarm(null);
  expect(N.cancelScheduledNotificationAsync).toHaveBeenCalledWith(BREAK_ALARM_ID);
  expect(N.scheduleNotificationAsync).not.toHaveBeenCalled();
  expect(N.getPermissionsAsync).not.toHaveBeenCalled();
 });
 test('without permission nothing is scheduled',async()=>{
  N.getPermissionsAsync.mockResolvedValueOnce({granted:false,canAskAgain:false} as any);
  await expect(syncBreakAlarm(NOW+60000)).resolves.toBe(false);
  expect(N.scheduleNotificationAsync).not.toHaveBeenCalled();
 });
 test('a quick skip right after starting a rest leaves no alarm behind',async()=>{
  const order:string[]=[];
  N.cancelScheduledNotificationAsync.mockImplementation(async()=>{order.push('cancel')});
  N.scheduleNotificationAsync.mockImplementation(async()=>{await new Promise(r=>setTimeout(r,5));order.push('schedule');return 'id'});
  await Promise.all([syncBreakAlarm(NOW+60000),syncBreakAlarm(null)]);
  expect(order).toEqual(['cancel','schedule','cancel']);
 });
});
