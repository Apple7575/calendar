import React,{useRef,useState} from 'react';
import {Alert,Pressable,Switch,View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/types';
import {getDay} from '../../lib/routineModel';
import {timeWallet} from '../../lib/timeWallet';
import {runScreenTimeAction,syncRoutineRewards} from '../../lib/screenTime';
import {rewardSyncExtras} from '../../lib/focusPenalty';
import {useTheme} from '../../theme/ThemeContext';
import {wordDailyCap} from '../../lib/studyRewards';
import {priorityGate} from '../../lib/priorityPlan';
import {useRoutine} from './RoutineProvider';
import {Copy,Link,u} from './ui';
export function RewardUseToggle({onConnect,compact=false,inline=false,toolbar=false}:{onConnect?:()=>void;compact?:boolean;inline?:boolean;toolbar?:boolean}){
 const {data,dayKey,native,refreshNative,ready}=useRoutine(),{colors:c}=useTheme(),navigation=useNavigation<NativeStackNavigationProp<RootStackParamList>>();
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),inFlight=useRef(false);
 const gate=priorityGate(data,dayKey),day=getDay(data,dayKey),wallet=timeWallet(day,dayKey,native),on=wallet.connected&&!!native?.usingRewards&&!gate.blocked;
 const focus=!!native?.focusUntil&&native.focusUntil>Date.now();
 const canStart=ready&&!gate.blocked&&(!gate.required||!!native?.supportsPriorityGate)&&wallet.connected&&native?.day===dayKey&&wallet.morning&&wallet.balance>0&&!native?.sleepLocked&&!focus&&!data.pendingStudyAdjustment;
 const connect=onConnect??(()=>navigation.navigate('RoutineScreenTime'));
 const explain=(title:string,message:string,actionLabel?:string,action?:()=>void)=>{
  setError(message);Alert.alert(title,message,action?[{text:'닫기',style:'cancel'},{text:actionLabel??'확인',onPress:action}]:[{text:'확인'}]);
 };
 const change=async(value:boolean)=>{
  if(inFlight.current)return;
  if(value){
   if(!ready){explain('기록을 불러오고 있어요','잔액과 잠금 상태를 확인한 뒤 다시 눌러 주세요.');return;}
   if(data.pendingStudyAdjustment){explain('보상을 복원하고 있어요','취소한 카드의 보상을 기기에 반영한 뒤 사용할 수 있어요.');return;}
   if(!wallet.connected){explain('스크린타임 연결이 필요해요','제한할 앱과 스크린타임 권한을 확인하면 모은 시간을 사용할 수 있어요.','연결 설정',connect);return;}
   if(native?.day!==dayKey){explain('오늘 잔액을 확인하고 있어요','기기의 날짜와 잔액을 다시 확인해 주세요.','상태 다시 확인',()=>void refreshNative());return;}
   if(!wallet.morning){explain('아침 루틴을 먼저 마쳐 주세요',`남은 ${wallet.balance}분은 보관 중이에요. 아침 전체 또는 작은 목표를 마치면 사용할 수 있어요.`,'아침 루틴 열기',()=>navigation.navigate('GuidedRoutine',{slot:'morning'}));return;}
   if(gate.required&&!native?.supportsPriorityGate){explain('새 아이폰 빌드가 필요해요','이 설치본은 첫 공부 잠금을 지원하지 않아요. 계획과 실천 기록은 저장돼요. 새 빌드 설치 후 기기 잠금이 적용돼요.');return;}
   if(gate.blocked){explain('중요한 공부부터 작게 시작해요',gate.reason+' 다른 공부로 모은 시간은 그대로 보관돼요.','오늘의 첫 공부',()=>navigation.navigate('Main',{screen:'Today'}));return;}
   if(native?.sleepLocked){explain('취침 준비 시간이에요',`남은 ${wallet.balance}분은 보관 중이에요. 취침 잠금이 끝난 뒤 시간 사용을 켤 수 있어요.`);return;}
   if(focus){
    const t=data.bookTimer,active=t&&t.phase!=='idle';
    const phase=active&&t.phase==='break'?'휴식':'집중 공부';
    const detail=active?`${phase} 타이머가 ${t.running?'진행 중':'일시정지 상태'}이에요. 타이머를 종료하거나 휴식까지 끝내면 시간 사용을 켤 수 있어요.`:'기기에 집중·휴식 잠금이 남아 있어요. 공부 타이머와 기기 상태를 확인해 주세요.';
    explain('집중·휴식 중에는 사용할 수 없어요',`잔액 ${wallet.balance}분은 사라지지 않았어요. ${detail}`,'집중 공부 열기',()=>navigation.navigate('BookStudy'));return;
   }
   if(wallet.balance<=0){explain('지금 사용할 잔액이 없어요',wallet.pending>0?`${wallet.pending}분이 기기 반영 대기 중이에요. 상태를 다시 확인해 주세요.`:'남은 시간이 0분이에요. 루틴이나 공부로 시간을 모은 뒤 켤 수 있어요.',wallet.pending>0?'상태 다시 확인':'학습 열기',()=>wallet.pending>0?void refreshNative():navigation.navigate('Main',{screen:'Study'}));return;}
  }
  inFlight.current=true;setBusy(true);setError('');
  try{
   if(value)await syncRoutineRewards(dayKey,{...day.paid,book:day.bonus?.book??0,extra:day.bonus?.words??0,quick:day.bonus?.quick??0,wordDailyCap:wordDailyCap(data,dayKey),...(native?.supportsOrderBonus?{order:day.bonus?.order??0}:{}),...(native?.supportsFreeStudyRewards?{freeStudy:day.bonus?.freeStudy??0}:{}),...rewardSyncExtras(data,dayKey,native)});
   await runScreenTimeAction(value?'startRewardUse':'pauseRewardUse');
  }catch(e){explain('시간 사용을 변경하지 못했어요',e instanceof Error?e.message:'기기 상태를 확인하고 다시 시도해 주세요.','상태 다시 확인',()=>void refreshNative());}
  finally{await refreshNative();inFlight.current=false;setBusy(false);}
 };
 if(toolbar)return <View style={{gap:4}}><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',minHeight:44}}><Pressable accessibilityRole="button" accessibilityLabel="사용 시간 상세" onPress={()=>navigation.navigate('TimeWallet')} style={{minHeight:44,justifyContent:'center'}}><Copy size={12} muted>{!wallet.connected?'스크린타임 연결 전':wallet.held>0?wallet.held+'분 보관 중':'시간 사용 '+(on?'켜짐':'꺼짐')}</Copy></Pressable><Switch accessibilityLabel="시간 사용" accessibilityHint="켤 수 없으면 이유와 해결 방법을 안내해요" disabled={busy} value={on} trackColor={{true:c.primary,false:c.border}} thumbColor={c.white} ios_backgroundColor={c.border} onValueChange={value=>void change(value)}/></View>{error?<Copy size={12}>{error}</Copy>:null}</View>;
 if(inline)return <View style={{backgroundColor:c.card,borderRadius:20,padding:16,gap:7,borderWidth:1,borderColor:c.border}}><View style={{flexDirection:'row',alignItems:'center',gap:14}}><Pressable testID="time-wallet-summary" accessibilityRole="button" accessibilityLabel="사용 시간 상세" onPress={()=>navigation.navigate('TimeWallet')} style={{flex:1,gap:3}}><Copy size={11} muted>{!wallet.connected?'스크린타임 연결 전':gate.blocked?'첫 공부 시작 전':'지금 사용할 수 있는 시간'}</Copy><View style={{flexDirection:'row',alignItems:'center',gap:8}}><Copy size={24} weight="800">{wallet.available}분</Copy>{wallet.held>0?<Copy size={11} muted>{wallet.held}분 보관 중</Copy>:null}</View></Pressable><View style={{alignItems:'center',gap:3}}><Copy size={10} muted>시간 사용 {on?'켜짐':'꺼짐'}</Copy><Switch accessibilityLabel="시간 사용" accessibilityState={{disabled:busy}} disabled={busy} value={on} trackColor={{true:c.primary,false:c.border}} thumbColor={c.white} ios_backgroundColor={c.border} onValueChange={value=>void change(value)}/></View></View>{error?<Copy size={12}>{error}</Copy>:null}</View>;
 return <View style={{gap:3,paddingHorizontal:4}}><View style={[u.between,{gap:14}]}><View style={{flex:1}}><Copy weight="800">남은 시간 {wallet.balance}분 · 시간 사용 {on?'켜짐':'꺼짐'}</Copy><Copy muted size={12}>{busy?'기기에 반영하고 있어요…':!wallet.connected?'아이폰 스크린타임 연결 후 사용할 수 있어요.':gate.required&&!native?.supportsPriorityGate?'첫 공부 잠금은 새 아이폰 빌드에서 적용돼요.':gate.blocked?gate.reason:focus?'집중·휴식 타이머 종료 후 사용할 수 있어요.':wallet.reason}</Copy></View><Switch accessibilityLabel="시간 사용" accessibilityHint={!on&&!canStart?'누르면 켤 수 없는 이유와 해결 방법을 안내해요.':undefined} accessibilityState={{disabled:busy}} disabled={busy} value={on} trackColor={{true:c.primary,false:c.border}} thumbColor={c.white} ios_backgroundColor={c.border} onValueChange={value=>void change(value)}/></View>{!compact&&!wallet.connected?<Link label="제한 앱 연결 설정" onPress={connect}/>:null}{!compact&&!on&&!canStart&&!busy?<Link label="왜 켤 수 없나요?" onPress={()=>void change(true)}/>:null}{error?<Copy size={12}>{error}</Copy>:null}</View>;
}
