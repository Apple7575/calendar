import {Day,earned} from './routineModel';
import type {ScreenTimeStatus} from './screenTime';
export function timeWallet(day:Day,key:string,native:ScreenTimeStatus|null,now=Date.now()){
 const connected=!!native?.supported&&native.authorized&&native.enabled&&!!native.rewardMode;
 const current=connected&&native?.day===key;
 const credited=current?native!.grantedMinutes:0,used=current?native!.consumedMinutes:0,balance=Math.max(0,credited-used);
 const focus=!!native?.focusUntil&&native.focusUntil>now;
 const morning=day.paid.morning>0&&!!native?.morningComplete;
 const paused=!!native?.policyVersion&&native.policyVersion>=2&&!native.usingRewards;
 const priorityBlocked=!!native?.priorityRequired&&!native.priorityComplete;
 const reason=!connected?'제한 앱 연결 전':!current?'오늘 잔액 확인 중':!morning?'아침 루틴을 마치면 사용 가능':native?.sleepLocked?'취침 준비 시간':focus?'집중 시간':paused?'모은 시간 사용 대기':balance===0?'사용 시간을 모두 썼어요':native?.locked?'잠금 상태 확인 중':'지금 사용할 수 있어요';
 // Pausing use shields apps but does not remove the balance that can be resumed.
 const usable=!!current&&morning&&!priorityBlocked&&!native?.sleepLocked&&!focus&&(!native?.locked||paused);
 return {connected,localEarned:earned(day),credited,used,balance,available:usable?balance:0,held:usable?0:balance,pending:Math.max(0,earned(day)-credited-(current?(native!.penaltyMinutes??0)+(native!.debtMinutes??0):0)),reason:connected&&morning&&priorityBlocked?'1순위 공부를 작게 시작하면 사용 가능':reason,morning,paused};
}
