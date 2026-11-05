import {focusMascotCue,type FocusMascotFrame} from '../lib/focusMascotCue';

const frame=(over:Partial<FocusMascotFrame>={}):FocusMascotFrame=>({timerId:'t1',phase:'focus',credit:100,elapsed:100,...over});

test('stays still while studying between stages',()=>{
 expect(focusMascotCue(frame({credit:100}),frame({credit:101}))).toBeNull();
});
test.each([120,300,600,900,1500])('moves once when study reaches the %i second stage',seconds=>{
 const before=frame({credit:seconds-1}),at=frame({credit:seconds});
 expect(focusMascotCue(before,at)).toBe('stage');
 expect(focusMascotCue(at,frame({credit:seconds+1}))).toBeNull();
});
test('moves again each time study passes another 25 minutes',()=>{
 expect(focusMascotCue(frame({credit:2999}),frame({credit:3000}))).toBe('stage');
 expect(focusMascotCue(frame({credit:3000}),frame({credit:3001}))).toBeNull();
});
test('does not play a stage for time carried into a new run',()=>{
 expect(focusMascotCue(frame(),frame({timerId:'t2',credit:400,elapsed:0}))).toBe('start');
});
test('does not move at a time that is not a stage',()=>{
 expect(focusMascotCue(frame({credit:179}),frame({credit:180}))).toBeNull();
});
test('moves when a jump passes a stage, as after the app wakes',()=>{
 expect(focusMascotCue(frame({credit:100}),frame({credit:400}))).toBe('stage');
});
test('moves when study starts on a freshly opened screen',()=>{
 expect(focusMascotCue(null,frame({credit:1,elapsed:1}))).toBe('start');
});
test('stays still when the screen reopens in the middle of study',()=>{
 expect(focusMascotCue(null,frame({credit:400,elapsed:400}))).toBeNull();
});
test('stays still when the screen reopens in the middle of a break',()=>{
 expect(focusMascotCue(null,frame({phase:'break',elapsed:60}))).toBeNull();
});
test('moves when a new run replaces the timer',()=>{
 expect(focusMascotCue(frame(),frame({timerId:'t2',credit:0,elapsed:0}))).toBe('start');
});
test('moves when a break starts',()=>{
 expect(focusMascotCue(frame(),frame({phase:'break',elapsed:0}))).toBe('break');
});
test('moves when study comes back from a break',()=>{
 expect(focusMascotCue(frame({phase:'break'}),frame({phase:'focus'}))).toBe('start');
});
test('stays still with no timer',()=>{
 expect(focusMascotCue(null,frame({phase:'idle',credit:0,elapsed:0}))).toBeNull();
});
test('does not call a payout that lowers the credit a stage',()=>{
 expect(focusMascotCue(frame({credit:300}),frame({credit:0}))).toBeNull();
});
