import React,{useState} from 'react';
import { Switch,View } from 'react-native';
import { RootScreenProps } from '../../navigation/types';
import { useTheme } from '../../theme/ThemeContext';
import { AccountConnection } from './AccountConnection';
import { useRoutine } from './RoutineProvider';
import {Action,CardView,Copy,Link,NavCard,Page,u} from './ui';
import { extraRewardsEnabled } from '../../lib/studyRewards';
import n2Content from '../../../assets/decks/n2-vocabulary.json';
import {PublishedDeck,validatePublishedDeck} from '../../lib/japaneseDeck';
import {mergeStudyDeck,n3Deck} from '../../lib/n3Deck';
import {useConceptLab} from '../conceptLab/useConceptLab';
const preparedDecks=[n3Deck,validatePublishedDeck(n2Content)];
export function StudySettingsScreen({navigation}:RootScreenProps<'StudySettings'>){
 const {data,ready,update,syncDecks,syncingDecks,deckError,accountId}=useRoutine(),[connection,setConnection]=useState(false),[message,setMessage]=useState('');
 const {data:conceptData}=useConceptLab(accountId);
 const conceptCount=conceptData?Object.values(conceptData.cards).filter(card=>card.status==='ready').length:null;
 const [adding,setAdding]=useState(false),[addError,setAddError]=useState('');
 const addingRef=React.useRef(false);
 const available=preparedDecks.filter(deck=>!data.decks.some(existing=>existing.id===`pc:${deck.id}`));
 const addDeck=async(deck:PublishedDeck)=>{
  if(addingRef.current)return;
  addingRef.current=true;setAdding(true);setAddError('');
  try{await update(current=>mergeStudyDeck(current,deck));}
  catch{setAddError('단어장을 추가하지 못했어요. 다시 눌러 주세요.');}
  finally{addingRef.current=false;setAdding(false);}
 };
 return <Page title="내 단어장" right={<Link label="닫기" onPress={()=>navigation.goBack()}/>}>
  {data.decks.length?data.decks.map(deck=><NavCard key={deck.id} accessibilityLabel={`${deck.name} 카드 관리`} title={deck.name} subtitle={`${data.words.filter(w=>w.deckId===deck.id&&w.active!==false).length}장 · ${deck.active?'학습 중':'쉬는 중'}`} onPress={()=>navigation.navigate('DeckCards',{deckId:deck.id})}/>):<CardView><Copy>{ready?'아직 단어장이 없어요. 컴퓨터에서 준비한 단어장을 받아보세요.':'단어장을 불러오고 있어요…'}</Copy></CardView>}
  <NavCard accessibilityLabel="N3 문법·독해·청해 카드 열기" title="N3 문법·독해·청해" subtitle={conceptCount===null?'카드를 불러오는 중…':`${conceptCount}장 · 개념서 플래시카드`} onPress={()=>navigation.navigate('ConceptLab')}/>
  {ready&&available.length?<View style={{gap:10}}><Copy muted size={13}>추가할 수 있는 단어장</Copy>{available.map(deck=><View key={deck.id} style={{gap:4}}><Action compact secondary label={`${deck.name} 추가`} disabled={adding} onPress={()=>void addDeck(deck)}/><Copy muted size={12}>{deck.notes.length}장 · 단어·예문 음성 포함</Copy></View>)}{addError?<Copy size={13}>{addError}</Copy>:null}</View>:null}
  <Link label={connection?'컴퓨터 연결 접기':'컴퓨터 단어장 가져오기'} onPress={()=>setConnection(!connection)}/>
  {connection?<CardView><AccountConnection onConnected={syncDecks}/><Action label={syncingDecks?'단어장을 받고 있어요…':'컴퓨터 단어장 받기'} disabled={!ready||syncingDecks} onPress={()=>void syncDecks().then(count=>{if(count>=0)setMessage(count?`${count}개 단어장을 반영했어요.`:'현재 단어장이 최신이에요.');})}/>{deckError?<Copy size={13}>{deckError}</Copy>:null}{message?<Copy size={13}>{message}</Copy>:null}</CardView>:null}
 </Page>;
}
export function StudyPreferencesScreen({navigation}:RootScreenProps<'StudyPreferences'>){
 const {data,update}=useRoutine(),{colors:c}=useTheme(),[error,setError]=useState('');
 const [details,setDetails]=useState(false);
 const save=(extraEnabled:boolean,quickEnabled:boolean)=>void update(s=>({...s,studyRewardPolicy:{...s.studyRewardPolicy,extraEnabled,quickEnabled}})).catch(e=>setError(e.message));
 return <Page title="학습·보상 설정" right={<Link label="닫기" onPress={()=>navigation.goBack()}/>}>
  <CardView><Copy size={22} weight="800">실천은 각각, 시간은 함께</Copy><Copy>아침 전체 10분 · 작게 5분</Copy><Copy>단어 10장 → 15장 → 20장마다 5분</Copy><Copy>헬스장 30분 · 집 운동 10분</Copy><Copy muted size={13}>아침은 첫 사용 조건이에요. 단어·운동은 따로 적립되고, 아침·운동은 작은 목표 뒤 전체 완료 시 차액만 더 받아요.</Copy><Link label={details?'자세한 규칙 접기':'보상·하루 기준 자세히 보기'} onPress={()=>setDetails(!details)}/>{details?<><Copy muted size={13}>하루는 현지 시각 새벽 4시에 바뀌어요. 잔여 이용 시간과 아침 게이트만 초기화하고 기록은 유지해요. 기본 60분 합계는 전역 상한이 아니에요.</Copy><Copy muted size={13}>추가 카드의 다음 복습이 다음 학습일 이후로 넘어가면 완료예요. Again·당일 재학습은 응답만 늘어요. 기본 목표와 같은 완료를 중복 보상하지 않아요.</Copy><Copy muted size={13}>집중 공부는 계획 작성부터 +5분, 이후 2·5·10·15·25분 실제 공부와 필기 사진을 확인할 때마다 +5분이에요. 25분에서 더 늘지 않고, 집중 공부를 2시간 쉬면 계획부터 다시 시작해요. 필기 돈 보상은 100자당 500원이에요. 기본 과목 목표는500자이며 더 공부해도 계속 적립돼요. 시간대가 바뀌는 여행 중에는 현지04시 기준을 확인해 주세요.</Copy></>:null}</CardView>
  <CardView><Copy weight="700">덱별 하루 새 카드</Copy><Copy muted>각 덱의 카드 관리에서 설정해요. 시작한 오늘 목표는 유지하고 다음 날부터 바뀌어요.</Copy>{data.decks.map(d=><Link key={d.id} label={`${d.name} · ${d.newLimit??data.newLimit}장`} onPress={()=>navigation.navigate('DeckCards',{deckId:d.id})}/>)}</CardView>
  <CardView><Copy size={23} weight="800">공부할수록 늘어나는 단어 보상</Copy><Copy>처음 10장 → 5분</Copy><Copy>다음 15장 → 5분 추가</Copy><Copy>다음 20장 → 5분 추가</Copy><Copy muted size={13}>이후에도 필요한 카드 수가 5장씩 늘어요. 기본·추가·짧은 복습을 함께 계산하며 하루 상한은 없어요. 새벽 4시에 10장부터 다시 시작해요.</Copy><Copy muted size={13}>다음 복습이 다음 학습일로 넘어간 카드만 세요. 같은 카드는 하루 한 번만 반영하고, 다시·당일 재학습은 보상 개수를 늘리지 않아요. 작은 목표와 전체 완료 자체의 고정 보상은 없어요.</Copy><Link label="하루 순서·60분 보너스 설정" onPress={()=>navigation.navigate('HabitOrderSettings')}/></CardView>
  <CardView><Copy weight="800">기본 목표 그다음에는 자유 공부</Copy><Copy muted size={13}>원하는 주제로 손글씨를 남기고 사진을 찍어 시간을 모아요. 기본 목표 완료 전후 모두 같은 기준이며, 시간·하루 보상 상한이 없어요.</Copy><Link label="모든 보상과 자유 공부 확인" onPress={()=>navigation.navigate('TimeWallet')}/></CardView>{error?<Copy>{error}</Copy>:null}
 </Page>;
}


