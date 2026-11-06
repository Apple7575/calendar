import {useEffect,useState} from 'react';
import {onRestAlarmRinging,restAlarmIsRinging} from '../../lib/restAlarmState';

export function useRestAlarmRinging(){
 const [on,setOn]=useState(restAlarmIsRinging());
 useEffect(()=>{setOn(restAlarmIsRinging());return onRestAlarmRinging(setOn);},[]);
 return on;
}
