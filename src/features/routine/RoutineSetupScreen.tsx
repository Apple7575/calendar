import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Alert,Animated,Modal,PanResponder,Platform,Pressable,ScrollView,Switch,TextInput,View} from 'react-native';
import * as Crypto from 'expo-crypto';
import {RootScreenProps} from '../../navigation/types';
import {DEFAULT_MORNING,MorningStep,saveMorningSteps} from '../../lib/routineModel';
import {saveEveningSteps,SUGGESTED_EVENING,SUGGESTED_MORNING} from '../../lib/dailyPlan';
import {useTheme} from '../../theme/ThemeContext';
import {tapLight} from '../../lib/haptics';
import {useRoutine} from './RoutineProvider';
import {Action,Copy,Icon,Link,Page,u} from './ui';
import {Segments} from './experience';

function DragRow({children,onDrop,onActive}:{children:React.ReactNode;onDrop:(delta:number)=>void;onActive:(active:boolean)=>void}){
 const dy=useRef(new Animated.Value(0)).current,latest=useRef({onDrop,onActive});latest.current={onDrop,onActive};
 const responder=useMemo(()=>PanResponder.create({onStartShouldSetPanResponder:()=>true,onMoveShouldSetPanResponder:()=>true,onPanResponderGrant:()=>{latest.current.onActive(true);tapLight()},onPanResponderMove:(_,g)=>dy.setValue(g.dy),onPanResponderRelease:(_,g)=>{dy.setValue(0);latest.current.onActive(false);latest.current.onDrop(g.dy)},onPanResponderTerminate:()=>{dy.setValue(0);latest.current.onActive(false)}}),[dy]);
 return <Animated.View style={{transform:[{translateY:dy}],zIndex:1,flexDirection:'row',alignItems:'center',gap:8}}><View {...responder.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel="드래그하여 순서 바꾸기" style={{width:34,minHeight:64,justifyContent:'center',alignItems:'center'}}><Icon name="reorder-two-outline" size={25}/></View>{children}</Animated.View>;
}
export function RoutineSetupScreen({route,navigation}:RootScreenProps<'RoutineSetup'>){
 const {data,ready,update}=useRoutine(),{colors:c}=useTheme(),[slot,setSlot]=useState<'morning'|'evening'>(route.params?.slot??'morning');
 const [drafts,setDrafts]=useState(()=>({morning:(data.morningSteps??DEFAULT_MORNING).map(s=>({...s})),evening:(data.eveningSteps??SUGGESTED_EVENING).map(s=>({...s}))}));
 const initialized=useRef(ready);
 useEffect(()=>{if(ready&&!initialized.current){initialized.current=true;setDrafts({morning:(data.morningSteps??DEFAULT_MORNING).map(s=>({...s})),evening:(data.eveningSteps??SUGGESTED_EVENING).map(s=>({...s}))})}},[ready,data.morningSteps,data.eveningSteps]);
 const [editing,setEditing]=useState<MorningStep|null>(null),[busy,setBusy]=useState(false),[dragging,setDragging]=useState(false),[error,setError]=useState('');
 const positions=useRef<Record<string,{y:number;height:number}>>({}),steps=drafts[slot];
 const put=(rows:MorningStep[])=>setDrafts(d=>({...d,[slot]:rows}));
 const move=(from:number,to:number)=>{if(to<0||to>=steps.length||to===from)return;const rows=[...steps];const [item]=rows.splice(from,1);rows.splice(to,0,item);put(rows);tapLight()};
 const save=async()=>{if(busy||!ready)return;setBusy(true);setError('');try{await update(s=>saveEveningSteps(saveMorningSteps(s,drafts.morning),drafts.evening));navigation.goBack()}catch(e){setError(e instanceof Error?e.message:'저장하지 못했어요.')}finally{setBusy(false)}};
 const recommended=()=>{const apply=()=>put((slot==='morning'?SUGGESTED_MORNING:SUGGESTED_EVENING).map(s=>({...s})));const message='이 탭에서 편집 중인 순서를 추천 구성으로 바꿔요. 저장 전까지 실제 루틴은 바뀌지 않아요. 이미 시작한 오늘 기록은 유지돼요.';if(Platform.OS==='web'){if(window.confirm(message))apply()}else Alert.alert('추천 구성 불러오기',message,[{text:'취소'},{text:'구성 바꾸기',onPress:apply}])};
 return <Page title="나에게 맞는 루틴" scrollEnabled={!dragging} right={<Link label="닫기" onPress={()=>navigation.goBack()}/>} footer={<Action label={busy?'저장 중…':'루틴 저장'} disabled={!ready||busy} onPress={()=>void save()}/>}>
  <Segments value={slot} onChange={value=>{setSlot(value);setEditing(null)}} items={[{id:'morning',label:'아침'},{id:'evening',label:'저녁'}]}/>
  <View style={u.between}><View><Copy muted size={12}>전체 목표</Copy><Copy size={27} weight="800">약 {steps.reduce((n,s)=>n+(s.minutes??5),0)}분</Copy></View><View><Copy muted size={12}>작은 목표</Copy><Copy size={27} weight="800">약 {steps.filter(s=>s.minimum).reduce((n,s)=>n+(s.minutes??5),0)}분</Copy></View></View>
  <Copy muted size={12}>행을 눌러 수정하고, 왼쪽 손잡이를 끌어 순서를 바꿔요. 위·아래 버튼으로도 이동할 수 있어요.</Copy>
  <View style={{gap:10}}>{steps.map((step,index)=><View key={step.id} onLayout={e=>{positions.current[step.id]=e.nativeEvent.layout}} style={{borderRadius:20,backgroundColor:c.card,borderWidth:1,borderColor:c.border,paddingHorizontal:8}}><DragRow onActive={setDragging} onDrop={delta=>{const source=positions.current[step.id];if(!source)return;const center=source.y+source.height/2+delta;let target=index,best=Infinity;steps.forEach((s,i)=>{const box=positions.current[s.id];if(box&&Math.abs(box.y+box.height/2-center)<best){target=i;best=Math.abs(box.y+box.height/2-center)}});move(index,target)}}>
   <Pressable accessibilityRole="button" accessibilityLabel={`${index+1}번째 ${step.title||'새 행동'} 편집`} onPress={()=>setEditing({...step})} style={{flex:1,paddingVertical:16,gap:4}}><Copy weight="700">{step.title||'새 행동'}</Copy><Copy muted size={12}>{step.minutes??5}분{step.minimum?' · 작은 목표 포함':''}</Copy></Pressable>
   <View><Pressable accessibilityRole="button" accessibilityLabel={`${index+1}번째 행동 위로`} disabled={index===0} onPress={()=>move(index,index-1)} style={{padding:10,opacity:index===0?0.3:1}}><Icon name="chevron-up" size={17}/></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`${index+1}번째 행동 아래로`} disabled={index===steps.length-1} onPress={()=>move(index,index+1)} style={{padding:10,opacity:index===steps.length-1?0.3:1}}><Icon name="chevron-down" size={17}/></Pressable></View>
  </DragRow></View>)}</View>
  <Action secondary label="행동 추가" disabled={steps.length>=12} onPress={()=>{const row={id:Crypto.randomUUID(),title:'',detail:'',minimum:false,minutes:5};put([...steps,row]);setEditing(row)}}/>
  <Link label="추천 순서 불러오기" onPress={recommended}/><Copy muted size={12}>저장한 설정은 아직 시작하지 않은 실행부터 적용돼요. 오늘 이미 체크한 단계·학습·보상은 바꾸지 않아요.</Copy>{error?<Copy>{error}</Copy>:null}
  <Modal visible={!!editing} transparent animationType="slide" onRequestClose={()=>setEditing(null)}><View style={{flex:1,justifyContent:'flex-end',backgroundColor:'rgba(20,30,30,0.4)'}}><View style={{padding:24,backgroundColor:c.card,borderTopLeftRadius:28,borderTopRightRadius:28,maxHeight:'90%',gap:14}}><View style={u.between}><Copy size={22} weight="800">행동 다듬기</Copy><Link label="닫기" onPress={()=>setEditing(null)}/></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:14,paddingBottom:22}}>
   {editing?<><Copy muted size={12}>행동 이름</Copy><TextInput accessibilityLabel="행동 이름" maxLength={60} value={editing.title} onChangeText={title=>setEditing(s=>s?{...s,title}:s)} style={{padding:14,borderRadius:14,color:c.text,backgroundColor:c.inputBg,fontSize:17}}/><Copy muted size={12}>짧은 설명 · 선택</Copy><TextInput accessibilityLabel="행동 설명" multiline maxLength={160} value={editing.detail} onChangeText={detail=>setEditing(s=>s?{...s,detail}:s)} style={{padding:14,minHeight:70,borderRadius:14,color:c.text,backgroundColor:c.inputBg}}/><View style={u.between}><Copy>목표 시간 (분)</Copy><TextInput accessibilityLabel="행동 목표 시간" keyboardType="number-pad" value={String(editing.minutes??5)} onChangeText={text=>setEditing(s=>s?{...s,minutes:Number(text)||0}:s)} style={{padding:14,minWidth:80,borderRadius:14,color:c.text,backgroundColor:c.inputBg}}/></View><View style={u.between}><Copy>작은 목표에도 포함</Copy><Switch accessibilityLabel="작은 목표에 포함" value={editing.minimum} trackColor={{true:c.primary,false:c.border}} onValueChange={minimum=>setEditing(s=>s?{...s,minimum}:s)}/></View>{error?<Copy>{error}</Copy>:null}<Action label="편집 반영" onPress={()=>{if(!editing.title.trim()||!Number.isInteger(editing.minutes)||editing.minutes!<1||editing.minutes!>120){setError('이름과 1~120분을 입력해 주세요.');return;}put(steps.map(s=>s.id===editing.id?{...editing}:s));setEditing(null);setError('')}}/><Link label="이 행동 삭제" onPress={()=>{put(steps.filter(s=>s.id!==editing.id));setEditing(null)}}/></>:null}
  </ScrollView></View></View></Modal>
 </Page>;
}

