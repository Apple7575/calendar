import {emptyData,routineDay} from '../lib/routineModel';
import {beginPriorityTask,priorityTaskProgress,savePriorityDay} from '../lib/priorityPlan';
import {claimFocusPlan as claimPlan,focusRampStatus} from '../lib/focusRamp';
import {acceptHandwriting,handwritingAccess,settleHandwritingRewards,validateHandwritingState} from '../lib/handwriting';
import {skipBookBreak,startBookBreak,startBookTimer,stopBookTimer} from '../lib/bookStudy';
import {bookDisplaySeconds} from '../lib/bookTimerTime';
import {canTakeHandwritingPhoto} from '../lib/focusFlow';
import {makeBackup,validateBackup} from '../lib/routineBackup';
import {validateStudyState} from '../lib/studyHistory';
jest.mock('../lib/supabase',()=>({supabase:{}}));
const at=new Date(2026,10,1,9).getTime(),subject='수능',sec=1000,user='00000000-0000-4000-8000-000000000000';
/** These suites pin the build-42 reward path, which pending and saved records still use: a plan worth 5 and ramp-v1 photos. */
const asBuild42=<T extends ReturnType<typeof emptyData>>(before:T,after:T):T=>{
 const plan=after.focusPlans?.[after.focusPlans.length-1];
 if(after===before||!plan||before.focusPlans?.some(p=>p.id===plan.id))return after;
 const key42=plan.day,day=after.days[key42];
 return {...after,focusPlans:after.focusPlans!.map(p=>p.id===plan.id?{...p,minutes:5 as const}:p),handwritingReceipts:after.handwritingReceipts?.map(r=>r.rewardPolicy==='ramp-v2'&&r.rewardStatus==='pending'?{...r,rewardPolicy:'ramp-v1' as const}:r),days:{...after.days,[key42]:{...day,bonus:{...day.bonus,handwriting:(day.bonus?.handwriting??0)+5}}}};
};
const claimFocusPlan:typeof claimPlan=(d,...rest)=>asBuild42(d,claimPlan(d,...rest));
const planned=()=>claimFocusPlan(emptyData(),'plan',subject,'기출 1번',at);
const firstRun=()=>startBookTimer(planned(),'first',subject,at,120,'output');
const analysis={lines:['가나다라마바사아자차'.repeat(12)],languages:['ko' as const],quality:'readable' as const,message:''};
const photo=(d:ReturnType<typeof planned>,when:number,id='p1')=>settleHandwritingRewards(acceptHandwriting(d,id,'a'.repeat(64),subject,analysis,new Date(when),'ramp-v1'),when);

