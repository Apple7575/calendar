import React from 'react';
const renderer=require('react-test-renderer'),{act}=renderer;

jest.mock('react-native',()=>{const actual=jest.requireActual('react-native');actual.AppState.currentState='active';return actual});
const mockAwake={activate:jest.fn(async()=>{}),deactivate:jest.fn(async()=>{})};
const mockOrientation={lock:jest.fn(async()=>{}),previous:7};
jest.mock('expo-keep-awake',()=>({activateKeepAwakeAsync:(...a:unknown[])=>mockAwake.activate(...(a as [])),deactivateKeepAwake:(...a:unknown[])=>mockAwake.deactivate(...(a as []))}));
jest.mock('expo-screen-orientation',()=>({OrientationLock:{LANDSCAPE:1,PORTRAIT_UP:2},getOrientationLockAsync:async()=>mockOrientation.previous,lockAsync:(...a:unknown[])=>mockOrientation.lock(...(a as []))}));
jest.mock('@react-navigation/native',()=>{const React=require('react');return {useFocusEffect:(fn:()=>void)=>React.useEffect(fn,[fn])}});
import {resetTimerOrientationForTest,useTimerScreenHold} from '../features/routine/useTimerScreenHold';

let rotate:()=>void;
function Probe({active}:{active:boolean}){rotate=useTimerScreenHold(active).rotate;return null}
const flush=()=>act(async()=>{await new Promise(r=>setTimeout(r,0));await new Promise(r=>setTimeout(r,0))});
const mount=async(active:boolean)=>{let tree:any;await act(async()=>{tree=renderer.create(React.createElement(Probe,{active}))});await flush();return tree};

beforeEach(()=>{jest.clearAllMocks();resetTimerOrientationForTest()});

test('keeps the screen on and opens in landscape while the timer screen is active',async()=>{
 await mount(true);
 expect(mockAwake.activate).toHaveBeenCalledTimes(1);
 expect(mockOrientation.lock).toHaveBeenLastCalledWith(1);
});

test('does nothing before the routine starts',async()=>{
 await mount(false);
 expect(mockAwake.activate).not.toHaveBeenCalled();
 expect(mockOrientation.lock).not.toHaveBeenCalled();
});

test('leaving releases the screen and restores the previous orientation',async()=>{
 const tree=await mount(true);
 await act(async()=>{tree.unmount()});await flush();
 expect(mockAwake.deactivate).toHaveBeenCalled();
 expect(mockOrientation.lock).toHaveBeenLastCalledWith(mockOrientation.previous);
});

test('the rotate button toggles and the choice is kept for the next step',async()=>{
 const tree=await mount(true);
 await act(async()=>{rotate()});await flush();
 expect(mockOrientation.lock).toHaveBeenLastCalledWith(2);
 await act(async()=>{tree.unmount()});await flush();
 await mount(true);
 expect(mockOrientation.lock).toHaveBeenLastCalledWith(2);
 await act(async()=>{rotate()});await flush();
 expect(mockOrientation.lock).toHaveBeenLastCalledWith(1);
});

test('focus and routine remember their own direction',async()=>{
 const tree=await mount(true);
 await act(async()=>{rotate()});await flush();
 await act(async()=>{tree.unmount()});await flush();
 function FocusProbe(){useTimerScreenHold(true,'focus');return null}
 await act(async()=>{renderer.create(React.createElement(FocusProbe))});await flush();
 expect(mockOrientation.lock).toHaveBeenLastCalledWith(1);
});

describe('leaving the screen (build 53: 닫기 froze the big timer)',()=>{
 let leave:(go:()=>void)=>void;
 function LeaveProbe(){leave=useTimerScreenHold(true,'focus').leave;return null}
 const mountLeave=async()=>{let tree:any;await act(async()=>{tree=renderer.create(React.createElement(LeaveProbe))});await flush();return tree};
 test('turns the screen back before navigating, so the pop never runs mid-rotation',async()=>{
  await mountLeave();
  let finishRotation:()=>void=()=>{};
  mockOrientation.lock.mockImplementationOnce(()=>new Promise<void>(r=>{finishRotation=r}));
  const go=jest.fn();
  await act(async()=>{leave(go)});
  expect(mockOrientation.lock).toHaveBeenLastCalledWith(mockOrientation.previous);
  expect(go).not.toHaveBeenCalled();
  await act(async()=>{finishRotation()});await flush();
  expect(go).toHaveBeenCalledTimes(1);
 });
 test('a second tap while turning does not navigate twice',async()=>{
  await mountLeave();
  const go=jest.fn();
  await act(async()=>{leave(go);leave(go)});await flush();
  expect(go).toHaveBeenCalledTimes(1);
 });
 test('still leaves when the rotation never answers',async()=>{
  jest.useFakeTimers();
  try{
   await act(async()=>{renderer.create(React.createElement(LeaveProbe))});
   await act(async()=>{await Promise.resolve();await Promise.resolve()});
   mockOrientation.lock.mockImplementationOnce(()=>new Promise<void>(()=>{}));
   const go=jest.fn();
   await act(async()=>{leave(go)});
   expect(go).not.toHaveBeenCalled();
   await act(async()=>{jest.advanceTimersByTime(1000)});
   expect(go).toHaveBeenCalledTimes(1);
  }finally{jest.useRealTimers()}
 });
 test('still leaves when the rotation fails',async()=>{
  await mountLeave();
  mockOrientation.lock.mockImplementationOnce(async()=>{throw new Error('no')});
  const go=jest.fn();
  await act(async()=>{leave(go)});await flush();
  expect(go).toHaveBeenCalledTimes(1);
 });
});

test('an inactive hold (routine not started) leaves at once, every time, without turning',async()=>{
 let leave:(go:()=>void)=>void=()=>{};
 function Idle(){leave=useTimerScreenHold(false,'routine').leave;return null}
 await act(async()=>{renderer.create(React.createElement(Idle))});await flush();
 const go=jest.fn();
 await act(async()=>{leave(go)});
 await act(async()=>{leave(go)});
 expect(go).toHaveBeenCalledTimes(2);
 expect(mockOrientation.lock).not.toHaveBeenCalled();
});
