import React from 'react';
import {useDayData} from '../hooks/useDayData';
import {listLocalEventsInRange} from '../lib/events';
import {getDiaryWithPhotos} from '../lib/diary';
jest.mock('@react-navigation/native',()=>({useFocusEffect:(effect:()=>void)=>require('react').useEffect(effect,[effect])}));
jest.mock('../lib/supabase',()=>({supabase:{auth:{getUser:async()=>({data:{user:{id:'owner'}}})}}}));
jest.mock('../lib/events',()=>({listLocalEventsInRange:jest.fn(async()=>[])}));
jest.mock('../lib/diary',()=>({getDiaryWithPhotos:jest.fn(async()=>({diary:{content:'남겨둔 일기'},photos:[]}))}));
jest.mock('../lib/tasks',()=>({listTasks:async()=>[{id:'task',title:'할 일'}]}));
jest.mock('../lib/routines',()=>({listRoutines:async()=>[],listCheckedRoutineIds:async()=>new Set(),routinesForDate:(all:unknown)=>all}));
const renderer=require('react-test-renderer');let value:ReturnType<typeof useDayData>;
function Probe({date}:{date:string}){value=useDayData(date);return null;}
beforeEach(()=>{jest.clearAllMocks();(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true});
test('an event failure leaves successfully loaded diary and task data available',async()=>{
 (listLocalEventsInRange as jest.Mock).mockRejectedValueOnce(Error('events failed'));let tree:any;
 await renderer.act(async()=>{tree=renderer.create(React.createElement(Probe,{date:'2026-10-31'}))});
 expect(value.diary.diary?.content).toBe('남겨둔 일기');expect(value.tasks).toHaveLength(1);expect(value.localEvents).toEqual([]);expect(value.error).toContain('일부 기록');expect(value.loading).toBe(false);await renderer.act(async()=>tree.unmount());
});
test('a slow old date cannot replace the newly selected date',async()=>{
 let resolveOld:(v:unknown)=>void=()=>{};(getDiaryWithPhotos as jest.Mock).mockImplementationOnce(()=>new Promise(r=>resolveOld=r)).mockResolvedValueOnce({diary:{content:'새 날짜 일기'},photos:[]});let tree:any;
 await renderer.act(async()=>{tree=renderer.create(React.createElement(Probe,{date:'2026-10-30'}))});await renderer.act(async()=>tree.update(React.createElement(Probe,{date:'2026-10-31'})));
 await renderer.act(async()=>resolveOld({diary:{content:'지난 날짜 일기'},photos:[]}));expect(value.diary.diary?.content).toBe('새 날짜 일기');await renderer.act(async()=>tree.unmount());
});