test('photo during the run: the next stage counts down what is left after the surplus',()=>{
 const when=at+210*sec,d=photo(firstRun(),when);
 expect(focusRampStatus(d,when).required).toBe(300);
 expect(bookDisplaySeconds(d.bookTimer!,when)).toBe(210);
 expect(canTakeHandwritingPhoto(d,when+209*sec)).toBe(false);
 expect(canTakeHandwritingPhoto(d,when+210*sec)).toBe(true);
});
test('break then photo: the surplus reaches the next run',()=>{
 const rest=at+210*sec,d=photo(startBookBreak(firstRun(),rest),rest+sec),next=skipBookBreak(d,'first','second',rest+2*sec);
 expect(next.bookTimer!.carrySeconds).toBe(90);
 expect(bookDisplaySeconds(next.bookTimer!,rest+2*sec)).toBe(210);
 expect(canTakeHandwritingPhoto(next,rest+2*sec+210*sec)).toBe(true);
 expect(canTakeHandwritingPhoto(next,rest+2*sec+209*sec)).toBe(false);
});
test('a stage reached but not photographed stays open through a break',()=>{
 const rest=at+150*sec,next=skipBookBreak(startBookBreak(firstRun(),rest),'first','second',rest+sec);
 expect(focusRampStatus(next,rest+sec).required).toBe(120);
 expect(canTakeHandwritingPhoto(next,rest+sec)).toBe(true);
});
test('a run that stopped short of its stage still restarts from the full stage',()=>{
 const rest=at+60*sec,next=skipBookBreak(startBookBreak(firstRun(),rest),'first','second',rest+sec);
 expect(next.bookTimer!.carrySeconds??0).toBe(0);
 expect(bookDisplaySeconds(next.bookTimer!,rest+sec)).toBe(120);
 expect(canTakeHandwritingPhoto(next,rest+sec+119*sec)).toBe(false);
});
test('a short run keeps the earlier surplus but adds nothing to it',()=>{
 const rest=at+210*sec,paid=photo(startBookBreak(firstRun(),rest),rest+sec);
 const second=skipBookBreak(paid,'first','second',rest+2*sec);
 const third=skipBookBreak(startBookBreak(second,rest+62*sec),'second','third',rest+63*sec);
 expect(third.bookTimer!.carrySeconds).toBe(90);
 expect(bookDisplaySeconds(third.bookTimer!,rest+63*sec)).toBe(210);
});
test('a long run, a break, then one photo: every passed stage is paid and the rest carries',()=>{
 const rest=at+500*sec,paid=photo(startBookBreak(firstRun(),rest),rest+sec),next=skipBookBreak(paid,'first','second',rest+2*sec);
 expect(paid.handwritingReceipts![0].focusStagesPaid).toEqual([1,2]);
 expect(next.bookTimer!.carrySeconds).toBe(80);
 expect(bookDisplaySeconds(next.bookTimer!,rest+2*sec)).toBe(520);
 expect(canTakeHandwritingPhoto(next,rest+2*sec)).toBe(false);
});
test('another subject gets no surplus',()=>{
 const rest=at+210*sec,paid=photo(startBookBreak(firstRun(),rest),rest+sec);
 const other=startBookTimer(stopBookTimer(paid,rest+2*sec),'other','영어',rest+3*sec,300,'output');
 expect(other.bookTimer!.carrySeconds??0).toBe(0);
 expect(bookDisplaySeconds(other.bookTimer!,rest+3*sec)).toBe(300);
});
test('a new plan cycle after two idle hours drops the surplus',()=>{
 const rest=at+210*sec,paid=stopBookTimer(photo(startBookBreak(firstRun(),rest),rest+sec),rest+2*sec),later=rest+3*60*60*sec;
 const next=startBookTimer(claimFocusPlan(paid,'plan2',subject,'다시',later),'second',subject,later,120,'output');
 expect(next.bookTimer!.carrySeconds??0).toBe(0);
 expect(bookDisplaySeconds(next.bookTimer!,later)).toBe(120);
});
test('the surplus never pays twice or changes the reward amount',()=>{
 const rest=at+210*sec,paid=photo(startBookBreak(firstRun(),rest),rest+sec),next=skipBookBreak(paid,'first','second',rest+2*sec);
 expect(handwritingAccess(next,subject,rest+2*sec).seconds).toBe(90);
 expect(paid.days[Object.keys(paid.days)[0]].bonus?.handwriting).toBe(10);
});
test('two payouts match plain accumulated time: nothing is counted twice',()=>{
 const rest=at+210*sec,paid=photo(startBookBreak(firstRun(),rest),rest+sec),second=skipBookBreak(paid,'first','second',rest+2*sec),end=rest+212*sec;
 const analysis2={...analysis,lines:['타파하거너더러머버서어'.repeat(12)]};
 const done=settleHandwritingRewards(acceptHandwriting(second,'p2','b'.repeat(64),subject,analysis2,new Date(end),'ramp-v1'),end);
 expect(done.focusRamp!.level).toBe(3);
 expect(done.focusRamp!.consumed[subject]).toBe(420);
 expect(handwritingAccess(done,subject,end).seconds).toBe(0);
 expect(done.days[Object.keys(done.days)[0]].bonus?.handwriting).toBe(15);
 expect(bookDisplaySeconds(done.bookTimer!,end)).toBe(600);
 expect(canTakeHandwritingPhoto(done,end)).toBe(false);
});
test('the same photo settled again changes nothing',()=>{
 const when=at+210*sec,d=photo(firstRun(),when);
 expect(settleHandwritingRewards(d,when+sec)).toEqual(d);
});
test('restart: surplus and countdown come back from saved JSON',()=>{
 const rest=at+210*sec,next=JSON.parse(JSON.stringify(skipBookBreak(photo(startBookBreak(firstRun(),rest),rest+sec),'first','second',rest+2*sec)));
 expect(bookDisplaySeconds(next.bookTimer,rest+102*sec)).toBe(110);
 expect(canTakeHandwritingPhoto(next,rest+212*sec)).toBe(true);
});
test('a late skip press for the old timer id does nothing',()=>{
 const rest=at+210*sec,next=skipBookBreak(photo(startBookBreak(firstRun(),rest),rest+sec),'first','second',rest+2*sec);
 expect(skipBookBreak(next,'first','third',rest+3*sec)).toBe(next);
});
test.each(['soon',null,Number.NaN,-5,1.5,{},999999])('a malformed saved value %p neither blocks loading nor grants time',bad=>{
 const base=firstRun(),data={...base,bookTimer:{...base.bookTimer!,carrySeconds:bad as unknown as number,creditMark:bad as unknown as number}};
 expect(()=>validateStudyState(data)).not.toThrow();
 expect(()=>validateBackup(makeBackup(data,user),user)).not.toThrow();
 expect(canTakeHandwritingPhoto(data,at+119*sec)).toBe(false);
 expect(canTakeHandwritingPhoto(data,at+120*sec)).toBe(true);
});
test('saved surplus survives a backup round trip',()=>{
 const rest=at+210*sec,next=skipBookBreak(photo(startBookBreak(firstRun(),rest),rest+sec),'first','second',rest+2*sec);
 expect(validateBackup(JSON.parse(JSON.stringify(makeBackup(next,user))),user).data.bookTimer!.carrySeconds).toBe(90);
});
test('a saved timer from before this change loads with no surplus',()=>{
 const {carrySeconds:_c,creditMark:_m,...old}=firstRun().bookTimer!;
 expect(canTakeHandwritingPhoto({...firstRun(),bookTimer:old},at+119*sec)).toBe(false);
 expect(canTakeHandwritingPhoto({...firstRun(),bookTimer:old},at+120*sec)).toBe(true);
});
test('a finished stage still waits for its photo after a home start',()=>{
 const key=routineDay(new Date(at)),task={id:'t',subject,action:'1번',preparation:'',target:'',minimum:120 as const};
 const studied=stopBookTimer(startBookTimer(claimFocusPlan(savePriorityDay(emptyData(),key,[task],new Date(at)),'plan',subject,'기출 1번',at),'first',subject,at,120,'output'),at+420*sec);
 const home=beginPriorityTask(studied,key,'t',at+480*sec);
 expect(canTakeHandwritingPhoto(home,at+480*sec)).toBe(true);
 expect(priorityTaskProgress(home,home.priorityDays![key].tasks[0],at+480*sec).seconds).toBe(0);
});
const straight=(seconds:number)=>photo(firstRun(),at+seconds*sec);
test('25 straight minutes and one photo finish stages 2, 5 and 10: +15 minutes, 8 minutes carried',()=>{
 const d=straight(1500),r=d.handwritingReceipts![0];
 expect(r).toMatchObject({focusStage:1,focusStagesPaid:[1,2,3],focusSeconds:1020,minutes:15,rewardStatus:'earned'});
 expect(d.focusRamp).toMatchObject({level:4,consumed:{[subject]:1020}});
 expect(d.days[Object.keys(d.days)[0]].bonus?.handwriting).toBe(20); // plan 5 + 15
 expect(d.bookTimer!.carrySeconds).toBe(480);
 expect(bookDisplaySeconds(d.bookTimer!,at+1500*sec)).toBe(420);
 expect(handwritingAccess(d,subject,at+1500*sec).seconds).toBe(480);
 expect(()=>validateHandwritingState(d)).not.toThrow();
});
test('the time a photo spent is not counted again by the next photo',()=>{
 const d=straight(1500),when=at+1500*sec;
 expect(canTakeHandwritingPhoto(d,when)).toBe(false);
 const later=at+1920*sec,again=settleHandwritingRewards(acceptHandwriting(d,'p2','b'.repeat(64),subject,{...analysis,lines:['타파하거너더러머버서어'.repeat(12)]},new Date(later),'ramp-v1'),later);
 expect(again.handwritingReceipts![1]).toMatchObject({focusStage:4,focusSeconds:900,minutes:5});
 expect(again.handwritingReceipts![1].focusStagesPaid).toBeUndefined();
 expect(again.focusRamp).toMatchObject({level:5,consumed:{[subject]:1920}});
 expect(again.days[Object.keys(again.days)[0]].bonus?.handwriting).toBe(25);
 expect(()=>validateHandwritingState(again)).not.toThrow();
});
test.each([[120,5],[419,5],[420,10],[1019,10],[1020,15],[1919,15],[1920,20],[3419,20],[3420,25],[4919,25],[4920,30]])('%i seconds straight then one photo pays %i minutes',(seconds,minutes)=>{
 const d=straight(seconds);
 expect(d.days[Object.keys(d.days)[0]].bonus?.handwriting).toBe(5+minutes);
 expect(()=>validateHandwritingState(d)).not.toThrow();
});
test('a run cut short never counts toward extra stages',()=>{
 const short=startBookBreak(firstRun(),at+60*sec),next=skipBookBreak(short,'first','second',at+61*sec);
 const d=photo(next,at+(61+420)*sec);
 expect(d.handwritingReceipts![0].focusStagesPaid).toEqual([1,2]);
 expect(d.handwritingReceipts![0].focusSeconds).toBe(420);
 expect(d.bookTimer!.carrySeconds).toBe(0);
});
test('a corrupt stage list is rejected like any other reward record',()=>{
 const d=straight(1500),bad={...d,handwritingReceipts:[{...d.handwritingReceipts![0],focusStagesPaid:[1,3]}]};
 expect(()=>validateHandwritingState(bad)).toThrow();
});
test('earlier single-stage receipts stay valid and unchanged',()=>{
 const d=straight(130),r=d.handwritingReceipts![0];
 expect(r.focusStagesPaid).toBeUndefined();
 expect(r).toMatchObject({focusSeconds:120,minutes:5});
 expect(()=>validateHandwritingState(d)).not.toThrow();
});
test('home start uses the current stage time, not the task minimum',()=>{
 const key=routineDay(new Date(at)),task={id:'t',subject,action:'1번',preparation:'',target:'',minimum:120 as const};
 const base=savePriorityDay(planned(),key,[task],new Date(at)),high={...base,focusRamp:{...base.focusRamp!,level:5 as const}};
 const home=beginPriorityTask(high,key,'t',at+sec);
 expect(bookDisplaySeconds(home.bookTimer!,at+sec)).toBe(1500);
 expect(home.bookTimer!.targetSeconds).toBe(1500);
});
