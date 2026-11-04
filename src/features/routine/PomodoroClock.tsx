import React,{useEffect,useState} from 'react';
import {AppState,Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {focusTheme,overtimeTheme} from '../../theme/themes';
import {focusClockInverted} from '../../lib/focusFlow';
import {tapLight} from '../../lib/haptics';
import {TimerFace} from './TimerFace';
import {Icon} from './ui';
export type ClockDesign='A'|'B'|'C';
const palettes={A:{bg:focusTheme.colors.background,text:focusTheme.colors.text,muted:focusTheme.colors.textMuted,accent:focusTheme.colors.primary,onAccent:'#17251C',track:'#ffffff16',control:'#ffffff0D',line:'#81909B66'},B:{bg:'#FFF6E6',text:'#303E32',muted:'#687B68',accent:'#65914C',onAccent:'#FFFFFF',track:'#DBE5CF',control:'#ffffff0D',line:'#81909B66'},C:{bg:'#192754',text:'#F7F9FF',muted:'#B9C8E6',accent:'#A8C4FF',onAccent:'#17251C',track:'#ffffff16',control:'#ffffff0D',line:'#81909B66'}};
/** 시간 초과: 검은 시계를 연두 바탕에 뒤집는다. */
const overtimePalette={bg:overtimeTheme.colors.background,text:overtimeTheme.colors.text,muted:overtimeTheme.colors.textMuted,accent:overtimeTheme.colors.primary,onAccent:overtimeTheme.colors.background,track:'#00000022',control:'#00000012',line:overtimeTheme.colors.border};
type Props={design:ClockDesign;left:number;total?:number;running:boolean;phase:string;subject:string;onPause:()=>void;onClose:()=>void;onPhoto?:()=>void;onBreak?:()=>void;onSkipBreak?:()=>void;onLeaveNote?:()=>void;onFinish?:()=>void;onAdjust?:(seconds:number)=>void;restOvertime?:number|null;ready?:boolean;requiredMinutes?:number;needsPlan?:boolean;onRotate?:()=>void;carried?:number;dueMinutes?:number;nextMinutes?:number;onDeclare?:()=>void;quitPenalty?:string;awaitingChoice?:boolean;overtimeFlashDone?:boolean};
export function FocusClock({design,left:rawLeft,total:rawTotal=1500,running,phase,subject,onPause,onClose,onPhoto,onBreak,onSkipBreak,onLeaveNote,onFinish,onAdjust,restOvertime=null,ready=false,requiredMinutes=25,needsPlan=false,onRotate,carried=0,dueMinutes=0,nextMinutes=0,onDeclare,quitPenalty='',awaitingChoice=false,overtimeFlashDone=false}:Props){
 const idle=phase==='idle',resting=phase==='break',restOver=idle&&restOvertime!==null,left=restOver?-restOvertime!:idle?Math.max(0,requiredMinutes*60-(awaitingChoice?carried:0)):rawLeft,total=idle?requiredMinutes*60:rawTotal;
 const pauseLabel=idle?(needsPlan?'계획부터 시작':awaitingChoice?'계속 공부':requiredMinutes+'분 집중 시작'):resting?(running?'휴식 일시정지':'휴식 이어가기'):running?'일시정지':needsPlan?'계획부터 시작':'이어서 공부';
 const [area,setArea]=useState({width:844,height:390}),[revealed,setRevealed]=useState(false),[adjusting,setAdjusting]=useState(false),[confirmQuit,setConfirmQuit]=useState(false),inverted=focusClockInverted(phase,left,restOver?restOvertime:null,overtimeFlashDone),p=inverted?overtimePalette:palettes[design],landscape=area.width>area.height;
 useEffect(()=>{if(!revealed)return;const id=setTimeout(()=>setRevealed(false),5000);return()=>clearTimeout(id)},[revealed]);
 useEffect(()=>{if(!confirmQuit)return;const id=setTimeout(()=>setConfirmQuit(false),5000);return()=>clearTimeout(id)},[confirmQuit]);
 useEffect(()=>{const subscription=AppState.addEventListener('change',()=>setRevealed(false));return()=>subscription.remove()},[]);
 const size=Math.max(132,Math.min(landscape?area.height-100:area.width-48,landscape?area.width*.52:Math.max(180,area.height-(phase==='focus'?500:360)-(adjusting?52:0)),320)),progress=Math.max(0,Math.min(1,left/Math.max(total,1)));
 const playIcon=!idle&&!(needsPlan&&!resting&&!running),playSize=landscape?56:72;
 const seconds=Math.abs(left),overtime=phase==='focus'&&left<=0,time=(left<0||restOver?'+':'')+String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
 const button=(label:string,fn:()=>void,primary=false,compact=false)=><Pressable accessibilityRole="button" onPress={fn} style={({pressed})=>({minHeight:44,justifyContent:'center',paddingVertical:compact?10:13,paddingHorizontal:compact?13:20,borderRadius:12,backgroundColor:primary?p.accent:p.control,borderWidth:1,borderColor:primary?p.accent:p.line,transform:[{scale:pressed?.97:1}]})}><Text style={{color:primary?p.onAccent:p.text,fontSize:compact?14:17,fontWeight:'700',textAlign:'center'}}>{label}</Text></Pressable>;
 /** A penalty needs a second press, so a stray tap cannot cost money. */
 const quit=()=>{if(quitPenalty&&!confirmQuit){setConfirmQuit(true);return;}setConfirmQuit(false);onFinish?.()};
 const quitLabel=confirmQuit?'한 번 더 누르면 마쳐요 · '+quitPenalty:awaitingChoice?'마치기':(restOver?'이 과목 공부 마치기':'공부 마치기')+(quitPenalty?' · '+quitPenalty:'');
 return <View testID="focus-clock" onLayout={e=>setArea(e.nativeEvent.layout)} style={{flex:1,backgroundColor:p.bg,padding:landscape?12:24,gap:landscape?8:10}}>
  <View style={{flexDirection:'row',alignItems:'center',gap:landscape?12:8,justifyContent:'space-between'}}>
   <Text numberOfLines={1} style={{color:p.accent,fontSize:landscape?18:16,fontWeight:'800',flexShrink:0}}>{resting?'휴식 중':restOver?'휴식 끝':awaitingChoice?'이번 단계 끝':idle?'다음 공부 준비':overtime?'추가 공부 중':'집중 시간'}</Text>
   <View style={{flex:1,alignItems:'center'}}>{button(revealed?subject:'과목 보기',()=>setRevealed(v=>!v),false,true)}</View>
   {landscape&&(phase==='focus'||awaitingChoice)&&onLeaveNote?button('다음 시작 위치 남기기',onLeaveNote,false,true):null}
   {button('돌아가기',onClose,false,true)}
   {onRotate?<Pressable accessibilityRole="button" accessibilityLabel={landscape?'세로로 돌리기':'가로로 돌리기'} onPress={onRotate} style={({pressed})=>({width:44,height:44,alignItems:'center',justifyContent:'center',borderRadius:12,backgroundColor:p.control,borderWidth:1,borderColor:p.line,transform:[{scale:pressed?.97:1}]})}><Icon name="reload-outline" size={22} color={p.text}/></Pressable>:null}
  </View>
  <View style={{flex:1,flexDirection:landscape?'row':'column',gap:landscape?28:18,alignItems:'center',justifyContent:'center'}}>
   <View style={{flex:landscape?1:undefined,alignItems:'center',justifyContent:'center'}}>
    <TimerFace size={size} progress={progress} time={time} weight={design==='A'?'300':'800'} fontRatio={left<0||restOver?.24:.29} colors={overtime&&!inverted?{...p,text:p.accent}:p} accessibilityLabel={(restOver?'휴식 후 지난 시간 ':overtime?'추가 공부 시간 ':'남은 시간 ')+Math.floor(seconds/60)+'분 '+seconds%60+'초'} caption={restOver?'버튼을 누르면 집중을 시작해요':awaitingChoice?'다음 단계':idle?'시작하면 공부 시간이 쌓여요':!running?(resting?'휴식 일시정지':'일시정지 중'):resting?'편하게 쉬어도 좋아요':overtime?'목표 달성 · 공부 시간은 계속 쌓여요':'내가 선택한 공부'}/>
   </View>
   <View style={{width:landscape?238:'100%',maxWidth:360,gap:landscape?8:12}}>
    {design==='C'?<Text style={{color:p.accent,fontSize:16,fontWeight:'800'}}>{revealed?subject:'지금 할 행동에 집중해요'}</Text>:null}
    {resting&&onSkipBreak?button(needsPlan?'계획 쓰고 다시 공부하기':'쉬는 시간 건너뛰고 공부하기',onSkipBreak,true,true):null}
    {ready&&!resting&&onPhoto?button('필기 사진 제출',onPhoto,true):null}
    {resting&&needsPlan&&onSkipBreak?null:playIcon?<View style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8}}><Pressable accessibilityRole="button" accessibilityLabel={pauseLabel} onPress={()=>{tapLight();onPause()}} style={({pressed})=>({width:playSize,height:playSize,borderRadius:playSize/2,alignItems:'center',justifyContent:'center',backgroundColor:p.accent,transform:[{scale:pressed?.95:1}]})}><Ionicons name={running?'pause':'play'} size={playSize*.45} color={p.onAccent}/></Pressable>{landscape&&phase==='focus'&&onBreak?<View style={{flex:1}}>{button('휴식 시작 · 5분',onBreak,false,true)}</View>:null}</View>:button(pauseLabel,onPause,!resting&&!ready&&(idle||!running),resting||landscape)}
    {phase==='focus'&&onBreak&&!(landscape&&playIcon)?button('휴식 시작 · 5분',onBreak,false,true):null}
    {ready&&resting&&onPhoto?button('필기 사진 제출',onPhoto,false,true):null}
    {!landscape&&(phase==='focus'||awaitingChoice)&&onLeaveNote?button('다음 시작 위치 남기기',onLeaveNote,false,true):null}
    {phase==='focus'&&onDeclare?button('다 했어요 · 사진으로 끝내기',onDeclare,false,true):null}
    {(!idle||restOver||awaitingChoice)&&onFinish?button(quitLabel,quit,false,true):null}
    {onAdjust&&!idle?<><Pressable accessibilityRole="button" accessibilityLabel="타이머 시간 조정" accessibilityState={{expanded:adjusting}} onPress={()=>setAdjusting(v=>!v)} style={{minHeight:44,justifyContent:'center'}}><Text style={{color:p.muted,fontSize:13,textAlign:'center'}}>시간 조정 {adjusting?'−':'+'}</Text></Pressable>{adjusting?<View style={{gap:8}}><View style={{flexDirection:'row',gap:8,justifyContent:'center'}}>{button('−1분',()=>onAdjust(-60),false,true)}{button('+1분',()=>onAdjust(60),false,true)}{button('−5분',()=>onAdjust(-300),false,true)}{button('+5분',()=>onAdjust(300),false,true)}</View></View>:null}</>:null}
    <Text style={{color:p.muted,fontSize:12,textAlign:'center'}}>{needsPlan?'계획 한 줄부터 시작해요':awaitingChoice?'고를 때까지 시간이 멈춰요 · 마치기 전에는 앱이 잠겨 있어요':ready?'이번 단계 충족 · 사진 확인하면 +'+dueMinutes+'분':resting?'쉬는 시간은 공부 시간에 포함되지 않아요':(phase==='focus'&&carried>0?'지난 공부 '+Math.floor(carried/60)+'분 '+carried%60+'초 이어짐 · ':'실제 집중 ')+requiredMinutes+'분 후 필기 사진 · +'+nextMinutes+'분'}</Text>
   </View>
  </View>
 </View>;
}
