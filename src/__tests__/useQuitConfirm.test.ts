import React from 'react';
import {useQuitConfirm} from '../features/routine/useQuitConfirm';

const renderer=require('react-test-renderer');
const PENALTY='벌점 10분·1,000원',QUESTION='일론 머스크라면 지금 그만둘까?';
beforeAll(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;jest.useFakeTimers()});
afterAll(()=>jest.useRealTimers());

async function mount(penalty:string,ask:()=>string|null=()=>QUESTION){
 let current:ReturnType<typeof useQuitConfirm>,tree:any;
 const Probe=({value}:{value:string})=>{current=useQuitConfirm(value,ask);return null};
 await renderer.act(async()=>{tree=renderer.create(React.createElement(Probe,{value:penalty}))});
 return {get:()=>current!,set:(value:string)=>renderer.act(async()=>tree.update(React.createElement(Probe,{value}))),act:(fn:()=>void)=>renderer.act(async()=>fn()),done:()=>renderer.act(async()=>tree.unmount())};
}

describe('one confirm step for every way of ending a run',()=>{
 test('no penalty goes straight through and asks nothing',async()=>{
  const ask=jest.fn(()=>QUESTION),go=jest.fn(),c=await mount('',ask);
  await c.act(()=>c.get().press(go));
  expect(go).toHaveBeenCalledTimes(1);expect(ask).not.toHaveBeenCalled();expect(c.get().open).toBe(false);
  await c.done();
 });
 test('a penalty asks first, and the second press goes',async()=>{
  const go=jest.fn(),c=await mount(PENALTY);
  await c.act(()=>c.get().press(go));
  expect(go).not.toHaveBeenCalled();expect(c.get()).toMatchObject({open:true,question:QUESTION});
  await c.act(()=>c.get().press(go));
  expect(go).toHaveBeenCalledTimes(1);expect(c.get().open).toBe(false);
  await c.done();
 });
 test('over the daily limit it is still a second press, with no question',async()=>{
  const go=jest.fn(),c=await mount(PENALTY,()=>null);
  await c.act(()=>c.get().press(go));
  expect(c.get()).toMatchObject({open:true,question:null});expect(go).not.toHaveBeenCalled();
  await c.done();
 });
 test('staying closes it and spends nothing further until asked again',async()=>{
  const ask=jest.fn(()=>QUESTION),go=jest.fn(),c=await mount(PENALTY,ask);
  await c.act(()=>c.get().press(go));
  await c.act(()=>c.get().stay());
  expect(c.get().open).toBe(false);expect(go).not.toHaveBeenCalled();expect(ask).toHaveBeenCalledTimes(1);
  await c.done();
 });
 test('left alone it closes, later with a question to read',async()=>{
  const go=jest.fn(),plain=await mount(PENALTY,()=>null);
  await plain.act(()=>plain.get().press(go));
  await plain.act(()=>{jest.advanceTimersByTime(5000)});
  expect(plain.get().open).toBe(false);
  await plain.done();
  const asked=await mount(PENALTY);
  await asked.act(()=>asked.get().press(go));
  await asked.act(()=>{jest.advanceTimersByTime(9999)});
  expect(asked.get().open).toBe(true);
  await asked.act(()=>{jest.advanceTimersByTime(1)});
  expect(asked.get().open).toBe(false);
  await asked.done();
 });
 test('the penalty ending while open closes it, so the next press is free',async()=>{
  const go=jest.fn(),c=await mount(PENALTY);
  await c.act(()=>c.get().press(go));
  await c.set('');
  expect(c.get().open).toBe(false);
  await c.act(()=>c.get().press(go));
  expect(go).toHaveBeenCalledTimes(1);
  await c.done();
 });
});

describe('every screen that can charge goes through it',()=>{
 const fs=require('fs'),path=require('path');
 const read=(f:string)=>fs.readFileSync(path.join(__dirname,'../features/routine',f),'utf8') as string;
 test.each(['BookStudyScreen.tsx','PriorityPauseScreen.tsx','PriorityMissionCard.tsx','PomodoroClock.tsx'])('%s',file=>{
  expect(read(file)).toContain('useQuitConfirm(');
 });
});
