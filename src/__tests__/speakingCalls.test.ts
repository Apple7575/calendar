const mockStore=new Map<string,string>();
const mockInvoke=jest.fn(),mockUser=jest.fn();
jest.mock('@react-native-async-storage/async-storage',()=>({__esModule:true,default:{getItem:async(k:string)=>mockStore.get(k)??null,setItem:async(k:string,v:string)=>{mockStore.set(k,v)}}}));
jest.mock('../lib/supabase',()=>({supabase:{auth:{getUser:()=>mockUser()},functions:{invoke:(...a:unknown[])=>mockInvoke(...a)}}}));
const day='2026-11-05';
/** A fresh copy is the app opened again: only what was saved remains. */
const fresh=()=>{let calls:typeof import('../lib/speakingCalls'),api:typeof import('../lib/speakingApi');jest.isolateModules(()=>{calls=require('../lib/speakingCalls');api=require('../lib/speakingApi')});return {calls:calls!,api:api!}};
const flush=()=>new Promise(r=>setImmediate(r));
const good={good:'좋음',missed:'빠짐',followUp:'되물음',relevant:true,repetitive:false};
beforeEach(()=>{mockStore.clear();mockInvoke.mockReset();mockUser.mockReset();mockUser.mockResolvedValue({data:{user:{id:'u'}},error:null})});

describe('the daily count of AI calls',()=>{
 test('stops at 100 and starts over the next day',async()=>{
  const {calls}=fresh();
  for(let i=0;i<100;i++)expect(await calls.claimSpeakingCall(day)).toBe(true);
  expect(await calls.claimSpeakingCall(day)).toBe(false);
  expect(calls.speakingCallsLeft(day)).toBe(0);
  expect(await calls.claimSpeakingCall('2026-11-06')).toBe(true);
 });
 test('survives closing the app',async()=>{
  const first=fresh();await first.calls.claimSpeakingCall(day);await flush();
  const again=fresh();await again.calls.loadSpeakingCalls();
  expect(again.calls.speakingCallsLeft(day)).toBe(99);
 });
 test.each(['not json','null','{"day":5,"count":"x"}','{"day":"2026-11-05","count":-1}'])('a broken value counts as nothing: %s',async bad=>{
  mockStore.set('speaking.ai.calls.v1',bad);
  const {calls}=fresh();await calls.loadSpeakingCalls();
  expect(calls.speakingCallsLeft(day)).toBe(100);
 });
});

describe('asking the coach',()=>{
 test('a good reply is used and counted',async()=>{
  mockInvoke.mockResolvedValue({data:good,error:null});
  const {api,calls}=fresh(),r=await api.coachSpeakingAnswer(day,'질문','답변');
  expect(r.verdict).toEqual({relevant:true,repetitive:false});
  expect(mockInvoke.mock.calls[0][0]).toBe('speaking-coach');
  expect(calls.speakingCallsLeft(day)).toBe(99);
 });
 test('over the limit it never calls the server',async()=>{
  const {api,calls}=fresh();for(let i=0;i<100;i++)await calls.claimSpeakingCall(day);
  await expect(api.coachSpeakingAnswer(day,'질문','답변')).rejects.toBeInstanceOf(api.SpeakingLimitError);
  expect(mockInvoke).not.toHaveBeenCalled();
 });
 test('no network: the count goes back',async()=>{
  mockInvoke.mockRejectedValue(new Error('offline'));
  const {api,calls}=fresh();
  await expect(api.coachSpeakingAnswer(day,'질문','답변')).rejects.toThrow();
  expect(calls.speakingCallsLeft(day)).toBe(100);
 });
 test('signed out: the count goes back and the server is not called',async()=>{
  mockUser.mockResolvedValue({data:{user:null},error:null});
  const {api,calls}=fresh();
  await expect(api.coachSpeakingAnswer(day,'질문','답변')).rejects.toThrow(/로그인/);
  expect(mockInvoke).not.toHaveBeenCalled();
  expect(calls.speakingCallsLeft(day)).toBe(100);
 });
 test('an expired session at the server: the count goes back and the words say so',async()=>{
  mockInvoke.mockResolvedValue({data:null,error:{context:{status:401,json:async()=>({message:'계정에 다시 로그인해 주세요.'})}}});
  const {api,calls}=fresh();
  await expect(api.coachSpeakingAnswer(day,'질문','답변')).rejects.toThrow(/로그인/);
  expect(calls.speakingCallsLeft(day)).toBe(100);
 });
 test('a reply the AI got wrong keeps the count, since it cost a call',async()=>{
  mockInvoke.mockResolvedValue({data:{good:'x'},error:null});
  const {api,calls}=fresh();
  await expect(api.coachSpeakingAnswer(day,'질문','답변')).rejects.toThrow(/형식/);
  expect(calls.speakingCallsLeft(day)).toBe(99);
 });
 test('a server error from the AI keeps the count too',async()=>{
  mockInvoke.mockResolvedValue({data:null,error:{context:{status:502,json:async()=>({message:'AI에 연결하지 못했어요.'})}}});
  const {api,calls}=fresh();
  await expect(api.checkSpeakingFollowUp(day,'질문','답변','되물음','되묻는 답')).rejects.toThrow(/연결/);
  expect(calls.speakingCallsLeft(day)).toBe(99);
 });
});
