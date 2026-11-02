import React,{useState} from 'react';
import {Pressable,Switch,TextInput,View} from 'react-native';
import * as Crypto from 'expo-crypto';
import {RootScreenProps} from '../../navigation/types';
import {addDays} from '../../lib/dateUtils';
import {PriorityTask,priorityPlan,savePriorityDay,setPriorityPolicy} from '../../lib/priorityPlan';
import {useRoutine} from './RoutineProvider';
import {useTheme} from '../../theme/ThemeContext';
import {Action,CardView,Copy,Icon,Link,Page,u} from './ui';
import {Segments} from './experience';

const examples=[{subject:'전기공사기사 실기',action:'기출 1번의 조건에 밑줄 긋고 풀이 첫 줄 쓰기',preparation:'기출 책과 노트를 펼치고 펜 꺼내기',target:'문제 3개 풀이와 오답 정리'},{subject:'수능',action:'오늘 풀 지문 첫 문단을 읽고 핵심 한 줄 쓰기',preparation:'문제집 페이지를 펼치고 휴대폰 뒤집기',target:'지문 2개와 오답 정리'}];
const empty=():PriorityTask=>({id:Crypto.randomUUID(),subject:'',action:'',preparation:'',target:'',minimum:120});
export function PriorityPlanScreen({navigation,route}:RootScreenProps<'PriorityPlan'>){
 const {data,dayKey,update,ready}=useRoutine(),{colors:c}=useTheme(),tomorrow=addDays(dayKey,1);
 const [key,setKey]=useState(route.params?.day??dayKey),[drafts,setDrafts]=useState<Record<string,PriorityTask[]>>({}),[gate,setGate]=useState(data.priorityPolicy?.enabled??true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState('');
 const previous=Object.values(data.priorityDays??{}).filter(p=>p.day<key).sort((a,b)=>b.day.localeCompare(a.day))[0];
 const tasks=drafts[key]??priorityPlan(data,key)?.tasks??[empty()];
 const change=(next:PriorityTask[])=>{setDrafts(d=>({...d,[key]:next}));setSaved('')};
 const field=(id:string,name:keyof PriorityTask,text:string)=>change(tasks.map(t=>t.id===id?{...t,[name]:text}:t));
 const move=(index:number,delta:number)=>{const next=[...tasks],to=index+delta;if(to<0||to>=next.length)return;[next[index],next[to]]=[next[to],next[index]];change(next)};
 const input=(t:PriorityTask,name:'subject'|'action'|'preparation'|'target',label:string,placeholder:string)=> <View style={{gap:5}}><Copy size={12} weight="700">{label}</Copy><TextInput accessibilityLabel={`${tasks.indexOf(t)+1}번째 ${label}`} value={t[name]} editable={!t.startedAt} onChangeText={v=>field(t.id,name,v)} maxLength={name==='subject'?80:300} multiline={name!=='subject'} placeholder={placeholder} placeholderTextColor={c.textMuted} style={{padding:13,borderRadius:12,backgroundColor:c.inputBg,color:c.text,fontSize:15,minHeight:name==='subject'?45:65,textAlignVertical:'top'}}/></View>;
 const save=async()=>{setBusy(true);setError('');try{await update(s=>setPriorityPolicy(savePriorityDay(s,key,tasks),gate,key));setSaved(key===dayKey?'오늘의 첫 행동을 준비했어요.':'내일 아침, 이 행동부터 보여드릴게요.');setDrafts(d=>{const next={...d};delete next[key];return next})}catch(e){setError(e instanceof Error?e.message:'계획을 저장하지 못했어요.')}finally{setBusy(false)}};
 return <Page title="중요한 공부 준비" right={<Link label="닫기" onPress={()=>navigation.goBack()}/>} footer={<Action label={busy?'저장 중…':'첫 행동까지 준비해 두기'} disabled={!ready||busy} onPress={()=>void save()}/>}>
  <Segments value={key} items={[{id:dayKey,label:'오늘'},{id:tomorrow,label:'내일'}]} onChange={setKey}/>
  <View style={{padding:22,borderRadius:25,backgroundColor:c.primarySoft,gap:8}}><Copy size={25} weight="800">시작할 때는, 고민 없이.</Copy><Copy>중요한 공부를 1~3개만 정해요. 큰 목표보다 책을 펼쳤을 때 바로 할 첫 행동을 적어 주세요.</Copy><Copy muted size={12}>{key} · 하루는 새벽 4시에 시작해요.</Copy></View>
  {tasks.map((t,i)=><CardView key={t.id}><View style={u.between}><Copy size={20} weight="800">{i+1}순위 {i===0?'· 먼저 시작할 공부':''}</Copy><View style={{flexDirection:'row',gap:7}}><Link label="↑" disabled={i===0||!!t.startedAt} onPress={()=>move(i,-1)}/><Link label="↓" disabled={i===tasks.length-1||!!t.startedAt} onPress={()=>move(i,1)}/>{tasks.length>1?<Link label="삭제" disabled={!!t.startedAt} onPress={()=>change(tasks.filter(p=>p.id!==t.id))}/>:null}</View></View>
   {input(t,'subject','과목','예: 전기기사 실기')}{input(t,'action','바로 할 첫 행동','예: 32쪽 1번 조건에 밑줄 긋고 풀이 첫 줄 쓰기')}{input(t,'preparation','미리 준비할 것 · 선택','예: 책 32쪽, 노트, 펜 펼쳐두기')}{input(t,'target','오늘 이어갈 분량 · 선택','예: 기출 3문제와 오답 정리')}
   <Copy size={12} weight="700">부담 없는 작은 시작</Copy><View style={{flexDirection:'row',gap:8}}>{([120,300] as const).map(seconds=><Pressable key={seconds} accessibilityRole="button" accessibilityState={{selected:t.minimum===seconds}} disabled={!!t.startedAt} onPress={()=>change(tasks.map(p=>p.id===t.id?{...p,minimum:seconds}:p))} style={{padding:12,borderRadius:12,backgroundColor:t.minimum===seconds?c.primarySoft:c.inputBg}}><Copy>{seconds/60}분 + 필기 사진</Copy></Pressable>)}</View>{t.startedAt?<Copy muted size={12}>시작한 공부와 순서는 오늘 유지해요. 내일 계획은 자유롭게 바꿀 수 있어요.</Copy>:null}
  </CardView>)}
  {tasks.length<3?<Action secondary label="중요한 공부 하나 더" onPress={()=>change([...tasks,empty()])}/>:null}
  {!priorityPlan(data,key)&&previous?<Link label="지난 계획의 다음 행동 가져오기" onPress={()=>change(previous.tasks.map(t=>({...empty(),subject:t.subject,action:t.nextAction||t.action,preparation:t.preparation,target:t.target,minimum:t.minimum})))}/>:null}
  {!priorityPlan(data,key)?<Link label="예시로 시작 · 저장 전 수정 가능" onPress={()=>change(examples.map(t=>({...empty(),...t})))}/>:null}
  {key===tomorrow&&priorityPlan(data,dayKey)?<Link label="오늘 계획을 복사해 수정하기" onPress={()=>change(priorityPlan(data,dayKey)!.tasks.map(t=>({...empty(),subject:t.subject,action:t.nextAction||t.action,preparation:t.preparation,target:t.target,minimum:t.minimum})))}/>:null}
  <CardView><View style={u.between}><View style={{flex:1}}><Copy weight="800">1순위 작은 시작 후 시간 사용</Copy><Copy muted size={12}>아침 루틴과 1순위 공부를 시작한 뒤 오락 앱을 사용해요.</Copy></View><Switch accessibilityLabel="중요한 공부 먼저" value={gate} onValueChange={setGate} trackColor={{true:c.primary,false:c.border}}/></View><Copy size={13}>다른 공부의 보상도 계속 적립돼요. 첫 공부 {tasks[0]?.minimum/60||2}분과 필기 사진을 확인하면 오늘의 첫 공부 조건은 충족돼요. 계획을 쓰기만 해서는 이 조건이 열리지 않아요.</Copy><Link label="60분 보너스의 전체 순서 확인" onPress={()=>navigation.navigate('HabitOrderSettings')}/><Copy muted size={12}>기존 순서 보너스 +60분은 별도예요. 여기의 작은 시작 완료가 전체 공부 완료를 뜻하지는 않아요. 보상 규칙은 그대로 유지해요.</Copy></CardView>
  {saved?<CardView><Copy weight="800">✓ {saved}</Copy><Action label="오늘 화면에서 확인" onPress={()=>navigation.popTo('Main',{screen:'Today'})}/></CardView>:null}{error?<Copy>{error}</Copy>:null}
 </Page>;
}
