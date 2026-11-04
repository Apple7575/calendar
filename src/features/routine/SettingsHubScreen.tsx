import {AnimalCharacterPicker} from './AnimalCharacterPicker';
﻿import React from 'react';
import {Switch,View} from 'react-native';
import {RootScreenProps} from '../../navigation/types';
import {useTheme,useThemeControls} from '../../theme/ThemeContext';
import {useExperiencePreferences,setExperiencePreference} from '../../lib/experiencePreferences';
import {CardView,Copy,Notice,Page,u} from './ui';
import {space} from '../../theme/tokens';
import {MenuRow,Segments} from './experience';
import {AccountConnection} from './AccountConnection';
/** 설정 묶음: 행 자체에 여백이 있어 카드 간격을 좁힌다. */
const group={gap:space.xxs,paddingBottom:space.xs};
export function SettingsHubScreen({navigation}:RootScreenProps<'SettingsHub'>){
 const go=(screen:keyof import('../../navigation/types').RootStackParamList)=>()=>navigation.navigate(screen as any);
 return <Page title="나의 설정">
  <CardView style={group}><Copy variant="section">공부와 보상</Copy><MenuRow title="중요한 공부·첫 행동" subtitle="오늘·내일 계획 · 작은 시작 · 시간 사용 조건" icon="flag-outline" onPress={()=>navigation.navigate('PriorityPlan')}/>
  <MenuRow title="돈 보상·지출" subtitle="보상 금액 · 쓸 수 있는 돈 · 사용 내역" icon="wallet-outline" onPress={go('MoneyWallet')}/></CardView>
  <CardView style={group}><Copy variant="section">매일의 실천</Copy><MenuRow title="아침·저녁 루틴" subtitle="구성 · 작은 목표 · 시간 · 순서" icon="sunny-outline" onPress={()=>navigation.navigate('RoutineSetup')}/><MenuRow title="하루 순서·60분 보너스" subtitle="과목별 집중 공부 · 어려운 것부터" icon="trail-sign-outline" onPress={go('HabitOrderSettings')}/><MenuRow title="제한 앱과 권한" subtitle="선택 앱 · 공용 시간 · 잠금 상태" icon="shield-checkmark-outline" onPress={go('RoutineScreenTime')}/><MenuRow title="보상·학습 규칙" subtitle="기본 보상과 추가 학습 설정" icon="gift-outline" onPress={go('StudyPreferences')}/><MenuRow title="내 단어장" icon="albums-outline" onPress={go('StudySettings')}/></CardView>
  <CardView style={group}><Copy variant="section">친구와 화면</Copy><MenuRow title="동물 친구 동작 검수" subtitle="4캐릭터 · 60동작 · 대표 프레임" icon="paw-outline" onPress={go('AnimalPreview')}/><MenuRow title="소리·진동·모션·화면" subtitle="내게 편안한 반응으로" icon="color-palette-outline" onPress={go('ExperienceSettings')}/><MenuRow title="알림·연결 상세 설정" subtitle="기존 알림 · 건강 · 캘린더 설정" icon="notifications-outline" onPress={go('Settings')}/></CardView>
  <CardView style={group}><Copy variant="section">내 기록과 계정</Copy><AccountConnection/><MenuRow title="백업·복구" subtitle="마지막 백업 · 파일 보관 · 복원" icon="cloud-upload-outline" onPress={go('RoutineBackup')}/><MenuRow title="모든 기록·기존 도구" subtitle="사진 · 식단 · 지출 · 목표 등 기존 기능" icon="grid-outline" onPress={go('LegacyInterests')}/><MenuRow title="이전 캘린더 루틴" icon="list-outline" onPress={go('Routines')}/><MenuRow title="기존 일기·생활 리포트" icon="stats-chart-outline" onPress={go('LegacyReport')}/></CardView>
 </Page>;
}
export function ExperienceSettingsScreen({navigation}:RootScreenProps<'ExperienceSettings'>){
 const preferences=useExperiencePreferences(),{colors:c}=useTheme(),{theme,setThemeId}=useThemeControls(),[error,setError]=React.useState('');
 return <Page title="소리와 화면">
  <CardView><Copy variant="section">편안한 반응</Copy>{([['sound','축하 효과음','10장 완료와 목표 완료 때만 짧게 들려요.'],['haptics','진동','버튼과 완료를 손끝으로 알려줘요.'],['motion','화면 움직임','기기의 동작 줄이기 설정도 항상 존중해요.']] as const).map(([key,title,description])=><View key={key} style={[u.between,{gap:space.md}]}><View style={{flex:1}}><Copy variant="label">{title}</Copy><Copy muted variant="caption">{description}</Copy></View><Switch accessibilityLabel={title} value={preferences[key]} trackColor={{true:c.primary,false:c.border}} onValueChange={value=>{void setExperiencePreference(key,value).catch(()=>setError('설정을 저장하지 못했어요. 다시 시도해 주세요.'));}}/></View>)}<Copy muted size={12}>단어·예문 음성의 자동 재생과 배속은 학습 카드의 … 메뉴에서 따로 정해요.</Copy></CardView>
  <AnimalCharacterPicker/>
  <CardView><Copy variant="section">화면 모드</Copy><Segments value={theme.isDark?'dark':'routine'} items={[{id:'dark',label:'다크'},{id:'routine',label:'라이트'}]} onChange={setThemeId}/></CardView>{error?<Notice tone="error">{error}</Notice>:null}
 </Page>;
}

