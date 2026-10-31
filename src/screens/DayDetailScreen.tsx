import React from 'react';
import {View} from 'react-native';
import {DayOverview} from '../components/DayOverview';
import {RootScreenProps} from '../navigation/types';
import {useRoutine} from '../features/routine/RoutineProvider';
import {routineActivities,activityStatusLabel} from '../lib/routineActivity';
import {formatKoreanDate} from '../lib/dateUtils';
import {Copy,Link,Page,u} from '../features/routine/ui';
import {useTheme} from '../theme/ThemeContext';
export function DayDetailScreen({route,navigation}:RootScreenProps<'DayDetail'>){
 const {date}=route.params,{data}=useRoutine(),{colors:c}=useTheme();
 return <Page title={formatKoreanDate(date)} scrollable={false} right={<Link label="일기 보기" onPress={()=>navigation.navigate('DiaryDetail',{date})}/>}>
  <View style={{padding:12,borderRadius:20,backgroundColor:c.primarySoft,gap:8,marginBottom:10}}><View style={{flexDirection:'row',flexWrap:'wrap',gap:7}}>{routineActivities(data,date).filter(a=>a.status!=='none').map(a=><Copy key={a.id} size={12}>{a.title} · {activityStatusLabel[a.status]}</Copy>)}</View><Copy muted size={11}>일정·일기는 이 날짜, 실천 기록은 새벽 4시 기준이에요. 새벽 1시의 실천은 전날에 남아요.</Copy></View>
  <View style={{flex:1}}><DayOverview dateKey={date} onEditEvent={eventId=>navigation.navigate('EventEdit',{date,eventId})} onEditDiary={()=>navigation.navigate('DiaryEdit',{date})} onGoSettings={()=>navigation.navigate('SettingsHub')} onOpenPhotos={(photos,index)=>navigation.navigate('PhotoViewer',{photos,index})} onManageRoutines={()=>navigation.navigate('Routines')}/></View>
 </Page>;
}
