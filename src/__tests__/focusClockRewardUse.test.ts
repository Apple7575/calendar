import React from 'react';
import {Text} from 'react-native';
import {FocusClock} from '../features/routine/PomodoroClock';
import {focusJourney} from '../lib/focusJourney';

jest.mock('@expo/vector-icons',()=>({Ionicons:()=>null}));
jest.mock('../features/routine/ui',()=>({Icon:()=>null}));
jest.mock('../lib/haptics',()=>({tapLight:()=>{}}));
const renderer=require('react-test-renderer');
const onPress=jest.fn();
const base={design:'A' as const,left:200,running:true,subject:'회로',onPause:()=>{},onClose:()=>{},onFinish:()=>{},rewardUse:{label:'스크린타임 켜기 · 23분',onPress}};
async function labels(props:object){
 let tree:any;
 await renderer.act(async()=>{tree=renderer.create(React.createElement(FocusClock,{...base,phase:'focus',...props}))});
 const texts=tree.root.findAllByType(Text).map((t:any)=>[t.props.children].flat().join(''));
 await renderer.act(async()=>tree.unmount());
 return texts;
}
beforeAll(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true});

describe('the screen time button on the timer',()=>{
 test('shows during a rest',async()=>expect(await labels({phase:'break'})).toContain('스크린타임 켜기 · 23분'));
 test('shows after a rest ran out',async()=>expect(await labels({phase:'idle',restOvertime:40})).toContain('스크린타임 켜기 · 23분'));
 test('stays away while studying',async()=>expect(await labels({phase:'focus'})).not.toContain('스크린타임 켜기 · 23분'));
 test('stays away while choosing after a photo, which is still locked',async()=>expect(await labels({phase:'idle',awaitingChoice:true})).not.toContain('스크린타임 켜기 · 23분'));
});

describe('the 25-minute clock',()=>{
 const journey=focusJourney(130,120);
 test('shows study time and the next stage instead of a plus sign',async()=>{
  const texts=await labels({phase:'focus',left:-10,journey});
  expect(texts).toContain('02:10');expect(texts).toContain('다음 5분까지 02:50');expect(texts).not.toContain('+00:10');expect(texts).not.toContain('추가 공부 중');
 });
 test('a paused run says so and keeps the study time',async()=>{
  const texts=await labels({phase:'focus',running:false,journey});
  expect(texts).toContain('02:10');expect(texts).toContain('일시정지 중');
 });
 test('time adjustment leaves study, since it never changed what counts, and stays for a rest',async()=>{
  expect(await labels({phase:'focus',journey,onAdjust:()=>{}})).not.toContain('시간 조정 +');
  expect(await labels({phase:'break',onAdjust:()=>{}})).toContain('시간 조정 +');
 });
 test('a rest keeps its countdown',async()=>{
  const texts=await labels({phase:'break',left:200});
  expect(texts).toContain('03:20');expect(texts).toContain('휴식 중');
 });
});
