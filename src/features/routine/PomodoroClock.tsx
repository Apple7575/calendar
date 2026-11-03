import React,{useEffect,useState} from 'react';
import {AppState,Pressable,Text,View} from 'react-native';
import Svg,{Circle} from 'react-native-svg';
import {focusTheme} from '../../theme/themes';
export type ClockDesign='A'|'B'|'C';
const palettes={A:{bg:focusTheme.colors.background,text:focusTheme.colors.text,muted:focusTheme.colors.textMuted,accent:focusTheme.colors.primary},B:{bg:'#FFF6E6',text:'#303E32',muted:'#687B68',accent:'#65914C'},C:{bg:'#192754',text:'#F7F9FF',muted:'#B9C8E6',accent:'#A8C4FF'}};
type Props={design:ClockDesign;left:number;total?:number;running:boolean;phase:string;subject:string;onPause:()=>void;onClose:()=>void;onPhoto?:()=>void;onBreak?:()=>void;onSkipBreak?:()=>void;onLeaveNote?:()=>void;onFinish?:()=>void;onAdjust?:(seconds:number)=>void;restOvertime?:number|null;ready?:boolean;requiredMinutes?:number;needsPlan?:boolean};
export function FocusClock({design,left:rawLeft,total:rawTotal=1500,running,phase,subject,onPause,onClose,onPhoto,onBreak,onSkipBreak,onLeaveNote,onFinish,onAdjust,restOvertime=null,ready=false,requiredMinutes=25,needsPlan=false}:Props){
 const idle=phase==='idle',resting=phase==='break',restOver=idle&&restOvertime!==null,left=restOver?-restOvertime!:idle?requiredMinutes*60:rawLeft,total=idle?requiredMinutes*60:rawTotal;
 const pauseLabel=idle?(needsPlan?'계획부터 시작':requiredMinutes+'분 집중 시작'):resting?(running?'휴식 일시정지':'휴식 이어가기'):running?'일시정지':needsPlan?'계획부터 시작':'이어서 공부';
 const [area,setArea]=useState({width:844,height:390}),[revealed,setRevealed]=useState(false),[adjusting,setAdjusting]=useState(false),p=palettes[design],landscape=area.width>area.height;
 useEffect(()=>{if(!revealed)return;const id=setTimeout(()=>setRevealed(false),5000);return()=>clearTimeout(id)},[revealed]);
 useEffect(()=>{const subscription=AppState.addEventListener('change',()=>setRevealed(false));return()=>subscription.remove()},[]);
 const size=Math.max(132,Math.min(landscape?area.height-100:area.width-48,landscape?area.width*.52:320,320)),radius=size/2-7,circumference=2*Math.PI*radius,progress=Math.max(0,Math.min(1,left/Math.max(total,1)));
 const seconds=Math.abs(left),overtime=phase==='focus'&&left<=0,time=(left<0||restOver?'+':'')+String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
 const button=(label:string,fn:()=>void,primary=false,compact=false)=><Pressable accessibilityRole="button" onPress={fn} style={({pressed})=>({minHeight:44,justifyContent:'center',paddingVertical:compact?10:13,paddingHorizontal:compact?13:20,borderRadius:12,backgroundColor:primary?p.accent:'#ffffff0D',borderWidth:1,borderColor:primary?p.accent:'#81909B66',transform:[{scale:pressed?.97:1}]})}><Text style={{color:primary?(design==='B'?'#FFFFFF':'#17251C'):p.text,fontSize:compact?14:17,fontWeight:'700',textAlign:'center'}}>{label}</Text></Pressable>;
 return <View testID="focus-clock" onLayout={e=>setArea(e.nativeEvent.layout)} style={{flex:1,backgroundColor:p.bg,padding:landscape?12:24,gap:landscape?8:10}}>
  <View style={{flexDirection:'row',alignItems:'center',gap:12,justifyContent:'space-between'}}>
   <Text numberOfLines={1} style={{color:p.accent,fontSize:18,fontWeight:'800',flexShrink:0}}>{resting?'휴식 중':restOver?'휴식 끝':idle?'다음 공부 준비':overtime?'추가 공부 중':'집중 시간'}</Text>
   <View style={{flex:1,alignItems:'center'}}>{button(revealed?subject:'과목 보기',()=>setRevealed(v=>!v),false,true)}</View>
   {landscape&&phase==='focus'&&onLeaveNote?button('다음 시작 위치 남기기',onLeaveNote,false,true):null}
   {button('돌아가기',onClose,false,true)}
  </View>
  <View style={{flex:1,flexDirection:landscape?'row':'column',gap:landscape?28:18,alignItems:'center',justifyContent:'center'}}>
   <View style={{flex:landscape?1:undefined,alignItems:'center',justifyContent:'center'}}>
    <View style={{width:size,height:size,justifyContent:'center',alignItems:'center'}}>
     <Svg width={size} height={size} style={{position:'absolute'}} accessible={false}>
      <Circle cx={size/2} cy={size/2} r={radius} stroke={design==='B'?'#DBE5CF':'#ffffff16'} strokeWidth={5} fill="none"/>
      <Circle cx={size/2} cy={size/2} r={radius} stroke={p.accent} strokeWidth={5} fill="none" strokeLinecap="round" strokeDasharray={[circumference,circumference]} strokeDashoffset={circumference*(1-progress)} rotation={-90} originX={size/2} originY={size/2}/>
     </Svg>
     <Text accessibilityRole="timer" accessibilityLabel={(restOver?'휴식 후 지난 시간 ':overtime?'추가 공부 시간 ':'남은 시간 ')+Math.floor(seconds/60)+'분 '+seconds%60+'초'} style={{color:p.text,fontSize:size*(left<0||restOver?.24:.29),fontWeight:design==='A'?'300':'800',fontVariant:['tabular-nums'],letterSpacing:-2}}>{time}</Text>
     <Text style={{color:p.muted,fontSize:13}}>{restOver?'버튼을 누르면 집중을 시작해요':idle?'시작하면 공부 시간이 쌓여요':!running?(resting?'휴식 일시정지':'일시정지 중'):resting?'편하게 쉬어도 좋아요':overtime?'목표 달성 · 공부 시간은 계속 쌓여요':'지금은 이 순간에 집중'}</Text>
    </View>
   </View>
   <View style={{width:landscape?238:'100%',maxWidth:360,gap:landscape?8:12}}>
    {design==='C'?<Text style={{color:p.accent,fontSize:16,fontWeight:'800'}}>{revealed?subject:'지금 할 행동에 집중해요'}</Text>:null}
    {resting&&onSkipBreak?button(needsPlan?'계획 쓰고 다시 공부하기':'쉬는 시간 건너뛰고 공부하기',onSkipBreak,true,true):null}
    {ready&&!resting&&onPhoto?button('필기 사진 제출',onPhoto,true):null}
    {resting&&needsPlan&&onSkipBreak?null:button(pauseLabel,onPause,!resting&&!ready&&(idle||!running),resting||landscape)}
    {restOver&&onFinish?button('이 과목 공부 마치기',onFinish,false,true):null}
    {phase==='focus'&&onBreak?button('휴식 시작 · 5분',onBreak,false,true):null}
    {ready&&resting&&onPhoto?button('필기 사진 제출',onPhoto,false,true):null}
    {!landscape&&phase==='focus'&&onLeaveNote?button('다음 시작 위치 남기기',onLeaveNote,false,true):null}
    {onAdjust&&!idle?<><Pressable accessibilityRole="button" accessibilityLabel="타이머 시간 조정" accessibilityState={{expanded:adjusting}} onPress={()=>setAdjusting(v=>!v)} style={{minHeight:44,justifyContent:'center'}}><Text style={{color:p.muted,fontSize:13,textAlign:'center'}}>시간 조정 {adjusting?'−':'+'}</Text></Pressable>{adjusting?<View style={{gap:8}}><View style={{flexDirection:'row',gap:8,justifyContent:'center'}}>{button('−1분',()=>onAdjust(-60),false,true)}{button('+1분',()=>onAdjust(60),false,true)}{button('−5분',()=>onAdjust(-300),false,true)}{button('+5분',()=>onAdjust(300),false,true)}</View></View>:null}</>:null}
    <Text style={{color:p.muted,fontSize:12,textAlign:'center'}}>{needsPlan?'계획 한 줄부터 +5분':ready?'이번 단계 충족 · 사진 확인하면 +5분':resting?'쉬는 시간은 공부 시간에 포함되지 않아요':'실제 집중 '+requiredMinutes+'분 후 필기 사진 · +5분'}</Text>
   </View>
  </View>
 </View>;
}
