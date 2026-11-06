import * as Notifications from 'expo-notifications';
import {BREAK_ALARM_ID} from '../lib/breakAlarm';
import {NEXT_STUDY_ALARM_ID,syncNextStudyAlarm} from '../lib/studyReservationAlarm';

jest.mock('expo-notifications',()=>({
 SchedulableTriggerInputTypes:{DATE:'date'},
 getPermissionsAsync:jest.fn(async()=>({granted:true,canAskAgain:true})),
 requestPermissionsAsync:jest.fn(async()=>({granted:true})),
 scheduleNotificationAsync:jest.fn(async()=>'id'),
 cancelScheduledNotificationAsync:jest.fn(async()=>{}),
}));
const N=Notifications as jest.Mocked<typeof Notifications>;
beforeEach(()=>jest.clearAllMocks());

test('its own id, never the rest alarm',()=>expect(NEXT_STUDY_ALARM_ID).not.toBe(BREAK_ALARM_ID));
test('rings once at the reserved time and opens the focus timer',async()=>{
 await syncNextStudyAlarm(5000,'전기기사');
 expect(N.cancelScheduledNotificationAsync).toHaveBeenCalledWith(NEXT_STUDY_ALARM_ID);
 const call=N.scheduleNotificationAsync.mock.calls[0][0] as any;
 expect(call.identifier).toBe(NEXT_STUDY_ALARM_ID);
 expect(call.trigger.date).toEqual(new Date(5000));
 expect(call.content.body).toContain('전기기사');
 expect(call.content.data).toEqual({screen:'FocusTimer'});
});
test('no reservation only clears, and never touches the rest alarm',async()=>{
 await syncNextStudyAlarm(null);
 expect(N.scheduleNotificationAsync).not.toHaveBeenCalled();
 expect(N.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(1);
 expect(N.cancelScheduledNotificationAsync).not.toHaveBeenCalledWith(BREAK_ALARM_ID);
});
test('notifications off: nothing scheduled, reports false',async()=>{
 N.getPermissionsAsync.mockResolvedValueOnce({granted:false,canAskAgain:false} as any);
 expect(await syncNextStudyAlarm(5000,'x')).toBe(false);
 expect(N.scheduleNotificationAsync).not.toHaveBeenCalled();
});
