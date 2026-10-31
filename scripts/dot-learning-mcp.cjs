// Local stdio MCP. Credentials are encrypted with Windows DPAPI and never sent to the model.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),readline=require('node:readline'),{execFileSync}=require('node:child_process');
const {createClient}=require('@supabase/supabase-js');
const ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,f);
const {validateLearningSummary}=require('../src/lib/learningSummary.ts');
const root=path.resolve(__dirname,'..'),credentials=path.join(root,'.expo/dot-learning-session.dpapi');
const config=JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8')).expo.extra;
function protect(value,decode=false){
 if(process.platform!=='win32')throw Error('이 연결 도구는 Windows DPAPI를 사용해요.');
 const command=decode?"$v=ConvertTo-SecureString ([Console]::In.ReadToEnd());$p=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($v);try{[Runtime.InteropServices.Marshal]::PtrToStringBSTR($p)}finally{[Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p)}":"$v=ConvertTo-SecureString ([Console]::In.ReadToEnd()) -AsPlainText -Force;ConvertFrom-SecureString $v";
 return execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{input:value,encoding:'utf8',windowsHide:true,stdio:['pipe','pipe','pipe']}).trim();
}
const client=()=>createClient(config.supabaseUrl,config.supabaseAnonKey,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(10000)})}});
function store(session){fs.mkdirSync(path.dirname(credentials),{recursive:true});fs.writeFileSync(credentials,protect(JSON.stringify({access_token:session.access_token,refresh_token:session.refresh_token})),{mode:0o600});}
async function sessionClient(tokens){const api=client();const {data,error}=await api.auth.setSession(tokens);if(error||!data.session)throw Object.assign(Error('로그인 연결을 확인하지 못했어요.'),{stage:error?.name==='AuthRetryableFetchError'?'network':'auth'});const result=await api.auth.getUser();if(result.error||!result.data.user)throw Object.assign(Error('로그인한 사용자를 확인하지 못했어요.'),{stage:result.error?.name==='AuthRetryableFetchError'?'network':'auth'});try{store(data.session)}catch{throw Object.assign(Error('Windows 암호화 저장을 확인하지 못했어요.'),{stage:'storage'})}return {api,user:result.data.user};}
async function upload(input){
 const summary=validateLearningSummary(input);
 if(!fs.existsSync(credentials))throw Error('먼저 PC 덱 관리 화면에서 Dot 연결 정보를 저장해 주세요.');
 const tokens=JSON.parse(protect(fs.readFileSync(credentials,'utf8'),true));const {api,user}=await sessionClient(tokens);
 const storage=api.storage.from('diary-photos'),file=`${user.id}/learning-inbox/${summary.eventId}--${String(summary.revision).padStart(8,'0')}.json`,body=JSON.stringify(summary);
 const {error}=await storage.upload(file,body,{contentType:'application/json',upsert:false});
 if(error){if(String(error.statusCode)==='409'||/already exists/i.test(error.message)){const {data,error:readError}=await storage.download(file);if(readError||!data)throw Error('기존 요약을 확인하지 못했어요.');if(JSON.stringify(validateLearningSummary(JSON.parse(await data.text())))!==body)throw Error('같은 버전의 내용이 달라요. revision을 올려 보내 주세요.');return {saved:true,duplicate:true,eventId:summary.eventId,revision:summary.revision};}throw Error(`요약 저장 실패: ${error.message}`);}
 return {saved:true,duplicate:false,eventId:summary.eventId,revision:summary.revision,date:summary.date};
}
const inputSchema={type:'object',additionalProperties:false,required:['schema','eventId','revision','date','title','summary','topics','questions','nextAction','sourceUrl'],properties:{schema:{type:'string',const:'routine.learning-summary.v1'},eventId:{type:'string',pattern:'^[a-zA-Z0-9_-]{1,100}$',description:'Stable source event ID. Reuse it for retries; use a new revision for changes.'},revision:{type:'integer',minimum:1,maximum:99999999},date:{type:'string',pattern:'^[0-9]{4}-[0-9]{2}-[0-9]{2}$',description:'Date the summary belongs to in Asia/Seoul. Do not infer study time.'},title:{type:'string',maxLength:200},summary:{type:'string',maxLength:12000},topics:{type:'array',items:{type:'string'},maxItems:30},questions:{type:'array',items:{type:'string'},maxItems:30},nextAction:{type:'string',maxLength:2000},sourceUrl:{type:'string',description:'HTTPS source conversation link, or empty if unavailable. Never invent a link.'}}};
async function rpc(request){
 if(request.method==='initialize')return {protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'routine-learning',version:'1.0.0'}};
 if(request.method==='ping')return {};
 if(request.method==='tools/list')return {tools:[{name:'save_learning_summary',description:'Save an already prepared study summary to the authenticated owner\'s private routine app. Does not edit the personal diary body, create rewards, or read other chats. Requires an explicitly sourced date and stable event ID.',inputSchema,annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:true,openWorldHint:true}}]};
 if(request.method==='tools/call'&&request.params?.name==='save_learning_summary'){
  try{return {content:[{type:'text',text:JSON.stringify(await upload(request.params.arguments))}],isError:false};}
  catch(e){return {content:[{type:'text',text:e.message}],isError:true};}
 }
 throw Error('Unsupported method');
}
if(process.argv.includes('--inventory')){
 (async()=>{const {api}=await sessionClient(JSON.parse(protect(fs.readFileSync(credentials,'utf8'),true)));const counts={};
  for(const table of ['diaries','diary_photos','events','tasks','routines','routine_checks','workout_records','meals','daily_logs','vocab','expressions']){
    const {count,error}=await api.from(table).select('id',{count:'exact',head:true});counts[table]=error?{available:false,code:error.code}:count;
  }process.stdout.write(JSON.stringify(counts)+'\n');
 })().catch(()=>{process.stderr.write('계정별 기록 수를 확인하지 못했어요.\n');process.exitCode=1;});
}else if(process.argv.includes('--verify')){
 (async()=>{
  if(!fs.existsSync(credentials))throw Error('연결 정보가 없어요.');
  const {api,user}=await sessionClient(JSON.parse(protect(fs.readFileSync(credentials,'utf8'),true)));
  const storage=api.storage.from('diary-photos'),eventId=`connection-test-${Date.now()}`;
  const summary={schema:'routine.learning-summary.v1',eventId,revision:1,date:new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'}),title:'연결 검사 · 학습 기록 아님',summary:'비공개 저장소 연결을 검사하는 임시 데이터입니다.',topics:[],questions:[],nextAction:'',sourceUrl:''};
  const file=`${user.id}/learning-inbox/${eventId}--00000001.json`;
  try{
   const first=await upload(summary),second=await upload(summary);
   const {data,error}=await storage.download(file);if(error||!data||JSON.stringify(validateLearningSummary(JSON.parse(await data.text())))!==JSON.stringify(summary))throw Error('저장 후 내용 검증에 실패했어요.');
   process.stdout.write(JSON.stringify({authenticated:true,writeReadVerified:true,retryDeduplicated:!first.duplicate&&second.duplicate})+'\n');
  }finally{const {error}=await storage.remove([file]);process.stdout.write(JSON.stringify({testDataRemoved:!error})+'\n');}
 })().catch(e=>{process.stderr.write(e.message+'\n');process.exitCode=1;});
}else if(process.argv.includes('--pair')){
 const origins=new Set(['http://localhost:8082','http://127.0.0.1:8082']);
 http.createServer(async(req,res)=>{
  const origin=req.headers.origin;if(!origin||!origins.has(origin)){res.writeHead(403);return res.end();}
  res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Access-Control-Allow-Private-Network','true');res.setHeader('Content-Type','application/json');
  if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
  if(req.method==='GET'&&req.url==='/status')return res.end(JSON.stringify({ready:fs.existsSync(credentials)}));
  if(req.method!=='POST'||req.url!=='/pair'||!req.headers['content-type']?.startsWith('application/json')){res.writeHead(404);return res.end('{}');}
  try{
   let body='';for await(const chunk of req){body+=chunk;if(body.length>24000)throw Error('Request too large');}
   const tokens=JSON.parse(body);if(typeof tokens.access_token!=='string'||typeof tokens.refresh_token!=='string')throw Error('로그인 정보가 없어요.');
   await sessionClient(tokens);res.end(JSON.stringify({ok:true}));
  }catch(e){res.writeHead(e.stage==='network'?503:400);res.end(JSON.stringify({stage:e.stage??'request',error:e.stage==='network'?'PC 연결 도구가 서버에 접근하지 못했어요. 네트워크 연결을 확인해 주세요.':e.stage==='storage'?'Windows 암호화 저장에 실패했어요. PC 연결 도구의 실행 권한을 확인해 주세요.':'로그인 연결을 확인하지 못했어요. 같은 계정으로 다시 로그인해 주세요.'}));}
 }).listen(8766,'127.0.0.1',()=>process.stderr.write('Routine Dot pairing is listening on loopback port 8766. No credentials are logged.\n'));
}else if(require.main===module){
 let queue=Promise.resolve();readline.createInterface({input:process.stdin,crlfDelay:Infinity}).on('line',line=>{queue=queue.then(async()=>{let request;try{request=JSON.parse(line);if(request.id===undefined)return;const result=await rpc(request);process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:request.id,result})+'\n');}catch(e){process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:request?.id??null,error:{code:-32603,message:e.message}})+'\n');}});});
}
module.exports={rpc,sessionClient,loadTokens:()=>JSON.parse(protect(fs.readFileSync(credentials,'utf8'),true))};
