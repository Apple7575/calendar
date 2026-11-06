import * as Notifications from 'expo-notifications';
import {Platform} from 'react-native';

/** 다음 공부 예약 알림 (S1-10). 휴식 끝 알림(routine.break-end)과 id가 겹치지 않는다. */
export const NEXT_STUDY_ALARM_ID='routine.next-study';

async function apply(at:number|null,subject:string){
 await Notifications.cancelScheduledNotificationAsync(NEXT_STUDY_ALARM_ID);
 if(at===null)return true;
 const current=await Notifications.getPermissionsAsync();
 const granted=current.granted||(current.canAskAgain&&(await Notifications.requestPermissionsAsync()).granted);
 if(!granted)return false;
 await Notifications.scheduleNotificationAsync({identifier:NEXT_STUDY_ALARM_ID,content:{title:'다음 공부 시간이에요',body:`${subject} 2분부터 시작해요.`,sound:true,data:{screen:'FocusTimer'}},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:new Date(at)}});
 return true;
}

let queue:Promise<unknown>=Promise.resolve();
/** 차례로 건다. 예약을 바꾸거나 일찍 시작하면 이전 알림은 지워진다. 알림이 꺼져 있으면 false. */
export function syncNextStudyAlarm(at:number|null,subject=''):Promise<boolean>{
 if(Platform.OS==='web')return Promise.resolve(false);
 const run=queue.then(()=>apply(at,subject));
 queue=run.catch(()=>{});
 return run;
}
