import {emptyData,getDay,routineDay} from '../lib/routineModel';
import type {RoutineData} from '../lib/routineModel';
import {claimFocusPlan} from '../lib/focusRamp';
import {acceptHandwritingPages,addPendingPage,MULTI_PAGE_POLICY,pagesPreview,pagesToday,pendingPages,removePendingPage,startOutputStudy,validateHandwritingState} from '../lib/handwriting';
import {acceptDeclaredFinishPages,finishWithoutPhoto,startBookTimer} from '../lib/bookStudy';
import {canDeclareFinish} from '../lib/focusFlow';
import {makeBackup,validateBackup} from '../lib/routineBackup';

jest.mock('../lib/supabase',()=>({supabase:{}}));
const at=new Date(2026,10,8,9).getTime(),sec=1000,subject='수능',key=routineDay(new Date(at)),user='00000000-0000-4000-8000-000000000000';
/** n distinct Hangul letters starting at an offset, so pages do not overlap unless asked to. */
const text=(n:number,from=0)=>Array.from({length:n},(_,i)=>String.fromCharCode(0xAC00+from+i)).join('');
const analysis=(n:number,from=0)=>({lines:[text(n,from)],languages:['ko' as const],quality:'readable' as const,message:''});
const hash=(n:number)=>n.toString(16).padStart(64,'0');
const page=(n:number,chars:number,from=n*1000)=>({imageHash:hash(n),analysis:analysis(chars,from)});
const running=()=>startBookTimer(claimFocusPlan(emptyData(),'plan',subject,'기출',at),'run',subject,at,120,'output');
const add=(d:RoutineData,...pages:ReturnType<typeof page>[])=>pages.reduce((s,p)=>addPendingPage(s,'batch',subject,p,false,at+120*sec),d);
const valid=(d:RoutineData)=>{validateHandwritingState(d);validateBackup(makeBackup(d,user),user);};

describe('several pages in one submission',()=>{
 test('letters count as the sum of the pages, and the stage pays once, on the first page',()=>{
  const d=add(running(),page(1,50),page(2,60),page(3,40));
  expect(pendingPages(d.handwritingPending)).toHaveLength(3);
  expect(pagesPreview(d).total).toBe(150);
  const saved=acceptHandwritingPages(d,new Date(at+120*sec));
  const rows=saved.handwritingReceipts!;
  expect(rows.map(r=>r.units)).toEqual([50,60,40]);
  expect(rows.reduce((n,r)=>n+(r.letterMinutes??0),0)).toBe(5);
  expect(rows.filter(r=>(r.stageMinutes??0)>0)).toHaveLength(1);
  expect(rows[0].stageMinutes).toBeGreaterThan(0);
  expect(new Set(rows.map(r=>r.focusBatch)).size).toBe(1);
  expect(saved.handwritingPending).toBeUndefined();
  valid(saved);
 });
 test('the same photo twice in one submission is refused at once',()=>{
  const d=add(running(),page(1,50));
  expect(()=>addPendingPage(d,'batch',subject,page(1,50),false,at)).toThrow(/같은 사진/);
 });
 test('the same writing photographed again shows as a duplicate page and blocks the submission until removed',()=>{
  const d=add(running(),page(1,120,0),{imageHash:hash(2),analysis:analysis(120,0)});
  const p=pagesPreview(d);
  expect(p.pages.map(x=>x.units)).toEqual([120,0]);
  expect(p.pages[1].duplicate).toBe(true);
  expect(()=>acceptHandwritingPages(d,new Date(at+120*sec))).toThrow(/2번째 장/);
  const fixed=removePendingPage(d,1);
  expect(pendingPages(fixed.handwritingPending)).toHaveLength(1);
  valid(acceptHandwritingPages(fixed,new Date(at+120*sec)));
 });
 test('a page that repeats writing already saved earlier counts only its new part',()=>{
  const first=acceptHandwritingPages(add(running(),page(1,120,0)),new Date(at+120*sec));
  const again=addPendingPage(first,'b2',subject,{imageHash:hash(9),analysis:analysis(150,0)},false,at+200*sec);
  expect(pagesPreview(again).pages[0]).toMatchObject({units:30,duplicate:false});
 });
 test('removing a page keeps the others in order',()=>{
  const d=removePendingPage(add(running(),page(1,50),page(2,60),page(3,40)),0);
  expect(pendingPages(d.handwritingPending).map(p=>p.imageHash)).toEqual([hash(2),hash(3)]);
  expect(removePendingPage(removePendingPage(d,0),0).handwritingPending).toBeUndefined();
 });
});

