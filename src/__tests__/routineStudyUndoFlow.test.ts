import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Rating } from 'ts-fsrs';
import { RoutineProvider,useRoutine } from '../features/routine/RoutineProvider';
import { addDeck,answerWord,emptyData,getDay,planStudy,routineDay } from '../lib/routineModel';
import { adjustStudyRewards,getScreenTimeStatus,syncRoutineRewards } from '../lib/screenTime';
jest.mock('../lib/breakAlarm',()=>({breakAlarmAt:()=>null,syncBreakAlarm:async()=>true}));
jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('react-native',()=>({AppState:{currentState:'active',addEventListener:()=>({remove:jest.fn()})}}));
jest.mock('../lib/screenTime',()=>({getScreenTimeStatus:jest.fn(),syncRoutineRewards:jest.fn(async()=>{}),syncFocusWindow:jest.fn(async()=>{}),adjustStudyRewards:jest.fn(async()=>{})}));
jest.mock('../lib/deckCloud',()=>({receiveDecks:async()=>[]}));jest.mock('../lib/learningCloud',()=>({receiveLearningSummaries:async()=>[]}));
jest.mock('../lib/routineBackup',()=>({isCloudAccount:()=>false,latestRoutineBackup:jest.fn(),uploadRoutineBackup:jest.fn()}));
const renderer=require('react-test-renderer'),uid='undo-test',storage=`routine.v1.${uid}`;let value:ReturnType<typeof useRoutine>;
function Probe(){value=useRoutine();return null;}
async function mount(count=10){if(!await AsyncStorage.getItem(storage)){const now=new Date(),key=routineDay(now);await AsyncStorage.setItem(storage,JSON.stringify(planStudy(addDeck(emptyData(),'d',Array.from({length:count},(_,i)=>({front:`w${i}`,back:'뜻'})),'d',now),key)));}let tree:any;await renderer.act(async()=>{tree=renderer.create(React.createElement(RoutineProvider,{userId:uid,children:React.createElement(Probe)}));});return tree;}
beforeEach(async()=>{jest.useFakeTimers();await AsyncStorage.clear();jest.clearAllMocks();(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;(getScreenTimeStatus as jest.Mock).mockResolvedValue({policyVersion:2,enabled:true,authorized:true,rewardMode:true,supportsStudyUndo:true});(adjustStudyRewards as jest.Mock).mockResolvedValue(undefined);});afterEach(()=>jest.useRealTimers());
test('native reward rollback is journaled before the call and normal sync waits until it finishes',async()=>{
 const tree=await mount(),key=value!.dayKey;await renderer.act(async()=>{for(let i=0;i<10;i++)await value!.update(s=>answerWord(s,key,`d:${i}`,Rating.Easy,new Date(),1));});
 let resolve!:()=>void;(adjustStudyRewards as jest.Mock).mockImplementation(()=>new Promise<void>(r=>{resolve=r}));
 await renderer.act(async()=>{await value!.undoStudy();});
 const saved=JSON.parse((await AsyncStorage.getItem(storage))!);expect(saved.pendingStudyAdjustment).toMatchObject({from:{words:5},to:{words:0}});expect(saved.days[key].paid.words).toBe(0);
 expect(adjustStudyRewards).toHaveBeenCalledWith(key,{words:5,extra:0,quick:0},{words:0,extra:0,quick:0});
 expect((syncRoutineRewards as jest.Mock).mock.calls.at(-1)[1].words).toBe(5);
 await renderer.act(async()=>{resolve();});expect(value!.data.pendingStudyAdjustment).toBeUndefined();expect((syncRoutineRewards as jest.Mock).mock.calls.at(-1)[1].words).toBe(0);
 await renderer.act(async()=>tree.unmount());
});
test('failed native rollback survives restart and is retried without regranting the reverted reward',async()=>{
 let tree=await mount(),key=value!.dayKey;await renderer.act(async()=>{for(let i=0;i<10;i++)await value!.update(s=>answerWord(s,key,`d:${i}`,Rating.Easy,new Date(),1));});
 (adjustStudyRewards as jest.Mock).mockRejectedValue(new Error('temporary native failure'));await renderer.act(async()=>{await value!.undoStudy();});expect(value!.data.pendingStudyAdjustment).toBeDefined();expect(value!.error).toContain('temporary native failure');
 await renderer.act(async()=>tree.unmount());(adjustStudyRewards as jest.Mock).mockResolvedValue(undefined);(syncRoutineRewards as jest.Mock).mockClear();tree=await mount();
 expect(value!.data.pendingStudyAdjustment).toBeUndefined();expect(getDay(value!.data,key).paid.words).toBe(0);expect((syncRoutineRewards as jest.Mock).mock.calls.every(([,paid])=>paid.words===0)).toBe(true);expect(value!.data.reviewHistory?.at(-1)?.voidedAt).toBeDefined();await renderer.act(async()=>tree.unmount());
});
test('older native builds reject reward-changing undo before changing any local state',async()=>{
 (getScreenTimeStatus as jest.Mock).mockResolvedValue({policyVersion:2,enabled:true,rewardMode:true});const tree=await mount(),key=value!.dayKey;
 await renderer.act(async()=>{for(let i=0;i<10;i++)await value!.update(s=>answerWord(s,key,`d:${i}`,Rating.Easy,new Date(),1));});await expect(value!.undoStudy()).rejects.toThrow('새 아이폰 빌드');expect(getDay(value!.data,key).paid.words).toBe(5);expect(value!.data.reviewHistory?.at(-1)?.voidedAt).toBeUndefined();expect(adjustStudyRewards).not.toHaveBeenCalled();await renderer.act(async()=>tree.unmount());
});
