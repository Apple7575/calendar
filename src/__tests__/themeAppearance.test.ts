import React from 'react';
import {Appearance} from 'react-native';
const renderer=require('react-test-renderer'),{act}=renderer;

let mockSaved:string|null=null;
jest.mock('@react-native-async-storage/async-storage',()=>({__esModule:true,default:{getItem:async(k:string)=>k==='theme.id.v2'?mockSaved:null,setItem:async()=>{}}}));
import {ThemeProvider} from '../theme/ThemeContext';

const mount=async()=>{await act(async()=>{renderer.create(React.createElement(ThemeProvider,null,null))});await act(async()=>{await new Promise(r=>setTimeout(r,0))})};

describe('system UI follows the app theme',()=>{
 let spy:jest.SpyInstance;
 beforeEach(()=>{spy=jest.spyOn(Appearance,'setColorScheme').mockImplementation(()=>{})});
 afterEach(()=>spy.mockRestore());
 it('is dark by default',async()=>{
  mockSaved=null;await mount();
  expect(spy).toHaveBeenLastCalledWith('dark');
 });
 it('is light when the user chose light',async()=>{
  mockSaved='routine';await mount();
  expect(spy).toHaveBeenLastCalledWith('light');
 });
});
