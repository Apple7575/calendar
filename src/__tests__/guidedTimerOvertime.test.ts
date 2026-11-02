import {emptyData,getDay} from '../lib/routineModel';
import {startGuidedStep,pauseGuidedStep,resumeGuidedStep,guidedSeconds,formatGuidedTime} from '../lib/dailyPlan';
test('an older UI clock cannot show more than the starting or resumed duration',()=>{
 const key='2026-11-01',start=100000;let data=emptyData();data.morningSteps=[{id:'bed',title:'bed',detail:'',minimum:true,minutes:10}];
 data=startGuidedStep(data,key,'morning','bed',start);let timer=getDay(data,key).guidedTimer!;
 expect(formatGuidedTime(guidedSeconds(timer,start-499))).toBe('10:00');
 expect(formatGuidedTime(guidedSeconds(timer,start))).toBe('10:00');
 expect(formatGuidedTime(guidedSeconds(timer,start+1000))).toBe('09:59');
 data=pauseGuidedStep(data,key,start+2000);data=resumeGuidedStep(data,key,start+9000);timer=getDay(data,key).guidedTimer!;
 expect(formatGuidedTime(guidedSeconds(timer,start+8500))).toBe('09:58');
});
test('timer crosses zero and keeps overtime through pause/resume and reload',()=>{
 const key='2026-11-01',start=100000;
 let data=startGuidedStep(emptyData(),key,'morning','bed',start);
 let timer=getDay(data,key).guidedTimer!;const end=timer.endsAt;
 expect(guidedSeconds(timer,end)).toBe(0);expect(formatGuidedTime(guidedSeconds(timer,end+17000))).toBe('+00:17');
 data=pauseGuidedStep(data,key,end+17000);timer=getDay(data,key).guidedTimer!;
 expect(guidedSeconds(timer,end+80000)).toBe(-17);
 data=JSON.parse(JSON.stringify(data));data=resumeGuidedStep(data,key,end+80000);timer=getDay(data,key).guidedTimer!;
 expect(formatGuidedTime(guidedSeconds(timer,end+85000))).toBe('+00:22');expect(getDay(data,key).paid.morning).toBe(0);
});
