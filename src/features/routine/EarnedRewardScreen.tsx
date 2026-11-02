import React from 'react';
import {Pressable,ScrollView,Text,View,useWindowDimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import {RootScreenProps} from '../../navigation/types';
import {useRoutine} from './RoutineProvider';
import {getDay} from '../../lib/routineModel';
import {timeWallet} from '../../lib/timeWallet';
import {Mascot,Icon} from './ui';
import {RewardResultTiles} from './RewardResultTiles';
import {AnimalSharedLayer} from './AnimalSharedScene';
import {useStudyFeedback} from './useStudyFeedback';

/** A stack destination, not an overlay. It only displays already committed rewards. */
export function EarnedRewardScreen({route,navigation}:RootScreenProps<'EarnedReward'>){
 const p=route.params,{data,dayKey,native}=useRoutine(),{height,width}=useWindowDimensions();
 const receipt=p.kind==='handwriting'?data.handwritingReceipts?.find(r=>r.id===p.id):undefined;
 const batch=receipt?.focusBatch?data.handwritingReceipts?.find(r=>r.id===receipt.focusBatch):receipt;
 const pending=receipt?receipt.rewardStatus==='pending':!!p.pending,minutes=batch?.minutes??p.minutes;
 const cash=p.pending&&!pending?Math.max(0,(data.money?.entries??[]).filter(e=>e.source==='output').reduce((n,e)=>n+e.amount,0)-(p.cashBaseline??0)):p.cash;
 const wallet=timeWallet(getDay(data,dayKey),dayKey,native),small=height<740;
 const close=()=>navigation.canGoBack()?navigation.goBack():navigation.navigate('Main',{screen:'Study'});
 useStudyFeedback(!pending?{kind:'complete',id:p.id}:null);
 return <View testID="earned-reward-page" style={{flex:1,backgroundColor:'#14252E'}}>
  <StatusBar style="light"/><AnimalSharedLayer id="celebration_effects" animated/>
  <SafeAreaView style={{flex:1}} edges={['top','bottom']}>
   <Pressable accessibilityRole="button" accessibilityLabel="축하 화면 닫기" onPress={close} hitSlop={8} style={{margin:12,width:44,height:44,alignItems:'center',justifyContent:'center'}}><Icon name="close" color="#CEE1E8" size={27}/></Pressable>
   <ScrollView contentContainerStyle={{flexGrow:1,alignItems:'center',justifyContent:'center',paddingHorizontal:22,paddingBottom:20,gap:small?12:20}}>
    <Mascot character="C03" action={pending?'A21':p.kind==='plan'?'A24':'A26'} size={Math.min(width-44,small?210:310)}/>
    <Text accessibilityRole="header" style={{fontSize:small?29:36,fontWeight:'900',color:'#FFDA39',textAlign:'center'}}>{pending?'필기를 저장했어요!':p.kind==='plan'?'계획 완료!':'공부 완료!'}</Text>
    <Text style={{color:'#F5FAFC',fontSize:17,textAlign:'center',lineHeight:25}}>{p.kind==='plan'?'시작할 준비가 됐어요. 시간 +'+minutes+'분 적립!':pending?'공부 시간을 채우면 보상이 적립돼요.':'해낸 공부가 시간과 보상으로 쌓였어요.'}</Text>
    <View style={{width:'100%',maxWidth:500}}><RewardResultTiles minutes={minutes} cash={cash} cashEnabled={p.cashEnabled} pending={pending} quantity={p.quantity+(p.kind==='plan'?'개':'자')} quantityLabel={p.kind==='plan'?'저장한 계획':'인정 필기'}/></View>
    <Text style={{color:'#FFFFFF',fontSize:18,fontWeight:'700'}}>지금 사용 가능 {wallet.available}분</Text>
    <Text style={{color:'#BFD0D8',fontSize:13,lineHeight:20,textAlign:'center'}}>{pending?'사진과 인식 결과는 저장했어요. 공부를 이어가 주세요.':!getDay(data,dayKey).paid.morning?'적립 완료 · 아침 루틴을 마치면 사용할 수 있어요.':wallet.reason}</Text>
    {p.kind==='plan'?<Text style={{color:'#BFD0D8',fontSize:12,textAlign:'center'}}>계획은 시간 보상만 받아요. 다음은 2분 공부예요.</Text>:null}
   </ScrollView>
   <View style={{width:'100%',maxWidth:540,alignSelf:'center',padding:20,alignItems:'flex-end'}}><Pressable accessibilityRole="button" accessibilityLabel={pending?'공부로 돌아가기':'보상받기'} onPress={close} style={({pressed})=>({minHeight:58,width:'84%',backgroundColor:'#42C4F4',borderRadius:18,borderBottomWidth:pressed?1:6,borderBottomColor:'#168CB9',transform:[{translateY:pressed?5:0}],alignItems:'center',justifyContent:'center',padding:14})}><Text style={{color:'#102A36',fontSize:20,fontWeight:'900'}}>{pending?'공부로 돌아가기':'보상받기'}</Text></Pressable></View>
  </SafeAreaView>
 </View>;
}
