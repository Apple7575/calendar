import {useContext,useEffect,useRef} from 'react';
import {NavigationContainerRefContext} from '@react-navigation/native';
import {addDays} from '../../lib/dateUtils';
import {syncReflectAlarm} from '../../lib/reflectAlarm';
import {dayPromise,weekKeyOf} from '../../lib/weeklyCommitments';
import {reflectAlarmTimes,shouldOpenWeekCheck} from '../../lib/weeklyReview';
import {useRoutine} from './RoutineProvider';

/**
 * 화면 없이 도는 부분: 월요일 주간 점검을 한 번 열고, 밤 돌아보기 알림을 맞춘다.
 * RootNavigator와 App.web.tsx의 RoutineProvider 안에 둔다.
 */
export function CommitmentGate(){
 const {data,ready,dayKey,now}=useRoutine(),nav=useContext(NavigationContainerRefContext),opened=useRef('');
 const open=ready&&shouldOpenWeekCheck(data,dayKey,now.getTime()),week=weekKeyOf(dayKey);
 useEffect(()=>{
  if(!open||opened.current===week||!nav?.isReady())return;
  const root=nav.getRootState();
  if(root?.routes[root.index??0]?.name!=='Main')return; // 다른 흐름(아침 루틴·보상 화면 등) 중에는 끼어들지 않는다
  opened.current=week;
  (nav as unknown as {navigate:(name:'WeekCheck')=>void}).navigate('WeekCheck');
 },[open,week,nav,now]);
 const promised=dayPromise(data,addDays(dayKey,1)).status!=='none';
 const times=ready?reflectAlarmTimes(data,dayKey,promised,now.getTime()).join(','):'';
 useEffect(()=>{if(ready)void syncReflectAlarm(times?times.split(',').map(Number):[]).catch(()=>{});},[ready,times]);
 return null;
}
