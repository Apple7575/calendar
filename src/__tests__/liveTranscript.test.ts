import {continuousListen,liveTranscript} from '../lib/liveTranscript';

/** Stands in for the speech module: tests fire its events by hand. */
function fakeSpeech(){
 const listeners:Record<string,((e:any)=>void)[]>={};
 const module={start:jest.fn(),stop:jest.fn()};
 return {module,on:(name:string,fn:(e:any)=>void)=>{(listeners[name]??=[]).push(fn);return {remove:()=>{listeners[name]=listeners[name].filter(f=>f!==fn)}}},
  fire:(name:string,e:any={})=>[...(listeners[name]??[])].forEach(fn=>fn(e)),count:(name:string)=>(listeners[name]??[]).length};
}
const said=(text:string,isFinal=false)=>({results:[{transcript:text}],isFinal});
beforeEach(()=>jest.useFakeTimers());
afterEach(()=>jest.useRealTimers());

describe('joining what was heard',()=>{
 test('a partial replaces the last partial',()=>{
  const t=liveTranscript();t.heard('안녕',false);t.heard('안녕하세요',false);
  expect(t.text()).toBe('안녕하세요');
 });
 test('a final stays and the next partial follows it',()=>{
  const t=liveTranscript();t.heard('첫 문장',true);t.heard('둘째',false);
  expect(t.text()).toBe('첫 문장 둘째');
 });
 test('a partial with no final is kept when the task ends',()=>{
  const t=liveTranscript();t.heard('끊긴 말',false);t.cut();t.heard('이어진 말',false);
  expect(t.text()).toBe('끊긴 말 이어진 말');
 });
 test('cutting twice does not double anything',()=>{
  const t=liveTranscript();t.heard('한 번',false);t.cut();t.cut();
  expect(t.text()).toBe('한 번');
 });
});

describe('going past Apple\'s one minute limit',()=>{
 test('when the task ends by itself it starts again and the text carries on',()=>{
  const s=fakeSpeech(),onText=jest.fn(),l=continuousListen({start:s.module.start,stop:s.module.stop,on:s.on,onText,onStopped:jest.fn()});
  expect(s.module.start).toHaveBeenCalledTimes(1);
  s.fire('result',said('일분 동안 말한 내용'));
  s.fire('end');jest.advanceTimersByTime(300);
  expect(s.module.start).toHaveBeenCalledTimes(2);
  s.fire('result',said('이어서 말한 내용'));
  expect(onText).toHaveBeenLastCalledWith('일분 동안 말한 내용 이어서 말한 내용');
  void l.stop();
 });
 test('three minutes of one-minute tasks keeps all of it',()=>{
  const s=fakeSpeech(),l=continuousListen({start:s.module.start,stop:s.module.stop,on:s.on,onText:jest.fn(),onStopped:jest.fn()});
  for(const part of ['첫째','둘째','셋째']){s.fire('result',said(part,true));s.fire('end');jest.advanceTimersByTime(300)}
  expect(l.text()).toBe('첫째 둘째 셋째');
  void l.stop();
 });
 test('passing errors do not end it',()=>{
  const s=fakeSpeech(),stopped=jest.fn(),l=continuousListen({start:s.module.start,stop:s.module.stop,on:s.on,onText:jest.fn(),onStopped:stopped});
  s.fire('result',said('말'));
  for(const error of ['no-speech','network','interrupted']){s.fire('error',{error});s.fire('end');jest.advanceTimersByTime(300);s.fire('result',said(error))}
  expect(stopped).not.toHaveBeenCalled();
  void l.stop();
 });
 test.each(['not-allowed','service-not-allowed','language-not-supported'])('%s stops it and keeps the text',error=>{
  const s=fakeSpeech(),stopped=jest.fn(),l=continuousListen({start:s.module.start,stop:s.module.stop,on:s.on,onText:jest.fn(),onStopped:stopped});
  s.fire('result',said('지금까지'));s.fire('error',{error});s.fire('end');jest.advanceTimersByTime(1000);
  expect(s.module.start).toHaveBeenCalledTimes(1);
  expect(stopped).toHaveBeenCalledTimes(1);
  expect(l.text()).toBe('지금까지');
 });
 test('it gives up after three restarts that hear nothing, and hearing something resets that',()=>{
  const s=fakeSpeech(),stopped=jest.fn();continuousListen({start:s.module.start,stop:s.module.stop,on:s.on,onText:jest.fn(),onStopped:stopped});
  s.fire('end');jest.advanceTimersByTime(300);s.fire('end');jest.advanceTimersByTime(300);
  s.fire('result',said('들림'));
  s.fire('end');jest.advanceTimersByTime(300);s.fire('end');jest.advanceTimersByTime(300);
  expect(stopped).not.toHaveBeenCalled();
  s.fire('end');jest.advanceTimersByTime(300);s.fire('end');jest.advanceTimersByTime(300);
  expect(stopped).toHaveBeenCalledTimes(1);
 });
 test('a failed restart stops it instead of throwing',()=>{
  const s=fakeSpeech(),stopped=jest.fn();
  continuousListen({start:s.module.start,stop:s.module.stop,on:s.on,onText:jest.fn(),onStopped:stopped});
  s.module.start.mockImplementation(()=>{throw new Error('busy')});
  s.fire('end');jest.advanceTimersByTime(300);
  expect(stopped).toHaveBeenCalledTimes(1);
 });
});

describe('the user stopping',()=>{
 test('waits for the final words, then leaves no listeners behind and never restarts',async()=>{
  const s=fakeSpeech(),l=continuousListen({start:s.module.start,stop:s.module.stop,on:s.on,onText:jest.fn(),onStopped:jest.fn()});
  s.fire('result',said('거의 다'));
  const done=l.stop();
  expect(s.module.stop).toHaveBeenCalledTimes(1);
  s.fire('result',said('거의 다 말했어요',true));s.fire('end');
  await expect(done).resolves.toBe('거의 다 말했어요');
  jest.advanceTimersByTime(1000);
  expect(s.module.start).toHaveBeenCalledTimes(1);
  expect(s.count('result')+s.count('end')+s.count('error')).toBe(0);
 });
 test('does not hang if the end never comes',async()=>{
  const s=fakeSpeech(),l=continuousListen({start:s.module.start,stop:s.module.stop,on:s.on,onText:jest.fn(),onStopped:jest.fn()});
  s.fire('result',said('말'));
  const done=l.stop();jest.advanceTimersByTime(1000);
  await expect(done).resolves.toBe('말');
 });
 test('stopping between tasks cancels the restart',async()=>{
  const s=fakeSpeech(),l=continuousListen({start:s.module.start,stop:s.module.stop,on:s.on,onText:jest.fn(),onStopped:jest.fn()});
  s.fire('result',said('말',true));s.fire('end');
  const done=l.stop();jest.advanceTimersByTime(1000);await done;
  expect(s.module.start).toHaveBeenCalledTimes(1);
 });
});
