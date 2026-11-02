import {useState} from 'react';
import type {Word} from '../../lib/routineModel';
type Presentation={scope:string;id?:string;reps?:number;restoreToken?:string};
export type RestoredStudyWord={id:string;reps:number;token:string};
/** Queue time may change priority, but never replace a card the learner is reading. */
export function usePresentedStudyWord(scope:string,pending:Word[],candidate:Word|undefined,restored?:RestoredStudyWord){
 const [shown,setShown]=useState<Presentation>(()=>({scope,id:candidate?.id,reps:candidate?.card.reps}));
 const held=shown.scope===scope?pending.find(w=>w.id===shown.id&&w.card.reps===shown.reps):undefined;
 const restoreToken=restored?`${scope}:${restored.token}`:shown.restoreToken;
 const restore=restored&&shown.restoreToken!==restoreToken?pending.find(w=>w.id===restored.id&&w.card.reps===restored.reps):undefined;
 const word=restore??held??candidate;
 // Adjust this component's derived selection before children render. A clock tick alone
 // leaves it unchanged; answers, exclusions and queue/deck changes invalidate it.
 if(shown.scope!==scope||shown.id!==word?.id||shown.reps!==word?.card.reps||shown.restoreToken!==restoreToken)setShown({scope,id:word?.id,reps:word?.card.reps,restoreToken});
 return word;
}
