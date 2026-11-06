import * as Notifications from 'expo-notifications';
import {Platform} from 'react-native';

/** 밤 1분 돌아보기 알림. 앞으로 3번까지 미리 걸어 두고, 앱이 열릴 때마다 다시 맞춘다. */
export const REFLECT_ALARM_IDS=['routine.reflect.0','routine.reflect.1','routine.reflect.2'];

async function apply(times:number[]){
 for(const id of REFLECT_ALARM_IDS)await Notifications.cancelScheduledNotificationAsync(id);
 if(!times.length)return true;
 const current=await Notifications.getPermissionsAsync();
 const granted=current.granted||(current.canAskAgain&&(await Notifications.requestPermissionsAsync()).granted);
 if(!granted)return false;
 for(const [i,at] of times.slice(0,REFLECT_ALARM_IDS.length).entries())
  await Notifications.scheduleNotificationAsync({identifier:REFLECT_ALARM_IDS[i],content:{title:'밤 1분 돌아보기',body:'오늘을 보고 내일 첫 공부 시각을 정해요.',sound:true,data:{screen:'NightReflection'}},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date:new Date(at)}});
 return true;
}

let queue:Promise<unknown>=Promise.resolve(),last='';
/** 같은 시각 목록이면 다시 걸지 않는다. 알림이 꺼져 있으면 false. */
export function syncReflectAlarm(times:number[]):Promise<boolean>{
 if(Platform.OS==='web')return Promise.resolve(false);
 const key=times.join(',');
 if(key===last)return Promise.resolve(true);
 const run=queue.then(()=>apply(times)).then(ok=>{if(ok)last=key;return ok;});
 queue=run.catch(()=>{});
 return run;
}
