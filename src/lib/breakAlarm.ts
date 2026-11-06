import * as Notifications from 'expo-notifications';
import {Platform} from 'react-native';
import type {BookTimer} from './bookStudy';
import {REST_ALARM_POLICY} from './restAlarm';
import {faceAttachments} from './notificationFaceAttachment';

export const BREAK_ALARM_ID='routine.break-end';

/** When the phone should ring: only a running rest with its end still ahead. Pausing, skipping or adjusting changes this and the alarm follows. */
export function breakAlarmAt(t:BookTimer|undefined,now=Date.now()){
 return t?.phase==='break'&&t.running&&Number.isFinite(t.endsAt)&&t.endsAt>now?t.endsAt:null;
}

async function apply(at:number|null,ring:boolean,face?:string){
 await Notifications.cancelScheduledNotificationAsync(BREAK_ALARM_ID);
 if(at===null)return true;
 const current=await Notifications.getPermissionsAsync();
 const granted=current.granted||(current.canAskAgain&&(await Notifications.requestPermissionsAsync()).granted);
 if(!granted)return false;
 const attachments=await faceAttachments(face,BREAK_ALARM_ID);
 await Notifications.scheduleNotificationAsync({identifier:BREAK_ALARM_ID,content:{title:'쉬는 시간이 끝났어요',body:'돌아와서 다음 공부를 시작해요.',sound:ring?REST_ALARM_POLICY.sound:false,...(attachments.length?{attachments}:{})},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:new Date(at)}});
 return true;
}

let queue:Promise<unknown>=Promise.resolve();
/**
 * Calls run in order, so a skip right after a rest starts cannot leave an alarm behind. Resolves false when notifications are off.
 * ring (S1-21 종 아이콘): on plays our alarm sound (iOS caps it at 30 s); off is a silent notification.
 * face (S2-12): the animal face picked for when it goes off (notificationFace, kind 'chosen'). None, no picture.
 */
export function syncBreakAlarm(at:number|null,ring=true,face?:string):Promise<boolean>{
 if(Platform.OS==='web')return Promise.resolve(false);
 const run=queue.then(()=>apply(at,ring,face));
 queue=run.catch(()=>{});
 return run;
}
