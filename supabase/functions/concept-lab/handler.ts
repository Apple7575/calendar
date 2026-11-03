import {createClient} from 'npm:@supabase/supabase-js@2.110.1';
import catalog from './catalog.json' with {type:'json'};
import {boundedText,checkGenerated,checkGrade,generationSystem,gradeSystem,reviewSystem} from './protocol.ts';
import {compactRules,generationGoal,MAX_OUTPUT,MAX_PAYLOAD_BYTES,MODEL,selectedReview,usageMicros} from './controlled.ts';
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
type ServerCard=typeof catalog.cards[number] & {bundleId?:string;cue?:unknown};
async function hash(input:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input)))].map(b=>b.toString(16).padStart(2,'0')).join('');}
export async function handler(req:Request){
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='POST')return reply({message:'method_not_allowed'},405);
 const token=req.headers.get('Authorization');if(!token?.startsWith('Bearer '))return reply({message:'login_required'},401);
 const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false}});
 const {data:{user},error}=await client.auth.getUser(token.slice(7));if(error||!user||user.is_anonymous)return reply({message:'login_required'},401);
 const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!serviceKey)return reply({message:'server_not_configured'},503);
 const admin=createClient(Deno.env.get('SUPABASE_URL')!,serviceKey,{auth:{persistSession:false}});
 let requestHash:string|undefined,reserved=false,knownCost=0,unknownUsage=false,modelStarted=false;
 const usageRows:unknown[]=[];
 try{
  const text=await req.text();if(text.length>32000)return reply({message:'request_too_large'},413);
  const body=JSON.parse(text);
  const {data:budget,error:budgetError}=await admin.from('concept_lab_ai_budget').select('limit_micros,enabled,production_micros').eq('id','n3-concept-lab').single();
  if(budgetError)return reply({message:'budget_not_configured'},503);
  if(body.task==='status'){
   const {data:jobs,error:jobError}=await admin.from('concept_lab_jobs').select('charged_micros,reserved_micros,status');if(jobError)throw new Error('budget_read_failed');
   const spent=(jobs??[]).reduce((sum,j)=>sum+(j.charged_micros??j.reserved_micros),budget.production_micros??0);
   return reply({result:{ready:budget.enabled&&!!Deno.env.get('OPENAI_API_KEY'),model:MODEL,limitUSD:budget.limit_micros/1e6,estimatedUsedUSD:spent/1e6,remainingUSD:Math.max(0,budget.limit_micros-spent)/1e6,reservationUSD:.4,billVerified:false}});
  }
  if(body.task==='lookup'){
   if(!boundedText(body.input?.requestId,500))return reply({message:'invalid_request'},400);
   const lookupHash=await hash(JSON.stringify({version:'controlled-v2',user:user.id,model:MODEL,source:catalog.sourceHash,task:'generate',requestId:body.input.requestId}));
   const {data:job,error:lookupError}=await admin.from('concept_lab_jobs').select('status,result').eq('user_id',user.id).eq('request_hash',lookupHash).maybeSingle();
   if(lookupError||!job)return reply({message:'result_not_found'},404);if(job.status!=='complete')return reply({message:job.status},409);return reply({result:job.result,cached:true});
  }
  if(!['grade','generate'].includes(body.task)||!body.input)return reply({message:'invalid_task'},400);
  if(!budget.enabled)return reply({message:'experiment_disabled'},503);
  const apiKey=Deno.env.get('OPENAI_API_KEY');if(!apiKey)return reply({message:'server_not_configured'},503);
  const id=body.task==='grade'?body.input.card?.id:body.input.parent?.id;
  if(!boundedText(id,120))return reply({message:'invalid_card'},400);
  let card=[...catalog.cards,...catalog.variants].find(c=>c.id===id) as ServerCard|undefined;
  if(!card){const {data:rows,error:loadError}=await admin.from('concept_lab_jobs').select('result').eq('user_id',user.id).eq('task','generate').eq('status','complete').contains('result',{id}).limit(1);if(loadError)throw new Error('catalog_lookup_failed');card=rows?.[0]?.result;}
  if(!card||card.status!=='ready')return reply({message:'card_not_ready'},422);
  if(body.task==='grade'&&(['prompt','answer','rubric','explanation'].some(field=>body.input.card[field]!==card![field as keyof ServerCard])||JSON.stringify(body.input.card.accepted)!==JSON.stringify(card.accepted)))return reply({message:'card_revision_requires_self_assessment'},422);
  if(body.task==='generate'&&(!card.conceptId||card.bundleId||card.type==='audio'))return reply({message:'unsupported_target'},422);
  if(body.task==='grade'&&(!boundedText(body.input.answer,2000)||!body.input.answer.trim()))return reply({message:'answer_required'},400);
  const concept=catalog.concepts.find(c=>c.id===card!.conceptId),goal=body.task==='generate'?generationGoal(body.input.strategy,card,concept?.domain??''):null;
  if(body.task==='generate'&&(!goal||!boundedText(body.input.requestId,500)))return reply({message:'select_generation_target_first'},400);
  const daily=body.input.dailyLimit;if(!Number.isInteger(daily)||daily<1||daily>5)return reply({message:'invalid_daily_limit'},400);
  const existing=Array.isArray(body.input.existingPrompts)?body.input.existingPrompts:[];
  if(existing.length>60||existing.some((p:unknown)=>!boundedText(p,1500)))return reply({message:'too_many_existing_prompts'},413);
  const unit=catalog.units.find(u=>u.id===card!.unitId),passage=catalog.bundles.find(b=>b.id===card!.bundleId)?.text??'';
  const input=body.task==='grade'?{card,answer:body.input.answer,passage}:{parent:card,unit,concept,goal,evidence:catalog.extractions.filter(e=>card!.evidenceIds.includes(e.id)),existingPrompts:[...new Set([...existing,...[...catalog.cards,...catalog.variants].filter(c=>c.conceptId===card!.conceptId).map(c=>c.prompt)])],errorSummary:typeof body.input.reason==='string'?body.input.reason.slice(0,500):''};
  requestHash=await hash(JSON.stringify({version:'controlled-v2',user:user.id,model:MODEL,source:catalog.sourceHash,task:body.task,requestId:body.input.requestId??JSON.stringify(input)}));
  const {data:reservation,error:reserveError}=await admin.rpc('reserve_controlled_concept_job',{p_user:user.id,p_hash:requestHash,p_task:body.task,p_daily:daily});
  if(reserveError)throw new Error('reservation_failed');if(reservation.cached)return reply({result:reservation.result,cached:true});if(reservation.blocked)return reply({message:reservation.reason},429);reserved=true;
  async function infer(system:string,data:unknown){
   const content=JSON.stringify(data);if(new TextEncoder().encode(system+content).length>MAX_PAYLOAD_BYTES)throw new Error('model_input_too_large');
   modelStarted=true;const unknownBefore=unknownUsage;unknownUsage=true;
   const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',signal:AbortSignal.timeout(60000),headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:MODEL,store:false,max_completion_tokens:MAX_OUTPUT,reasoning_effort:'low',response_format:{type:'json_object'},messages:[{role:'system',content:system},{role:'user',content}]})});
   const output=await response.json(),cost=usageMicros(output.usage);usageRows.push(output.usage??null);if(cost!==null){unknownUsage=unknownBefore;knownCost+=cost;}
   if(!response.ok)throw new Error('model_request_failed');if(output.choices?.[0]?.finish_reason!=='stop')throw new Error('truncated_output');return JSON.parse(output.choices[0].message.content);
  }
  let result:unknown;
  if(body.task==='grade'){const grade=await infer(gradeSystem,input);if(!checkGrade(grade))throw new Error('invalid_grade');result={...grade,model:MODEL,rubricVersion:'controlled-v2'};}
  else{
   const draft=await infer(generationSystem+'\n'+compactRules,input);
   if(!checkGenerated(draft,card)||draft.type!==goal!.type||draft.ability!==goal!.ability||String(draft.prompt).length>400||String(draft.explanation).length>300)throw new Error('invalid_draft');
   if('existingPrompts' in input&&input.existingPrompts?.some(p=>p.normalize('NFKC').replace(/\s/g,'')===String(draft.prompt).normalize('NFKC').replace(/\s/g,'')))throw new Error('duplicate_draft');
   const cue=draft.cue as {kind?:string;text?:string}|undefined|null;
   if(cue&&(!['seen','heard'].includes(cue.kind??'')||!boundedText(cue.text,100)))throw new Error('invalid_cue');
   const review=await infer(reviewSystem+' For reinforce, also return smallerStep=true only if the same target is validly decomposed into a smaller recall step.',{...input,proposed:draft});
   if(!selectedReview(review,goal!.strategy))throw new Error('validation_rejected');
   result={type:draft.type,ability:draft.ability,prompt:draft.prompt,answer:draft.answer,accepted:draft.accepted,rubric:draft.rubric,explanation:draft.explanation,hint:draft.hint,assessment:draft.assessment,...(cue?{cue}:{}),id:`lab_ai_${requestHash.slice(0,24)}`,unitId:card.unitId,conceptId:card.conceptId,parentId:card.id,evidenceIds:card.evidenceIds,origin:'ai',novel:true,difficulty:'N3',status:'ready',quality:{natural:true,unambiguous:true,level:true,grounded:true,reviewer:`independent_call:${MODEL}:controlled-v2`}};
  }
  const charged=unknownUsage?null:knownCost;
  const {error:saveError}=await admin.from('concept_lab_jobs').update({status:'complete',result,charged_micros:charged,usage:usageRows,updated_at:new Date().toISOString()}).eq('user_id',user.id).eq('request_hash',requestHash);
  if(saveError)throw new Error('result_save_failed');return reply({result,cached:false,estimatedCostUSD:charged===null?null:charged/1e6});
 }catch{
  if(requestHash&&reserved)await admin.from('concept_lab_jobs').update({status:'failed',charged_micros:!modelStarted?0:unknownUsage?null:knownCost,usage:usageRows,updated_at:new Date().toISOString()}).eq('user_id',user.id).eq('request_hash',requestHash).eq('status','running');
  return reply({message:'generation_failed_existing_history_preserved'},502);
 }
}
