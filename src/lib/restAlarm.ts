import type {BookTimer} from './bookStudy';

/**
 * 휴식 끝 알람 (S1-21). 앱이 켜져 있는 동안 휴식이 끝나면 소리를 반복하고 진동한다.
 * 기준은 휴식 끝 알림(breakAlarmAt)과 같다: 달리는 휴식의 endsAt. 일시정지·건너뛰기·시간 조정을 하면 따라간다.
 * 앱이 켜진 채 휴식이 달릴 때만 "장전"하고, 앱을 떠났다 돌아오면 이미 끝난 휴식은 울리지 않는다(그때는 알림이 울렸다).
 */
export const REST_ALARM_POLICY={
 /** 아무도 끄지 않으면 이만큼 뒤 저절로 멈춘다 (PM 제안). */
 autoStopMs:5*60000,
 /** assets/sounds/rest_alarm.wav. 알림 소리로도 쓰여 app.json expo-notifications sounds에 등록돼 있다. 30초 미만. */
 sound:'rest_alarm.wav',
};

/** 휴식이 끝나는(끝난) 시각. 달리는 휴식은 endsAt, 이미 끝나 정리된 휴식은 restEndedAt. 그 밖에는 null. */
export function restAlarmEnd(t:BookTimer|undefined):number|null{
 if(!t)return null;
 if(t.phase==='break')return t.running&&Number.isFinite(t.endsAt)?t.endsAt:null;
 if(t.phase==='idle'&&typeof t.restEndedAt==='number'&&Number.isFinite(t.restEndedAt))return t.restEndedAt;
 return null;
}
const keyOf=(t:BookTimer,end:number)=>t.id+':'+end;

/** 장전할 열쇠: 앱이 켜져 있고 휴식이 아직 달리는 중일 때만. */
export function restAlarmArm(t:BookTimer|undefined,now:number,appActive:boolean):string|null{
 if(!appActive||!t||t.phase!=='break')return null;
 const end=restAlarmEnd(t);
 return end!==null&&now<end?keyOf(t,end):null;
}

/** 지금 울려야 하는지. 장전된 휴식이 끝났고, 끄지 않았고, 5분이 지나지 않았을 때. 공부를 시작하면 끝 시각이 사라져 멈춘다. */
export function restAlarmRinging(t:BookTimer|undefined,now:number,armed:string,dismissed:string):boolean{
 const end=restAlarmEnd(t);
 if(!t||end===null)return false;
 const key=keyOf(t,end);
 return key===armed&&key!==dismissed&&now>=end&&now<end+REST_ALARM_POLICY.autoStopMs;
}
