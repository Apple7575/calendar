import React from 'react';
import {Text,View} from 'react-native';
import {startTimeHint,startTimeMap,weekdayOf} from '../../lib/startTimeMap';
import type {RoutineData} from '../../lib/routineModel';
import {radii,space,type} from '../../theme/tokens';
import {useTheme} from '../../theme/ThemeContext';
import {Copy} from './ui';

/** S1-14: when first study actually started, by weekday over the last 4 weeks. It only shows; it never picks the time. */
export function StartTimeMap({data,day,compact=false}:{data:RoutineData;day:string;compact?:boolean}){
 const {colors:c}=useTheme(),map=startTimeMap(data,day),target=weekdayOf(day);
 const hint=<View testID="start-time-hint"><Copy muted>{startTimeHint(data,day)}</Copy></View>;
 if(compact)return hint;
 return <View testID="start-time-map" style={{gap:space.xs}}>
  {hint}
  <View accessibilityLabel={map.days.map(d=>`${d.label}요일 ${d.median??'기록 없음'}`).join(', ')} style={{flexDirection:'row',gap:space.xxs}}>
   {map.days.map(d=>{const on=d.weekday===target;return <View key={d.weekday} style={{flex:1,alignItems:'center',paddingVertical:space.xxs,paddingHorizontal:2,minWidth:0,borderRadius:radii.chip,borderWidth:1,borderColor:on?c.primary:c.border,backgroundColor:on?c.primarySoft:'transparent'}}>
    <Copy variant="caption" weight={on?'800':'500'}>{d.label}</Copy>
    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[type.caption,{color:d.median?c.text:c.textMuted,fontVariant:['tabular-nums']}]}>{d.median??'—'}</Text>
   </View>;})}
  </View>
 </View>;
}
