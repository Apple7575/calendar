import React,{useRef,useState} from 'react';
import {Switch,View} from 'react-native';
import {getDay} from '../../lib/routineModel';
import {timeWallet} from '../../lib/timeWallet';
import {runScreenTimeAction,syncRoutineRewards} from '../../lib/screenTime';
import {useTheme} from '../../theme/ThemeContext';
import {wordDailyCap} from '../../lib/studyRewards';
import {useRoutine} from './RoutineProvider';
import {Copy,Link,u} from './ui';
export function RewardUseToggle({onConnect}:{onConnect?:()=>void}){
 const {data,dayKey,native,refreshNative,ready}=useRoutine(),{colors:c}=useTheme(),[busy,setBusy]=useState(false),[error,setError]=useState(''),inFlight=useRef(false);
 const day=getDay(data,dayKey),wallet=timeWallet(day,dayKey,native),on=wallet.connected&&!!native?.usingRewards;
 const canStart=wallet.connected&&wallet.morning&&wallet.balance>0&&!native?.sleepLocked&&!(native?.focusUntil&&native.focusUntil>Date.now())&&!data.pendingStudyAdjustment;
 const change=async(value:boolean)=>{if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');try{if(value)await syncRoutineRewards(dayKey,{...day.paid,book:day.bonus?.book??0,extra:day.bonus?.words??0,quick:day.bonus?.quick??0,wordDailyCap:wordDailyCap(data,dayKey),...(native?.supportsOrderBonus?{order:day.bonus?.order??0}:{}),...(native?.supportsFreeStudyRewards?{freeStudy:day.bonus?.freeStudy??0}:{})});await runScreenTimeAction(value?'startRewardUse':'pauseRewardUse');}catch(e){setError(e instanceof Error?e.message:'시간 사용을 변경하지 못했어요.')}finally{await refreshNative();inFlight.current=false;setBusy(false)}};
 return <View style={{gap:3,paddingHorizontal:4}}><View style={[u.between,{gap:14}]}><View style={{flex:1}}><Copy weight="800">시간 사용 {on?'켜짐':'꺼짐'}</Copy><Copy muted size={12}>{busy?'기기에 반영하고 있어요…':!wallet.connected?'아이폰 스크린타임 연결 후 사용할 수 있어요.':wallet.reason}</Copy></View><Switch accessibilityLabel="시간 사용" accessibilityState={{disabled:busy||!ready||!wallet.connected||!on&&!canStart}} disabled={busy||!ready||!wallet.connected||!on&&!canStart} value={on} trackColor={{true:c.primary,false:c.border}} thumbColor={c.white} ios_backgroundColor={c.border} onValueChange={value=>void change(value)}/></View>{!wallet.connected&&onConnect?<Link label="제한 앱 연결 설정" onPress={onConnect}/>:null}{error?<Copy size={12}>{error}</Copy>:null}</View>;
}

