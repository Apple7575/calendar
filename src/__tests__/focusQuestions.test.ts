import {HARVARD_QUESTIONS,MUSK_QUESTIONS} from '../lib/focusQuestionWords';
import {FOCUS_QUESTION_KEY,nextFocusQuestion} from '../lib/focusQuestions';

const mockStore=new Map<string,string>();
const mockGetItem=jest.fn(async(k:string)=>mockStore.get(k)??null);
jest.mock('@react-native-async-storage/async-storage',()=>({__esModule:true,default:{getItem:(k:string)=>mockGetItem(k),setItem:async(k:string,v:string)=>{mockStore.set(k,v)}}}));
const day='2026-11-05',tomorrow='2026-11-06';
const never={day:'',plan:0,quit:0};

describe('how often a question appears',()=>{
 test('Harvard once on the first plan of the day',()=>{
  const first=nextFocusQuestion(never,'plan',day);
  expect(HARVARD_QUESTIONS).toContain(first.text);
  expect(nextFocusQuestion(first.shown,'plan',day).text).toBeNull();
 });
 test('Musk twice a day, and never a third time',()=>{
  const a=nextFocusQuestion(never,'quit',day),b=nextFocusQuestion(a.shown,'quit',day),c=nextFocusQuestion(b.shown,'quit',day);
  expect(MUSK_QUESTIONS).toContain(a.text);
  expect(MUSK_QUESTIONS).toContain(b.text);
  expect(c.text).toBeNull();
 });
 test('the day total stays at three whatever the order',()=>{
  let shown=never,count=0;
  for(const moment of ['quit','plan','quit','plan','quit','quit','plan'] as const){const r=nextFocusQuestion(shown,moment,day);shown=r.shown;if(r.text)count+=1}
  expect(count).toBe(3);
 });
 test('a new routine day starts over',()=>{
  const used=nextFocusQuestion(nextFocusQuestion(never,'quit',day).shown,'plan',day).shown;
  expect(nextFocusQuestion(used,'plan',tomorrow).text).not.toBeNull();
  expect(nextFocusQuestion(used,'plan',tomorrow).shown).toEqual({day:tomorrow,plan:1,quit:0});
 });
 test('the two questions of one day are different, and the wording moves between days',()=>{
  const a=nextFocusQuestion(never,'quit',day),b=nextFocusQuestion(a.shown,'quit',day);
  expect(a.text).not.toBe(b.text);
  expect(nextFocusQuestion(never,'plan',day).text).not.toBe(nextFocusQuestion(never,'plan',tomorrow).text);
 });
});

describe('the wording',()=>{
 test.each([['Harvard',HARVARD_QUESTIONS,'하버드생이라면'],['Musk',MUSK_QUESTIONS,'일론 머스크라면']] as const)('%s is 2 to 4 questions, never a quotation',(_,list,opening)=>{
  expect(list.length).toBeGreaterThanOrEqual(2);
  expect(list.length).toBeLessThanOrEqual(4);
  for(const line of list){
   expect(line.startsWith(opening)).toBe(true);
   expect(line.endsWith('?')).toBe(true);
   expect(line).not.toMatch(/["'“”‘’「」『』]|말했|명언/);
  }
 });
});

describe('the saved count',()=>{
 /** A fresh copy of the module is the app opened again: only what was saved remains. */
 const open=()=>{let q:typeof import('../lib/focusQuestions');jest.isolateModules(()=>{q=require('../lib/focusQuestions')});return q!};
 const flush=()=>new Promise(r=>setImmediate(r));
 beforeEach(()=>mockStore.clear());
 test('nothing is offered before it has loaded, so a used day cannot show again',()=>{
  expect(open().takeFocusQuestion('quit',day)).toBeNull();
 });
 test('survives closing the app',async()=>{
  const first=open();await first.loadFocusQuestions();
  expect(first.takeFocusQuestion('plan',day)).not.toBeNull();
  await flush();
  const again=open();await again.loadFocusQuestions();
  expect(again.takeFocusQuestion('plan',day)).toBeNull();
 });
 test('a question held back by the limit writes nothing',async()=>{
  const q=open();await q.loadFocusQuestions();
  q.takeFocusQuestion('plan',day);await flush();
  expect(mockStore.has(FOCUS_QUESTION_KEY)).toBe(true);
  mockStore.delete(FOCUS_QUESTION_KEY);
  expect(q.takeFocusQuestion('plan',day)).toBeNull();await flush();
  expect(mockStore.has(FOCUS_QUESTION_KEY)).toBe(false);
 });
 test.each(['not json','null','[]','{"day":5,"plan":"x","quit":-1}'])('a broken saved value counts as nothing: %s',async bad=>{
  mockStore.set(FOCUS_QUESTION_KEY,bad);
  const q=open();await q.loadFocusQuestions();
  expect(q.takeFocusQuestion('quit',day)).not.toBeNull();
 });
 test('a failed read does not throw',async()=>{
  mockGetItem.mockRejectedValueOnce(new Error('disk'));
  await expect(open().loadFocusQuestions()).resolves.toBeUndefined();
 });
});

describe('it stays on the screen side',()=>{
 const fs=require('fs'),path=require('path');
 const read=(f:string)=>fs.readFileSync(path.join(__dirname,'../..',f),'utf8') as string;
 test('the count lives in its own key, outside routine data and backup',()=>{
  expect(FOCUS_QUESTION_KEY.startsWith('routine.v1')).toBe(false);
  expect(read('src/lib/backup.ts')).not.toMatch(/focusQuestion|focus\.questions/);
  expect(read('src/lib/routineModel.ts')).not.toMatch(/focusQuestion/);
 });
 test('neither module reads reward, penalty or lock code',()=>{
  for(const f of ['src/lib/focusQuestions.ts','src/lib/focusQuestionWords.ts'])expect(read(f)).not.toMatch(/focusPenalty|focusRamp|bookStudy|routineModel|ScreenTime|money/i);
 });
});
