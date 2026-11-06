import React,{useEffect,useMemo,useState} from 'react';
import {Platform,View} from 'react-native';
import * as Crypto from 'expo-crypto';
import {beginEmergencyUnlock,cancelEmergencyUnlock,EMERGENCY_POLICY,emergencyBlock,emergencyOpenUntil,emergencyPrice,finishEmergencyUnlock} from '../../lib/emergencyUnlock';
import {penaltyLabel} from '../../lib/focusPenalty';
import {clockLabel} from '../../lib/focusJourney';
import {emergencyGoal,type GoalReminder} from '../../lib/goalReminder';
import {startEmergencyUnlock} from '../../lib/screenTime';
import {RootScreenProps} from '../../navigation/types';
import {space} from '../../theme/tokens';
import {useRoutine} from './RoutineProvider';
import {useTheme} from '../../theme/ThemeContext';
import {colorRoles} from '../../theme/roles';
import {Action,CardView,Copy,Field,Link,Notice,Page,Progress} from './ui';

const P=EMERGENCY_POLICY;
const BLOCKED={studying:'공부 중에는 쓸 수 없어요. 공부 잠금은 여기서 풀리지 않아요.','not-sleep':'긴급 해제는 취침 잠금 시간(21시~04시 30분)에만 쓸 수 있어요.'} as const;
/** The goal furthest behind, in the user's own words, above the price. It only shows; nothing here changes the rules. */
function GoalReminderCard({reminder:{goal,dueLabel,duePassed,week}}:{reminder:GoalReminder}){
 const theme=useTheme();
 return <View testID="emergency-goal"><CardView style={{gap:space.xs}}>
  <Copy variant="label" style={{color:colorRoles(theme).primary.ink}}>{'내 목표'+(dueLabel&&!duePassed?' · '+dueLabel:'')}</Copy>
  <Copy variant="heading">{goal.title}</Copy>
  {goal.why?<View style={{gap:2}}><Copy variant="caption" muted>내가 적은 이유</Copy><Copy numberOfLines={3}>{goal.why}</Copy></View>:null}
  {week?<View style={{gap:space.xxs}}>
   <Copy variant="caption" muted>{`이번 주 ${week.count}일 / 주 ${week.target}일`}</Copy>
   <Progress value={week.count/Math.max(1,week.target)} label={`${goal.title} 이번 주 공부한 날 ${week.count}일, 목표 ${week.target}일`}/>
  </View>:null}
 </CardView></View>;
}
/** Opening the apps during the sleep lock. The price, a reason and a wait come first, so it is not done on reflex. */
export function EmergencyUnlockScreen({navigation}:RootScreenProps<'EmergencyUnlock'>){
 const {data,dayKey,native,update,refreshNative}=useRoutine(),[now,setNow]=useState(Date.now()),[reason,setReason]=useState(''),[wait,setWait]=useState<number>(P.waitSeconds),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const hasReason=!!reason.trim();
 useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),250);return()=>clearInterval(id)},[]);
 /** The wait starts once there is a reason, and starts over if it is cleared. */
 useEffect(()=>{
  if(!hasReason){setWait(P.waitSeconds);return}
  const started=Date.now(),id=setInterval(()=>{const left=P.waitSeconds-Math.floor((Date.now()-started)/1000);setWait(Math.max(0,left));if(left<=0)clearInterval(id)},250);
  return()=>clearInterval(id);
 },[hasReason]);
 const nativeUntil=native?.emergencyUntil,until=emergencyOpenUntil(data,nativeUntil,now),block=emergencyBlock(data,nativeUntil,now),price=emergencyPrice(data,now),supported=Platform.OS==='web'||!!native?.supportsEmergencyUnlock;
 const reminder=useMemo(()=>emergencyGoal(data,dayKey),[data,dayKey]);
 const submit=async()=>{
  if(busy||wait>0||!hasReason)return;
  setBusy(true);setError('');
  const id=Crypto.randomUUID();
  try{
   let minutes=0;
   await update(s=>{const next=beginEmergencyUnlock(s,id,reason,Date.now(),nativeUntil);minutes=next.emergencyPending?.minutes??0;return next});
   try{
    const opened=await startEmergencyUnlock(id,P.minutes,minutes);
    await update(s=>finishEmergencyUnlock(s,id,opened.until));
   }catch(e){
    await update(s=>cancelEmergencyUnlock(s,id));
    throw new Error((e instanceof Error?e.message+' ':'')+'열리지 않았고 벌점도 없어요.');
   }
   setReason('');
  }catch(e){setError(e instanceof Error?e.message:'긴급 해제를 하지 못했어요.')}
  finally{setBusy(false);void refreshNative()}
 };
 const close=<Link label="닫기" onPress={()=>navigation.goBack()}/>;
 if(until)return <Page title="긴급 해제" right={close}>
  <CardView><Copy variant="section">제한 앱이 열려 있어요</Copy><Copy variant="title" style={{fontVariant:['tabular-nums']}}>{clockLabel(Math.ceil((until-now)/1000))}</Copy><Copy>시간이 끝나면 앱이 꺼져 있어도 다시 잠겨요.</Copy><Copy variant="caption" muted>이 시간에 쓴 만큼 사용 시간에 함께 집계돼요.</Copy></CardView>
  {Platform.OS==='web'?<Notice>웹 미리보기라 실제 잠금은 바뀌지 않아요.</Notice>:null}
 </Page>;
 return <Page title="긴급 해제" right={close}>
  {block==='studying'||block==='not-sleep'?<Notice tone="warning">{BLOCKED[block]}</Notice>:null}
  {!supported?<Notice tone="warning">긴급 해제는 새 아이폰 빌드에서 쓸 수 있어요.</Notice>:null}
  {block?null:<>
   {reminder?<GoalReminderCard reminder={reminder}/>:null}
   <CardView>
    <Copy variant="heading">{'제한 앱을 '+P.minutes+'분 열어요'}</Copy>
    <Copy variant="section">{'오늘 '+price.order+'번째 · '+penaltyLabel(price)}</Copy>
    <Copy>누르는 순간 벌점이 기록되고 되돌릴 수 없어요.</Copy>
    <Copy variant="caption" muted>{P.penalties.map((p,i)=>(i===P.penalties.length-1?i+1+'번째부터':i+1+'번째')+' '+p.minutes+'분·'+p.won.toLocaleString('ko-KR')+'원').join(' / ')+(data.money?'':' · 돈 보상을 쓰지 않으면 돈은 빠지지 않아요')}</Copy>
    <Copy variant="caption" muted>벌점이 큰 날은 다음 날로 60분까지만 넘어가요.</Copy>
   </CardView>
   <CardView style={{gap:space.sm}}>
    <Field label="왜 지금 필요한가요?" value={reason} onChangeText={setReason} maxLength={P.reasonChars} placeholder="이유 한 줄"/>
    {error?<Notice tone="error">{error}</Notice>:null}
    <Action variant="danger" loading={busy} disabled={!supported||!hasReason||wait>0||busy} label={!hasReason?'이유를 적어 주세요':wait>0?wait+'초 뒤에 누를 수 있어요':'벌점 받고 '+P.minutes+'분 열기'} onPress={()=>void submit()}/>
   </CardView>
  </>}
 </Page>;
}
/** The way in, shown only in the sleep lock's hours. */
export function EmergencyUnlockLink({onPress}:{onPress:()=>void}){
 const {data,native}=useRoutine(),block=emergencyBlock(data,native?.emergencyUntil),connected=Platform.OS==='web'||(!!native?.enabled&&!!native.rewardMode);
 if(!connected||block==='not-sleep')return null;
 return <Link label={block==='open'?'긴급 해제 중 · 남은 시간 보기':'꼭 써야 하나요? 긴급 해제'} onPress={onPress}/>;
}
