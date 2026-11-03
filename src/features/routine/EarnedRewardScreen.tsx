import React from 'react';
import {Pressable,ScrollView,Text,View,useWindowDimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {StatusBar} from 'expo-status-bar';
import {RootScreenProps} from '../../navigation/types';
import {useRoutine} from './RoutineProvider';
import {getDay} from '../../lib/routineModel';
import {timeWallet} from '../../lib/timeWallet';
import {Action,Mascot,Icon} from './ui';
import {FocusThemeProvider} from '../../theme/ThemeContext';
import {RewardResultTiles} from './RewardResultTiles';
import {AnimalSharedLayer} from './AnimalSharedScene';
import {useStudyFeedback} from './useStudyFeedback';
import {focusTheme} from '../../theme/themes';

/** A stack destination, not an overlay. It only displays already committed rewards. */
export function EarnedRewardScreen(props:RootScreenProps<'EarnedReward'>){
 return <FocusThemeProvider><EarnedRewardPage {...props}/></FocusThemeProvider>;
}
function EarnedRewardPage({route,navigation}:RootScreenProps<'EarnedReward'>){
 const p=route.params,{data,dayKey,native}=useRoutine(),{height,width}=useWindowDimensions();
 const receipt=p.kind==='handwriting'?data.handwritingReceipts?.find(r=>r.id===p.id):undefined;
 const batch=receipt?.focusBatch?data.handwritingReceipts?.find(r=>r.id===receipt.focusBatch):receipt;
 const pending=receipt?receipt.rewardStatus==='pending':!!p.pending,minutes=batch?.minutes??p.minutes;
 const cash=p.pending&&!pending?Math.max(0,(data.money?.entries??[]).filter(e=>e.source==='output').reduce((n,e)=>n+e.amount,0)-(p.cashBaseline??0)):p.cash;
 const wallet=timeWallet(getDay(data,dayKey),dayKey,native),small=height<800;
 const close=()=>p.continueTo?navigation.replace(p.continueTo):navigation.canGoBack()?navigation.goBack():navigation.navigate('Main',{screen:'Study'});
 const nextLabel=p.continueTo==='FocusTimer'?'공부 시작하기':p.kind==='handwriting'?'이어서 공부하기':'다음 공부 준비하기';
 const continueStudy=()=>p.kind==='handwriting'&&data.bookTimer?.phase==='focus'?navigation.popTo('FocusTimer'):close();
 useStudyFeedback(!pending?{kind:'complete',id:p.id}:null);
 return <View testID="earned-reward-page" style={{flex:1,backgroundColor:focusTheme.colors.background}}>
  <StatusBar style="light"/><AnimalSharedLayer id="celebration_effects" animated/>
  <SafeAreaView style={{flex:1}} edges={['top','bottom']}>
   <Pressable accessibilityRole="button" accessibilityLabel="축하 화면 닫기" onPress={continueStudy} hitSlop={8} style={{margin:12,width:44,height:44,alignItems:'center',justifyContent:'center'}}><Icon name="close" color="#CEE1E8" size={27}/></Pressable>
   <ScrollView contentContainerStyle={{flexGrow:1,alignItems:'center',justifyContent:'center',paddingHorizontal:22,paddingBottom:20,gap:small?12:20}}>
    <Mascot character="C03" action={pending?'A21':p.kind==='plan'?'A24':'A26'} size={Math.min(width-44,small?160:220)}/>
    <Text accessibilityRole="header" style={{fontSize:small?27:32,fontWeight:'900',color:focusTheme.colors.primary,textAlign:'center'}}>{pending?'필기를 저장했어요!':p.kind==='plan'?'시작할 준비 완료!':'한 단계 해냈어요!'}</Text>
    <View style={{width:'100%',maxWidth:500}}><RewardResultTiles minutes={minutes} cash={cash} cashEnabled={p.cashEnabled} pending={pending} quantity={p.quantity+(p.kind==='plan'?'개':'자')} quantityLabel={p.kind==='plan'?'저장한 계획':'인정 필기'}/></View>
    <Text style={{color:'#FFFFFF',fontSize:18,fontWeight:'700'}}>지금 사용 가능 {wallet.available}분</Text>
    <Text style={{color:'#BFD0D8',fontSize:13,lineHeight:20,textAlign:'center'}}>{pending?'사진과 인식 결과는 저장했어요. 공부를 이어가 주세요.':!getDay(data,dayKey).paid.morning?'적립 완료 · 아침 루틴을 마치면 사용할 수 있어요.':wallet.reason}</Text>
    {p.kind==='plan'?<Text style={{color:'#BFD0D8',fontSize:12,textAlign:'center'}}>계획은 시간 보상만 받아요.</Text>:null}
   </ScrollView>
   <View style={{width:'100%',maxWidth:540,alignSelf:'center',padding:20,gap:10}}><Text style={{color:'#BFD0D8',fontSize:12,textAlign:'center'}}>{pending?'기록 저장 완료 · 보상은 시간 충족 후 적립돼요':'보상 적립 완료'}</Text><Action label={nextLabel} onPress={continueStudy}/></View>
  </SafeAreaView>
 </View>;
}
