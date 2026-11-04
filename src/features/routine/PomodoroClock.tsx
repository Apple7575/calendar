import React,{useEffect,useState} from 'react';
import {AppState,Pressable,Text,View} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {focusTheme,overtimeTheme} from '../../theme/themes';
import {focusClockInverted} from '../../lib/focusFlow';
import {tapLight} from '../../lib/haptics';
import {ActionPanel,PanelButton} from './ActionPanel';
import {TimerFace} from './TimerFace';
import {Icon} from './ui';
import {control,gutter,space,type} from '../../theme/tokens';
export type ClockDesign='A'|'B'|'C';
/** 수달 그림에서 머리 꼭대기와 턱의 위치(그림 크기 대비). 머리는 안내 문구 아래, 턱은 버튼 묶음 위에 둔다. */
const CROWN=.34,CHIN=.64,NOTE_HEIGHT=20,PANEL_CLEARANCE=172;
const palettes={A:{bg:focusTheme.colors.background,text:focusTheme.colors.text,muted:focusTheme.colors.textMuted,accent:focusTheme.colors.primary,onAccent:'#17251C',track:'#ffffff16',control:'#ffffff0D',line:'#81909B66',panel:'rgba(22,22,22,0.9)',cell:focusTheme.colors.border},B:{bg:'#FFF6E6',text:'#303E32',muted:'#687B68',accent:'#65914C',onAccent:'#FFFFFF',track:'#DBE5CF',control:'#ffffff0D',line:'#81909B66',panel:'rgba(255,246,230,0.9)',cell:'#DBE5CF'},C:{bg:'#192754',text:'#F7F9FF',muted:'#B9C8E6',accent:'#A8C4FF',onAccent:'#17251C',track:'#ffffff16',control:'#ffffff0D',line:'#81909B66',panel:'rgba(25,39,84,0.9)',cell:'#2A3B75'}};
/** 시간 초과: 검은 시계를 연두 바탕에 뒤집는다. */
const overtimePalette={bg:overtimeTheme.colors.background,text:overtimeTheme.colors.text,muted:overtimeTheme.colors.textMuted,accent:overtimeTheme.colors.primary,onAccent:overtimeTheme.colors.background,track:'#00000022',control:'#00000012',line:overtimeTheme.colors.border,panel:'rgba(214,242,168,0.9)',cell:overtimeTheme.colors.primarySoft};
type Props={design:ClockDesign;left:number;total?:number;running:boolean;phase:string;subject:string;onPause:()=>void;onClose:()=>void;onPhoto?:()=>void;onBreak?:()=>void;onSkipBreak?:()=>void;onLeaveNote?:()=>void;onFinish?:()=>void;onAdjust?:(seconds:number)=>void;restOvertime?:number|null;ready?:boolean;requiredMinutes?:number;needsPlan?:boolean;onRotate?:()=>void;carried?:number;dueMinutes?:number;nextMinutes?:number;onDeclare?:()=>void;quitPenalty?:string;awaitingChoice?:boolean;overtimeFlashDone?:boolean;character?:(size:number)=>React.ReactNode};
export function FocusClock({design,left:rawLeft,total:rawTotal=1500,running,phase,subject,onPause,onClose,onPhoto,onBreak,onSkipBreak,onLeaveNote,onFinish,onAdjust,restOvertime=null,ready=false,requiredMinutes=25,needsPlan=false,onRotate,carried=0,dueMinutes=0,nextMinutes=0,onDeclare,quitPenalty='',awaitingChoice=false,overtimeFlashDone=false,character}:Props){
 const idle=phase==='idle',resting=phase==='break',restOver=idle&&restOvertime!==null,left=restOver?-restOvertime!:idle?Math.max(0,requiredMinutes*60-(awaitingChoice?carried:0)):rawLeft,total=idle?requiredMinutes*60:rawTotal;
 const pauseLabel=idle?(needsPlan?'계획부터 시작':awaitingChoice?'계속 공부':requiredMinutes+'분 집중 시작'):resting?(running?'휴식 일시정지':'휴식 이어가기'):running?'일시정지':needsPlan?'계획부터 시작':'이어서 공부';
 const [area,setArea]=useState({width:844,height:390}),[revealed,setRevealed]=useState(false),[adjusting,setAdjusting]=useState(false),[confirmQuit,setConfirmQuit]=useState(false),inverted=focusClockInverted(phase,left,restOver?restOvertime:null,overtimeFlashDone),p=inverted?overtimePalette:palettes[design],landscape=area.width>area.height;
 useEffect(()=>{if(!revealed)return;const id=setTimeout(()=>setRevealed(false),5000);return()=>clearTimeout(id)},[revealed]);
 useEffect(()=>{if(!confirmQuit)return;const id=setTimeout(()=>setConfirmQuit(false),5000);return()=>clearTimeout(id)},[confirmQuit]);
 useEffect(()=>{const subscription=AppState.addEventListener('change',()=>setRevealed(false));return()=>subscription.remove()},[]);
 const half=area.width/2,size=Math.max(132,landscape?Math.min(290,area.height-80):Math.min(290,area.width-48)),progress=Math.max(0,Math.min(1,left/Math.max(total,1)));
 const playIcon=!idle&&!(needsPlan&&!resting&&!running);
 const seconds=Math.abs(left),overtime=phase==='focus'&&left<=0,time=(left<0||restOver?'+':'')+String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
 /** A penalty needs a second press, so a stray tap cannot cost money. */
 const quit=()=>{if(quitPenalty&&!confirmQuit){setConfirmQuit(true);return;}setConfirmQuit(false);onFinish?.()};
 const quitLabel=confirmQuit?'한 번 더 누르면 마쳐요 · '+quitPenalty:awaitingChoice?'마치기':(restOver?'이 과목 공부 마치기':'공부 마치기')+(quitPenalty?' · '+quitPenalty:'');
 const characterSize=landscape?Math.round(area.height*1.6):Math.round(area.width*1.69),characterLeft=landscape?half+(half-characterSize)/2:(area.width-characterSize)/2,characterTop=Math.round(landscape?area.height-PANEL_CLEARANCE-characterSize*CHIN:control.touch+space.xs+size+space.xxs+NOTE_HEIGHT+space.xs-characterSize*CROWN);
 const panelWidth=landscape?Math.min(358,half-gutter):Math.min(358,area.width-gutter*2),panelLeft=landscape?half+(half-panelWidth)/2:(area.width-panelWidth)/2;
 const adjustButton=(label:string,amount:number)=><PanelButton tight key={label} label={label} colors={p} onPress={()=>onAdjust?.(amount)}/>;
 return <View testID="focus-clock" onLayout={e=>setArea(e.nativeEvent.layout)} style={{flex:1,backgroundColor:p.bg}}>
  {character?<View pointerEvents="none" style={{position:'absolute',left:characterLeft,top:characterTop,width:characterSize,height:characterSize}}>{character(characterSize)}</View>:null}
  <View style={{position:'absolute',left:landscape?0:gutter,right:landscape?0:gutter,top:landscape?space.xs:space.xxs,flexDirection:'row',alignItems:'center',justifyContent:'space-between',zIndex:1}}>
   <View style={{flexDirection:'row',alignItems:'center',gap:space.xs,flexShrink:1}}>
    <Pressable accessibilityRole="button" onPress={onClose} style={{minHeight:control.touch,justifyContent:'center',paddingHorizontal:space.xxs}}><Text style={{...type.label,color:p.muted}}>닫기</Text></Pressable>
    <Text numberOfLines={1} style={{...type.label,fontWeight:'800',color:p.accent,flexShrink:1}}>{resting?'휴식 중':restOver?'휴식 끝':awaitingChoice?'이번 단계 끝':idle?'다음 공부 준비':overtime?'추가 공부 중':'집중 시간'}</Text>
   </View>
   {onRotate?<Pressable accessibilityRole="button" accessibilityLabel={landscape?'세로로 돌리기':'가로로 돌리기'} onPress={onRotate} style={({pressed})=>({width:control.touch,height:control.touch,alignItems:'center',justifyContent:'center',borderRadius:control.touch/2,backgroundColor:p.cell,transform:[{scale:pressed?.97:1}]})}><Icon name="reload-outline" size={22} color={p.text}/></Pressable>:null}
  </View>
  <View style={{position:'absolute',left:landscape?0:gutter,width:landscape?half:area.width-gutter*2,top:landscape?space.xxl+space.xs:control.touch+space.xs,alignItems:'center',gap:space.xxs}}>
   <TimerFace size={size} progress={progress} time={time} weight={design==='A'?'300':'800'} fontRatio={left<0||restOver?.24:.262} colors={overtime&&!inverted?{...p,text:p.accent}:p} accessibilityLabel={(restOver?'휴식 후 지난 시간 ':overtime?'추가 공부 시간 ':'남은 시간 ')+Math.floor(seconds/60)+'분 '+seconds%60+'초'} caption={restOver?'버튼을 누르면 집중을 시작해요':awaitingChoice?'다음 단계':idle?'시작하면 공부 시간이 쌓여요':!running?(resting?'휴식 일시정지':'일시정지 중'):resting?'편하게 쉬어도 좋아요':overtime?'목표 달성 · 공부 시간은 계속 쌓여요':'내가 선택한 공부'}>
    {playIcon&&!(resting&&needsPlan&&onSkipBreak)?<View style={{paddingTop:space.xs}}><Pressable accessibilityRole="button" accessibilityLabel={pauseLabel} onPress={()=>{tapLight();onPause()}} style={({pressed})=>({width:control.compact,height:control.compact,borderRadius:control.compact/2,alignItems:'center',justifyContent:'center',backgroundColor:p.accent,transform:[{scale:pressed?.95:1}]})}><Ionicons name={running?'pause':'play'} size={22} color={p.onAccent}/></Pressable></View>:null}
   </TimerFace>
   <Text style={{...type.caption,color:p.muted,textAlign:'center'}}>{needsPlan?'계획 한 줄부터 시작해요':awaitingChoice?'고를 때까지 시간이 멈춰요 · 마치기 전에는 앱이 잠겨 있어요':ready?'이번 단계 충족 · 사진 확인하면 +'+dueMinutes+'분':resting?'쉬는 시간은 공부 시간에 포함되지 않아요':(phase==='focus'&&carried>0?'지난 공부 '+Math.floor(carried/60)+'분 '+carried%60+'초 이어짐 · ':'실제 집중 ')+requiredMinutes+'분 후 필기 사진 · +'+nextMinutes+'분'}</Text>
  </View>
  <View style={{position:'absolute',left:panelLeft,width:panelWidth,bottom:landscape?space.xs:gutter}}>
   <ActionPanel background={p.panel}>
    {design==='C'?<Text style={{...type.label,fontWeight:'800',color:p.accent,flexBasis:'100%'}}>{revealed?subject:'지금 할 행동에 집중해요'}</Text>:null}
    {resting&&onSkipBreak?<PanelButton wide primary colors={p} label={needsPlan?'계획 쓰고 다시 공부하기':'쉬는 시간 건너뛰고 공부하기'} onPress={onSkipBreak}/>:null}
    {!playIcon&&!(resting&&needsPlan&&onSkipBreak)?<PanelButton wide primary={!resting&&!ready&&(idle||!running)} colors={p} label={pauseLabel} onPress={onPause}/>:null}
    {ready&&!resting&&onPhoto?<PanelButton wide primary colors={p} label="필기 사진 제출" onPress={onPhoto}/>:null}
    {ready&&resting&&onPhoto?<PanelButton wide colors={p} label="필기 사진 제출" onPress={onPhoto}/>:null}
    {phase==='focus'&&onDeclare?<PanelButton wide colors={p} label="다 했어요 · 사진으로 끝내기" onPress={onDeclare}/>:null}
    <PanelButton colors={p} label={revealed?subject:'과목 보기'} onPress={()=>setRevealed(v=>!v)}/>
    {phase==='focus'&&onBreak?<PanelButton colors={p} label="휴식 5분" onPress={onBreak}/>:null}
    {(phase==='focus'||awaitingChoice)&&onLeaveNote?<PanelButton colors={p} label="멈추고 메모" onPress={onLeaveNote}/>:null}
    {onAdjust&&!idle?<PanelButton colors={p} label={'시간 조정 '+(adjusting?'−':'+')} accessibilityLabel="타이머 시간 조정" expanded={adjusting} onPress={()=>setAdjusting(v=>!v)}/>:null}
    {(!idle||restOver||awaitingChoice)&&onFinish?<PanelButton colors={p} label={quitLabel} onPress={quit}/>:null}
    {onAdjust&&!idle&&adjusting?<View style={{flexDirection:'row',gap:space.xs,flexBasis:'100%'}}>{adjustButton('−1분',-60)}{adjustButton('+1분',60)}{adjustButton('−5분',-300)}{adjustButton('+5분',300)}</View>:null}
   </ActionPanel>
  </View>
 </View>;
}
