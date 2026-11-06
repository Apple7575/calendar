import {routineAnimalAction} from './animalScene';
﻿import React,{useEffect,useRef,useState} from 'react';
import {Modal,Pressable,ScrollView,Text,useWindowDimensions,View} from 'react-native';
import {completeGuidedStep,currentGuidedIndex,eveningSteps,isReturnDay,pauseGuidedStep,previousGuidedIndex,resumeGuidedStep,startGuidedStep,guidedSeconds,formatGuidedTime,undoGuidedStep} from '../../lib/dailyPlan';
import {checkMorning,getDay,Level,morningSteps,morningWords,withDay} from '../../lib/routineModel';
import {tapSuccess} from '../../lib/haptics';
import {RootScreenProps} from '../../navigation/types';
import {runScreenTimeAction,syncRoutineRewards} from '../../lib/screenTime';
import {ThemeOverride,useTheme} from '../../theme/ThemeContext';
import {overtimeTheme} from '../../theme/themes';
import {TimerFace} from './TimerFace';
import {useTimerScreenHold} from './useTimerScreenHold';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useIsFocused} from '@react-navigation/native';
import {useRoutine} from './RoutineProvider';
import {Action,CardView,CharacterPeek,Copy,IconAction,Link,Notice,Page,Progress,u} from './ui';
import {Segments} from './experience';
import {control,space,type} from '../../theme/tokens';
import {CelebrationHero} from './CelebrationHero';
import {CelebrationSurface} from './CelebrationSurface';
import {useStudyFeedback} from './useStudyFeedback';

