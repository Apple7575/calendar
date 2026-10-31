import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RoutineProvider,useRoutine } from '../features/routine/RoutineProvider';
import { addDeck,emptyData } from '../lib/routineModel';
import { latestRoutineBackup,uploadRoutineBackup } from '../lib/routineBackup';
import { getScreenTimeStatus,syncRoutineRewards } from '../lib/screenTime';
import { getDay,routineDay } from '../lib/routineModel';
jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('react-native',()=>({AppState:{currentState:'active',addEventListener:()=>({remove:jest.fn()})}}));
const renderer=require('react-test-renderer');
jest.mock('../lib/screenTime',()=>({getScreenTimeStatus:jest.fn(async()=>null),syncRoutineRewards:jest.fn(async()=>{}),syncFocusWindow:jest.fn(async()=>{})}));
jest.mock('../lib/deckCloud',()=>({receiveDecks:async()=>[]}));
jest.mock('../lib/learningCloud',()=>({receiveLearningSummaries:async()=>[]}));
jest.mock('../lib/routineBackup',()=>({isCloudAccount:(id:string)=>id==='11111111-1111-4111-8111-111111111111',latestRoutineBackup:jest.fn(),uploadRoutineBackup:jest.fn()}));
const uid='11111111-1111-4111-8111-111111111111';
let value:ReturnType<typeof useRoutine>|undefined;
function Probe(){value=useRoutine();return null;}
beforeEach(async()=>{jest.useFakeTimers();await AsyncStorage.clear();jest.clearAllMocks();(getScreenTimeStatus as jest.Mock).mockResolvedValue(null);(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;});
afterEach(()=>jest.useRealTimers());
test('a fresh install restores its cloud snapshot before it can upload an empty snapshot',async()=>{
 const data=addDeck(emptyData(),'my deck',[{front:'語',back:'단어'}],'my-deck');data.words[0].favorite=true;
 (latestRoutineBackup as jest.Mock).mockResolvedValue({data,createdAt:'2026-10-30T00:00:00Z'});
 let tree:any;await renderer.act(async()=>{tree=renderer.create(React.createElement(RoutineProvider,{userId:uid,children:React.createElement(Probe)}));});
 expect(value!.ready).toBe(true);expect(value!.data.words[0].favorite).toBe(true);
 const stored=JSON.parse((await AsyncStorage.getItem(`routine.v1.${uid}`))!);expect(stored.words).toHaveLength(1);
 await renderer.act(async()=>{jest.advanceTimersByTime(6000);});expect(uploadRoutineBackup).not.toHaveBeenCalled();
 await renderer.act(async()=>{tree.unmount();});
});
test('an offline restore check never creates a newer empty cloud backup',async()=>{
 (latestRoutineBackup as jest.Mock).mockRejectedValue(new Error('offline'));
 let tree:any;await renderer.act(async()=>{tree=renderer.create(React.createElement(RoutineProvider,{userId:uid,children:React.createElement(Probe)}));});
 expect(value!.ready).toBe(true);expect(value!.backupState.error).toContain('offline');
 await renderer.act(async()=>{jest.advanceTimersByTime(10000);});expect(uploadRoutineBackup).not.toHaveBeenCalled();
 await renderer.act(async()=>{tree.unmount();});
});
test('completed extra cards recover from local storage and reach the native reward ledger once',async()=>{
 const key=routineDay(),ids=Array.from({length:10},(_,i)=>`d:${i}`),data=addDeck(emptyData(),'단어',ids.map(front=>({front,back:'뜻'})),'d');
 data.days[key]={...getDay(data,key),paid:{morning:10,words:20,gym:0},plan:{ids:[],reviewIds:[],newLimit:10},additional:{kind:'new',ids,complete:ids,completedIds:ids,responses:10}};
 await AsyncStorage.setItem(`routine.v1.${uid}`,JSON.stringify(data));
 (getScreenTimeStatus as jest.Mock).mockResolvedValue({policyVersion:2,enabled:true,rewardMode:true});
 let tree:any;await renderer.act(async()=>{tree=renderer.create(React.createElement(RoutineProvider,{userId:uid,children:React.createElement(Probe)}));});
 expect(value!.data.days[key].bonus?.words).toBe(5);
 expect(syncRoutineRewards).toHaveBeenLastCalledWith(key,{morning:10,words:20,gym:0,book:0,extra:5,quick:0,wordDailyCap:60});
 await renderer.act(async()=>{await value!.update(s=>({...s}));});
 expect(value!.data.days[key].bonus?.words).toBe(5);expect(value!.data.days[key].rewardedStudyIds).toHaveLength(10);
 await renderer.act(async()=>{tree.unmount();});
});
test('restored free-study credit reaches its separate native ledger without increasing capped sources',async()=>{
 const key=routineDay(),data=emptyData();data.days[key]={...getDay(data,key),paid:{morning:10,words:20,gym:0},bonus:{book:20,words:40,freeStudy:35},rewardedFreeSessionIds:Array.from({length:7},(_,i)=>`free-${i}`)};
 await AsyncStorage.setItem(`routine.v1.${uid}`,JSON.stringify(data));(getScreenTimeStatus as jest.Mock).mockResolvedValue({policyVersion:2,enabled:true,rewardMode:true,supportsFreeStudyRewards:true});let tree:any;
 await renderer.act(async()=>{tree=renderer.create(React.createElement(RoutineProvider,{userId:uid,children:React.createElement(Probe)}))});expect(syncRoutineRewards).toHaveBeenLastCalledWith(key,expect.objectContaining({words:20,extra:40,book:20,freeStudy:35,wordDailyCap:60}));
 await renderer.act(async()=>{await value!.update(s=>({...s}))});expect(value!.data.days[key].bonus?.freeStudy).toBe(35);expect(value!.data.days[key].rewardedFreeSessionIds).toHaveLength(7);await renderer.act(async()=>tree.unmount());
});
