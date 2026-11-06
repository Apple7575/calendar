import {useCallback,useContext,useEffect,useRef} from 'react';
import {NavigationContainerRefContext} from '@react-navigation/native';
import {pendingNextStudyAsk,reservationAlarmAt,reservedStudy} from '../../lib/studyReservation';
import {syncNextStudyAlarm} from '../../lib/studyReservationAlarm';
import {useRoutine} from './RoutineProvider';

/**
 * 화면 없이 도는 부분 (S1-10): 공부를 마치고 메인으로 돌아오면 "다음 공부는 언제?"를 한 번 열고, 예약 알림을 맞춘다.
 * CommitmentGate 옆, NavigationContainer 안에 둔다.
 */
export function NextStudyGate(){
 const {data,ready}=useRoutine(),nav=useContext(NavigationContainerRefContext),shown=useRef(''),latest=useRef(data);
 latest.current=data;
 const tryOpen=useCallback(()=>{
  if(!ready||!nav?.isReady())return;
  const ask=pendingNextStudyAsk(latest.current,Date.now());
  if(!ask||shown.current===ask.id)return;
  const root=nav.getRootState();
  if(root?.routes[root.index??0]?.name!=='Main')return; // 다른 흐름 중에는 끼어들지 않는다
  shown.current=ask.id;
  (nav as unknown as {navigate:(name:'NextStudy',params:{id:string})=>void}).navigate('NextStudy',{id:ask.id});
 },[ready,nav]);
 useEffect(()=>{tryOpen()},[tryOpen,data]);
 useEffect(()=>nav?nav.addListener('state',tryOpen):undefined,[nav,tryOpen]);
 const now=Date.now(),at=ready?reservationAlarmAt(data,now):null,subject=at===null?'':reservedStudy(data,now)?.subject??'';
 useEffect(()=>{if(ready)void syncNextStudyAlarm(at,subject).catch(()=>{});},[ready,at,subject]);
 return null;
}
