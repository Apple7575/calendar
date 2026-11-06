import React from 'react';
import { Audio } from 'expo-av';
import { useStudyAudio } from '../features/routine/StudyAudio';
import { normalizeNote } from '../lib/japaneseDeck';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {studyRateKey} from '../lib/studyPlayback';
jest.mock('react-native',()=>({AppState:{currentState:'active',addEventListener:()=>({remove:jest.fn()})},View:()=>null}));
jest.mock('@react-navigation/native',()=>({useIsFocused:()=>true}));
jest.mock('../hooks/useSession',()=>({useSession:()=>({session:null,loading:false})}));
jest.mock('../features/routine/ui',()=>({Action:()=>null,Copy:()=>null,Link:()=>null}));
jest.mock('@react-native-async-storage/async-storage',()=>({getItem:jest.fn(async()=> 'false'),setItem:jest.fn(async()=>{})}));
jest.mock('../lib/studyAudio',()=>({resolveStudyAudio:(_:unknown,kind:string)=>kind==='word'?1:2}));
jest.mock('../lib/remoteStudyAudio',()=>({remoteAudioName:()=>null,cachedRemoteAudio:jest.fn()}));
jest.mock('expo-av',()=>({Audio:{PitchCorrectionQuality:{Medium:'medium'},setAudioModeAsync:jest.fn(async()=>{}),Sound:{createAsync:jest.fn()}}}));
const renderer=require('react-test-renderer');let value:ReturnType<typeof useStudyAudio>;
const note=normalizeNote({ID:'test',Word:'価格',Word_Reading:'かかく',Word_Meaning:'가격',Sentence:'価格を調べます。'},0);
function Probe({revealed}:{revealed:boolean}){value=useStudyAudio(note,'word',revealed);return null;}
beforeEach(()=>{jest.clearAllMocks();(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;});
test('both recordings preload on the front and repeated taps replay without creating new players',async()=>{
 const players:any[]=[];(Audio.Sound.createAsync as jest.Mock).mockImplementation(async()=>{const sound={pauseAsync:jest.fn(async()=>{}),replayAsync:jest.fn(async()=>{}),unloadAsync:jest.fn(async()=>{}),setOnPlaybackStatusUpdate:jest.fn()};players.push(sound);return {sound};});
 let tree:any;await renderer.act(async()=>{tree=renderer.create(React.createElement(Probe,{revealed:false}));});
 expect(Audio.Sound.createAsync).toHaveBeenCalledTimes(2);expect(players.every(p=>p.replayAsync.mock.calls.length===0)).toBe(true);
 await renderer.act(async()=>tree.update(React.createElement(Probe,{revealed:true})));
 await renderer.act(async()=>{await value!.play('word');await value!.play('word');await value!.play('sentence');});
 expect(Audio.Sound.createAsync).toHaveBeenCalledTimes(2);expect(Audio.setAudioModeAsync).toHaveBeenCalledTimes(1);expect(players[0].replayAsync).toHaveBeenCalledTimes(2);expect(players[1].replayAsync).toHaveBeenCalledTimes(1);
 await renderer.act(async()=>tree.unmount());expect(players.every(p=>p.unloadAsync.mock.calls.length===1)).toBe(true);
});
test('a pending preload resolves after unmount without starting playback or leaking a player',async()=>{
 const pending:((v:unknown)=>void)[]=[];(Audio.Sound.createAsync as jest.Mock).mockImplementation(()=>new Promise(r=>pending.push(r)));
 let tree:any;await renderer.act(async()=>{tree=renderer.create(React.createElement(Probe,{revealed:false}));});await renderer.act(async()=>tree.unmount());
 const players=pending.map(()=>({unloadAsync:jest.fn(async()=>{}),replayAsync:jest.fn()}));await renderer.act(async()=>pending.forEach((resolve,i)=>resolve({sound:players[i]})));
 expect(players.every(p=>p.unloadAsync.mock.calls.length===1&&p.replayAsync.mock.calls.length===0)).toBe(true);
});

test('word and sentence speeds persist independently and apply to playback with pitch correction',async()=>{
 (AsyncStorage.getItem as jest.Mock).mockImplementation(async(key:string)=>key===studyRateKey('word')?'1.25':key===studyRateKey('sentence')?'1.75':'false');
 const players:any[]=[];(Audio.Sound.createAsync as jest.Mock).mockImplementation(async()=>{const sound={pauseAsync:jest.fn(async()=>{}),replayAsync:jest.fn(async()=>{}),setRateAsync:jest.fn(async()=>{}),unloadAsync:jest.fn(async()=>{}),setOnPlaybackStatusUpdate:jest.fn()};players.push(sound);return {sound};});
 let tree:any;await renderer.act(async()=>{tree=renderer.create(React.createElement(Probe,{revealed:true}));});
 await renderer.act(async()=>{await value.play('word');await value.play('sentence');});
 expect(players[0].replayAsync).toHaveBeenLastCalledWith(expect.objectContaining({rate:1.25,shouldCorrectPitch:true}));
 expect(players[1].replayAsync).toHaveBeenLastCalledWith(expect.objectContaining({rate:1.75,shouldCorrectPitch:true}));
 await renderer.act(async()=>{await value.setRate('word',2);});
 expect(AsyncStorage.setItem).toHaveBeenCalledWith(studyRateKey('word'),'2');expect(value.rates).toEqual({word:2,sentence:1.75});
 expect(players[0].setRateAsync).toHaveBeenCalledWith(2,true,'medium');
 await renderer.act(async()=>{await value.play('word');});expect(players[0].replayAsync).toHaveBeenLastCalledWith(expect.objectContaining({rate:2}));
 expect(Audio.Sound.createAsync).toHaveBeenCalledTimes(2);await renderer.act(async()=>tree.unmount());
});

test('automatic sentence waits exactly 200ms and a manual action cancels the pending sentence',async()=>{
 jest.useFakeTimers({doNotFake:['queueMicrotask','setImmediate']});
 (AsyncStorage.getItem as jest.Mock).mockImplementation(async(key:string)=>key==='routine.studyAudio.sentenceAuto.v1'?'true':'false');
 const players:any[]=[];(Audio.Sound.createAsync as jest.Mock).mockImplementation(async()=>{const sound={pauseAsync:jest.fn(async()=>{}),replayAsync:jest.fn(async()=>{}),unloadAsync:jest.fn(async()=>{}),setOnPlaybackStatusUpdate:jest.fn((callback:any)=>{sound.callback=callback}),callback:null as any};players.push(sound);return {sound}});
 let tree:any;try{
  await renderer.act(async()=>{tree=renderer.create(React.createElement(Probe,{revealed:true}));});
  await renderer.act(async()=>{await value.play('word',true)});
  await renderer.act(async()=>{players[0].callback({isLoaded:true,didJustFinish:true});jest.advanceTimersByTime(199)});
  expect(players[1].replayAsync).not.toHaveBeenCalled();
  await renderer.act(async()=>{jest.advanceTimersByTime(1)});expect(players[1].replayAsync).toHaveBeenCalledTimes(1);
  await renderer.act(async()=>{await value.play('word',true);players[0].callback({isLoaded:true,didJustFinish:true});value.stop();jest.advanceTimersByTime(1000)});
  expect(players[1].replayAsync).toHaveBeenCalledTimes(1);
 }finally{if(tree)await renderer.act(async()=>tree.unmount());jest.useRealTimers();}
});
