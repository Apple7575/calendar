import React,{useEffect,useRef,useState} from 'react';
import { Pressable,Text,View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
type Recognition={lang:string;continuous:boolean;interimResults:boolean;start:()=>void;stop:()=>void;abort:()=>void;onresult:((e:{results:ArrayLike<{isFinal:boolean;0:{transcript:string}}>;resultIndex:number})=>void)|null;onend:(()=>void)|null;onerror:((e:{error:string})=>void)|null};
type Props={onText:(text:string)=>void;onPartial?:(text:string)=>void;onListeningChange?:(value:boolean)=>void;size?:number};
export function MicButton({onText,onPartial,onListeningChange,size=40}:Props){
 const {colors:c}=useTheme(),[listening,setListening]=useState(false),[error,setError]=useState('');
 const current=useRef<Recognition|null>(null),text=useRef('');const callbacks=useRef({onText,onPartial,onListeningChange});callbacks.current={onText,onPartial,onListeningChange};
 useEffect(()=>()=>{if(current.current){current.current.onend=null;current.current.abort();}},[]);
 const toggle=()=>{
  if(current.current){current.current.stop();return;}
  const w=window as unknown as {SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};const Constructor=w.SpeechRecognition??w.webkitSpeechRecognition;
  if(!Constructor){setError('이 브라우저는 음성 입력을 지원하지 않아요. 글로 입력해 주세요.');return;}
  const r=new Constructor();r.lang='ko-KR';r.continuous=true;r.interimResults=true;text.current='';setError('');
  r.onresult=e=>{let value='';for(let i=0;i<e.results.length;i++)value+=e.results[i][0].transcript;text.current=value;callbacks.current.onPartial?.(value);};
  r.onend=()=>{current.current=null;setListening(false);callbacks.current.onListeningChange?.(false);if(text.current.trim())callbacks.current.onText(text.current.trim());};
  r.onerror=e=>setError(`음성 입력을 확인해 주세요: ${e.error}`);
  try{current.current=r;r.start();setListening(true);callbacks.current.onListeningChange?.(true);}catch{current.current=null;setError('음성 입력을 시작하지 못했어요.');}
 };
 return <View style={{gap:4}}><Pressable accessibilityRole="button" accessibilityLabel={listening?'녹음 끝내기':'음성으로 입력'} onPress={toggle} style={{width:size,height:size,borderRadius:size/2,backgroundColor:c.primarySoft,alignItems:'center',justifyContent:'center'}}><Text style={{color:c.primary,fontSize:20}}>{listening?'■':'🎙'}</Text></Pressable>{error?<Text style={{color:c.textMuted,fontSize:12}}>{error}</Text>:null}</View>;
}
