import React,{useState} from 'react';
import {Pressable,TextInput,View} from 'react-native';
import * as Crypto from 'expo-crypto';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/types';
import {SUBJECTS,startBookTimer,StudyRewardMode} from '../../lib/bookStudy';
import {startOutputStudy} from '../../lib/handwriting';
import {focusSubject,habitOrderPolicy} from '../../lib/habitOrder';
import {useTheme} from '../../theme/ThemeContext';
import {useRoutine} from './RoutineProvider';
import {Action,Copy,Link} from './ui';
import {BoriScene,Segments} from './experience';
export function FocusStart({initialSubject}:{initialSubject?:string;initialRewardMode?:StudyRewardMode}){
 const nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>(),{data,update,ready}=useRoutine(),{colors:c}=useTheme();
 const [subject,setSubject]=useState(initialSubject??data.outputDraft?.subject??SUBJECTS[0]),[minutes,setMinutes]=useState<'25'|'50'>('50'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const subjects=[...new Set([...SUBJECTS,...habitOrderPolicy(data).sequence.map(focusSubject).filter((s):s is string=>!!s)])],active=data.bookTimer&&data.bookTimer.phase!=='idle';
 const start=async(timer:boolean)=>{if(busy)return;setBusy(true);setError('');try{await update(s=>{let next=startOutputStudy(s,Crypto.randomUUID(),subject);if(timer)next=startBookTimer(next,Crypto.randomUUID(),next.outputDraft!.subject,Date.now(),Number(minutes)*60,'output');return next});nav.navigate('BookStudy');}catch(e){setError(e instanceof Error?e.message:'공부를 시작하지 못했어요.');}finally{setBusy(false);}};
 return <View style={{gap:16}}><BoriScene tone="focus" mood="focus" title="공부한 만큼, 손으로 남겨요" description="노트 사진 속 손글씨 100자마다 +5분. 하루 보상 상한은 없어요." size={140}/>
  <Copy weight="800">어떤 공부를 할까요?</Copy><TextInput accessibilityLabel="공부 주제" value={subject} onChangeText={setSubject} editable={!data.outputDraft} maxLength={80} placeholder="예: 전기공사기사 기출 풀이" placeholderTextColor={c.textMuted} style={{padding:16,borderRadius:18,backgroundColor:c.inputBg,color:c.text,fontSize:17}}/>
  {!data.outputDraft?<View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}>{subjects.map(s=><Pressable key={s} accessibilityRole="button" accessibilityState={{selected:subject===s}} onPress={()=>setSubject(s)} style={{padding:12,borderRadius:16,backgroundColor:subject===s?c.primarySoft:c.inputBg}}><Copy size={13}>{s}</Copy></Pressable>)}</View>:null}
  <Action label={data.outputDraft?'손글씨 공부 이어가기':'공부 시작 · 타이머 없이'} disabled={!ready||busy||!subject.trim()} onPress={()=>void start(false)}/>
  {active?<Link label="진행 중인 타이머로 돌아가기" onPress={()=>nav.navigate('BookStudy')}/>:<><Copy weight="700">필요하면 집중 타이머도 함께</Copy><Segments value={minutes} onChange={setMinutes} items={[{id:'25',label:'25분 + 휴식 5분'},{id:'50',label:'50분 + 휴식 5분'}]}/><Action secondary label={`${minutes}분 타이머로 공부하기`} disabled={!ready||busy||!subject.trim()} onPress={()=>void start(true)}/></>}
  <Copy muted size={12}>기본 목표는 과목별 손글씨 500자예요. 더 써도 계속 적립돼요. 타이머와 한 줄 기록은 시간 보상을 따로 지급하지 않아요. 모든 공부 주제에 같은 기준을 적용해요.</Copy>{error?<Copy>{error}</Copy>:null}
 </View>;
}
