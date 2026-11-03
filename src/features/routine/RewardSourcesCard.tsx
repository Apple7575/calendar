import React from 'react';
import {View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/types';
import {getDay} from '../../lib/routineModel';
import {useRoutine} from './RoutineProvider';
import {Action,CardView,Copy,Icon,u} from './ui';
export function FreeStudyCard(){
 const {data,dayKey,ready}=useRoutine(),nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>();
 return <CardView><View style={u.row}><Icon name="book-outline"/><Copy size={21} weight="800">계획 한 줄부터, 가볍게</Copy></View><Copy>계획 → 2분 → 5분 → 10분 → 15분 → 25분</Copy><Copy muted size={13}>기본 목표를 마쳐도, 순서를 놓쳐도 원하는 공부를 계속해요. 시간·하루 보상 상한은 없어요. 단계마다 +5분. 2시간 쉬면 계획부터 다시 시작해요. 필기는 100자당 500원이에요.</Copy><Action label="집중 공부로 시간 모으기" disabled={!ready} onPress={()=>nav.navigate('BookStudy')}/><Copy muted size={12}>오늘 집중 공부·계획으로 +{getDay(data,dayKey).bonus?.handwriting??0}분</Copy></CardView>;
}
export function RewardSourcesCard(){
 const rows=[['아침 루틴','전체 10분 · 작게 5분'],['단어 학습','10장 → 15장 → 20장마다5분 · 하루 상한 없음'],['운동','헬스장30분 · 짧은 집 운동10분'],['손글씨 공부','계획·단계 완료마다5분 · 최대25분 공부'],['하루 순서','지정 순서 실천 완료 · 하루 한 번60분']];
 return <View style={{gap:16}}><CardView><Copy size={22} weight="800">시간을 모으는 방법</Copy>{rows.map(([name,description])=><View key={name} style={{gap:3,paddingVertical:5}}><Copy weight="700">{name}</Copy><Copy muted size={13}>{description}</Copy></View>)}<Copy muted size={12}>작은 목표 뒤 전체 완료는 차액만 받아요. 저녁 루틴은 실천 기록을 남겨요. 이전 집중·자유 공부에서 받은 보상은 유지하고, 새 타이머·메모에는 별도 보상을 지급하지 않아요.</Copy></CardView><FreeStudyCard/></View>;
}