export function GuidedRoutineScreen({route,navigation}:RootScreenProps<'GuidedRoutine'>){
 const slot=route.params.slot,{data,dayKey,update,ready,native,refreshNative}=useRoutine(),day=getDay(data,dayKey),baseTheme=useTheme();
 const level=day.guidedLevels?.[slot]??(slot==='morning'&&isReturnDay(data,dayKey)?'min':'full');
 const steps=slot==='morning'?morningSteps(data,dayKey):eveningSteps(data,dayKey),done=slot==='morning'?day.morning:day.evening??[];
 const [skipped,setSkipped]=useState<string[]>([]);
 const required=steps.map((s,i)=>level==='full'||s.minimum?i:-1).filter(i=>i>=0),stepIds=steps.map(s=>s.id),current=currentGuidedIndex(required,done,skipped,stepIds),step=current===undefined?null:steps[current];
 const timer=day.guidedTimer?.slot===slot&&day.guidedTimer.stepId===step?.id?day.guidedTimer:null;
 const [clock,setClock]=useState(Date.now()),[busy,setBusy]=useState(false),[error,setError]=useState(''),[order,setOrder]=useState(false),[started,setStarted]=useState(done.some(Boolean)||!!timer),[celebrate,setCelebrate]=useState(false);
 const identity=useRef(dayKey);
 useStudyFeedback(celebrate?{kind:'complete',id:`${dayKey}:${slot}:${level}`}:null);
 useEffect(()=>{const id=setInterval(()=>setClock(Date.now()),500);return()=>clearInterval(id)},[]);
 const left=timer?guidedSeconds(timer,Math.max(clock,Date.now())):(step?.minutes??5)*60,overtime=!!timer&&left<=0,c=(overtime?overtimeTheme:baseTheme).colors,{width,height}=useWindowDimensions(),landscape=width>height,insets=useSafeAreaInsets(),timerSize=landscape?Math.min(240,height-insets.top-insets.bottom-70):Math.min(196,width-200);
 const [timerCue,setTimerCue]=useState<string|null>(null),alerting=useRef<string|null>(null);
 useStudyFeedback(timerCue?{kind:'timer',id:timerCue}:null);
 useEffect(()=>{
  if(!timer?.running||timer.alerted||left>0||identity.current!==dayKey)return;
  const id=`${dayKey}:${timer.slot}:${timer.stepId}:${timer.endsAt}`;
  if(alerting.current===id)return;alerting.current=id;
  void update(s=>withDay(s,dayKey,d=>d.guidedTimer?.stepId===timer.stepId&&d.guidedTimer.endsAt===timer.endsAt?{...d,guidedTimer:{...d.guidedTimer,alerted:true}}:d)).then(()=>{setTimerCue(id);tapSuccess();}).catch(()=>{alerting.current=null;});
 },[timer?.running,timer?.alerted,timer?.stepId,timer?.endsAt,left,dayKey,update]);
 const run=async(fn:Parameters<typeof update>[0])=>{if(busy)return false;setBusy(true);setError('');try{await update(fn);return true}catch(e){setError(e instanceof Error?e.message:'저장하지 못했어요.');return false}finally{setBusy(false)}};
 const choose=async(value:Level)=>{if(busy)return;let added=0;const saved=await run(s=>{let next=withDay(s,dayKey,d=>({...d,guidedLevels:{...d.guidedLevels,[slot]:value}}));if(slot==='morning'){next=checkMorning(next,dayKey,value);added=getDay(next,dayKey).paid.morning-getDay(s,dayKey).paid.morning;}return next;});if(saved&&added>0)navigation.replace('RoutineReward',{unit:'morning',level:value,added});};
 const finish=async()=>{
  if(current===undefined||busy)return;setBusy(true);setError('');let added=0,finished=false;
  let paidAfter=0;
  try{await update(s=>{const before=getDay(s,dayKey).paid.morning,next=completeGuidedStep(s,dayKey,slot,current,level),after=getDay(next,dayKey);added=after.paid.morning-before;paidAfter=after.paid.morning;const checks=slot==='morning'?after.morning:after.evening??[];finished=required.every(i=>checks[i]);const following=currentGuidedIndex(required,checks,skipped,stepIds);return following===undefined?next:startGuidedStep(next,dayKey,slot,steps[following].id)});tapSuccess();
   if(finished&&slot==='morning'&&added>0)navigation.replace('RoutineReward',{unit:'morning',level,added});else if(finished&&(slot!=='morning'||paidAfter>0))setCelebrate(true);
  }catch(e){setError(e instanceof Error?e.message:'기록을 저장하지 못했어요.')}finally{setBusy(false)}
 };
 const passed=required.map((_,n)=>n).reduce<boolean[]>((flags,n)=>{const i=required[n];flags[i]=!!done[i]||skipped.includes(stepIds[i]);return flags},[]),previous=previousGuidedIndex(required,passed,current??steps.length),others=required.filter(i=>!done[i]&&i!==current);
 const goBack=()=>{if(previous===undefined)return;const wasDone=!!done[previous];setSkipped(list=>list.filter(id=>id!==steps[previous].id));void run(s=>startGuidedStep(wasDone?undoGuidedStep(s,dayKey,slot,previous):s,dayKey,slot,steps[previous].id));};
 const skip=()=>{if(!step||!others.length)return;const remaining=[...skipped.filter(id=>id!==step.id),step.id],nextIndex=currentGuidedIndex(required,done,remaining,stepIds);setSkipped(remaining);if(nextIndex!==undefined)void run(s=>startGuidedStep(s,dayKey,slot,steps[nextIndex].id));};
 const hold=useTimerScreenHold(started&&current!==undefined&&identity.current===dayKey,'routine');
 const levelChoice=<Segments value={level} onChange={choose} items={[{id:'full',label:'전체 목표'},{id:'min',label:isReturnDay(data,dayKey)?'다시 시작 · 작게':'오늘은 작게'}]}/>;
 const focused=useIsFocused();
 const words=slot==='morning'?morningWords(data,dayKey,level):null,settling=useRef(false),owedReward=useRef(false);
 const complete=current===undefined,waitingWords=slot==='morning'&&complete&&!day.paid.morning&&!!words&&!words.met,wordsReady=slot==='morning'&&complete&&!day.paid.morning&&!!words?.met;
 // 지급은 데이터 쪽(settleMorningWords)이 한다. 이 화면은 단어를 기다리는 모습을 보여 줬다면, 지급된 뒤 다시 보일 때 보상 화면을 한 번 띄운다.
 useEffect(()=>{if(waitingWords)owedReward.current=true;},[waitingWords]);
 useEffect(()=>{
  if(!focused||slot!=='morning'||identity.current!==dayKey)return;
  if(owedReward.current&&day.paid.morning>0){owedReward.current=false;navigation.replace('RoutineReward',{unit:'morning',level,added:day.paid.morning});return;}
  if(!wordsReady||!ready||busy||settling.current)return;
  settling.current=true;let added=0;
  void run(s=>{const before=getDay(s,dayKey).paid.morning,next=checkMorning(s,dayKey,level);added=getDay(next,dayKey).paid.morning-before;return next;}).then(saved=>{if(saved&&added>0){owedReward.current=false;navigation.replace('RoutineReward',{unit:'morning',level,added});}}).finally(()=>{settling.current=false;});
 },[focused,wordsReady,ready,busy,dayKey,level,day.paid.morning]);
 const totalMinutes=required.reduce((sum,i)=>sum+(steps[i].minutes??5),0),count=required.filter(i=>done[i]).length;
 const footer=identity.current!==dayKey?<Action label="새로운 오늘로 돌아가기" onPress={()=>navigation.popTo('Main',{screen:'Today'})}/>:waitingWords&&words?<View style={{gap:5}}><Action label={`단어 ${words.required-words.done}장 하러 가기`} disabled={!ready||busy} onPress={()=>navigation.navigate('RoutineStudySession',{level:'full'})}/><Link muted label="오늘로 돌아가기" onPress={()=>navigation.popTo('Main',{screen:'Today'})}/></View>:complete?<View style={{gap:5}}><Action label="오늘로 돌아가기" onPress={()=>navigation.popTo('Main',{screen:'Today'})}/>{slot==='evening'&&previous!==undefined?<Link muted label="마지막 행동 되돌리기" onPress={goBack}/>:null}{slot==='morning'&&level==='min'?<Link label="전체 목표도 이어가기" onPress={()=>{choose('full');setCelebrate(false);setStarted(true)}}/>:null}{slot==='morning'&&native?.enabled&&native.rewardMode?<Link label="모은 시간 사용하기" onPress={()=>{void syncRoutineRewards(dayKey,{...day.paid,book:day.bonus?.book??0,extra:day.bonus?.words??0,quick:day.bonus?.quick??0}).then(()=>runScreenTimeAction('startRewardUse')).then(refreshNative).catch(e=>setError(e.message))}}/>:null}</View>:!started?<Action label={`${level==='min'?'작은':'오늘'} 루틴 시작 · 약 ${totalMinutes}분`} disabled={!ready||busy} onPress={()=>{setStarted(true);if(step)void run(s=>startGuidedStep(s,dayKey,slot,step.id))}}/>:<Action label={busy?'기록하고 있어요…':'이 행동 마쳤어요'} disabled={!ready||busy||identity.current!==dayKey} onPress={()=>void finish()}/>;
 const rotateButton=<IconAction icon="reload-outline" label={landscape?'세로로 돌리기':'가로로 돌리기'} onPress={hold.rotate}/>;
 const timerFace=step?<TimerFace size={timerSize} progress={left/Math.max((step.minutes??5)*60,1)} time={formatGuidedTime(left)} fontRatio={.25} colors={{text:c.text,muted:c.textMuted,accent:c.primary,track:c.border}} accessibilityLabel={(overtime?'초과 시간 ':'남은 시간 ')+Math.floor(Math.abs(left)/60)+'분 '+Math.abs(left)%60+'초'}>
<View style={{paddingTop:space.xxs}}><IconAction large boxSize={control.touch+space.xs} icon={timer?.running?'pause':'play'} label={!timer?'타이머 시작':timer.running?'타이머 멈추기':'타이머 이어가기'} disabled={busy} onPress={()=>void run(s=>!timer?startGuidedStep(s,dayKey,slot,step.id):timer.running?pauseGuidedStep(s,dayKey):resumeGuidedStep(s,dayKey))}/></View>
</TimerFace>:null;
 const backButton=<IconAction icon="play-skip-back" label="이전 행동으로 돌아가기" caption="이전" disabled={previous===undefined||busy} onPress={goBack}/>;
 const skipButton=<IconAction icon="play-skip-forward" label="이 행동 건너뛰기" caption="건너뛰기" disabled={!others.length||busy} onPress={skip}/>;
 const finishAction=<Action compact label={busy?'기록하고 있어요…':'이 행동 마쳤어요'} disabled={!ready||busy||identity.current!==dayKey} onPress={()=>void finish()}/>;
 const modals=<>
  <Modal supportedOrientations={["portrait","landscape"]} visible={celebrate} presentationStyle="fullScreen" animationType="fade" onRequestClose={()=>setCelebrate(false)}><CelebrationSurface character={slot==='morning'?'C01':'C04'} action={slot==='evening'?'A30':level==='min'?'A24':'A25'} title={level==='min'?'작게 해도,\n해냈어요!':slot==='evening'?'포근하게\n하루 마무리!':'아침 루틴\n완료!'} subtitle="실천 기록을 캘린더에 남겼어요" onClose={()=>setCelebrate(false)} footer={<Action label="오늘로 돌아가기" onPress={()=>{setCelebrate(false);navigation.popTo('Main',{screen:'Today'})}}/>}><View style={{alignSelf:'stretch',backgroundColor:c.card,borderRadius:26,padding:18,alignItems:'center',gap:8}}><Copy size={18} weight="800">{slot==='evening'?'저녁 루틴 완료':`오늘 아침 보상 합계 ${day.paid.morning}분`}</Copy><Copy muted size={13}>{slot==='evening'?'저녁은 별도 시간 보상 없이 실천 기록을 남겨요.':'이미 받은 시간은 중복 지급하지 않아요.'}</Copy></View></CelebrationSurface></Modal>
  <Modal supportedOrientations={["portrait","landscape"]} visible={order} transparent animationType="fade" onRequestClose={()=>setOrder(false)}><View style={{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(20,30,30,0.4)'}}><View style={{backgroundColor:c.card,borderTopLeftRadius:30,borderTopRightRadius:30,padding:24,maxHeight:'80%',gap:14}}><View style={u.between}><Copy size={21} weight="800">오늘의 순서</Copy><Link label="닫기" onPress={()=>setOrder(false)}/></View>{levelChoice}<ScrollView contentContainerStyle={{gap:16}}>{required.map((i,n)=><View key={steps[i].id} style={u.between}><Copy>{done[i]?'✓':`${n+1}.`} {steps[i].title}</Copy><Copy muted size={12}>{steps[i].minutes??5}분</Copy></View>)}<Link label="루틴 구성 편집" onPress={()=>{setOrder(false);navigation.navigate('RoutineSetup',{slot})}}/></ScrollView></View></View></Modal>
 </>;
 if(landscape&&started&&step)return <ThemeOverride theme={overtime?overtimeTheme:undefined}><View testID="guided-landscape" style={{flex:1,flexDirection:'row',alignItems:'center',gap:space.md,backgroundColor:c.surface,paddingTop:insets.top,paddingBottom:insets.bottom,paddingLeft:Math.max(insets.left,space.md),paddingRight:Math.max(insets.right,space.md)}}>
  <View style={{flex:1,alignSelf:'stretch',justifyContent:'flex-end',overflow:'hidden'}}><CharacterPeek character={slot==='morning'?'C01':'C04'} action={routineAnimalAction(step.id,step.title)} fixedSize={Math.min(height*1.45,580)} topCrop={.2} fixedHeight={height-insets.top-insets.bottom}/></View>
  <View style={{alignItems:'center',gap:space.xs}}>{timerFace}<Copy variant="caption" muted>{count}/{required.length}개 · 목표 {step.minutes??5}분</Copy></View>
  <View style={{width:236,gap:space.xs,justifyContent:'center'}}>
   <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Link label="닫기" onPress={()=>navigation.goBack()}/>{rotateButton}</View>
   <Text accessibilityRole="header" numberOfLines={2} style={[type.heading,{color:c.text}]}>{step.title}</Text>
   {step.detail?<Copy variant="caption" muted numberOfLines={2}>{step.detail}</Copy>:null}
   <View style={{flexDirection:'row',justifyContent:'space-around'}}>{backButton}{skipButton}</View>
   {finishAction}
   {error||hold.error?<Notice tone="error">{error||hold.error}</Notice>:null}
  </View>
  {modals}
 </View></ThemeOverride>;
 return <ThemeOverride theme={overtime?overtimeTheme:undefined}><Page title={slot==='morning'?'아침 루틴':'저녁 루틴'} right={<Link label="닫기" onPress={()=>navigation.goBack()}/>} footer={footer}>
  {started&&!complete?null:levelChoice}
  <Progress value={required.length?count/required.length:0} label="루틴 진행률"/>
  <Copy muted size={12}>{count}/{required.length}개 · {slot==='morning'?level==='full'?'전체 완료 +10분':'작게 완료 +5분':'저녁은 기록만 남아요 · 별도 보상 없음'}</Copy>
  {waitingWords&&words?<View><CharacterPeek character="C01" action="A04"/><CardView>
   <Text accessibilityRole="header" style={[type.heading,{color:c.text}]}>마지막으로 단어 {words.required}장</Text>
   <Progress value={words.required?words.done/words.required:1} label="아침 단어 진행률"/>
   <Copy muted>{words.done}/{words.required}장 · 끝내면 아침 루틴이 완료돼요.</Copy>
   {words.reduced?<Copy variant="caption" muted>오늘 학습할 수 있는 카드가 {words.required}장이라 {words.required}장만 해요.</Copy>:null}
  </CardView></View>:complete?<><CelebrationHero character={slot==='morning'?'C01':'C04'} action={slot==='evening'?'A30':level==='min'?'A24':'A25'} title={level==='min'?'작게 해도, 해냈어요!':slot==='evening'?'포근하게 하루 마무리!':'아침 루틴 완료!'} subtitle="실천 기록을 캘린더에 남겼어요"/>{slot==='evening'?<Copy muted size={13}>저녁 루틴은 별도 사용 시간 보상 없이 실천 기록을 남겨요.</Copy>:<Copy muted size={13}>오늘 아침 루틴에서 받은 합계 {day.paid.morning}분 · 이미 받은 시간은 중복 지급되지 않아요.</Copy>}</>:<View><CharacterPeek character={slot==='morning'?'C01':'C04'} action={started&&step?routineAnimalAction(step.id,step.title):slot==='morning'?'A04':'A05'}/><CardView>
   <View style={[u.between,{gap:space.xs}]}><Text accessibilityRole="header" style={[type.heading,{color:c.text,flex:1}]}>{!started?`${required.length}개의 작은 행동을 함께해요`:step?.title??''}</Text>{started&&step?rotateButton:null}</View>
   <Copy muted>{!started?`약 ${totalMinutes}분 · ${slot==='morning'?'07:00까지 하루를 준비해요.':'잠들기 전 내일의 나를 챙겨요.'}`:step?.detail}</Copy>
   {started&&step?<View style={{gap:space.sm,paddingTop:space.xs}}>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}>
     {backButton}{timerFace}{skipButton}
    </View>
    <Copy variant="caption" muted style={{textAlign:'center'}}>{overtime?'초과 시간을 재고 있어요. 마쳤다면 아래 버튼을 눌러 주세요.':`목표 ${step.minutes??5}분 · 완벽보다 제시간에. 끝나면 소리와 진동으로 알려드려요.`}</Copy>
   </View>:null}
  </CardView></View>}
  {step?<View style={{gap:space.xxs,paddingHorizontal:space.xxs}}>
   {skipped.length?<Copy variant="caption" muted>건너뛴 행동은 끝에 다시 나와요. 건너뛰면 완료로 치지 않아요.</Copy>:null}
   <Copy variant="caption" muted>{current!==undefined&&others.length?'다음 행동: '+steps[currentGuidedIndex(required,done.map((v,i)=>v||i===current),skipped,stepIds)??others[0]].title:slot==='morning'&&!day.paid.morning&&words&&!words.met?`다음 행동: 단어 ${words.required}장`:'마치면 오늘의 실천에 기록돼요.'}</Copy>
   {step.preparation?<Copy variant="caption">미리 준비: {step.preparation}</Copy>:null}
  </View>:null}
  {started&&step?.id==='study'?<Link label="집중 공부 공간 열기" onPress={()=>navigation.navigate('BookStudy')}/>:started&&step?.id==='review'?<Link label="사진·목소리로 오늘 남기기" onPress={()=>navigation.navigate('DiaryEdit',{date:importCivilDate()})}/>:null}
  {step&&!step.preparation?<Link label="이 행동의 준비물 미리 정하기" onPress={()=>navigation.navigate('RoutineSetup',{slot})}/>:null}
  <Link label="전체 순서 보기" onPress={()=>setOrder(true)}/>{error||hold.error?<Notice tone="error">{error||hold.error}</Notice>:null}
  {modals}
 </Page></ThemeOverride>;
}
function importCivilDate(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}

