import React,{useEffect,useState} from 'react';
import {View,useWindowDimensions} from 'react-native';
import * as Crypto from 'expo-crypto';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/types';
import {SUBJECTS,skipBookBreak,startBookTimer,saveFocusPlan,StudyRewardMode} from '../../lib/bookStudy';
import {bookDisplaySeconds} from '../../lib/bookTimerTime';
import {startOutputStudy} from '../../lib/handwriting';
import {FOCUS_STEPS,focusRampStatus} from '../../lib/focusRamp';
import {focusSubject,habitOrderPolicy} from '../../lib/habitOrder';
import {useTheme} from '../../theme/ThemeContext';
import {useRoutine} from './RoutineProvider';
import {Action,CardView,Choice,Copy,Field,Link,Mascot,Notice} from './ui';
import {rewardChange} from '../../lib/rewardChange';
const STAGE_MINUTES=FOCUS_STEPS.slice(1).map(s=>s/60);
/** The art fills only the middle of its canvas, so the canvas is oversized and cropped by the panel overlapping its feet. */
const HERO_MAX=480,HERO_PLAN_MAX=380,HERO_WIDTH_RATIO=1.3,HERO_TOP_CROP=.3,HERO_VISIBLE=.44;
export function FocusStart({initialSubject,compact=false,secondary=false}:{initialSubject?:string;initialRewardMode?:StudyRewardMode;compact?:boolean;secondary?:boolean}){
 const nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>(),{data,update,ready,dayKey}=useRoutine(),{colors:c}=useTheme(),{width}=useWindowDimensions();
 const [clock,setClock]=useState(Date.now()),[subject,setSubject]=useState(initialSubject??data.outputDraft?.subject??SUBJECTS[0]),[plan,setPlan]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const id=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(id)},[]);
 const status=focusRampStatus(data,clock),minutes=status.required/60,timer=data.bookTimer,active=timer?.phase==='focus',resting=timer?.phase==='break'?timer:undefined;
 const breakLeft=resting?bookDisplaySeconds(resting,Math.max(clock,Date.now())):0,breakClock=String(Math.floor(breakLeft/60)).padStart(2,'0')+':'+String(breakLeft%60).padStart(2,'0');
 const openTimer=()=>{if(compact)nav.replace('FocusTimer');else nav.navigate('FocusTimer')};
 useEffect(()=>{if(!status.needsPlan&&data.outputDraft)setSubject(data.outputDraft.subject)},[status.needsPlan,data.outputDraft?.id,data.outputDraft?.subject]);
 const subjects=[...new Set([...SUBJECTS,...habitOrderPolicy(data).sequence.map(focusSubject).filter((s):s is string=>!!s)])];
 const submit=async()=>{if(busy)return;setBusy(true);setError('');try{const id=Crypto.randomUUID();let result:ReturnType<typeof rewardChange>|undefined;await update(s=>{const next=saveFocusPlan(s,id,subject,plan);result=rewardChange(s,next,dayKey);return next});setPlan('');if(result&&result.minutes>0)nav.navigate('EarnedReward',{id,kind:'plan',quantity:1,...result});}catch(e){setError(e instanceof Error?e.message:'계획을 저장하지 못했어요.')}finally{setBusy(false)}};
 const start=async()=>{if(busy)return;setBusy(true);setError('');const breakId=resting?.id;try{await update(s=>{if(breakId)return skipBookBreak(s,breakId,Crypto.randomUUID());const current=focusRampStatus(s);if(current.needsPlan)throw new Error('계획 한 줄부터 다시 시작해 주세요.');const next=startOutputStudy(s,Crypto.randomUUID(),subject);return startBookTimer(next,Crypto.randomUUID(),next.outputDraft!.subject,Date.now(),current.required,'output')});openTimer();}catch(e){setError(e instanceof Error?e.message:'집중을 시작하지 못했어요.')}finally{setBusy(false)}};
 if(secondary)return <View style={{gap:8}}><Action secondary label={'이어서 '+minutes+'분 더 공부하기'} disabled={!ready||busy} onPress={()=>void start()}/>{error?<Notice tone="error">{error}</Notice>:null}</View>;
 const hero=Math.min(status.needsPlan?HERO_PLAN_MAX:HERO_MAX,width*HERO_WIDTH_RATIO);
 const title=status.needsPlan?'오늘 공부할 계획 한 줄':resting?(resting.running?'쉬는 중':'휴식 일시정지')+' · '+breakClock:active?'공부 진행 중':minutes+'분만 해볼까요?';
 return <View>
  <View pointerEvents="none" style={{alignItems:'center',height:hero*HERO_VISIBLE,overflow:'hidden'}}><View style={{marginTop:-hero*HERO_TOP_CROP}}><Mascot size={hero} action="A31"/></View></View>
  <CardView>
   <View style={{gap:4}}><Copy size={25} weight="800">{title}</Copy>
    {status.expired?<Copy muted size={14}>집중 공부를 2시간 쉬었네요. 부담 없이 계획부터 다시 시작해요. 기록과 받은 보상은 남아 있어요.</Copy>:null}
    {!status.needsPlan?<Copy muted size={14}>{resting?.subject??subject}{status.plan?.text?' · '+status.plan.text:''}</Copy>:null}
   </View>
   {!status.needsPlan&&!data.outputDraft&&!resting?<Field label="공부 주제" value={subject} onChangeText={setSubject} maxLength={80} placeholder="공부 주제"/>:null}
   {status.needsPlan?<>
    <Field label="공부 주제" value={subject} onChangeText={setSubject} maxLength={80} placeholder="공부 주제"/>
    <View style={{flexDirection:'row',gap:6,flexWrap:'wrap'}}>{subjects.map(s=><Choice key={s} label={s} selected={subject===s} onPress={()=>setSubject(s)}/>)}</View>
    <Field label="오늘 공부 계획" multiline value={plan} onChangeText={setPlan} maxLength={2000} placeholder="예: 기출 1번을 읽고 풀이의 첫 줄 써보기"/>
    <Action label="계획 저장 · +5분 받기" disabled={!ready||busy||!subject.trim()||!plan.trim()} onPress={()=>void submit()}/>
    <Copy muted size={13}>공부 시간 없이 계획만 저장해도 +5분. 다음은 2분 공부예요.{status.expired?'':' 집중 공부를 2시간 쉬면 계획부터 다시 시작해요.'}{data.outputDraft?'':' 필기 돈 보상은 100자당 500원이에요.'}</Copy>
   </>:resting?<>
    <Action label="쉬는 시간 건너뛰고 공부하기" disabled={!ready||busy} onPress={()=>void start()}/>
    <Link label="큰 타이머 보기" onPress={openTimer}/>
    <Copy muted size={13}>쉬는 시간은 공부 시간에 포함되지 않아요. 지금까지 공부한 시간과 필기는 그대로예요.</Copy>
   </>:<>
    {active?<Action label="큰 타이머 열기" onPress={openTimer}/>:<Action label={minutes+'분 집중 시작'} disabled={!ready||busy||!subject.trim()} onPress={()=>void start()}/>}
    <View accessibilityLabel={'집중 단계 '+status.level+'/5, 이번 단계 '+minutes+'분'} style={{flexDirection:'row',gap:6}}>{STAGE_MINUTES.map((m,i)=><View key={m} style={{flex:1,gap:5}}><View style={{height:5,borderRadius:3,backgroundColor:i<status.level?c.primary:c.border}}/><Copy size={12} muted={i!==status.level-1} weight={i===status.level-1?'700':'500'}>{m}분</Copy></View>)}</View>
    <Copy muted size={13}>{minutes}분 실제 공부 후 새 필기 사진을 확인하면 +5분. 집중 공부를 2시간 쉬면 계획부터 다시 시작해요.{data.outputDraft?'':' 필기 돈 보상은 100자당 500원이에요.'}</Copy>
   </>}
   {error?<Notice tone="error">{error}</Notice>:null}
  </CardView>
 </View>;
}
