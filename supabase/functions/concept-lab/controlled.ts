export const MODEL='gpt-5.4-mini-2026-03-17';
export const MAX_OUTPUT=3500,MAX_PAYLOAD_BYTES=40000,RESERVATION_MICROS=400000;
export type Strategy='reinforce'|'contrast'|'transfer'|'form'|'recall';
export function generationGoal(strategy:unknown,parent:{ability:string},domain:string){
 switch(strategy){
  case 'reinforce':return {strategy,type:parent.ability==='form'?'transform':'basic',ability:parent.ability};
  case 'contrast':return {strategy,type:'compare',ability:domain==='vocabulary'?'usage':'grammar'};
  case 'transfer':return {strategy,type:domain==='vocabulary'?'cloze':'apply',ability:domain==='vocabulary'?'context':'grammar'};
  case 'form':return {strategy,type:'cloze',ability:'form'};
  case 'recall':return {strategy,type:'basic',ability:parent.ability};
  default:return null;
 }
}
export function usageMicros(usage:unknown):number|null{
 const u=usage as {prompt_tokens?:number;completion_tokens?:number};
 return u&&Number.isInteger(u.prompt_tokens)&&Number.isInteger(u.completion_tokens)&&u.prompt_tokens!>=0&&u.completion_tokens!>=0?Math.ceil(u.prompt_tokens!*.75+u.completion_tokens!*4.5):null;
}
export function selectedReview(raw:unknown,strategy:string){
 const r=raw as Record<string,unknown>;
 return !!r&&['natural','targetCorrect','sameDifficulty','unambiguous','noLeak','notDuplicate','selfContained'].every(key=>r[key]===true)&&(r.contextChanged===true||(strategy==='reinforce'&&r.smallerStep===true));
}
export const compactRules=`The user explicitly selected this goal; produce exactly that type and ability, one objective. This is a mental-recall flashcard, never require typing or a long explanation from the learner. Keep prompt <=400 characters, shortExplanation <=300 characters (use explanation field). Keep essential context and task clear; do not turn it into cryptic keywords. Prefer 2-4 short lines. Separate sensory/report context as optional cue={kind:"seen"|"heard",text:short Korean context}, or cue=null. Do not embed decorative emoji; UI renders the icon. Keep the target Japanese answer a complete natural phrase/sentence where required. For reinforce, use a genuinely smaller sub-step of the same concept; for transfer, change the reasoning context, not just names. No automatic follow-up generation.`;
