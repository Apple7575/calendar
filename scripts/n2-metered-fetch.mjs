// Meter only this N2 process. Secrets are passed to fetch, never to the ledger or output.
import {reserveRequest,finishRequest,finishTextRequest} from './n2-budget.mjs';
const originalFetch=globalThis.fetch;
function mp3Seconds(bytes){
 let offset=0,duration=0,frames=0;
 if(bytes.subarray(0,3).toString()==='ID3')offset=10+((bytes[6]&127)<<21)+((bytes[7]&127)<<14)+((bytes[8]&127)<<7)+(bytes[9]&127);
 while(offset+4<bytes.length){
  const a=bytes[offset],b=bytes[offset+1],c=bytes[offset+2];
  if(a!==255||(b&224)!==224){offset++;continue;}
  const version=(b>>3)&3,layer=(b>>1)&3,index=(c>>4)&15,sampleIndex=(c>>2)&3;
  if(version===1||layer!==1||!index||index===15||sampleIndex===3){offset++;continue;}
  const rate=[44100,48000,32000][sampleIndex]/(version===3?1:version===2?2:4);
  const kbps=(version===3?[0,32,40,48,56,64,80,96,112,128,160,192,224,256,320]:[0,8,16,24,32,40,48,56,64,80,96,112,128,144,160])[index];
  const size=Math.floor((version===3?144:72)*kbps*1000/rate)+((c>>1)&1);
  if(size<10||offset+size>bytes.length)break;
  duration+=(version===3?1152:576)/rate;frames++;offset+=size;
 }
 if(!frames)throw Error('Cannot meter audio duration; budget reservation retained.');
 return duration;
}
globalThis.fetch=async function(url,options){
 const endpoint=String(url);if(!endpoint.startsWith('https://api.openai.com/v1/'))return originalFetch(url,options);
 const speech=endpoint.endsWith('/audio/speech'),transcribe=endpoint.endsWith('/audio/transcriptions'),audioChat=endpoint.endsWith('/chat/completions');
 const model=typeof options?.body==='string'?JSON.parse(options.body).model:String(options?.body?.get?.('model')??'');
 const full=model.startsWith('gpt-4.1')&&!model.includes('mini'),shortText=full&&JSON.parse(options.body).max_output_tokens<=2000;
 const kind=speech||audioChat?'speech':transcribe?'asr':'text',ticket=reserveRequest(kind,audioChat?.2:speech?.05:transcribe?.01:shortText?.05:full?.12:.04,{endpoint:endpoint.split('/').at(-1)});
 const response=await originalFetch(url,options);
 if(response.ok){
  if(speech){
   const bytes=Buffer.from(await response.clone().arrayBuffer()),seconds=mp3Seconds(bytes),payload=JSON.parse(options.body);
   const inputChars=(payload.input??'').length+(payload.instructions??'').length;
   finishRequest(ticket,(seconds*.015/60+inputChars*.6/1e6)*1.25,{seconds,method:'speech duration estimate plus conservative text allowance and 25% margin'});
  }else{
   const body=await response.clone().json();
   if(audioChat){const u=body.usage,ai=u.prompt_tokens_details?.audio_tokens??0,ao=u.completion_tokens_details?.audio_tokens??0;finishRequest(ticket,(ai*32+ao*64+(u.prompt_tokens-ai)*2.5+(u.completion_tokens-ao)*10)/1e6*1.25,{usage:u,method:'gpt-audio modality token pricing plus 25 percent margin'});}
   else if(transcribe){const u=body.usage,mini=model.includes('mini');const estimate=u?.type==='duration'?(u.seconds??0)*(mini?.003:.006)/60:(u?.input_tokens??0)*(mini?1.25:2.5)/1e6+(u?.output_tokens??0)*(mini?5:10)/1e6;finishRequest(ticket,Math.max(.0001,estimate)*1.25,{usage:u,method:'transcription usage estimate with 25% margin'});}
   else finishTextRequest(ticket,body.usage,model);
  }
 }
 return response;
};
