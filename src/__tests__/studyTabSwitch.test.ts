import React from 'react';
import {emptyData} from '../lib/routineModel';
import {focusTheme} from '../theme/themes';

// 학습 탭에서 단어·집중·말하기·콘텐츠를 바꿔도 Page(상단 안전 영역 포함)가 다시 만들어지지 않아야 한다.
// 다시 만들어지면 첫 프레임에 위 여백이 0이 되어 깜빡인다(팀장 실기기 제보, 빌드 49).
const mockMounts={page:0,speak:0};
let mockSwitchTo:(id:string)=>void=()=>{};
let mockSeenTheme:string[]=[];

jest.mock('@react-native-async-storage/async-storage',()=>require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('expo-status-bar',()=>({StatusBar:()=>null}));
jest.mock('@react-navigation/native',()=>({useNavigation:()=>({navigate:()=>{}})}));
jest.mock('../features/routine/RoutineProvider',()=>{
 const {emptyData:empty}=jest.requireActual('../lib/routineModel');
 const data=empty();
 return {useRoutine:()=>({data,ready:true,error:null,dayKey:'2026-11-06'})};
});
jest.mock('../features/routine/ui',()=>{
 const R=jest.requireActual('react'),{Text:T}=jest.requireActual('react-native');
 const {useTheme}=jest.requireActual('../theme/ThemeContext');
 const Stub=({children}:{children?:React.ReactNode})=>R.createElement(R.Fragment,null,children??null);
 function Page({children}:{children:React.ReactNode}){
  R.useEffect(()=>{mockMounts.page+=1},[]);
  const t=useTheme();mockSeenTheme.push(t.name);
  return R.createElement(R.Fragment,null,children);
 }
 return {Page,Notice:Stub,Action:Stub,CardView:Stub,Choice:Stub,Copy:({children}:{children:React.ReactNode})=>R.createElement(T,null,children),Icon:Stub,Link:Stub,Progress:Stub,CharacterPeek:Stub,NavCard:Stub,u:{between:{}}};
});
jest.mock('../features/routine/experience',()=>({
 MenuRow:()=>null,SettingsButton:()=>null,
 Segments:({onChange}:{onChange:(id:string)=>void})=>{mockSwitchTo=onChange;return null},
}));
jest.mock('../features/routine/FocusStart',()=>({FocusStart:()=>null}));
jest.mock('../features/routine/SpeakingHome',()=>({SpeakingHome:()=>{jest.requireActual('react').useEffect(()=>{mockMounts.speak+=1},[]);return null}}));
jest.mock('../features/routine/ContentHome',()=>({ContentHome:()=>null}));

const renderer=require('react-test-renderer');
const {StudyHomeScreen}=require('../features/routine/StudyHomeScreen');
beforeAll(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true});

test('탭을 바꿔도 Page를 다시 만들지 않고, 집중 탭만 집중 테마로 그린다',async()=>{
 expect(emptyData).toBeDefined();
 let tree:any;
 await renderer.act(async()=>{tree=renderer.create(React.createElement(StudyHomeScreen))});
 expect(mockMounts.page).toBe(1);
 for(const id of ['focus','speak','focus','content','word']){
  mockSeenTheme=[];
  await renderer.act(async()=>mockSwitchTo(id));
  expect(mockMounts.page).toBe(1);
  if(id==='focus')expect(mockSeenTheme).toContain(focusTheme.name);
  else expect(mockSeenTheme).not.toContain(focusTheme.name);
 }
 // 한 번 연 칸은 숨겨 둘 뿐 다시 만들지 않는다(친구 Lottie를 다시 불러오지 않는다).
 expect(mockMounts.speak).toBe(1);
 await renderer.act(async()=>switchBack());
 expect(mockMounts.speak).toBe(1);
 await renderer.act(async()=>tree.unmount());
});
const switchBack=()=>mockSwitchTo('speak');
