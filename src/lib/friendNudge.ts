/**
 * 오늘 탭 친구가 먼저 말 걸기 (팀장 결정 2026-11-06, docs/plan-2026-11-06-ideas.md #5).
 * 오늘 공부 전일 때만 18:00과 20:30(21시 잠금 30분 전)에 한 번씩, 하루 최대 2번 말풍선을 띄운다.
 * 앱 안의 말풍선만 쓴다. 푸시 알림은 보내지 않는다. 보상·잠금·저장 형식과 관계없다.
 */
export const FRIEND_NUDGE_TIMES={evening:'18:00',lastCall:'20:30',lock:'21:00'} as const;
export type NudgeSlot='evening'|'lastCall';
export type NudgeClosed={day:string;slots:NudgeSlot[]}|null;
export type FriendNudge={slot:NudgeSlot;title:string;detail:string;action:'A32'|'A35'};

const minutes=(hhmm:string)=>Number(hhmm.slice(0,2))*60+Number(hhmm.slice(3,5));

export function nudgeSlot(now:Date):NudgeSlot|null{
 const m=now.getHours()*60+now.getMinutes();
 if(m>=minutes(FRIEND_NUDGE_TIMES.evening)&&m<minutes(FRIEND_NUDGE_TIMES.lastCall))return 'evening';
 if(m>=minutes(FRIEND_NUDGE_TIMES.lastCall)&&m<minutes(FRIEND_NUDGE_TIMES.lock))return 'lastCall';
 return null;
}

const LINES:Record<NudgeSlot,Omit<FriendNudge,'slot'>>={
 evening:{title:'저녁 6시예요. 오늘 공부는 아직이에요.',detail:'딱 2분만 같이 시작해요.',action:'A32'},
 lastCall:{title:'30분 뒤 9시에 잠겨요.',detail:'지금 2분만 하면 오늘도 이어져요.',action:'A35'},
};

/** 지금 띄울 말풍선. 오늘 공부했거나 시간 밖이거나 이 칸을 닫았으면 null. */
export function friendNudge({now,dayKey,todayDone,closed}:{now:Date;dayKey:string;todayDone:boolean;closed:NudgeClosed}):FriendNudge|null{
 const slot=nudgeSlot(now);
 if(!slot||todayDone)return null;
 if(closed&&closed.day===dayKey&&Array.isArray(closed.slots)&&closed.slots.includes(slot))return null;
 return {slot,...LINES[slot]};
}
