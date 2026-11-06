import {useEffect,useState} from 'react';
import {loadRestAlarmSetting,onRestAlarmSetting,restAlarmOn,setRestAlarmOn} from '../../lib/restAlarmSetting';

/** 종 아이콘 값. 화면·알림·게이트가 같은 값을 본다. */
export function useRestAlarmSetting():[boolean,(on:boolean)=>void]{
 const [on,setOn]=useState(restAlarmOn());
 useEffect(()=>{const off=onRestAlarmSetting(setOn);void loadRestAlarmSetting().then(setOn);return off;},[]);
 return [on,v=>{void setRestAlarmOn(v)}];
}
