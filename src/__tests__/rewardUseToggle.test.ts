import React from 'react';
import {Alert,Switch} from 'react-native';
import {RewardUseToggle} from '../features/routine/RewardUseToggle';
import {emptyData,emptyDay,routineDay} from '../lib/routineModel';
import {runScreenTimeAction,syncRoutineRewards} from '../lib/screenTime';
let mockContext:any;
const mockNavigate=jest.fn();
jest.mock('@react-navigation/native',()=>({useNavigation:()=>({navigate:mockNavigate})}));
jest.mock('../features/routine/RoutineProvider',()=>({useRoutine:()=>mockContext}));
jest.mock('../theme/ThemeContext',()=>({useTheme:()=>({colors:{primary:'#347B50',border:'#ddd',white:'#fff'}})}));
jest.mock('../features/routine/ui',()=>{const React=require('react'),{Text,Pressable}=require('react-native');return {Copy:({children}:any)=>React.createElement(Text,null,children),Link:({label,onPress}:any)=>React.createElement(Pressable,{onPress},React.createElement(Text,null,label)),u:{between:{}}}});
jest.mock('../lib/screenTime',()=>({runScreenTimeAction:jest.fn(async()=>{}),syncRoutineRewards:jest.fn(async()=>{})}));
const renderer=require('react-test-renderer');
beforeEach(()=>{jest.clearAllMocks();jest.spyOn(Alert,'alert').mockImplementation(()=>{});(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;const key=routineDay(),data=emptyData();data.days[key]={...emptyDay(),paid:{morning:10,words:20,gym:0},bonus:{order:60}};mockContext={data,dayKey:key,ready:true,refreshNative:jest.fn(async()=>{}),native:{supported:true,authorized:true,enabled:true,rewardMode:true,day:key,policyVersion:2,supportsOrderBonus:true,morningComplete:true,grantedMinutes:90,consumedMinutes:0,usingRewards:false,locked:true}};});
test('home starts only reward use, syncing the cap and separate order credit',async()=>{let tree:any;await renderer.act(async()=>{tree=renderer.create(React.createElement(RewardUseToggle))});const control=tree.root.findByType(Switch);expect(control.props.disabled).toBe(false);await renderer.act(async()=>control.props.onValueChange(true));expect(syncRoutineRewards).toHaveBeenCalledWith(mockContext.dayKey,{morning:10,words:20,gym:0,book:0,extra:0,quick:0,wordDailyCap:0,order:60});expect(runScreenTimeAction).toHaveBeenCalledWith('startRewardUse');expect(mockContext.refreshNative).toHaveBeenCalledTimes(1);await renderer.act(async()=>tree.unmount());});
test.each(['morning','sleep','focus','permission','zero'])('%s state explains a blocked tap without unlocking apps',async state=>{if(state==='morning')mockContext.native.morningComplete=false;if(state==='sleep')mockContext.native.sleepLocked=true;if(state==='focus')mockContext.native.focusUntil=Date.now()+60000;if(state==='permission')mockContext.native.authorized=false;if(state==='zero')mockContext.native.consumedMinutes=90;let tree:any;await renderer.act(async()=>{tree=renderer.create(React.createElement(RewardUseToggle))});const control=tree.root.findByType(Switch);expect(control.props.disabled).toBe(false);await renderer.act(async()=>control.props.onValueChange(true));expect(Alert.alert).toHaveBeenCalled();expect(runScreenTimeAction).not.toHaveBeenCalled();expect(syncRoutineRewards).not.toHaveBeenCalled();await renderer.act(async()=>tree.unmount());});

test('a paused focus timer explains the preserved 15-minute balance and opens its existing controls',async()=>{
 mockContext.native.grantedMinutes=65;mockContext.native.consumedMinutes=50;mockContext.native.focusUntil=Date.now()+86400000;
 mockContext.data.bookTimer={id:'focus',subject:'수능',phase:'focus',running:false,remaining:900,endsAt:Date.now(),startedAt:new Date().toISOString()};
 let tree:any;await renderer.act(async()=>{tree=renderer.create(React.createElement(RewardUseToggle))});await renderer.act(async()=>tree.root.findByType(Switch).props.onValueChange(true));
 const call=(Alert.alert as jest.Mock).mock.calls.at(-1);expect(call[1]).toContain('잔액 15분');expect(call[1]).toContain('일시정지');expect(call[1]).toContain('타이머를 종료');
 await renderer.act(async()=>call[2][1].onPress());expect(mockNavigate).toHaveBeenCalledWith('BookStudy');expect(runScreenTimeAction).not.toHaveBeenCalled();await renderer.act(async()=>tree.unmount());
});

test('native errors are also surfaced as an alert and leave use off',async()=>{
 (runScreenTimeAction as jest.Mock).mockRejectedValueOnce(new Error('기기에서 시작하지 못했어요.'));let tree:any;await renderer.act(async()=>{tree=renderer.create(React.createElement(RewardUseToggle))});await renderer.act(async()=>tree.root.findByType(Switch).props.onValueChange(true));expect(Alert.alert).toHaveBeenCalledWith('시간 사용을 변경하지 못했어요','기기에서 시작하지 못했어요.',expect.any(Array));expect(tree.root.findByType(Switch).props.value).toBe(false);await renderer.act(async()=>tree.unmount());
});
test('pause remains possible while focus blocks actual use, and never disables the app restriction service',async()=>{mockContext.native.usingRewards=true;mockContext.native.focusUntil=Date.now()+60000;let tree:any;await renderer.act(async()=>{tree=renderer.create(React.createElement(RewardUseToggle))});const control=tree.root.findByType(Switch);expect(control.props.disabled).toBe(false);await renderer.act(async()=>control.props.onValueChange(false));expect(runScreenTimeAction).toHaveBeenCalledWith('pauseRewardUse');expect(syncRoutineRewards).not.toHaveBeenCalled();expect(runScreenTimeAction).not.toHaveBeenCalledWith('disable');await renderer.act(async()=>tree.unmount());});
test('free study uses its own native ledger instead of inflating capped word or focus amounts',async()=>{mockContext.native.supportsFreeStudyRewards=true;mockContext.data.days[mockContext.dayKey].bonus.freeStudy=35;let tree:any;await renderer.act(async()=>{tree=renderer.create(React.createElement(RewardUseToggle))});await renderer.act(async()=>tree.root.findByType(Switch).props.onValueChange(true));expect(syncRoutineRewards).toHaveBeenCalledWith(mockContext.dayKey,expect.objectContaining({words:20,book:0,order:60,wordDailyCap:0,freeStudy:35}));await renderer.act(async()=>tree.unmount());});

