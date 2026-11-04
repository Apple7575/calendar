import {focusClockInverted} from '../lib/focusFlow';
import {overtimeTheme} from '../theme/themes';

test('focus clock inverts only when study time or a break has run over',()=>{
 expect(focusClockInverted('focus',10,null)).toBe(false);
 expect(focusClockInverted('focus',0,null)).toBe(true);
 expect(focusClockInverted('focus',-5,null)).toBe(true);
 expect(focusClockInverted('idle',0,12)).toBe(true);
 expect(focusClockInverted('idle',0,null)).toBe(false);
 expect(focusClockInverted('break',0,null)).toBe(false);
});

test('overtime theme is black on the timer green',()=>{
 expect(overtimeTheme.colors.background).toBe('#C4EA89');
 expect(overtimeTheme.colors.text).toBe('#000000');
 expect(overtimeTheme.isDark).toBe(false);
});
