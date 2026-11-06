import {appIconName} from './appIcon';
import {routineDay} from './routineModel';

/**
 * 알림에 붙이는 동물 얼굴 (S2-12, Diana 2026-11-07). 그림은 앱 아이콘과 같고 600px 사본을 쓴다(assets/notification-faces).
 * 얼굴은 알림이 울리는 시각으로 고른다. 미리 걸어 두는 알림도 그 시각의 얼굴이 된다.
 * - nudge: 오늘 루틴을 재촉하는 알림. 앱 아이콘 규칙 그대로(완료면 신남, 오전이면 웃음, 그 밖에는 걱정).
 * - chosen: 사용자가 정한 시각을 알리는 알림(휴식 끝, 다음 공부 예약). 탓하는 느낌이 없게 걱정은 쓰지 않는다. 완료면 신남, 아니면 웃음.
 * 밤(21:00–04:30)에는 신남 대신 웃음으로 조용히 한다. 아직 오지 않은 날은 완료를 모르니 안 한 것으로 본다.
 */
export type NotificationFaceKind='nudge'|'chosen';
export const NOTIFICATION_FACE_POLICY={size:600,nightFrom:{hour:21,minute:0},nightUntil:{hour:4,minute:30}};

const minutes=(t:{hour:number;minute:number})=>t.hour*60+t.minute;
export function quietNight(d:Date){
 const m=d.getHours()*60+d.getMinutes(),{nightFrom,nightUntil}=NOTIFICATION_FACE_POLICY;
 return m>=minutes(nightFrom)||m<minutes(nightUntil);
}

/** `{face}-{animal}`: assets/app-icons와 같은 이름. today는 지금의 04시 기준 날짜, todayDone은 지금 오늘 실천을 했는지. */
export function notificationFace({at,kind,today,todayDone}:{at:number;kind:NotificationFaceKind;today:string;todayDone:boolean}):string{
 const when=new Date(at),day=routineDay(when),hour=when.getHours(),done=day===today&&todayDone;
 const [face,animal]=appIconName(day,hour,done).split('-');
 const picked=kind==='chosen'&&face==='worried'?'smile':face;
 return `${picked==='cheer'&&quietNight(when)?'smile':picked}-${animal}`;
}
