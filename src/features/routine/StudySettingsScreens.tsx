import React,{useState} from 'react';
import { Pressable,Switch,View } from 'react-native';
import { RootScreenProps } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { AccountConnection } from './AccountConnection';
import { useRoutine } from './RoutineProvider';
import { Action,CardView,Copy,Icon,Link,Page,u } from './ui';
import { extraRewardsEnabled } from '../../lib/studyRewards';
export function StudySettingsScreen({navigation}:RootScreenProps<'StudySettings'>){
 const {data,ready,syncDecks,syncingDecks,deckError}=useRoutine(),[connection,setConnection]=useState(!data.decks.length),[message,setMessage]=useState('');
 return <Page title="내 단어장" right={<Link label="닫기" onPress={()=>navigation.goBack()}/>}>
  {data.decks.length?data.decks.map(deck=><Pressable key={deck.id} accessibilityRole="button" accessibilityLabel={`${deck.name} 카드 관리`} onPress={()=>navigation.navigate('DeckCards',{deckId:deck.id})}><CardView><View style={u.between}><View style={{flex:1}}><Copy size={18} weight="700">{deck.name}</Copy><Copy muted size={13}>{data.words.filter(w=>w.deckId===deck.id&&w.active!==false).length}장 · 새 카드 하루 {deck.newLimit??data.newLimit}장 · {deck.active?'학습 중':'쉬는 중'}</Copy></View><Icon name="chevron-forward" size={20}/></View></CardView></Pressable>):<CardView><Copy>아직 단어장이 없어요. 컴퓨터에서 준비한 덱을 받아보세요.</Copy></CardView>}
  <CardView><Link label={connection?'컴퓨터 덱 연결 접기':'컴퓨터에서 준비한 덱 연결'} onPress={()=>setConnection(!connection)}/>{connection?<><AccountConnection onConnected={syncDecks}/><Action label={syncingDecks?'덱을 받고 있어요…':'컴퓨터 덱 받기'} secondary disabled={!ready||syncingDecks} onPress={()=>void syncDecks().then(count=>{if(count>=0)setMessage(count?`${count}개 덱을 반영했어요.`:'현재 덱이 최신이에요.');})}/>{deckError?<Copy size={13}>{deckError}</Copy>:null}{message?<Copy size={13}>{message}</Copy>:null}</>:null}</CardView>
  <CardView><Link label="학습·보상 설정" onPress={()=>navigation.navigate('StudyPreferences')}/><Link label="즐겨찾기·확인할 단어" onPress={()=>navigation.navigate('SavedStudy')}/><Link label="진도 백업·복구" onPress={()=>navigation.navigate('RoutineBackup')}/></CardView>
 </Page>;
}
export function StudyPreferencesScreen({navigation}:RootScreenProps<'StudyPreferences'>){
 const {data,update}=useRoutine(),{colors:c}=useTheme(),[error,setError]=useState('');
 const [details,setDetails]=useState(false);
 const save=(extraEnabled:boolean,quickEnabled:boolean)=>void update(s=>({...s,studyRewardPolicy:{...s.studyRewardPolicy,extraEnabled,quickEnabled}})).catch(e=>setError(e.message));
 return <Page title="학습·보상 설정" right={<Link label="닫기" onPress={()=>navigation.goBack()}/>}>
  <CardView><Copy size={22} weight="800">실천은 각각, 시간은 함께</Copy><Copy>아침 전체 10분 · 작게 5분</Copy><Copy>단어 전체 20분 · 작게 5분</Copy><Copy>헬스장 30분 · 집 운동 10분</Copy><Copy muted size={13}>아침은 첫 사용 조건이에요. 단어·운동은 따로 적립되고, 작은 목표 뒤 전체 완료는 차액만 더 받아요.</Copy><Link label={details?'자세한 규칙 접기':'보상·하루 기준 자세히 보기'} onPress={()=>setDetails(!details)}/>{details?<><Copy muted size={13}>하루는 현지 시각 새벽 4시에 바뀌어요. 잔여 이용 시간과 아침 게이트만 초기화하고 기록은 유지해요. 기본 60분 합계는 전역 상한이 아니에요.</Copy><Copy muted size={13}>추가 카드의 다음 복습이 다음 학습일 이후로 넘어가면 완료예요. Again·당일 재학습은 응답만 늘어요. 기본 목표와 같은 완료를 중복 보상하지 않아요.</Copy><Copy muted size={13}>집중 공부는 손글씨 사진에서 읽힌 문자·숫자 100자당5분, 하루 상한이 없어요. 타이머·메모만으로는 새 보상을 지급하지 않아요. 기본 과목 목표는500자이며 더 공부해도 계속 적립돼요. 시간대가 바뀌는 여행 중에는 현지04시 기준을 확인해 주세요.</Copy></>:null}</CardView>
  <CardView><Copy weight="700">덱별 하루 새 카드</Copy><Copy muted>각 덱의 카드 관리에서 설정해요. 시작한 오늘 목표는 유지하고 다음 날부터 바뀌어요.</Copy>{data.decks.map(d=><Link key={d.id} label={`${d.name} · ${d.newLimit??data.newLimit}장`} onPress={()=>navigation.navigate('DeckCards',{deckId:d.id})}/>)}</CardView>
  <CardView><Copy size={23} weight="800">단어 보상, 하루 최대 60분</Copy><Copy muted size={13}>기본 목표 20분을 먼저 확보하고 추가·짧은 복습은 나머지 40분 안에서 적립해요. 한도 이후에도 공부는 계속할 수 있어요. 순서 보너스 60분은 별도로 받아요.</Copy><Link label="하루 순서·60분 보너스 설정" onPress={()=>navigation.navigate('HabitOrderSettings')}/><Copy weight="700">추가 단어 보상</Copy><View style={u.between}><View style={{flex:1}}><Copy>추가 카드 10장 완료 → 5분</Copy><Copy muted size={12}>기본·추가·짧은 복습 합계 하루 최대 60분</Copy></View><Switch accessibilityLabel="추가 단어 보상" value={extraRewardsEnabled(data)} trackColor={{true:c.primary,false:c.border}} onValueChange={value=>save(value,!!data.studyRewardPolicy?.quickEnabled)}/></View>
  <View style={u.between}><View style={{flex:1}}><Copy>짧은 복습 3장 → 2분</Copy><Copy muted size={12}>하루 2회 · 이미 보상받은 카드 제외</Copy></View><Switch accessibilityLabel="짧은 복습 보상" value={!!data.studyRewardPolicy?.quickEnabled} trackColor={{true:c.primary,false:c.border}} onValueChange={value=>save(extraRewardsEnabled(data),value)}/></View><Copy muted size={12}>오늘 기본 목표와 중복되지 않는 추가 카드를 마치면 적립해요. 같은 카드는 하루 한 번만 보상받고, 취침 잠금·아침 게이트는 유지돼요.</Copy></CardView>
  <CardView><Copy weight="800">기본 목표 그다음에는 자유 공부</Copy><Copy muted size={13}>원하는 주제로 손글씨를 남기고 사진을 찍어 시간을 모아요. 기본 목표 완료 전후 모두 같은 기준이며, 시간·하루 보상 상한이 없어요.</Copy><Link label="모든 보상과 자유 공부 확인" onPress={()=>navigation.navigate('TimeWallet')}/></CardView>{error?<Copy>{error}</Copy>:null}
 </Page>;
}


