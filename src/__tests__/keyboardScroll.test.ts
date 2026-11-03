import {keyboardScrollDelta} from '../lib/keyboardScroll';

describe('keyboardScrollDelta',()=>{
 it('moves a covered field above the keyboard with a margin',()=>{
  expect(keyboardScrollDelta(600,500)).toBe(116);
 });
 it('does not move a field that is already clear of the keyboard',()=>{
  expect(keyboardScrollDelta(400,500)).toBe(0);
  expect(keyboardScrollDelta(484,500)).toBe(0);
 });
 it('counts the margin even when the field only touches the keyboard',()=>{
  expect(keyboardScrollDelta(500,500)).toBe(16);
 });
});
