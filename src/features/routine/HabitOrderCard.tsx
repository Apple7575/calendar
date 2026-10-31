import React from 'react';
import {View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/types';
import {focusSubject,habitGoalLabel} from '../../lib/habitOrder';
import {getDay} from '../../lib/routineModel';
import {useTheme} from '../../theme/ThemeContext';
import {useRoutine} from './RoutineProvider';
import {Action,Copy,Icon,Link,u} from './ui';
export function HabitOrderCard(){
 const {data,dayKey,native}=useRoutine(),nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>(),{colors:c}=useTheme(),day=getDay(data,dayKey),p=day.orderProgress,next=p?.sequence[p.step];
 const open=()=>{if(!next)return;if(next==='morning')nav.navigate('GuidedRoutine',{slot:'morning'});else if(next==='words')nav.navigate('Main',{screen:'Study'});else if(next==='gym')nav.navigate('RoutineWorkout');else nav.navigate('BookStudy',{subject:focusSubject(next)});};
 return <View style={{padding:20,borderRadius:26,borderWidth:1,borderColor:c.border,backgroundColor:c.primarySoft,gap:10}}><View style={u.between}><View style={u.row}><Icon name="trail-sign-outline" size={22}/><Copy size={19} weight="800">나의 실천 순서</Copy></View><Link label="순서 설정" onPress={()=>nav.navigate('HabitOrderSettings')}/></View><Copy weight="800">{p?.status==='complete'?'순서대로 해냈어요 · +60분':p?.status==='active'?`차례대로 완료하면 +60분 · ${p.step}/${p.sequence.length}`:'다음 실천도 내 방식대로'}</Copy>
  {p?.status==='active'&&next?<><Copy size={14}>다음은 {habitGoalLabel(next)}</Copy><Action compact label="이 순서로 시작·이어하기" onPress={open}/></>:<Copy muted size={12}>{p?.status==='untracked'?'오늘은 추적 전의 실천이 있어요. 내일부터 새 순서로 함께해요.':p?.status==='off'?'순서 보너스가 꺼져 있어요. 설정에서 켤 수 있어요.':p?.status==='outOfOrder'?'오늘은 다른 순서로 실천했어요. 개별 보상은 그대로 받고, 내일 순서 보너스에 다시 도전해요.':'보너스는 하루 한 번, 단어 한도와 별도로 적립해요.'}</Copy>}
  {day.bonus?.order&&!native?.supportsOrderBonus&&native?.supported?<Copy muted size={12}>보너스를 실제 이용 시간에 연결하려면 이 기능을 포함한 새 아이폰 버전이 필요해요.</Copy>:null}
 </View>;
}
