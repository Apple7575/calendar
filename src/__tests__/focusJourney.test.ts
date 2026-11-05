import {focusJourney,journeyGoal} from '../lib/focusJourney';

const done=(j:ReturnType<typeof focusJourney>)=>j.ticks.filter(t=>t.done).map(t=>t.seconds);
describe('the way to 25 minutes',()=>{
 test('2:10 in the 2-minute stage is 2:10, heading for 5 minutes',()=>{
  const j=focusJourney(130,120);
  expect(j).toMatchObject({studied:130,next:300});
  expect(journeyGoal(j)).toBe('다음 5분까지 02:50');
  expect(done(j)).toEqual([120]);
 });
 test('before the stage is met the stage itself is next',()=>{
  const j=focusJourney(30,120);
  expect(j.next).toBe(120);expect(done(j)).toEqual([]);
 });
 test('a stage already paid stays lit and the next stage is what remains',()=>{
  const j=focusJourney(10,300);
  expect(j.next).toBe(300);expect(journeyGoal(j)).toBe('다음 5분까지 04:50');expect(done(j)).toEqual([120]);
 });
 test('the last stage repeats from a fresh count with all earlier marks lit',()=>{
  const j=focusJourney(60,1500);
  expect(j.next).toBe(1500);expect(done(j)).toEqual([120,300,600,900]);
 });
 test('past 25 minutes the time keeps rising on a full ring',()=>{
  const j=focusJourney(1620,1500);
  expect(j).toMatchObject({studied:1620,next:null,progress:1});
  expect(journeyGoal(j)).toBe('25분 달성 · 계속 쌓여요');
  expect(done(j)).toEqual([120,300,600,900,1500]);
 });
 test('marks sit where their minutes are on a 25-minute circle',()=>{
  expect(focusJourney(0,120).ticks.map(t=>t.at)).toEqual([120/1500,300/1500,600/1500,900/1500,1]);
  expect(focusJourney(750,120).progress).toBe(.5);
 });
 test('part seconds and bad values do not reach the screen',()=>{
  expect(focusJourney(130.9,120).studied).toBe(130);
  expect(focusJourney(-5,120).studied).toBe(0);
  expect(focusJourney(Number.NaN,120).studied).toBe(0);
 });
});
