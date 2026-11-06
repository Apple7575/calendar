jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
import {evaluateSelfCheck,selfCheckLines,type SelfCheckProbe} from '../lib/selfCheck';
import {buildCheckReport} from '../lib/buildChecklist';

const phone:SelfCheckProbe={
 platform:'ios',expoGo:false,installedBuild:'53',checklistBuild:53,
 speech:{present:true,missing:[]},screenTime:{present:true,authorized:true},lottie:true,
 records:{ready:true,error:null},
};
const byId=(p:SelfCheckProbe)=>Object.fromEntries(evaluateSelfCheck(p).map(r=>[r.id,r]));

describe('evaluateSelfCheck',()=>{
 test('a complete phone build passes every check',()=>{
  const r=evaluateSelfCheck(phone);
  expect(r.map(x=>x.id)).toEqual(['build','records','speech','screenTime','lottie']);
  expect(r.every(x=>x.state==='ok')).toBe(true);
 });
 test('a speech module skipped by autolinking fails (builds 48 to 50)',()=>{
  const r=byId({...phone,speech:{present:false,missing:[]}});
  expect(r.speech.state).toBe('fail');
  expect(r.speech.detail).toContain('빠져');
 });
 test('a speech module without a function the app calls fails and names it (build 51)',()=>{
  const r=byId({...phone,speech:{present:true,missing:['addListener']}});
  expect(r.speech.state).toBe('fail');
  expect(r.speech.detail).toContain('addListener');
 });
 test('an installed build older than the checklist is flagged',()=>{
  const r=byId({...phone,installedBuild:'52'});
  expect(r.build.state).toBe('fail');
  expect(r.build.detail).toContain('52');
  expect(r.build.detail).toContain('53');
 });
 test('a newer installed build than the checklist only warns, it does not fail',()=>{
  expect(byId({...phone,installedBuild:'54'}).build.state).toBe('ok');
 });
 test('records that did not load fail with the reason',()=>{
  const r=byId({...phone,records:{ready:false,error:'adjustment 값이 잘못됐어요'}});
  expect(r.records.state).toBe('fail');
  expect(r.records.detail).toContain('adjustment');
 });
 test('records still loading are not reported as a failure',()=>{
  expect(byId({...phone,records:{ready:false,error:null}}).records.state).toBe('wait');
 });
 test('Screen Time without permission is shown but is not a missing module',()=>{
  const r=byId({...phone,screenTime:{present:true,authorized:false}});
  expect(r.screenTime.state).toBe('ok');
  expect(r.screenTime.detail).toContain('권한');
 });
 test('a missing Screen Time module or Lottie view fails',()=>{
  const r=byId({...phone,screenTime:{present:false,authorized:null},lottie:false});
  expect(r.screenTime.state).toBe('fail');
  expect(r.lottie.state).toBe('fail');
 });
 test('the web preview and Expo Go skip native checks instead of failing them',()=>{
  for(const p of [{...phone,platform:'web',installedBuild:null,lottie:null},{...phone,expoGo:true,installedBuild:null,speech:{present:false,missing:[]}}]){
   const r=byId(p);
   for(const id of ['build','speech','screenTime','lottie'])expect(r[id].state).toBe('skip');
   expect(r.records.state).toBe('ok');
  }
 });
});

describe('selfCheckLines and the PM report',()=>{
 test('lines carry a mark per state',()=>{
  const lines=selfCheckLines(evaluateSelfCheck({...phone,speech:{present:false,missing:[]}}));
  expect(lines[0]).toBe('자동 확인: 됨 4 · 안 됨 1');
  expect(lines.some(l=>l.startsWith('✗ 음성 인식 모듈'))).toBe(true);
 });
 test('the copied report includes the automatic section before the manual items',()=>{
  const list={build:53,items:[{id:'a',title:'항목 A'}]};
  const text=buildCheckReport(list,{},new Date(2026,10,7),selfCheckLines(evaluateSelfCheck(phone)));
  const lines=text.split('\n');
  expect(lines[0]).toBe('[빌드 53 확인] 2026-11-07');
  expect(lines[1]).toBe('자동 확인: 됨 5 · 안 됨 0');
  expect(text.indexOf('자동 확인')).toBeLessThan(text.indexOf('항목 A'));
 });
 test('the report without automatic lines is unchanged',()=>{
  const list={build:53,items:[{id:'a',title:'항목 A'}]};
  expect(buildCheckReport(list,{},new Date(2026,10,7))).toBe('[빌드 53 확인] 2026-11-07\n됨 0 · 안 됨 0 · 미확인 1\n· 항목 A');
 });
});

describe('speech functions the self-check looks for',()=>{
 test('cover every function the app calls through speechCall',()=>{
  const fs=require('fs'),path=require('path');
  const dir=path.join(__dirname,'..','lib');
  const called=new Set<string>();
  for(const f of fs.readdirSync(dir))if(/\.tsx?$/.test(f))for(const m of fs.readFileSync(path.join(dir,f),'utf8').matchAll(/speechCall\("([A-Za-z]+)"/g))called.add(m[1]);
  const listed=fs.readFileSync(path.join(dir,'stt.ts'),'utf8').match(/SPEECH_FUNCTIONS = \[([^\]]+)\]/)[1].match(/[A-Za-z]+/g);
  expect(called.size).toBeGreaterThan(0);
  expect([...called].sort()).toEqual([...listed].sort());
 });
});
