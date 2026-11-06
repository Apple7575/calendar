import {priorityGate} from '../../lib/priorityPlan';
﻿import React,{useState} from 'react';
import {Text,View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/types';
import {canStudyWord,getDay,planStudy,studyDeckProgress} from '../../lib/routineModel';
import {wordRewardStatus} from '../../lib/studyRewards';
import {State} from 'ts-fsrs';
import {ThemeOverride,useTheme} from '../../theme/ThemeContext';
import {focusTheme} from '../../theme/themes';
import {useRoutine} from './RoutineProvider';
import {Notice,Action,CardView,Choice,Copy,Icon,Link,Page,Progress,u,CharacterPeek,NavCard} from './ui';
import {MenuRow,Segments,SettingsButton} from './experience';
import {space,type} from '../../theme/tokens';
import {FocusStart} from './FocusStart';
import {SpeakingHome} from './SpeakingHome';
import {ContentHome} from './ContentHome';
import {MascotVisible} from './mascotVisibility';
import {lapseWords} from '../../lib/lapseWords';
type Section='word'|'focus'|'speak'|'content';
/** A section stays mounted once opened and is only hidden, so coming back does not reload its friend (Lottie) or relayout the page. */
function SectionPane({id,section,opened,children}:{id:Section;section:Section;opened:Section[];children:()=>React.ReactNode}){
 return opened.includes(id)?<View style={{display:id===section?'flex':'none',gap:space.md}}><MascotVisible.Provider value={id===section}>{children()}</MascotVisible.Provider></View>:null;
}
export function StudyHomeScreen(){
 const nav=useNavigation<NativeStackNavigationProp<RootStackParamList>>(),{colors:c}=useTheme(),{data,ready,error,dayKey}=useRoutine();
 const [section,setSection]=useState<Section>('word'),[opened,setOpened]=useState<Section[]>(['word']),[selected,setSelected]=useState<string|undefined>();
 const planned=planStudy(data,dayKey),day=getDay(planned,dayKey),decks=data.decks.filter(d=>d.active||day.plan?.ids.some(id=>data.words.some(w=>w.id===id&&w.deckId===d.id)));
 const deckId=decks.some(d=>d.id===selected)?selected:undefined,progress=studyDeckProgress(planned,dayKey,deckId),started=!!getDay(data,dayKey).plan;
 const budget=wordRewardStatus(data,dayKey),pending=data.words.filter(w=>canStudyWord(w,dayKey)&&day.plan?.ids.includes(w.id)&&!day.complete.includes(w.id)&&(!deckId||w.deckId===deckId));
 const fresh=pending.filter(w=>w.card.state===State.New).length,learning=pending.filter(w=>w.card.state===State.Learning||w.card.state===State.Relearning).length,review=pending.length-fresh-learning;
 const label=deckId?decks.find(d=>d.id===deckId)!.name:decks.length===1?decks[0].name:'전체 단어장';
 const page=<Page title="학습" right={<SettingsButton/>}>
  <Segments value={section} onChange={(id:Section)=>{setSection(id);setOpened(o=>o.includes(id)?o:[...o,id])}} items={[{id:'word',label:'단어'},{id:'focus',label:'집중'},{id:'speak',label:'말하기'},{id:'content',label:'콘텐츠'}]}/>
  {priorityGate(data,dayKey).blocked&&(section==='speak'||section==='content')?<Notice tone="warning" actionLabel="준비한 첫 행동으로 이동" onAction={()=>nav.navigate('Main',{screen:'Today'})}>{'오늘 먼저 시작하기로 한 공부가 있어요. '+priorityGate(data,dayKey).reason+' 보상은 적립하고 첫 공부 뒤 사용할 수 있어요.'}</Notice>
  :priorityGate(data,dayKey).blocked?<CardView><Copy weight="800">오늘 먼저 시작하기로 한 공부</Copy><Copy size={13}>{priorityGate(data,dayKey).reason}</Copy><Link label="준비한 첫 행동으로 이동" onPress={()=>nav.navigate('Main',{screen:'Today'})}/><Copy muted size={12}>단어도 자유롭게 공부할 수 있어요. 보상은 적립하고 첫 공부 뒤 사용할 수 있어요.</Copy></CardView>:null}
  <SectionPane id="focus" section={section} opened={opened}>{()=><FocusStart/>}</SectionPane>
  <SectionPane id="speak" section={section} opened={opened}>{()=><SpeakingHome/>}</SectionPane>
  <SectionPane id="content" section={section} opened={opened}>{()=><ContentHome/>}</SectionPane>
  <SectionPane id="word" section={section} opened={opened}>{()=><>
   {decks.length>1?<View style={{flexDirection:'row',gap:7,flexWrap:'wrap'}}>{[{id:undefined,name:'전체 덱'},...decks].map(deck=><Choice key={deck.id??'all'} label={deck.name} accessibilityLabel={`${deck.name} 선택`} selected={deckId===deck.id} onPress={()=>setSelected(deck.id)}/>)}</View>:null}
   {!data.words.length?<View><CharacterPeek character="C02" action="A31"/><CardView><Text accessibilityRole="header" style={[type.heading,{color:c.text}]}>첫 단어를 심어볼까요?</Text><Copy muted>컴퓨터에서 준비한 단어장을 같은 계정으로 받아요.</Copy><Action label="첫 단어장 준비하기" onPress={()=>nav.navigate('StudySettings')}/></CardView></View>:<>
    <View><CharacterPeek character="C02" action={progress.full?'A23':'A17'}/><CardView><Text accessibilityRole="header" style={[type.heading,{color:c.text}]}>{progress.full?'오늘의 기억을 잘 가꿨어요!':progress.total?`${progress.remaining}장, 차근차근 만나봐요`:'오늘 예정된 학습이 없어요'}</Text><Copy muted>{label}</Copy><Action disabled={!ready} label={progress.full?'추가 학습하기':progress.total?started?'이어서 학습하기':'오늘 학습 시작':'더 공부하기'} onPress={()=>nav.navigate('RoutineStudySession',{level:'full',deckId})}/></CardView></View>
    <View style={{gap:15,paddingHorizontal:4}}><View style={{flexDirection:'row',alignItems:'baseline',gap:7}}><Text style={{fontSize:46,fontWeight:'800',color:c.text}}>{progress.done}</Text><Copy muted size={21}>/ {progress.total}장 완료</Copy></View><Progress value={progress.total?progress.done/progress.total:0} label="오늘 학습 진행률"/><View style={u.between}><Copy muted size={12}>남은 새 카드 {fresh} · 복습 {review} · 재학습 {learning}</Copy><Copy size={12}>{budget.untilNext}장 더 → +5분</Copy></View>
    {!deckId&&progress.minimum>0&&day.paid.words===0?<Link label={`오늘은 복습 ${progress.minimum}장만`} onPress={()=>nav.navigate('RoutineStudySession',{level:'min'})}/>:null}
    {decks.length>1?<Copy muted size={12}>{deckId?'선택한 덱의 카드만 나와요.':'활성 덱을 함께 공부해요.'} 보상 분량은 모든 덱을 합쳐 계산해요.</Copy>:null}
    {!progress.total?<Copy muted size={12}>완료한 카드 수만큼 보상 분량에 쌓여요. 원하면 추가 학습을 시작할 수 있어요.</Copy>:null}</View>
   </>}
   <NavCard title="오늘의 일본어 시작" subtitle="25분 구성 샘플 · 예문 복습 → 독해 → 새 상황 → 말하기" icon="language-outline" onPress={()=>nav.navigate('JapaneseSample')}/>
   <Copy muted size={12}>오늘 단어 보상 +{budget.earned}분 · 이번 구간 {budget.pending}/{budget.required}장 · 하루 상한 없음</Copy>{error?<Copy muted>{error}</Copy>:null}
   <MenuRow title="복습 예정" subtitle="오늘·내일·날짜별 복습할 카드" icon="calendar-outline" onPress={()=>nav.navigate('StudyForecast',{deckId})}/>
   <View style={{paddingHorizontal:4}}><MenuRow title="모아둔 단어" subtitle={`즐겨찾기 ${data.words.filter(w=>w.favorite).length} · 확인 필요 ${data.words.filter(w=>w.issue).length} · 자꾸 잊는 ${lapseWords(data).length}`} icon="star-outline" onPress={()=>nav.navigate('SavedStudy')}/><MenuRow title="내 단어장" subtitle={`${data.decks.length}개 단어장 · 카드 관리·컴퓨터에서 받기`} icon="albums-outline" onPress={()=>nav.navigate('StudySettings')}/><MenuRow title="학습 통계" subtitle="완료와 응답, 복습의 발자국" icon="stats-chart-outline" onPress={()=>nav.navigate('StudyHistory')}/></View>
  </>}</SectionPane>
 </Page>;
 // 집중 탭만 집중 테마로 그린다. 감싸는 컴포넌트를 늘 같게 두어 탭을 바꿔도 Page(상단 안전 영역)를 다시 만들지 않는다. 다시 만들면 첫 프레임에 위 여백이 0이 되어 깜빡인다.
 return <ThemeOverride theme={section==='focus'?focusTheme:undefined}>{page}</ThemeOverride>;
}

