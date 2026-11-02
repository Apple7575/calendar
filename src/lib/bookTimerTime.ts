import type {BookTimer} from './bookStudy';
export function bookRemaining(t:BookTimer,now=Date.now()){
 return t.running?Math.min(t.remaining,Math.max(0,Math.ceil((t.endsAt-now)/1000))):t.remaining;
}
/** Actual focus time is independent of the editable countdown target. */
export function bookFocusSeconds(t:BookTimer,now=Date.now()){
 if(t.phase!=='focus')return 0;
 if(t.focusElapsed!==undefined)return t.focusElapsed+(t.running?Math.max(0,Math.floor((now-(t.focusResumedAt??now))/1000)):0);
 return Math.max(0,(t.duration??1500)-bookRemaining(t,now))+(t.running?Math.max(0,Math.floor((now-t.endsAt)/1000)):0);
}
/** Signed seconds: negative values mean additional focus beyond the chosen target. */
export function bookDisplaySeconds(t:BookTimer,now=Date.now()){
 if(t.phase!=='focus')return bookRemaining(t,now);
 const overtime=bookFocusSeconds(t,now)-(t.targetSeconds??t.duration??1500);
 return overtime>0?-overtime:bookRemaining(t,now);
}
