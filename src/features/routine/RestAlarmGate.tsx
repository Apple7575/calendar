import React,{useEffect,useRef,useState} from 'react';
import {AppState,Pressable,Text,View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {restAlarmArm,restAlarmEnd,restAlarmRinging} from '../../lib/restAlarm';
import {startRestAlarm,stopRestAlarm} from '../../lib/restAlarmSound';
import {useRoutine} from './RoutineProvider';
import {useRestAlarmSetting} from './useRestAlarmSetting';

/**
 * 휴식 끝 알람 (S1-21). 앱이 켜진 채 휴식이 끝나면 어느 화면에서든 소리·진동을 반복하고, 위에 '알람 끄기'를 띄운다.
 * '알람 끄기', 집중 시작, 5분 경과 중 하나로 멈춘다. 종 아이콘이 꺼져 있으면 울리지 않는다.
 * RootNavigator와 App.web.tsx의 NavigationContainer 안, 다른 게이트 옆에 둔다.
 */
export function RestAlarmGate(){
 const {data}=useRoutine(),[on]=useRestAlarmSetting(),insets=useSafeAreaInsets(),t=data.bookTimer;
 const [now,setNow]=useState(Date.now()),[dismissed,setDismissed]=useState(''),armed=useRef(''),active=useRef(AppState.currentState==='active');
 useEffect(()=>{const sub=AppState.addEventListener('change',s=>{active.current=s==='active';if(!active.current)armed.current='';});return()=>sub.remove();},[]);
 const end=restAlarmEnd(t);
 useEffect(()=>{if(end===null)return;const id=setInterval(()=>setNow(Date.now()),500);return()=>clearInterval(id);},[end]);
 const arm=on?restAlarmArm(t,now,active.current):null;
 if(arm)armed.current=arm;
 const ringing=on&&restAlarmRinging(t,now,armed.current,dismissed);
 useEffect(()=>{void (ringing?startRestAlarm():stopRestAlarm());},[ringing]);
 useEffect(()=>()=>{void stopRestAlarm();},[]);
 if(!ringing)return null;
 return <View pointerEvents="box-none" style={{position:'absolute',left:0,right:0,top:insets.top+72,alignItems:'center'}}>
  <Pressable testID="rest-alarm-stop" accessibilityRole="button" accessibilityLabel="휴식 끝 알람 끄기" onPress={()=>setDismissed(armed.current)} style={({pressed})=>({minHeight:56,minWidth:180,paddingHorizontal:28,borderRadius:28,alignItems:'center',justifyContent:'center',backgroundColor:'#111111',transform:[{scale:pressed?.97:1}],shadowColor:'#000',shadowOpacity:.25,shadowRadius:10,shadowOffset:{width:0,height:4},elevation:6})}>
   <Text style={{color:'#FFFFFF',fontSize:18,fontWeight:'800'}}>알람 끄기</Text>
  </Pressable>
 </View>;
}
