import {emptyData} from '../lib/routineModel';
import {claimFocusPlan} from '../lib/focusRamp';
import {handwritingAccess} from '../lib/handwriting';
import {bookDisplaySeconds,bookFocusSeconds} from '../lib/bookTimerTime';
import {pauseBookTimer,settleBookTimer,skipBookBreak,startBookBreak,startBookTimer} from '../lib/bookStudy';
const at=new Date(2026,10,1,9).getTime(),subject='수능';
/** Level 5 is the 25-minute stage; the plan claim creates the draft and level 1 cycle. */
const stage=(level:1|2|3|4|5)=>{const d=claimFocusPlan(emptyData(),'plan',subject,'기출 1번',at);return {...d,focusRamp:{...d.focusRamp!,level}};};
const required={1:120,2:300,3:600,4:900,5:1500} as const;
const breakAfter=(studied:number,level:1|2|3|4|5=5)=>startBookBreak(startBookTimer(stage(level),'first',subject,at,required[level],'output'),at+studied*1000);
const later=(studied:number,rested:number)=>at+(studied+rested)*1000;

test('skipping keeps the subject, draft and real focus total without counting the rest',()=>{
 const d=breakAfter(600),draft=d.outputDraft;
 const next=skipBookBreak(d,'first','second',later(600,120));
 expect(next.bookTimer).toMatchObject({id:'second',phase:'focus',running:true,subject,rewardMode:'output'});
 expect(next.outputDraft).toEqual(draft);
 expect(next.bookSessions).toEqual(d.bookSessions);
 expect(next.bookSessions).toHaveLength(1);
 expect(handwritingAccess(next,subject,later(600,120)).seconds).toBe(600);
 expect(handwritingAccess(next,subject,later(600,120)+60000).seconds).toBe(660);
});
test('skipping pays nothing: days and receipts are untouched',()=>{
 const d=breakAfter(1500),next=skipBookBreak(d,'first','second',later(1500,10));
 expect(next.days).toEqual(d.days);
 expect(next.handwritingReceipts).toEqual(d.handwritingReceipts);
 expect(next.money).toEqual(d.money);
});
test('a paused break can be skipped and its stopped time is never focus time',()=>{
 const paused=pauseBookTimer(breakAfter(600),later(600,30));
 expect(paused.bookTimer).toMatchObject({phase:'break',running:false});
 const next=skipBookBreak(paused,'first','second',later(600,3000));
 expect(next.bookTimer).toMatchObject({id:'second',phase:'focus',running:true});
 expect(bookFocusSeconds(next.bookTimer!,later(600,3000))).toBe(0);
 expect(handwritingAccess(next,subject,later(600,3000)).seconds).toBe(600);
});
test('the countdown restarts the whole stage while real study time is kept',()=>{
 const next=skipBookBreak(breakAfter(600),'first','second',later(600,60));
 expect(bookDisplaySeconds(next.bookTimer!,later(600,60))).toBe(1500);
 expect(next.bookTimer).toMatchObject({targetSeconds:1500,remaining:1500,duration:1500});
 expect(handwritingAccess(next,subject,later(600,60)).remaining).toBe(900);
});
test('stages stay gradual: a 2-minute stage never becomes a fixed 25 minutes',()=>{
 const next=skipBookBreak(breakAfter(60,1),'first','second',later(60,10));
 expect(bookDisplaySeconds(next.bookTimer!,later(60,10))).toBe(120);
 const met=skipBookBreak(breakAfter(150,1),'first','second',later(150,10));
 expect(bookDisplaySeconds(met.bookTimer!,later(150,10))).toBe(120);
});
test('skipping and starting after a natural end give the same countdown',()=>{
 const skipped=skipBookBreak(breakAfter(600),'first','second',later(600,300));
 const natural=startBookTimer(settleBookTimer(breakAfter(600),later(600,300)),'second',subject,later(600,300),1500,'output');
 expect(skipped.bookTimer).toEqual(natural.bookTimer);
});
test('repeated presses transition once',()=>{
 const once=skipBookBreak(breakAfter(600),'first','second',later(600,10));
 expect(skipBookBreak(once,'first','third',later(600,11))).toBe(once);
});
test('break end then press still starts studying exactly once',()=>{
 const ended=settleBookTimer(breakAfter(600),later(600,300));
 expect(ended.bookTimer).toMatchObject({id:'first',phase:'idle'});
 const next=skipBookBreak(ended,'first','second',later(600,300));
 expect(next.bookTimer).toMatchObject({id:'second',phase:'focus'});
 expect(next.bookSessions).toHaveLength(1);
 expect(settleBookTimer(next,later(600,301))).toBe(next);
});
test('press then late break-end settlement does not stop the new study',()=>{
 const next=skipBookBreak(breakAfter(600),'first','second',later(600,10));
 expect(settleBookTimer(next,later(600,300))).toBe(next);
});
test('a stale press cannot replace a different timer',()=>{
 const d=breakAfter(600),other={...d,bookTimer:{...d.bookTimer!,id:'another'}};
 expect(skipBookBreak(other,'first','second',later(600,10))).toBe(other);
});
test('after 2 hours away the plan-first rule still applies',()=>{
 const paused=pauseBookTimer(breakAfter(600),later(600,10));
 expect(()=>skipBookBreak(paused,'first','second',later(600,7300))).toThrow('계획');
});
