import {emptyData} from '../lib/routineModel';
import {startBookTimer,startBookBreak,settleBookTimer,pauseBookTimer,resumeBookTimer,stopBookTimer} from '../lib/bookStudy';
import {bookFocusSeconds,bookDisplaySeconds} from '../lib/bookTimerTime';
const at=new Date(2026,10,1,9).getTime();
test('focus runs beyond target, survives reload, and records overtime only once at explicit break',()=>{
 let d=startBookTimer(emptyData(),'focus','공부',at,120);
 expect(settleBookTimer(d,at+121000)).toBe(d);expect(d.bookTimer?.phase).toBe('focus');
 d=JSON.parse(JSON.stringify(d));expect(bookDisplaySeconds(d.bookTimer!,at+151000)).toBe(-31);
 expect(bookFocusSeconds(d.bookTimer!,at+151000)).toBe(151);
 d=startBookBreak(d,at+151000);expect(d.bookTimer).toMatchObject({phase:'break',remaining:300,endsAt:at+451000});
 expect(d.bookSessions![0].seconds).toBe(151);expect(startBookBreak(d,at+152000)).toBe(d);
 d=settleBookTimer(d,at+451000);expect(d.bookTimer?.phase).toBe('idle');expect(d.bookSessions).toHaveLength(1);
});
test('overtime pauses without counting stopped time and continues on resume',()=>{
 let d=pauseBookTimer(startBookTimer(emptyData(),'focus','공부',at,120),at+150000);
 expect(bookDisplaySeconds(d.bookTimer!,at+200000)).toBe(-30);
 d=resumeBookTimer(d,at+200000);expect(bookDisplaySeconds(d.bookTimer!,at+210000)).toBe(-40);
 d=stopBookTimer(d,at+210000);expect(d.bookSessions![0].seconds).toBe(160);
});
