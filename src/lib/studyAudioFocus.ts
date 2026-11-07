// Vocabulary and celebration sounds share one foreground audio lane.
const listeners=new Map<symbol,()=>Promise<void>>();
// Who is sounding right now (a word or sentence loading or playing). Celebration sounds wait their turn: they skip while it is held.
const holders=new Set<symbol>();
export function registerStudyAudio(owner:symbol,stop:()=>Promise<void>){
  listeners.set(owner,stop);
  return ()=>{if(listeners.get(owner)===stop)listeners.delete(owner);};
}
export async function claimStudyAudio(owner:symbol){
  const others=[...listeners].filter(([id])=>id!==owner);
  await Promise.all(others.map(([,stop])=>stop().catch(()=>{})));
  for(const id of holders)if(id!==owner)holders.delete(id);
}
/** Marks the lane as in use until the returned release is called. */
export function holdStudyAudio(owner:symbol){
  holders.add(owner);
  return ()=>{holders.delete(owner);};
}
export const studyAudioBusy=()=>holders.size>0;
