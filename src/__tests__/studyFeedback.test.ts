import React from 'react';
import {Audio} from 'expo-av';
import {StudyFeedback,useStudyFeedback} from '../features/routine/useStudyFeedback';
import {claimStudyAudio,registerStudyAudio} from '../lib/studyAudioFocus';
const mockListeners=new Set<(state:string)=>void>();
jest.mock('@react-native-async-storage/async-storage',()=>({getItem:async()=>null,setItem:async()=>{}}));
jest.mock('react-native',()=>({AppState:{currentState:'active',addEventListener:(_event:string,callback:(state:string)=>void)=>{mockListeners.add(callback);return {remove:()=>mockListeners.delete(callback)}}}}));
jest.mock('@react-navigation/native',()=>({useIsFocused:()=>true}));
jest.mock('expo-av',()=>({Audio:{setAudioModeAsync:jest.fn(async()=>{}),Sound:{createAsync:jest.fn()}}}));
const renderer=require('react-test-renderer');
function Probe({event}:{event:StudyFeedback|null}){useStudyFeedback(event);return null;}
const player=()=>({replayAsync:jest.fn(async()=>{}),pauseAsync:jest.fn(async()=>{}),unloadAsync:jest.fn(async()=>{})});
beforeEach(()=>{jest.clearAllMocks();mockListeners.clear();(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;});

test('milestone plays once, cancels vocabulary first, and is stopped when dismissed',async()=>{
 const sounds:ReturnType<typeof player>[]=[];(Audio.Sound.createAsync as jest.Mock).mockImplementation(async()=>{const sound=player();sounds.push(sound);return {sound}});
 const stopWord=jest.fn(async()=>{}),unregister=registerStudyAudio(Symbol('word'),stopWord);
 let tree:any;await renderer.act(async()=>{tree=renderer.create(React.createElement(Probe,{event:null}));});
 const event:StudyFeedback={kind:'milestone',id:'batch-10'};
 await renderer.act(async()=>tree.update(React.createElement(Probe,{event})));
 expect(stopWord).toHaveBeenCalledTimes(1);expect(sounds[0].replayAsync).toHaveBeenCalledTimes(1);expect(sounds[1].replayAsync).not.toHaveBeenCalled();
 expect(stopWord.mock.invocationCallOrder[0]).toBeLessThan(sounds[0].replayAsync.mock.invocationCallOrder[0]);
 await renderer.act(async()=>tree.update(React.createElement(Probe,{event:{...event}})));expect(sounds[0].replayAsync).toHaveBeenCalledTimes(1);
 await renderer.act(async()=>tree.update(React.createElement(Probe,{event:null})));expect(sounds[0].pauseAsync).toHaveBeenCalled();
 await renderer.act(async()=>tree.update(React.createElement(Probe,{event})));expect(sounds[0].replayAsync).toHaveBeenCalledTimes(1);
 await renderer.act(async()=>tree.unmount());unregister();expect(sounds.every(s=>s.unloadAsync.mock.calls.length===1)).toBe(true);
});

test('completion uses its own normal-speed cue, yields to vocabulary, and does not replay after background',async()=>{
 const sounds:ReturnType<typeof player>[]=[];(Audio.Sound.createAsync as jest.Mock).mockImplementation(async()=>{const sound=player();sounds.push(sound);return {sound}});
 const event:StudyFeedback={kind:'complete',id:'batch-finished'};let tree:any;
 await renderer.act(async()=>{tree=renderer.create(React.createElement(Probe,{event}));});
 expect(sounds[0].replayAsync).not.toHaveBeenCalled();expect(sounds[1].replayAsync).toHaveBeenCalledWith({rate:1,volume:0.65});
 await renderer.act(async()=>{await claimStudyAudio(Symbol('new-word'));});expect(sounds[1].pauseAsync).toHaveBeenCalled();
 await renderer.act(async()=>{for(const listener of mockListeners)listener('background');});
 await renderer.act(async()=>{for(const listener of mockListeners)listener('active');});
 expect(sounds.reduce((sum,s)=>sum+s.replayAsync.mock.calls.length,0)).toBe(1);
 await renderer.act(async()=>tree.unmount());
});

test('a dismissed achievement cannot start playing after a slow preload finishes',async()=>{
 const resolves:((result:unknown)=>void)[]=[];(Audio.Sound.createAsync as jest.Mock).mockImplementation(()=>new Promise(resolve=>resolves.push(resolve)));
 let tree:any;await renderer.act(async()=>{tree=renderer.create(React.createElement(Probe,{event:{kind:'complete',id:'slow'}}));});
 await renderer.act(async()=>tree.unmount());const sounds=resolves.map(()=>player());
 await renderer.act(async()=>resolves.forEach((resolve,index)=>resolve({sound:sounds[index]})));
 expect(sounds.every(s=>s.replayAsync.mock.calls.length===0&&s.unloadAsync.mock.calls.length===1)).toBe(true);
});
