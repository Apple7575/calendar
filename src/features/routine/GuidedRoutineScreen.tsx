import React,{useEffect,useRef,useState} from 'react';
import {Modal,Pressable,ScrollView,Text,View} from 'react-native';
import {completeGuidedStep,eveningSteps,isReturnDay,pauseGuidedStep,resumeGuidedStep,startGuidedStep} from '../../lib/dailyPlan';
import {checkMorning,getDay,Level,morningSteps,withDay} from '../../lib/routineModel';
import {tapSuccess} from '../../lib/haptics';
import {RootScreenProps} from '../../navigation/types';
import {runScreenTimeAction,syncRoutineRewards} from '../../lib/screenTime';
import {useTheme} from '../../theme/ThemeContext';
import {useRoutine} from './RoutineProvider';
import {Action,CardView,Copy,Icon,Link,Page,Progress,u} from './ui';
import {BoriScene,Segments,useScene} from './experience';
import {CelebrationHero} from './CelebrationHero';
import {CelebrationSurface} from './CelebrationSurface';
import {useStudyFeedback} from './useStudyFeedback';

export function GuidedRoutineScreen({route,navigation}:RootScreenProps<'GuidedRoutine'>){
 const slot=route.params.slot,{data,dayKey,update,ready,native,refreshNative}=useRoutine(),day=getDay(data,dayKey),{colors:c}=useTheme();
 const level=day.guidedLevels?.[slot]??(slot==='morning'&&isReturnDay(data,dayKey)?'min':'full');
 const steps=slot==='morning'?morningSteps(data,dayKey):eveningSteps(data,dayKey),done=slot==='morning'?day.morning:day.evening??[];
 const required=steps.map((s,i)=>level==='full'||s.minimum?i:-1).filter(i=>i>=0),current=required.find(i=>!done[i]),step=current===undefined?null:steps[current];
 const timer=day.guidedTimer?.slot===slot&&day.guidedTimer.stepId===step?.id?day.guidedTimer:null;
 const [clock,setClock]=useState(Date.now()),[busy,setBusy]=useState(false),[error,setError]=useState(''),[order,setOrder]=useState(false),[started,setStarted]=useState(done.some(Boolean)||!!timer),[celebrate,setCelebrate]=useState(false);
 const identity=useRef(dayKey),p=useScene(slot==='morning'?'morning':'evening');
 useStudyFeedback(celebrate?{kind:'complete',id:`${dayKey}:${slot}:${level}`}:null);
 useEffect(()=>{const id=setInterval(()=>setClock(Date.now()),500);return()=>clearInterval(id)},[]);
 const left=timer?(timer.running?Math.max(0,Math.ceil((timer.endsAt-clock)/1000)):timer.remaining):(step?.minutes??5)*60;
 const run=async(fn:Parameters<typeof update>[0])=>{if(busy)return false;setBusy(true);setError('');try{await update(fn);return true}catch(e){setError(e instanceof Error?e.message:'저장하지 못했어요.');return false}finally{setBusy(false)}};
 const choose=async(value:Level)=>{if(busy)return;let added=0;const saved=await run(s=>{let next=withDay(s,dayKey,d=>({...d,guidedLevels:{...d.guidedLevels,[slot]:value}}));if(slot==='morning'){next=checkMorning(next,dayKey,value);added=getDay(next,dayKey).paid.morning-getDay(s,dayKey).paid.morning;}return next;});if(saved&&added>0)navigation.replace('RoutineReward',{unit:'morning',level:value,added});};
 const finish=async()=>{
  if(current===undefined||busy)return;setBusy(true);setError('');let added=0,finished=false;
  try{await update(s=>{const before=getDay(s,dayKey).paid.morning,next=completeGuidedStep(s,dayKey,slot,current,level),after=getDay(next,dayKey);added=after.paid.morning-before;const checks=slot==='morning'?after.morning:after.evening??[];finished=required.every(i=>checks[i]);return next});tapSuccess();
   if(finished&&slot==='morning'&&added>0)navigation.replace('RoutineReward',{unit:'morning',level,added});else if(finished)setCelebrate(true);
  }catch(e){setError(e instanceof Error?e.message:'기록을 저장하지 못했어요.')}finally{setBusy(false)}
 };
 const complete=current===undefined,totalMinutes=required.reduce((sum,i)=>sum+(steps[i].minutes??5),0),count=required.filter(i=>done[i]).length;
 const footer=identity.current!==dayKey?<Action label="새로운 오늘로 돌아가기" onPress={()=>navigation.popTo('Main',{screen:'Today'})}/>:complete?<View style={{gap:5}}><Action label="오늘로 돌아가기" onPress={()=>navigation.popTo('Main',{screen:'Today'})}/>{slot==='morning'&&level==='min'?<Link label="전체 목표도 이어가기" onPress={()=>{choose('full');setCelebrate(false);setStarted(true)}}/>:null}{slot==='morning'&&native?.enabled&&native.rewardMode?<Link label="모은 시간 사용하기" onPress={()=>{void syncRoutineRewards(dayKey,{...day.paid,book:day.bonus?.book??0,extra:day.bonus?.words??0,quick:day.bonus?.quick??0}).then(()=>runScreenTimeAction('startRewardUse')).then(refreshNative).catch(e=>setError(e.message))}}/>:null}</View>:!started?<Action label={`${level==='min'?'작은':'오늘'} 루틴 시작 · 약 ${totalMinutes}분`} disabled={!ready||busy} onPress={()=>{setStarted(true);if(step)void run(s=>startGuidedStep(s,dayKey,slot,step.id))}}/>:<Action label={busy?'기록하고 있어요…':'이 행동 마쳤어요'} disabled={!ready||busy||identity.current!==dayKey} onPress={()=>void finish()}/>;
 return <Page title={slot==='morning'?'햇살 가득 아침':'포근한 저녁'} right={<Link label="닫기" onPress={()=>navigation.goBack()}/>} footer={footer}>
  <Segments value={level} onChange={choose} items={[{id:'full',label:'전체 목표'},{id:'min',label:isReturnDay(data,dayKey)?'다시 시작 · 작게':'오늘은 작게'}]}/>
  <Progress value={required.length?count/required.length:0} label="루틴 진행률"/>
  <Copy muted size={12}>{count}/{required.length}개 · {slot==='morning'?level==='full'?'전체 완료 +10분':'작게 완료 +5분':'저녁은 기록만 남아요 · 별도 보상 없음'}</Copy>
  {complete?<><CelebrationHero title={level==='min'?'작게 해도, 해냈어요!':slot==='evening'?'포근하게 하루 마무리!':'아침 루틴 완료!'} subtitle="실천 기록을 캘린더에 남겼어요"/>{slot==='evening'?<Copy muted size={13}>저녁 루틴은 별도 사용 시간 보상 없이 실천 기록을 남겨요.</Copy>:<Copy muted size={13}>오늘 아침 루틴에서 받은 합계 {day.paid.morning}분 · 이미 받은 시간은 중복 지급되지 않아요.</Copy>}</>:<BoriScene tone={slot==='morning'?'morning':'evening'} size={started?108:160} mood={slot==='evening'?'sleepy':'cheer'} title={!started?`${required.length}개의 작은 행동을 함께해요`:step?.title??''} description={!started?`약 ${totalMinutes}분 · ${slot==='morning'?'07:00까지 하루를 준비해요.':'잠들기 전 내일의 나를 챙겨요.'}`:step?.detail}/>}
  {started&&step?<View style={{alignItems:'center',gap:8}}><Text style={{color:c.text,fontSize:48,fontWeight:'800',fontVariant:['tabular-nums']}}>{String(Math.floor(left/60)).padStart(2,'0')}:{String(left%60).padStart(2,'0')}</Text><Link label={!timer?'타이머 시작':timer.running?'잠깐 멈추기':'이어서 진행'} onPress={()=>void run(s=>!timer?startGuidedStep(s,dayKey,slot,step.id):timer.running?pauseGuidedStep(s,dayKey):resumeGuidedStep(s,dayKey))}/><Copy muted size={12}>{left===0?'정한 시간이 지났어요. 실제 마쳤다면 완료해 주세요.':'타이머가 끝나도 자동으로 완료하지 않아요.'}</Copy>{step.id==='study'?<Link label="집중 공부 공간 열기" onPress={()=>navigation.navigate('BookStudy')}/>:step.id==='review'?<Link label="사진·목소리로 오늘 남기기" onPress={()=>navigation.navigate('DiaryEdit',{date:importCivilDate()})}/>:null}</View>:null}
  <Link label="전체 순서 보기" onPress={()=>setOrder(true)}/>{error?<Copy>{error}</Copy>:null}
  <Modal visible={celebrate} presentationStyle="fullScreen" animationType="fade" onRequestClose={()=>setCelebrate(false)}><CelebrationSurface title={level==='min'?'작게 해도,\n해냈어요!':slot==='evening'?'포근하게\n하루 마무리!':'아침 루틴\n완료!'} subtitle="실천 기록을 캘린더에 남겼어요" onClose={()=>setCelebrate(false)} footer={<Action label="오늘로 돌아가기" onPress={()=>{setCelebrate(false);navigation.popTo('Main',{screen:'Today'})}}/>}><View style={{alignSelf:'stretch',backgroundColor:c.card,borderRadius:26,padding:18,alignItems:'center',gap:8}}><Copy size={18} weight="800">{slot==='evening'?'저녁 루틴 완료':`오늘 아침 보상 합계 ${day.paid.morning}분`}</Copy><Copy muted size={13}>{slot==='evening'?'저녁은 별도 시간 보상 없이 실천 기록을 남겨요.':'이미 받은 시간은 중복 지급하지 않아요.'}</Copy></View></CelebrationSurface></Modal>
  <Modal visible={order} transparent animationType="fade" onRequestClose={()=>setOrder(false)}><View style={{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(20,30,30,0.4)'}}><View style={{backgroundColor:c.card,borderTopLeftRadius:30,borderTopRightRadius:30,padding:24,maxHeight:'80%',gap:14}}><View style={u.between}><Copy size={21} weight="800">오늘의 순서</Copy><Link label="닫기" onPress={()=>setOrder(false)}/></View><ScrollView contentContainerStyle={{gap:16}}>{required.map((i,n)=><View key={steps[i].id} style={u.between}><Copy>{done[i]?'✓':`${n+1}.`} {steps[i].title}</Copy><Copy muted size={12}>{steps[i].minutes??5}분</Copy></View>)}<Link label="루틴 구성 편집" onPress={()=>{setOrder(false);navigation.navigate('RoutineSetup',{slot})}}/></ScrollView></View></View></Modal>
 </Page>;
}
function importCivilDate(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}

