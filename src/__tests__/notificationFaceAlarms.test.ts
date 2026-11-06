import * as Notifications from 'expo-notifications';
import {BREAK_ALARM_ID,syncBreakAlarm} from '../lib/breakAlarm';
import {NEXT_STUDY_ALARM_ID,syncNextStudyAlarm} from '../lib/studyReservationAlarm';
import {REFLECT_ALARM_IDS,syncReflectAlarm} from '../lib/reflectAlarm';
import {faceAttachments} from '../lib/notificationFaceAttachment';

jest.mock('expo-notifications',()=>({
 SchedulableTriggerInputTypes:{DATE:'date'},
 getPermissionsAsync:jest.fn(async()=>({granted:true,canAskAgain:true})),
 requestPermissionsAsync:jest.fn(async()=>({granted:true})),
 scheduleNotificationAsync:jest.fn(async()=>'id'),
 cancelScheduledNotificationAsync:jest.fn(async()=>{}),
}));
jest.mock('../lib/notificationFaceAttachment',()=>({faceAttachments:jest.fn(async(name:string|undefined,tag:string)=>name?[{identifier:name,uri:`file:///c/${tag}-${name}.png`}]:[])}));
const N=Notifications as jest.Mocked<typeof Notifications>;
const A=faceAttachments as jest.MockedFunction<typeof faceAttachments>;
const content=(i=0)=>(N.scheduleNotificationAsync.mock.calls[i][0] as any).content;
beforeEach(()=>jest.clearAllMocks());

// S2-12: the three routine notifications carry the animal face picked for when they go off.
describe('the face goes on the notification',()=>{
 test('rest end',async()=>{
  await syncBreakAlarm(5000,true,'smile-otter');
  expect(A).toHaveBeenCalledWith('smile-otter',BREAK_ALARM_ID);
  expect(content().attachments).toEqual([{identifier:'smile-otter',uri:`file:///c/${BREAK_ALARM_ID}-smile-otter.png`}]);
 });
 test('next study',async()=>{
  await syncNextStudyAlarm(5000,'전기기사','cheer-cat');
  expect(A).toHaveBeenCalledWith('cheer-cat',NEXT_STUDY_ALARM_ID);
  expect(content().attachments).toHaveLength(1);
 });
 test('night reflection: each of the three with its own face and its own copy',async()=>{
  await syncReflectAlarm([1000,2000,3000],['worried-bear','smile-cat','worried-otter']);
  expect(A.mock.calls).toEqual([['worried-bear',REFLECT_ALARM_IDS[0]],['smile-cat',REFLECT_ALARM_IDS[1]],['worried-otter',REFLECT_ALARM_IDS[2]]]);
  expect(content(1).attachments[0].identifier).toBe('smile-cat');
 });
 test('a new face for the same times is set again, so finishing the routine turns worry into a smile',async()=>{
  await syncReflectAlarm([7000],['worried-bear']);
  await syncReflectAlarm([7000],['worried-bear']);
  expect(N.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  await syncReflectAlarm([7000],['smile-bear']);
  expect(N.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
  expect(content(1).attachments[0].identifier).toBe('smile-bear');
 });
});

describe('no face, the notification is unchanged',()=>{
 test('without a face nothing is attached and the rest is as before',async()=>{
  await syncBreakAlarm(5000,false);
  expect(content().attachments).toBeUndefined();
  expect(content()).toMatchObject({title:'쉬는 시간이 끝났어요',sound:false});
 });
 test('a failed picture still sends the notification',async()=>{
  A.mockResolvedValueOnce([]);
  await syncNextStudyAlarm(5000,'수학','smile-otter');
  expect(N.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  expect(content().attachments).toBeUndefined();
 });
});
