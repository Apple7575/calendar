import {useAnimalCharacter} from '../../lib/animalPreference';
import {AnimalCharacterPicker} from './AnimalCharacterPicker';
import {AnimalSharedScene} from './AnimalSharedScene';
import React from 'react';
import {Pressable,Text,View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeContext';
import {routineActivities,isActivityComplete,routineStreak} from '../../lib/routineActivity';
import {boriWeek,boriStageRank} from '../../lib/boriGrowth';
import {addDays,todayKey} from '../../lib/dateUtils';
import {useDayData} from '../../hooks/useDayData';
import {useRoutine} from './RoutineProvider';
import {CardView,Copy,Icon,Link,Mascot,Page,u} from './ui';
import {SettingsButton,useScene} from './experience';
import {boriStageLabels} from './boriAssets';
export function BoriHomeScreen(){
 const companion=useAnimalCharacter();
 const {data,dayKey,now}=useRoutine(),nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>(),{colors:c}=useTheme();
 const night=now.getHours()>=18||now.getHours()<4,p=useScene(night?'evening':'morning'),stage=data.boriStage??'sprout',week=boriWeek(data,dayKey),streak=routineStreak(data,dayKey),diary=useDayData(todayKey());
 const books=(data.bookSessions?.filter(s=>s.note.trim()).length??0)+(data.handwritingReceipts?.length??0);
 return <Page title="친구들의 정원" right={<SettingsButton/>}>
  <AnimalCharacterPicker/>
  <View style={{borderRadius:34,backgroundColor:p.sky,minHeight:340,padding:22,overflow:'hidden',justifyContent:'space-between',gap:12}}>
   <AnimalSharedScene tone="garden"/>
   <View style={u.between}><Text style={{color:p.ink,fontSize:18,fontWeight:'800'}}>{night?'별빛 아래, 잠깐 쉬어요':'오늘도 내 자리에서 기다렸어요'}</Text><Icon name={night?'moon-outline':'sunny-outline'} color={p.ink}/></View>
   <View pointerEvents="none" style={{position:'absolute',width:440,height:180,borderRadius:220,left:-30,bottom:-80,backgroundColor:p.ground}}/>
   <View style={{alignItems:'center',paddingVertical:8}}><Mascot character={companion} size={205} mood={night?'sleepy':data.bookTimer?.phase==='focus'?'focus':'cheer'}/></View>
   <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{color:p.ink,fontWeight:'700'}}>친구를 톡, 눌러보세요</Text><View style={{flexDirection:'row',gap:12}}>{books>0?<Icon name="book-outline" color={p.ink} size={26}/>:null}{diary.diary.diary?<Icon name="journal-outline" color={p.ink} size={26}/>:null}<Icon name="leaf-outline" color={p.ink} size={27}/></View></View>
  </View>
  <View style={u.between}><Copy size={22} weight="800">{boriStageLabels[stage]}</Copy><Copy muted size={12}>쉬어도 성장은 남아요</Copy></View>
  <CardView><View style={u.between}><View><Copy muted size={12}>함께 실천한 날</Copy><Copy size={28} weight="800">{streak.completedDays.length}일</Copy></View><View><Copy muted size={12}>남긴 공부 기록</Copy><Copy size={28} weight="800">{books}번</Copy></View></View><Copy muted size={13}>이번 주 의미 있는 실천 {week.meaningfulDays}일 · 복습 완료 {week.reviewedCards}장. 실제로 쌓인 기록만 정원에 남겨요.</Copy></CardView>
  <Copy size={21} weight="800">자라는 모습을 함께 봐요</Copy>
  <View style={{flexDirection:'row',gap:10}}>{(['sprout','growing','blooming']as const).map(s=><View key={s} style={{flex:1,alignItems:'center',padding:12,borderRadius:22,borderWidth:stage===s?2:1,borderColor:stage===s?c.primary:c.border,backgroundColor:c.card,gap:5}}><Icon name={s==='sprout'?'leaf-outline':s==='growing'?'rose-outline':'flower-outline'} size={38}/><Copy size={12} weight="700">{boriStageLabels[s]}</Copy><Copy muted size={10}>{boriStageRank[s]<=boriStageRank[stage]?'함께한 모습':'앞으로 만날 모습'}</Copy></View>)}</View>
  <Copy muted size={12}>새싹에서 봉오리로, 그리고 꽃으로. 함께 실천한 시간은 쉬어가는 날에도 사라지지 않아요.</Copy>
  <Copy size={21} weight="800">함께 남긴 발자국</Copy>
  {Array.from({length:7},(_,i)=>addDays(dayKey,-i)).filter(key=>routineActivities(data,key).some(isActivityComplete)).map(key=><Pressable key={key} accessibilityRole="button" accessibilityLabel={`${key} 발자취`} onPress={()=>nav.navigate('DayDetail',{date:key})} style={[u.between,{paddingVertical:14,borderBottomWidth:1,borderColor:c.border}]}><View style={{flex:1}}><Copy weight="700">{key===dayKey?'오늘':key}</Copy><Copy muted size={12}>{routineActivities(data,key).filter(isActivityComplete).map(a=>a.title).join(' · ')}</Copy></View><Icon name="leaf-outline"/></Pressable>)}
  {!streak.completedDays.length?<Copy muted>아직 발자국이 없어요. 오늘 작은 실천 하나부터 함께해요.</Copy>:null}
  <Link label="모든 실천 기록 보기" onPress={()=>nav.navigate('Main',{screen:'Records',params:{section:'stats'}})}/>
 </Page>;
}
