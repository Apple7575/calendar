/**
 * Listening for longer than Apple allows. SFSpeechRecognizer stops any task after about a minute, so a three-minute
 * answer runs as several tasks. This starts the next one when one ends and joins what they heard.
 */
const join=(a:string,b:string)=>a+(a&&b?' ':'')+b;
export function liveTranscript(){
 let kept='',partial='';
 return {
  heard(text:string,isFinal:boolean){if(isFinal){kept=join(kept,text);partial=''}else partial=text},
  /** A task ended. What it was still unsure of is all there will ever be of those words. */
  cut(){kept=join(kept,partial);partial=''},
  text:()=>join(kept,partial).trim(),
 };
}

const RESTART_MS=300,STOP_WAIT_MS=800,EMPTY_RESTARTS=3;
const FATAL=new Set(['not-allowed','service-not-allowed','language-not-supported']);
type Listener={remove?:()=>void};
export type ContinuousOptions={start:()=>void;stop:()=>void;on:(name:string,fn:(event:any)=>void)=>Listener;onText:(text:string)=>void;onStopped:(reason:'denied'|'silent'|'failed')=>void};
export function continuousListen({start,stop,on,onText,onStopped}:ContinuousOptions){
 const transcript=liveTranscript();
 let stopping=false,finished=false,fatal=false,empty=0,restart:ReturnType<typeof setTimeout>|undefined,release:(()=>void)|undefined;
 const finish=()=>{if(finished)return;finished=true;if(restart)clearTimeout(restart);listeners.forEach(l=>l?.remove?.());release?.()};
 const give=(reason:'denied'|'silent'|'failed')=>{finish();onStopped(reason)};
 const listeners=[
  on('result',e=>{
   const text:string=e?.results?.map((r:{transcript?:string})=>r?.transcript??'').join('')??'';
   if(text)empty=0;
   transcript.heard(text,!!e?.isFinal);
   if(!stopping)onText(transcript.text());
  }),
  on('error',e=>{if(FATAL.has(e?.error))fatal=true}),
  on('end',()=>{
   transcript.cut();
   if(stopping){finish();return}
   if(fatal){give('denied');return}
   empty+=1;
   if(empty>EMPTY_RESTARTS){give('silent');return}
   restart=setTimeout(()=>{try{start()}catch{give('failed')}},RESTART_MS);
  }),
 ];
 start();
 return {
  text:transcript.text,
  /** Waits briefly for the last final result, since iOS only firms up the words after stopping. */
  stop():Promise<string>{
   if(restart)clearTimeout(restart);
   if(finished)return Promise.resolve(transcript.text());
   stopping=true;
   try{stop()}catch{}
   return new Promise(resolve=>{
    const wait=setTimeout(()=>{transcript.cut();finish()},STOP_WAIT_MS);
    release=()=>{clearTimeout(wait);resolve(transcript.text())};
   });
  },
 };
}
