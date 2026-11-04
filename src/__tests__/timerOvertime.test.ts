import {FOCUS_OVERTIME_FLASH_SECONDS,focusClockInverted} from '../lib/focusFlow';
import {overtimeTheme} from '../theme/themes';

test('study overtime flashes only just after crossing the target',()=>{
 expect(focusClockInverted('focus',10,null)).toBe(false);
 expect(focusClockInverted('focus',0,null)).toBe(true);
 expect(focusClockInverted('focus',-3,null)).toBe(true);
 expect(focusClockInverted('focus',-FOCUS_OVERTIME_FLASH_SECONDS,null)).toBe(false);
 expect(focusClockInverted('focus',-1500,null)).toBe(false);
});

test('reopening the app long after the target does not flash again',()=>{
 expect(focusClockInverted('focus',-600,null,false)).toBe(false);
});

test('adjusting the time and crossing again does not flash twice on one timer',()=>{
 expect(focusClockInverted('focus',-1,null,true)).toBe(false);
});

test('break overtime stays inverted for as long as it runs',()=>{
 expect(focusClockInverted('idle',0,12)).toBe(true);
 expect(focusClockInverted('idle',0,6000)).toBe(true);
 expect(focusClockInverted('idle',0,null)).toBe(false);
 expect(focusClockInverted('break',0,null)).toBe(false);
});

test('overtime theme is black on the timer green',()=>{
 expect(overtimeTheme.colors.background).toBe('#C4EA89');
 expect(overtimeTheme.colors.text).toBe('#000000');
 expect(overtimeTheme.isDark).toBe(false);
});
