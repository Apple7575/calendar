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
