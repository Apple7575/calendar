import React from 'react';
import {Text,View} from 'react-native';

/** Values come from a saved event, never from the animation or a reward estimate. */
export function RewardResultTiles({minutes,cash,quantity,quantityLabel,cashEnabled=true,pending=false}:{minutes:number;cash:number;quantity:string;quantityLabel:string;cashEnabled?:boolean;pending?:boolean}){
 const tiles=[
  {label:'이번 적립 시간',value:pending?'대기 중':`+${minutes}분`,color:'#206BCC',bg:'#EAF4FF'},
  {label:'이번 적립 금액',value:pending?'대기 중':cashEnabled?`+${cash.toLocaleString('ko-KR')}원`:'보상 꺼짐',color:'#736000',bg:'#FFF6CC'},
  {label:quantityLabel,value:quantity,color:'#26764D',bg:'#E8F8EA'},
 ];
 return <View testID="reward-result-tiles" style={{width:'100%',flexDirection:'row',flexWrap:'wrap',gap:8}}>{tiles.map(t=><View key={t.label} style={{flexGrow:1,flexBasis:100,borderRadius:20,borderWidth:2,borderBottomWidth:5,borderColor:t.color,backgroundColor:t.bg,padding:12,minHeight:90,alignItems:'center',justifyContent:'center',gap:7}}><Text style={{fontSize:12,fontWeight:'700',color:t.color,textAlign:'center'}}>{t.label}</Text><Text style={{fontSize:23,fontWeight:'900',color:t.color,textAlign:'center'}}>{t.value}</Text></View>)}</View>;
}
