import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {RoutineProvider,useRoutine} from '../features/routine/RoutineProvider';
import {getScreenTimeStatus} from '../lib/screenTime';
jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('react-native',()=>({AppState:{currentState:'active',addEventListener:()=>({remove:jest.fn()})}}));
const renderer=require('react-test-renderer');
jest.mock('../lib/screenTime',()=>({getScreenTimeStatus:jest.fn(async()=>null),syncRoutineRewards:jest.fn(async()=>{}),syncFocusWindow:jest.fn(async()=>{})}));
jest.mock('../lib/deckCloud',()=>({receiveDecks:async()=>[]}));
jest.mock('../lib/learningCloud',()=>({receiveLearningSummaries:async()=>[]}));
jest.mock('../lib/routineBackup',()=>({isCloudAccount:()=>false,latestRoutineBackup:jest.fn(),uploadRoutineBackup:jest.fn()}));
let value:ReturnType<typeof useRoutine>|undefined;
function Probe(){value=useRoutine();return null;}
beforeEach(async()=>{jest.useFakeTimers();await AsyncStorage.clear();jest.clearAllMocks();(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;});
afterEach(()=>jest.useRealTimers());
const status=(over:object)=>({supported:true,authorized:true,enabled:true,rewardMode:true,day:'x',supportsPlayLog:true,playLogSince:1000,playLog:[],...over});
const mount=async()=>{let tree:any;await renderer.act(async()=>{tree=renderer.create(React.createElement(RoutineProvider,{userId:'local',children:React.createElement(Probe)}));});return tree;};

test('closed stretches from the phone reach saved data, so backups carry them',async()=>{
 (getScreenTimeStatus as jest.Mock).mockResolvedValue(status({playLog:[{start:2000,end:3000},{start:4000}]}));
 const tree=await mount();
 expect(value!.data.playLog?.rows).toEqual([{start:2000,end:3000}]);
 const stored=JSON.parse((await AsyncStorage.getItem('routine.v1.local'))!);
 expect(stored.playLog.rows).toEqual([{start:2000,end:3000}]);
 await renderer.act(async()=>{tree.unmount();});
});
test('a build without the record leaves saved data alone',async()=>{
 (getScreenTimeStatus as jest.Mock).mockResolvedValue({supported:true,authorized:true,enabled:true,rewardMode:true,day:'x'});
 const tree=await mount();
 expect(value!.data.playLog).toBeUndefined();
 await renderer.act(async()=>{tree.unmount();});
});
