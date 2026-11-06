import React from 'react';
const renderer=require('react-test-renderer'),{act}=renderer;
import {useRefresh} from '../features/routine/useRefresh';

let state:{refreshing:boolean;onRefresh:()=>void};
function Probe({run}:{run:()=>Promise<void>}){state=useRefresh(run);return null}
const mount=async(run:()=>Promise<void>)=>{await act(async()=>{renderer.create(React.createElement(Probe,{run}))})};

test('pulling reads once and the spinner stops when reading ends',async()=>{
 let finish:()=>void=()=>{};const run=jest.fn(()=>new Promise<void>(r=>{finish=r}));
 await mount(run);
 await act(async()=>{state.onRefresh()});
 expect(state.refreshing).toBe(true);
 await act(async()=>{state.onRefresh()});
 expect(run).toHaveBeenCalledTimes(1);
 await act(async()=>{finish()});
 expect(state.refreshing).toBe(false);
});
test('a failed read still stops the spinner',async()=>{
 await mount(async()=>{throw new Error('native off')});
 await act(async()=>{state.onRefresh()});
 expect(state.refreshing).toBe(false);
});
