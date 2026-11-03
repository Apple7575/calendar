import {handler} from './handler.ts';
import {generationGoal,selectedReview,usageMicros} from './controlled.ts';
function assert(value:unknown,message='assertion failed'){if(!value)throw new Error(message);}
Deno.env.set('SUPABASE_URL','https://example.invalid');Deno.env.set('SUPABASE_ANON_KEY','test-public');Deno.env.set('SUPABASE_SERVICE_ROLE_KEY','test-private');Deno.env.set('OPENAI_API_KEY','test-model-key');
const user={id:'00000000-0000-4000-8000-000000000001',is_anonymous:false,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-11-03T00:00:00Z'};
const goodDraft={type:'cloze',ability:'form',prompt:'안내방송: 다음 버스는 10분 후 도착\n친구에게 전달: バスは十分後に（　）。\n来る → 보통체',answer:'来るそうだ',accepted:['来るそうだ','くるそうだ'],rubric:'들은 도착 정보를 보통형+そうだ로 전달',explanation:'들은 정보 → 전달\n来る + そうだ',hint:'ます형 어간이 아니라 보통형을 써요.',assessment:'exact',cue:{kind:'heard',text:'안내방송에서 들은 도착 정보'}};
const goodReview={natural:true,targetCorrect:true,sameDifficulty:true,unambiguous:true,noLeak:true,notDuplicate:true,contextChanged:true,selfContained:true};
function request(body:unknown,auth=true){return new Request('http://localhost/concept-lab',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer mock-token'}:{})},body:JSON.stringify(body)});}
async function mocked(run:(context:{calls:string[];patches:Record<string,unknown>[]})=>Promise<void>,options:{rejectReview?:boolean;timeout?:boolean;cached?:boolean;budgetBlocked?:boolean;productionMicros?:number}={}){
 const original=globalThis.fetch,calls:string[]=[],patches:Record<string,unknown>[]=[];let inference=0;
 globalThis.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=String(input),method=init?.method??'GET';calls.push(`${method}:${url}`);
  if(url.includes('/auth/v1/user'))return Response.json(user);
  if(url.includes('/concept_lab_ai_budget'))return Response.json({limit_micros:5000000,enabled:true,production_micros:options.productionMicros??0});
  if(url.includes('/rpc/reserve_controlled_concept_job'))return Response.json(options.budgetBlocked?{blocked:true,reason:'budget_limit'}:options.cached?{cached:true,result:{id:'lab_cached'}}:{cached:false});
  if(url.includes('/concept_lab_jobs')&&method==='PATCH'){patches.push(JSON.parse(String(init?.body)));return new Response(null,{status:204});}
  if(url.includes('/concept_lab_jobs'))return Response.json([]);
  if(url.includes('api.openai.com')){
   if(options.timeout)throw new Error('network response lost');inference++;
   const output=inference===1?goodDraft:{...goodReview,...(options.rejectReview?{unambiguous:false}:{})};
   return Response.json({usage:{prompt_tokens:1000,completion_tokens:500},choices:[{finish_reason:'stop',message:{content:JSON.stringify(output)}}]});
  }
  throw new Error(`unexpected request ${url}`);
 };
 try{await run({calls,patches});}finally{globalThis.fetch=original;}
}
const input={parent:{id:'lab_sou_form'},strategy:'form',requestId:'explicit-selection-1',dailyLimit:2,reason:'접속·활용에서 다시 평가',existingPrompts:[]};
Deno.test('no authentication and no selected strategy never call the model',async()=>{
 await mocked(async({calls})=>{assert((await handler(request({task:'generate',input},false))).status===401);assert(calls.length===0);
  assert((await handler(request({task:'generate',input:{...input,strategy:undefined}}))).status===400);assert(!calls.some(c=>c.includes('api.openai.com')));});
});
Deno.test('status reads budget only; cache and budget limit do not call the model',async()=>{
 await mocked(async({calls})=>{const response=await handler(request({task:'status',input:{}}));assert(response.status===200);assert((await response.json()).result.limitUSD===5);assert(!calls.some(c=>c.includes('api.openai.com')));});
 await mocked(async({calls})=>{assert((await handler(request({task:'generate',input}))).status===200);assert(!calls.some(c=>c.includes('api.openai.com')));},{cached:true});
 await mocked(async({calls})=>{assert((await handler(request({task:'generate',input}))).status===429);assert(!calls.some(c=>c.includes('api.openai.com')));},{budgetBlocked:true});
});
Deno.test('offline speech/review reservations share the same status budget',async()=>{
 await mocked(async({calls})=>{const result=(await(await handler(request({task:'status',input:{}}))).json()).result;assert(result.limitUSD===5);assert(result.estimatedUsedUSD===.11615);assert(result.remainingUSD===4.88385);assert(!calls.some(c=>c.includes('api.openai.com')));},{productionMicros:116150});
});
Deno.test('selected generation makes separate generation/review calls, charges usage and returns linked card',async()=>{
 await mocked(async({calls,patches})=>{const response=await handler(request({task:'generate',input})),json=await response.json();assert(response.status===200,JSON.stringify(json));assert(json.result.parentId==='lab_sou_form');assert(json.result.conceptId==='concept-sou');assert(json.result.type==='cloze');assert(calls.filter(c=>c.includes('api.openai.com')).length===2);assert(patches[0].status==='complete');assert(patches[0].charged_micros===6000);});
});
Deno.test('failed review never returns a learnable card and still accounts for usage',async()=>{
 await mocked(async({patches})=>{const response=await handler(request({task:'generate',input}));assert(response.status===502);assert(!(await response.json()).result);assert(patches[0].status==='failed');assert(patches[0].charged_micros===6000);},{rejectReview:true});
});
Deno.test('unknown network outcome keeps the full reservation instead of refunding uncertain charges',async()=>{
 await mocked(async({patches})=>{assert((await handler(request({task:'generate',input}))).status===502);assert(patches[0].charged_micros===null);},{timeout:true});
});
Deno.test('goal and review gates preserve the selected objective and only permit valid smaller steps',()=>{
 assert(generationGoal('form',{ability:'grammar'},'grammar')?.type==='cloze');assert(generationGoal('listening',{ability:'reading'},'vocabulary')===null);
 assert(selectedReview({...goodReview,contextChanged:false,smallerStep:true},'reinforce'));assert(!selectedReview({...goodReview,contextChanged:false},'transfer'));assert(usageMicros({prompt_tokens:1000,completion_tokens:500})===3000);
});
