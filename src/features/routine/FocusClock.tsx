import React,{useState} from 'react';
import {Pressable,ScrollView,Text,useWindowDimensions,View} from 'react-native';
import {FocusClock,ClockDesign} from './PomodoroClock';
export {FocusClock} from './PomodoroClock';
export function FocusDesignGallery(){
 const [design,setDesign]=useState<ClockDesign>('A'),[left,setLeft]=useState(1500),[running,setRunning]=useState(false);
 React.useEffect(()=>{if(!running)return;const id=setInterval(()=>setLeft(n=>Math.max(0,n-1)),1000);return()=>clearInterval(id)},[running]);
 return <View style={{flex:1,backgroundColor:'#EDF0F4'}}><ScrollView horizontal style={{flexGrow:0}} contentContainerStyle={{padding:14,gap:10,alignItems:'center'}}><Text style={{fontSize:16,fontWeight:'800'}}>타이머 디자인 후보 · 기록되지 않는 체험</Text>{(['A','B','C'] as const).map((id,i)=><Pressable accessibilityRole="button" accessibilityState={{selected:design===id}} key={id} onPress={()=>setDesign(id)} style={{padding:13,borderRadius:12,backgroundColor:design===id?'#254B93':'#FFFFFF'}}><Text style={{color:design===id?'white':'#25314A',fontWeight:'700'}}>{id} · {['조용한 시계','원형 타이머','행동 중심'][i]}</Text></Pressable>)}<Pressable accessibilityRole="button" onPress={()=>{setLeft(1500);setRunning(false)}}><Text>초기화</Text></Pressable></ScrollView><FocusClock design={design} left={left} running={running} phase="focus" subject="전기기사 · 기출 3~5번 풀기" onAdjust={seconds=>setLeft(n=>Math.max(1,n+seconds))} onPause={()=>setRunning(v=>!v)} onClose={()=>{if(typeof window!=='undefined')window.location.href='/'}}/><Text style={{padding:12,textAlign:'center'}}>가로 창으로 확인해 주세요. A·B·C를 눌러 비교하고 일시정지도 체험할 수 있어요.</Text></View>;
}
