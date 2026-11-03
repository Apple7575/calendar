import React from 'react';
import {Text,View} from 'react-native';
import {focusTheme} from '../../theme/themes';

/** Values come from a saved event, never from the animation or a reward estimate. */
export function RewardResultTiles({minutes,cash,quantity,quantityLabel,cashEnabled=true,pending=false}:{minutes:number;cash:number;quantity:string;quantityLabel:string;cashEnabled?:boolean;pending?:boolean}){
 const tiles=[
  {label:'이번 적립 시간',value:pending?'대기 중':`+${minutes}분`},
  {label:'이번 적립 금액',value:pending?'대기 중':cashEnabled?`+${cash.toLocaleString('ko-KR')}원`:'보상 꺼짐'},
  {label:quantityLabel,value:quantity},
 ];
 return <View testID="reward-result-tiles" style={{width:'100%',flexDirection:'row',flexWrap:'wrap',gap:8}}>{tiles.map(t=><View key={t.label} style={{flexGrow:1,flexBasis:100,borderRadius:20,borderWidth:1,borderColor:focusTheme.colors.border,backgroundColor:focusTheme.colors.card,padding:9,minHeight:90,alignItems:'center',justifyContent:'center',gap:7}}><Text style={{fontSize:12,fontWeight:'700',color:focusTheme.colors.textMuted,textAlign:'center'}}>{t.label}</Text><Text style={{fontSize:t.value==='보상 꺼짐'?17:23,fontWeight:'900',color:focusTheme.colors.primary,textAlign:'center'}}>{t.value}</Text></View>)}</View>;
}
