/**
 * The speech module is only linked from build 51 on, so nothing ran these calls before. This fakes exactly what
 * expo-speech-recognition 56.0.1 exports (the module with its methods, and events through the module's addListener)
 * and runs both ways of listening against it, so a call to a function the package does not have fails here.
 */
type Fn=(e:unknown)=>void;
const mockListeners=new Map<string,Set<Fn>>();
const mockModule56={
 requestPermissionsAsync:jest.fn(async()=>({granted:true})),
 start:jest.fn(),
 stop:jest.fn(),
 addListener:jest.fn((name:string,fn:Fn)=>{const set=mockListeners.get(name)??new Set<Fn>();set.add(fn);mockListeners.set(name,set);return {remove:()=>set.delete(fn)}}),
};
const emit=(name:string,e:unknown)=>mockListeners.get(name)?.forEach(fn=>fn(e));
jest.mock('expo-speech-recognition',()=>({get ExpoSpeechRecognitionModule(){return mockModule56}}));
jest.mock('expo-constants',()=>({__esModule:true,default:{appOwnership:null}}));
jest.mock('expo-av',()=>({Audio:{}}));
jest.mock('expo-file-system/legacy',()=>({}));
jest.mock('../lib/supabase',()=>({supabase:{}}));

import {isLiveSttAvailable,startContinuousLive,startLive,stopLive} from '../lib/stt';

const fs=require('fs'),path=require('path');
const installed=(f:string)=>fs.readFileSync(path.join(__dirname,'../../node_modules/expo-speech-recognition',f),'utf8') as string;

beforeEach(()=>{mockListeners.clear();jest.clearAllMocks();});

describe('the installed package (56.0.1)',()=>{
 test('exports the module and the hook, not addSpeechRecognitionListener',()=>{
  const index=installed('build/index.d.ts');
  expect(index).toContain('ExpoSpeechRecognitionModule');
  expect(index).not.toContain('addSpeechRecognitionListener');
  expect(installed('build/ExpoSpeechRecognitionModule.types.d.ts')).toMatch(/extends NativeModule</);
 });
});

describe('listening on the phone',()=>{
 test('the module is seen as available',()=>{
  expect(isLiveSttAvailable()).toBe(true);
 });
 test('long answers (말하기): asks, starts, and hears results through the module\'s own mockListeners',async()=>{
  const heard:string[]=[];
  const listening=await startContinuousLive(t=>heard.push(t),()=>{},'ko-KR');
  expect(mockModule56.requestPermissionsAsync).toHaveBeenCalled();
  expect(mockModule56.start).toHaveBeenCalledWith({lang:'ko-KR',interimResults:true,continuous:true});
  expect(mockModule56.addListener.mock.calls.map(c=>c[0]).sort()).toEqual(['end','error','result']);
  emit('result',{results:[{transcript:'안녕하세요'}],isFinal:true});
  expect(heard.at(-1)).toBe('안녕하세요');
  const done=listening.stop();
  emit('end',{});
  await expect(done).resolves.toBe('안녕하세요');
  expect([...mockListeners.values()].every(s=>s.size===0)).toBe(true);
 });
 test('short dictation (일기): the same module calls, and stopping removes the listener',async()=>{
  const partial:string[]=[];
  await startLive(t=>partial.push(t),'ko-KR');
  emit('result',{results:[{transcript:'오늘'}],isFinal:false});
  emit('result',{results:[{transcript:'오늘 공부'}],isFinal:true});
  expect(partial.at(-1)).toBe('오늘 공부');
  await expect(stopLive()).resolves.toBe('오늘 공부');
  expect(mockModule56.stop).toHaveBeenCalled();
  expect(mockListeners.get('result')?.size??0).toBe(0);
 });
 test('a missing function is named in the error, so the screen says what failed',async()=>{
  const saved=mockModule56.addListener;
  (mockModule56 as {addListener?:unknown}).addListener=undefined;
  try{
   await expect(startContinuousLive(()=>{},()=>{},'ko-KR')).rejects.toThrow(/addListener/);
  }finally{mockModule56.addListener=saved;}
 });
 test('permission refused still says so',async()=>{
  mockModule56.requestPermissionsAsync.mockResolvedValueOnce({granted:false});
  await expect(startLive(()=>{})).rejects.toThrow(/권한/);
 });
});
