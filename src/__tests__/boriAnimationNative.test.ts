import React from 'react';
// react-test-renderer에는 타입 패키지가 없어 require로 불러온다.
const renderer=require('react-test-renderer'),{act}=renderer;

const mockCalls={pause:0};
jest.mock('lottie-react-native',()=>{
 const React=require('react');
 return {__esModule:true,default:React.forwardRef((props:any,ref:any)=>{
  React.useImperativeHandle(ref,()=>({play:()=>{},resume:()=>{},pause:()=>{mockCalls.pause++}}));
  return React.createElement('LottieView',props);
 })};
});
import {BoriAnimation} from '../features/routine/BoriAnimation';

const source={ip:0,op:120,fr:30};
const element=(active:boolean,stillFrame?:number)=>React.createElement(BoriAnimation,{source:source as any,loop:true,active,stillFrame,onFinish:()=>{},onFailure:()=>{}});
const render=(node:React.ReactElement)=>{let tree:any;act(()=>{tree=renderer.create(node)});return tree};
const lottie=(tree:any)=>tree.root.findByType('LottieView' as any);

// iOS에서는 처음 만들 때 onAnimationLoaded가 JS까지 오지 않는다. 이 이벤트 없이도 재생돼야 한다.
describe('native BoriAnimation',()=>{
 beforeEach(()=>{mockCalls.pause=0});
 it('plays without waiting for the load event',()=>{
  expect(lottie(render(element(true))).props.autoPlay).toBe(true);
 });
 it('does not play while inactive or on a still frame',()=>{
  expect(lottie(render(element(false))).props.autoPlay).toBe(false);
  expect(lottie(render(element(true,40))).props.autoPlay).toBe(false);
 });
 it('pauses when it becomes inactive and plays again when active',()=>{
  const tree=render(element(true));
  act(()=>{tree.update(element(false))});
  expect(mockCalls.pause).toBeGreaterThan(0);
  expect(lottie(tree).props.autoPlay).toBe(false);
  act(()=>{tree.update(element(true))});
  expect(lottie(tree).props.autoPlay).toBe(true);
 });
});
