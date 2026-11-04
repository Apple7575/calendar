import React from 'react';
import {KeyboardAvoidingView,Platform,Pressable,Text,View} from 'react-native';
import {PriorityTask} from '../../lib/priorityPlan';
import {Icon,Mascot,Page} from './ui';
import {PriorityButton,PriorityField,usePriorityVisuals} from './PriorityUI';
export function PriorityPauseView({penalty='',task,text,onChange,busy,error,onSave,onSkip,onBack}:{penalty?:string;task?:PriorityTask;text:string;onChange:(text:string)=>void;busy:boolean;error:string;onSave:()=>void;onSkip:()=>void;onBack:()=>void}){
 const p=usePriorityVisuals();
 return <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><Page title="잠깐 멈추기" keyboardInsets={false} right={<Pressable accessibilityRole="button" accessibilityLabel="공부로 돌아가기" onPress={onBack} style={{width:44,height:44,alignItems:'center',justifyContent:'center'}}><Icon name="close" color={p.muted} size={23}/></Pressable>} footer={<View style={{gap:7}}><PriorityButton icon="pause" label={busy?'저장하고 있어요…':'저장하고 멈추기'+(penalty?' · '+penalty:'')} accessibilityLabel="다음 행동 저장하고 잠깐 멈추기" disabled={busy||!task||!text.trim()} onPress={onSave}/><Pressable accessibilityRole="button" accessibilityLabel="지금은 메모 없이 멈추기" disabled={busy} onPress={onSkip} style={{alignItems:'center',paddingVertical:12}}><Text style={{color:p.muted,fontSize:13}}>메모 없이 멈추기{penalty?' · '+penalty:''}</Text></Pressable></View>}>
  <View style={{height:147,borderRadius:24,backgroundColor:p.stage,overflow:'hidden',justifyContent:'center',paddingLeft:23}}><View style={{gap:7,zIndex:1}}><Icon name="bookmark" size={22} color={p.brand}/><Text style={{fontSize:22,fontWeight:'800',color:p.ink}}>돌아올 자리를{`\n`}남겨둘까요?</Text></View><View style={{position:'absolute',right:-8,bottom:-13}}><Mascot character="C03" action="A60" size={190}/></View></View>
  <View style={{paddingHorizontal:3,paddingTop:7,gap:8}}><Text style={{color:p.brandInk,fontSize:13,fontWeight:'700'}}>{task?.subject??'집중 공부'}</Text><Text style={{color:p.ink,fontSize:24,lineHeight:34,fontWeight:'800',letterSpacing:-.6}}>다음에 할 첫 행동</Text><Text style={{color:p.muted,fontSize:13,lineHeight:21}}>다시 앉았을 때, 이 한 줄부터 시작해요.</Text></View>
  <PriorityField label="" accessibilityLabel="이어갈 첫 행동" value={text} onChangeText={onChange} placeholder="예: 33쪽 2번 회로부터 그리기" multiline/>
  {task?<Pressable accessibilityRole="button" accessibilityLabel="지금의 첫 행동 가져오기" onPress={()=>onChange(task.nextAction||task.action)} style={{flexDirection:'row',gap:7,alignItems:'center',alignSelf:'flex-start',paddingVertical:8}}><Icon name="return-down-forward-outline" color={p.brandInk} size={16}/><Text style={{color:p.brandInk,fontSize:12,fontWeight:'700'}}>지금의 첫 행동 가져오기</Text></Pressable>:null}
  <Text style={{fontSize:12,lineHeight:20,color:p.muted}}>{penalty?'이번 단계를 못 채워 '+penalty+'이 있어요. 기록과 받은 보상은 그대로예요.':'타이머만 정지해요. 기록과 받은 보상은 그대로예요.'}</Text>{error?<Text style={{color:p.ink,fontSize:13,lineHeight:21}}>{error}</Text>:null}
 </Page></KeyboardAvoidingView>;
}
