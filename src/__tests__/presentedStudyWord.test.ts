import React from 'react';
import {Rating,State} from 'ts-fsrs';
import {usePresentedStudyWord,RestoredStudyWord} from '../features/routine/usePresentedStudyWord';
import {addDeck,answerAdditionalWord,answerWord,emptyData,getDay,nextAdditionalWord,nextStudyWord,pendingAdditionalWords,pendingWords,planStudy,routineDay,startAdditionalStudy,Word,encodeCard,decodeCard,scheduler} from '../lib/routineModel';
const renderer=require('react-test-renderer');
const now=new Date(2026,10,1,9),key=routineDay(now);
let shown:Word|undefined;
function Probe({scope,pending,candidate,restored}:{scope:string;pending:Word[];candidate:Word|undefined;restored?:RestoredStudyWord}){shown=usePresentedStudyWord(scope,pending,candidate,restored);return null;}
function seed(additional=false){
 let data=addDeck(emptyData(),'d',Array.from({length:3},(_,i)=>({front:`w${i}`,back:'m'})),'d',now);data.newLimit=additional?1:3;data=planStudy(data,key);
 if(additional)data=startAdditionalStudy(data,key,'new',2,now);
 const ids=additional?getDay(data,key).additional!.ids:['d:0','d:1'];
 data.words=data.words.map(w=>ids.includes(w.id)?{...w,card:{...encodeCard(scheduler.next(decodeCard(w.card),now,Rating.Again).card),due:new Date(now.getTime()+(w.id===ids[0]?1000:60000)).toISOString()}}:w);
 if(!additional)data.days[key].complete=['d:2'];
 data.days[key].lastStudyWordId=ids[0];if(additional)data.days[key].additional!.lastWordId=ids[0];
 return {data,ids};
}
beforeEach(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;});
test.each([false,true])('time becoming due cannot replace a presented card; grading the held card still works (additional=%s)',async additional=>{
 const {data,ids}=seed(additional),later=new Date(now.getTime()+2000);
 const pending=additional?pendingAdditionalWords(data,key):pendingWords(data,key,'full');
 const next=(at:Date)=>additional?nextAdditionalWord(data,key,at):nextStudyWord(data,key,'full',at);
 expect(next(now)?.id).toBe(ids[1]);expect(next(later)?.id).toBe(ids[0]);
 let tree:any;await renderer.act(async()=>{tree=renderer.create(React.createElement(Probe,{scope:'queue',pending,candidate:next(now)}))});
 expect(shown?.id).toBe(ids[1]);
 await renderer.act(async()=>tree.update(React.createElement(Probe,{scope:'queue',pending,candidate:next(later)})));
 expect(shown?.id).toBe(ids[1]);
 const graded=additional?answerAdditionalWord(data,key,shown!.id,Rating.Easy,later,2,undefined,shown!.card.reps):answerWord(data,key,shown!.id,Rating.Easy,later,2,'full',undefined,shown!.card.reps);
 expect(getDay(graded,key).responses).toBe(1);expect(graded.words.find(w=>w.id===ids[0])!.card.reps).toBe(1);
 const stale=additional?answerAdditionalWord(graded,key,shown!.id,Rating.Easy,later,2,undefined,1):answerWord(graded,key,shown!.id,Rating.Easy,later,2,'full',undefined,1);
 expect(stale).toBe(graded);
 const pendingAfter=additional?pendingAdditionalWords(graded,key):pendingWords(graded,key,'full');
 await renderer.act(async()=>tree.update(React.createElement(Probe,{scope:'queue',pending:pendingAfter,candidate:additional?nextAdditionalWord(graded,key,later):nextStudyWord(graded,key,'full',later)})));
 expect(shown?.id).toBe(ids[0]);await renderer.act(async()=>tree.unmount());
});
test('removal or deck changes release the held card immediately',async()=>{
 const {data,ids}=seed(),pending=pendingWords(data,key,'full');let tree:any;
 await renderer.act(async()=>{tree=renderer.create(React.createElement(Probe,{scope:'first',pending,candidate:pending[1]}))});
 const replacement=pending.find(w=>w.id!==shown!.id)!;
 await renderer.act(async()=>tree.update(React.createElement(Probe,{scope:'first',pending:[replacement],candidate:replacement})));
 expect(shown?.id).toBe(replacement.id);
 await renderer.act(async()=>tree.update(React.createElement(Probe,{scope:'second',pending,candidate:pending[1]})));
 expect(shown?.id).toBe(ids[1]);await renderer.act(async()=>tree.unmount());
});
test('explicit undo returns to the previous card once and later clock ticks still cannot replace it',async()=>{
 const {data}=seed(),pending=pendingWords(data,key,'full');let tree:any;
 await renderer.act(async()=>{tree=renderer.create(React.createElement(Probe,{scope:'queue',pending,candidate:pending[1]}))});
 const restored={id:pending[0].id,reps:pending[0].card.reps,token:'undo-event'};
 await renderer.act(async()=>tree.update(React.createElement(Probe,{scope:'queue',pending,candidate:pending[1],restored})));
 expect(shown?.id).toBe(pending[0].id);
 await renderer.act(async()=>tree.update(React.createElement(Probe,{scope:'queue',pending,candidate:pending[1],restored:{...restored}})));
 expect(shown?.id).toBe(pending[0].id);
 const after=[{...pending[0],card:{...pending[0].card,reps:2}},pending[1]];
 await renderer.act(async()=>tree.update(React.createElement(Probe,{scope:'queue',pending:after,candidate:pending[1],restored})));
 expect(shown?.id).toBe(pending[1].id);
 await renderer.act(async()=>tree.unmount());
});
