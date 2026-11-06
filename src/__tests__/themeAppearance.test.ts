import React from 'react';
import {Appearance} from 'react-native';
const renderer=require('react-test-renderer'),{act}=renderer;

let mockSaved:string|null=null;
jest.mock('@react-native-async-storage/async-storage',()=>({__esModule:true,default:{getItem:async(k:string)=>k==='theme.id.v2'?mockSaved:null,setItem:async()=>{}}}));
import {ThemeProvider} from '../theme/ThemeContext';

const mount=async()=>{await act(async()=>{renderer.create(React.createElement(ThemeProvider,null,null))});await act(async()=>{await new Promise(r=>setTimeout(r,0))})};

describe('system UI follows the app theme',()=>{
 let spy:jest.SpyInstance,clock:jest.SpyInstance;
 // 21:00~04:30에는 밤 화면이 된다. 여기서는 낮 동작을 보므로 시계를 낮 1시에 둔다.
 beforeEach(()=>{spy=jest.spyOn(Appearance,'setColorScheme').mockImplementation(()=>{});clock=jest.spyOn(Date,'now').mockReturnValue(new Date(2026,10,7,13,0).getTime())});
 afterEach(()=>{spy.mockRestore();clock.mockRestore()});
 it('is dark by default',async()=>{
  mockSaved=null;await mount();
  expect(spy).toHaveBeenLastCalledWith('dark');
 });
 it('is light when the user chose light',async()=>{
  mockSaved='routine';await mount();
  expect(spy).toHaveBeenLastCalledWith('light');
 });
 it('is dark at night (21:00~04:30) even when the user chose light',async()=>{
  clock.mockReturnValue(new Date(2026,10,7,22,0).getTime());
  mockSaved='routine';await mount();
  expect(spy).toHaveBeenLastCalledWith('dark');
 });
});
