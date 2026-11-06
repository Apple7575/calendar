import React from 'react';
import {Text} from 'react-native';
import {FocusClock} from '../features/routine/PomodoroClock';
import {warmRender,WARM_TIMEOUT} from './warmRender';

jest.mock('@expo/vector-icons',()=>({Ionicons:()=>null}));
jest.mock('../features/routine/ui',()=>({Icon:()=>null}));
jest.mock('../lib/haptics',()=>({tapLight:()=>{}}));
const renderer=require('react-test-renderer');
const QUESTION='일론 머스크라면 지금 그만둘까?',PENALTY='벌점 10분·1,000원';
beforeAll(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true});
beforeAll(()=>warmRender(()=>React.createElement(FocusClock,{design:'A',left:200,running:true,phase:'focus',subject:'회로',onClose:()=>{},onPause:()=>{},onFinish:()=>{}})),WARM_TIMEOUT);

async function clock(props:object){
 const onFinish=jest.fn(),onPause=jest.fn(),ask=jest.fn(()=>QUESTION as string|null),make=(extra:object)=>React.createElement(FocusClock,{design:'A',left:200,running:true,phase:'focus',subject:'회로',onClose:()=>{},onPause,onFinish,quitPenalty:PENALTY,askQuit:ask,...props,...extra});let tree:any;
 await renderer.act(async()=>{tree=renderer.create(make({}))});
 const label=(t:any)=>[t.props.children].flat().join('');
 const texts=()=>tree.root.findAllByType(Text).map(label);
 const press=async(name:string)=>{let n=tree.root.findAllByType(Text).find((t:any)=>label(t)===name);if(!n)throw new Error('no button '+name+' in '+texts().join(' | '));while(!n.props.onPress)n=n.parent;await renderer.act(async()=>n.props.onPress())};
 return {texts,press,onFinish,onPause,ask,rerender:(extra:object)=>renderer.act(async()=>tree.update(make(extra))),done:()=>renderer.act(async()=>tree.unmount())};
}

describe('the question on a penalised finish',()=>{
 test('asks inside the penalty step, with staying and the priced finish as the two answers',async()=>{
  const c=await clock({});
  expect(c.texts()).not.toContain(QUESTION);
  await c.press('공부 마치기\n'+PENALTY);
  expect(c.texts()).toEqual(expect.arrayContaining([QUESTION,'계속 공부','마치기\n'+PENALTY]));
  expect(c.onFinish).not.toHaveBeenCalled();
  await c.done();
 });
 test('finishing answers it and ends the run',async()=>{
  const c=await clock({});
  await c.press('공부 마치기\n'+PENALTY);await c.press('마치기\n'+PENALTY);
  expect(c.onFinish).toHaveBeenCalledTimes(1);
  await c.done();
 });
 test('staying closes it, ends nothing and leaves a running timer alone',async()=>{
  const c=await clock({});
  await c.press('공부 마치기\n'+PENALTY);await c.press('계속 공부');
  expect(c.texts()).not.toContain(QUESTION);
  expect(c.texts()).toContain('공부 마치기\n'+PENALTY);
  expect(c.onFinish).not.toHaveBeenCalled();expect(c.onPause).not.toHaveBeenCalled();
  await c.done();
 });
 test('staying on a paused run starts it again',async()=>{
  const c=await clock({running:false});
  await c.press('공부 마치기\n'+PENALTY);await c.press('계속 공부');
  expect(c.onPause).toHaveBeenCalledTimes(1);
  await c.done();
 });
 test('staying during a rest leaves the rest alone',async()=>{
  const c=await clock({phase:'break'});
  await c.press('공부 마치기\n'+PENALTY);await c.press('계속 공부');
  expect(c.onPause).not.toHaveBeenCalled();
  await c.done();
 });
 test('over the daily limit the screen is the same as before',async()=>{
  const c=await clock({askQuit:()=>null});
  await c.press('공부 마치기\n'+PENALTY);
  expect(c.texts()).toContain('한 번 더 누르면 마쳐요\n'+PENALTY);
  expect(c.texts()).not.toContain('계속 공부');
  await c.done();
 });
 test('no penalty means no question and an immediate finish',async()=>{
  const c=await clock({quitPenalty:''});
  await c.press('공부 마치기');
  expect(c.ask).not.toHaveBeenCalled();expect(c.onFinish).toHaveBeenCalledTimes(1);
  await c.done();
 });
 test('the penalty ending while it is open drops the question, so the next press is free',async()=>{
  const c=await clock({});
  await c.press('공부 마치기\n'+PENALTY);
  await c.rerender({quitPenalty:''});
  expect(c.texts()).not.toContain(QUESTION);
  expect(c.texts()).not.toContain('계속 공부');
  await c.done();
 });
});
