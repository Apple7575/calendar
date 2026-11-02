import React from 'react';
import {View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/types';
import {useRoutine} from './RoutineProvider';
import {CardView,Copy,Link,u} from './ui';
export function PriorityHistoryCard(){
 const {data}=useRoutine(),nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>();
 const days=Object.values(data.priorityDays??{}).filter(d=>d.tasks[0]?.completedAt).sort((a,b)=>b.day.localeCompare(a.day));
 if(!Object.keys(data.priorityDays??{}).length)return null;
 return <CardView><Copy size={21} weight="800">중요한 일에 손댄 날</Copy><Copy size={30} weight="800">{days.length}일</Copy><Copy muted size={12}>첫 공부의 작은 시간과 필기 사진을 확인한 날이에요. 하루 전체 목표 완료와는 구분해요.</Copy>{days.slice(0,7).map(d=><View key={d.day} style={u.between}><Copy size={12}>{d.day}</Copy><Copy size={13}>✓ {d.tasks[0].subject}</Copy></View>)}<Link label="다음 첫 행동 준비" onPress={()=>nav.navigate('PriorityPlan')}/></CardView>;
}
