import React,{useEffect,useState} from 'react';
import {Pressable,TextInput,View} from 'react-native';
import * as Crypto from 'expo-crypto';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/types';
import {SUBJECTS,skipBookBreak,startBookTimer,saveFocusPlan,StudyRewardMode} from '../../lib/bookStudy';
import {bookDisplaySeconds} from '../../lib/bookTimerTime';
import {startOutputStudy} from '../../lib/handwriting';
import {focusRampStatus} from '../../lib/focusRamp';
import {focusSubject,habitOrderPolicy} from '../../lib/habitOrder';
import {useTheme} from '../../theme/ThemeContext';
import {useRoutine} from './RoutineProvider';
import {Action,CardView,Copy,Link} from './ui';
import {BoriScene} from './experience';
import {rewardChange} from '../../lib/rewardChange';
export function FocusStart({initialSubject,compact=false,secondary=false}:{initialSubject?:string;initialRewardMode?:StudyRewardMode;compact?:boolean;secondary?:boolean}){
 const nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>(),{data,update,ready,dayKey,native}=useRoutine(),{colors:c}=useTheme();
 const [clock,setClock]=useState(Date.now()),[subject,setSubject]=useState(initialSubject??data.outputDraft?.subject??SUBJECTS[0]),[plan,setPlan]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const id=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(id)},[]);
 const status=focusRampStatus(data,clock),minutes=status.required/60,timer=data.bookTimer,active=timer?.phase==='focus',resting=timer?.phase==='break'?timer:undefined;
 const breakLeft=resting?bookDisplaySeconds(resting,Math.max(clock,Date.now())):0,breakClock=String(Math.floor(breakLeft/60)).padStart(2,'0')+':'+String(breakLeft%60).padStart(2,'0');
 const openTimer=()=>{if(!compact)nav.navigate('BookStudy');nav.navigate('FocusTimer')};
 useEffect(()=>{if(!status.needsPlan&&data.outputDraft)setSubject(data.outputDraft.subject)},[status.needsPlan,data.outputDraft?.id,data.outputDraft?.subject]);
 const subjects=[...new Set([...SUBJECTS,...habitOrderPolicy(data).sequence.map(focusSubject).filter((s):s is string=>!!s)])];
 const submit=async()=>{if(busy)return;setBusy(true);setError('');try{const id=Crypto.randomUUID();let result:ReturnType<typeof rewardChange>|undefined;await update(s=>{const next=saveFocusPlan(s,id,subject,plan);result=rewardChange(s,next,dayKey);return next});setPlan('');if(result&&result.minutes>0)nav.navigate('EarnedReward',{id,kind:'plan',quantity:1,...result});}catch(e){setError(e instanceof Error?e.message:'계획을 저장하지 못했어요.')}finally{setBusy(false)}};
 const start=async()=>{if(busy)return;setBusy(true);setError('');const breakId=resting?.id;try{await update(s=>{if(breakId)return skipBookBreak(s,breakId,Crypto.randomUUID());const current=focusRampStatus(s);if(current.needsPlan)throw new Error('계획 한 줄부터 다시 시작해 주세요.');const next=startOutputStudy(s,Crypto.randomUUID(),subject);return startBookTimer(next,Crypto.randomUUID(),next.outputDraft!.subject,Date.now(),current.required,'output')});openTimer();}catch(e){setError(e instanceof Error?e.message:'집중을 시작하지 못했어요.')}finally{setBusy(false)}};
 return <View style={{gap:14}}>
  {!compact?<BoriScene action="A31" tone="focus" size={120} title={status.needsPlan?'계획 한 줄이면, 시작이에요':minutes+'분만 해볼까요?'} description="계획 → 2분 → 5분 → 10분 → 15분 → 25분. 단계마다 사용 시간 5분을 받아요."/>:null}
  <CardView>
   <Copy size={secondary?16:21} weight="800">{status.needsPlan?'오늘 공부할 계획 한 줄':resting?(resting.running?'쉬는 중':'휴식 일시정지')+' · '+breakClock:secondary?'이어서 더 공부하기':minutes+'분 공부 + 필기 사진'}</Copy>
   {status.expired?<Copy muted size={13}>집중 공부를 2시간 쉬었네요. 부담 없이 계획부터 다시 시작해요. 기록과 받은 보상은 남아 있어요.</Copy>:null}
   {status.needsPlan||(!data.outputDraft&&!resting)?<TextInput accessibilityLabel="공부 주제" value={subject} onChangeText={setSubject} maxLength={80} placeholder="공부 주제" placeholderTextColor={c.textMuted} style={{padding:14,borderRadius:14,backgroundColor:c.inputBg,color:c.text,fontSize:16}}/>:<Copy weight="700">{resting?.subject??subject}</Copy>}
   {status.needsPlan?<><View style={{flexDirection:'row',gap:6,flexWrap:'wrap'}}>{subjects.map(s=><Pressable key={s} accessibilityRole="button" onPress={()=>setSubject(s)} style={{padding:10,borderRadius:12,backgroundColor:subject===s?c.primarySoft:c.inputBg}}><Copy size={12}>{s}</Copy></Pressable>)}</View>
    <TextInput accessibilityLabel="오늘 공부 계획" multiline value={plan} onChangeText={setPlan} maxLength={2000} placeholder="예: 기출 1번을 읽고 풀이의 첫 줄 써보기" placeholderTextColor={c.textMuted} style={{padding:14,minHeight:90,borderRadius:14,backgroundColor:c.inputBg,color:c.text,textAlignVertical:'top',fontSize:16}}/>
    <Copy muted size={13}>공부 시간 없이 계획만 저장해도 +5분. 다음은 2분 공부예요.</Copy>
    <Action label="계획 저장 · +5분 받기" disabled={!ready||busy||!subject.trim()||!plan.trim()} onPress={()=>void submit()}/>
   </>:resting?<><Copy muted size={13}>쉬는 시간은 공부 시간에 포함되지 않아요. 지금까지 공부한 시간과 필기는 그대로예요.</Copy>
    <Action label="쉬는 시간 건너뛰고 공부하기" disabled={!ready||busy} onPress={()=>void start()}/>
    <Link label="큰 타이머 보기" onPress={openTimer}/>
   </>:<>{status.plan?.text&&!secondary?<Copy muted size={13}>계획: {status.plan.text}</Copy>:null}
    {active?<Action label="진행 중인 큰 타이머 열기" onPress={openTimer}/>:<Action secondary={secondary} label={minutes+'분 집중 시작'} disabled={!ready||busy||!subject.trim()} onPress={()=>void start()}/>}
    {active?<Link label="필기 사진 확인하기" onPress={()=>nav.navigate('BookStudy')}/>:null}
    <Copy muted size={13}>{minutes}분 실제 공부와 새 필기 사진을 확인하면 +5분. {minutes<25?'다음 단계는 '+([2,5,10,15,25][status.level]??25)+'분이에요.':'이후에도 25분을 유지해요.'}</Copy>
   </>}
   {status.expired||resting?null:<Copy muted size={12}>집중 공부를 2시간 쉬면 계획부터 다시 시작해요.{data.outputDraft?'':' 필기 돈 보상은 100자당 500원이에요.'}</Copy>}
   {error?<Copy>{error}</Copy>:null}
  </CardView>
 </View>;
}