describe('finishing early with several pages',()=>{
 test('the 100 new letters are counted over all pages',()=>{
  const d=[page(1,60),page(2,50)].reduce((s,p)=>addPendingPage(s,'f',subject,p,true,at+60*sec),running());
  const done=acceptDeclaredFinishPages(d,new Date(at+60*sec));
  expect(done.handwritingReceipts!.map(r=>r.rewardStatus)).toEqual(['earned','earned']);
  expect(done.handwritingReceipts![0].finish).toBe('declared');
  valid(done);
 });
 test('fewer than 100 in total is refused',()=>{
  const d=[page(1,60),page(2,30)].reduce((s,p)=>addPendingPage(s,'f',subject,p,true,at+60*sec),running());
  expect(()=>acceptDeclaredFinishPages(d,new Date(at+60*sec))).toThrow(/100자/);
 });
});

describe('limits (team lead: 5 a submission, 50 a day, app side only)',()=>{
 test('the policy numbers',()=>{
  expect(MULTI_PAGE_POLICY).toEqual({pagesPerSubmit:5,pagesPerDay:50});
 });
 test('a sixth page is refused',()=>{
  const d=add(running(),page(1,30),page(2,30),page(3,30),page(4,30),page(5,30));
  expect(()=>addPendingPage(d,'batch',subject,page(6,30),false,at)).toThrow(/5장/);
 });
 test('50 pages a day, counting saved pages and the ones waiting',()=>{
  let d=running();
  const saved=Array.from({length:48},(_,i)=>({id:'old'+i,imageHash:hash(500+i),subject,at:new Date(at).toISOString(),day:key,lines:[text(10,30000+i*20)],languages:['ko' as const],units:10,duplicateUnits:0,minutes:0,policyVersion:1 as const,rewardStatus:'pending' as const,rewardPolicy:'ramp-v2' as const,focusCycle:d.focusRamp!.cycleId}));
  d={...d,handwritingReceipts:saved};
  expect(pagesToday(d,key)).toBe(48);
  d=add(d,page(1,30),page(2,30));
  expect(()=>addPendingPage(d,'batch',subject,page(3,30),false,at)).toThrow(/오늘은 50장/);
  // The next day starts again.
  const tomorrow=new Date(2026,10,9,9).getTime();
  expect(pagesToday({...d,handwritingPending:undefined},routineDay(new Date(tomorrow)))).toBe(0);
 });
});

describe('saved data',()=>{
 test('a one-photo pending from before reads as one page and still saves',()=>{
  const d={...running(),handwritingPending:{id:'old',imageHash:hash(1),subject,analysis:analysis(120)}} as RoutineData;
  expect(pendingPages(d.handwritingPending)).toEqual([{imageHash:hash(1),analysis:analysis(120)}]);
  valid(d);
  const saved=acceptHandwritingPages(d,new Date(at+120*sec));
  expect(saved.handwritingReceipts![0]).toMatchObject({id:'old',units:120});
 });
 test('a broken page list fails the load check like a broken photo',()=>{
  const d=add(running(),page(1,50));
  expect(()=>validateHandwritingState({...d,handwritingPending:{...d.handwritingPending!,pages:[{imageHash:'x',analysis:analysis(5)}]}} as RoutineData)).toThrow();
  expect(()=>validateHandwritingState({...d,handwritingPending:{...d.handwritingPending!,pages:Array.from({length:6},(_,i)=>page(i+1,10))}} as RoutineData)).toThrow();
 });
});

void getDay;void startOutputStudy;

describe('finishing early with too few letters (build 51 bug)',()=>{
 const waiting=()=>addPendingPage(running(),'f',subject,page(1,60),true,at+60*sec);
 test('a waiting finish photo under 100 letters keeps 다 했어요 open, to add a page',()=>{
  expect(canDeclareFinish(waiting(),at+70*sec)).toBe(true);
  expect(pagesPreview(waiting()).total).toBe(60);
 });
 test('another page brings the total to 100 and the finish goes through',()=>{
  const two=addPendingPage(waiting(),'f',subject,page(2,50),true,at+80*sec);
  const done=acceptDeclaredFinishPages(two,new Date(at+80*sec));
  expect(done.handwritingReceipts!.map(r=>r.units)).toEqual([60,50]);
 });
 test('a waiting photo taken for the 25-minute stage does not open 다 했어요',()=>{
  const d=addPendingPage(running(),'p',subject,page(1,60),false,at+60*sec);
  expect(canDeclareFinish(d,at+70*sec)).toBe(false);
 });
 test('a finish photo for another subject does not open it either',()=>{
  const d={...waiting(),handwritingPending:{...waiting().handwritingPending!,subject:'영어'}};
  expect(canDeclareFinish(d,at+70*sec)).toBe(false);
 });
 test('the study goes on meanwhile: the timer keeps running and can still be finished without a photo',()=>{
  const d=waiting();
  expect(d.bookTimer?.phase).toBe('focus');
  expect(d.bookTimer?.running).toBe(true);
  const ended=finishWithoutPhoto(d,at+90*sec);
  expect(ended.handwritingPending).toBeUndefined();
  expect(ended.bookTimer?.phase).toBe('idle');
 });
});
