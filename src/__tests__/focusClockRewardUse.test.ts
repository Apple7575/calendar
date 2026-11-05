import React from 'react';
import {Text} from 'react-native';
import {FocusClock} from '../features/routine/PomodoroClock';

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
