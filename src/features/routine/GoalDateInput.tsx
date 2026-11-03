import DateTimePicker from '@react-native-community/datetimepicker';
import React from 'react';
import {View} from 'react-native';
import {parseDateKey,toDateKey} from '../../lib/dateUtils';
import {space} from '../../theme/tokens';
import {Action,Copy,Link,u} from './ui';

export type GoalDateInputProps={value:string;today:string;onChange:(value:string)=>void};

export function GoalDateInput({value,today,onChange}:GoalDateInputProps){
 return <View style={{gap:space.xs}}>
  <Copy variant="caption" weight="700" muted>목표 날짜 (선택)</Copy>
  {value
   ?<View style={u.between}><DateTimePicker value={parseDateKey(value)} mode="date" locale="ko-KR" onChange={(_,date)=>{if(date)onChange(toDateKey(date))}}/><Link muted label="날짜 빼기" onPress={()=>onChange('')}/></View>
   :<Action secondary compact label="날짜 정하기" onPress={()=>onChange(today)}/>}
 </View>;
}
