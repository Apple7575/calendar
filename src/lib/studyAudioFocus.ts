// Vocabulary and celebration sounds share one foreground audio lane.
const listeners=new Map<symbol,()=>Promise<void>>();
export function registerStudyAudio(owner:symbol,stop:()=>Promise<void>){
  listeners.set(owner,stop);
  return ()=>{if(listeners.get(owner)===stop)listeners.delete(owner);};
}
export async function claimStudyAudio(owner:symbol){
  await Promise.all([...listeners].filter(([id])=>id!==owner).map(([,stop])=>stop().catch(()=>{})));
}
