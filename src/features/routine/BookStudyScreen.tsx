import {useStudyFeedback} from './useStudyFeedback';
import React,{useEffect,useRef,useState} from 'react';
import {TextInput,View} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import {MicButton} from '../../components/MicButton';
import {BookSession,bookNoteRewardPreview,finishFocusRun,saveBookNote,settleBookTimer} from '../../lib/bookStudy';
import {focusQuitPenalty,penaltyLabel} from '../../lib/focusPenalty';
import {getDay} from '../../lib/routineModel';
import {startOutputStudy} from '../../lib/handwriting';
import {FOCUS_FLOW_TITLES,focusFlowStage,opensTimer} from '../../lib/focusFlow';
import * as Crypto from 'expo-crypto';
import {RootScreenProps} from '../../navigation/types';
import {FocusThemeProvider,useTheme} from '../../theme/ThemeContext';
import {useRoutine} from './RoutineProvider';
import {Action,CardView,Copy,Page} from './ui';
import {FocusList,FocusListRow} from './FocusList';
import {FocusStart} from './FocusStart';
import {HandwritingStudy} from './HandwritingStudy';
import {HabitOrderCard} from './HabitOrderCard';

function NoteForm({session}:{session:BookSession}){
 const {update,data}=useRoutine(),{colors:c}=useTheme(),[note,setNote]=useState(session.note),[next,setNext]=useState(session.next),[error,setError]=useState(''),[busy,setBusy]=useState(false),prefix=useRef(''),reward=bookNoteRewardPreview(data,session);
 const append=(text:string)=>setNote(`${prefix.current}${prefix.current?'\n':''}${text}`);
 return <CardView><Copy weight="700">{session.subject} · {Math.round(session.seconds/60)}분 기록</Copy><TextInput accessibilityLabel="공부한 내용" value={note} onChangeText={setNote} multiline placeholder="공부한 내용 · 사진 보상과 별개로 남기는 메모" placeholderTextColor={c.textMuted} style={{backgroundColor:c.inputBg,color:c.text,borderRadius:16,padding:14,minHeight:90,textAlignVertical:'top'}}/><MicButton onText={append} onPartial={append} onListeningChange={listening=>{if(listening)prefix.current=note}}/><TextInput accessibilityLabel="다음 시작 위치" value={next} onChangeText={setNext} placeholder="다음에 이어갈 위치 · 선택" placeholderTextColor={c.textMuted} style={{backgroundColor:c.inputBg,color:c.text,borderRadius:14,padding:14}}/><Action label={reward?`이전 방식으로 끝낸 공부 기록 · +${reward}분`:'메모 저장 · 시간 보상 없음'} disabled={busy} onPress={()=>{setBusy(true);void update(s=>saveBookNote(s,session.id,note,next)).catch(e=>setError(e.message)).finally(()=>setBusy(false))}}/>{error?<Copy>{error}</Copy>:null}</CardView>;
}
export function BookStudyScreen(props:RootScreenProps<'BookStudy'>){
 return <FocusThemeProvider><BookStudyPage {...props}/></FocusThemeProvider>;
}
function BookStudyPage({navigation,route}:RootScreenProps<'BookStudy'>){
 const {data,dayKey,update,ready}=useRoutine(),focused=useIsFocused(),[clock,setClock]=useState(Date.now()),[error,setError]=useState(''),[notes,setNotes]=useState(false),[hasPhoto,setHasPhoto]=useState(false),timer=data.bookTimer,draft=data.outputDraft;
 // Saving clears the pending result; stay mounted until the reward screen takes over, or its navigation is lost.
 const saving=useRef(false);if(!focused)saving.current=false;
 const stage=saving.current?'submit':focusFlowStage(data,hasPhoto,clock,!!route.params?.capture,!!route.params?.declare),working=stage==='submit'||stage==='review',capturing=(stage==='capture'||working)&&(!!draft||!!data.handwritingPending);
 const switchTo=route.params?.subject&&draft&&route.params.subject!==draft.subject&&!working?route.params.subject:undefined,toTimer=opensTimer(stage);
 useEffect(()=>{const id=setInterval(()=>setClock(Date.now()),500);return()=>clearInterval(id)},[]);
 useEffect(()=>{if(timer?.phase==='break'&&timer.running&&clock>=timer.endsAt)void update(s=>settleBookTimer(s,Date.now())).catch(e=>setError(e.message))},[clock,timer?.running,timer?.endsAt,update]);
 useEffect(()=>{if(focused&&ready&&toTimer&&!switchTo)navigation.replace('FocusTimer')},[focused,ready,toTimer,switchTo,navigation]);
 useStudyFeedback(timer?.running&&clock>=timer.endsAt?{kind:'timer',id:timer.id+':'+timer.phase}:null);
 const run=(fn:Parameters<typeof update>[0])=>{void update(fn).catch(e=>setError(e.message))};
 const canFinish=!!draft&&!data.handwritingPending&&!working,penalty=penaltyLabel(focusQuitPenalty(data,clock));
 const rows=<>
  {timer&&timer.phase!=='idle'?<FocusListRow label="큰 타이머로 돌아가기" onPress={()=>navigation.popTo('FocusTimer')}/>:null}<FocusListRow label="타이머 공부 메모·이전 기록" open={notes} last={!canFinish} onPress={()=>setNotes(!notes)}/>
  {canFinish?<FocusListRow label={'이 과목 공부 마치기 · '+(penalty||'기록은 유지')} last onPress={()=>run(s=>({...finishFocusRun(s),outputDraft:undefined}))}/>:null}
 </>;
 return <Page title={FOCUS_FLOW_TITLES[stage]} right={<View/>}>
  {switchTo?<CardView><Copy>현재 {draft!.subject} 공부를 이어가는 중이에요.</Copy><Action secondary label={`${switchTo} 공부로 전환${penalty?' · '+penalty:''}`} onPress={()=>run(s=>startOutputStudy({...finishFocusRun(s),outputDraft:undefined},Crypto.randomUUID(),switchTo))}/>{toTimer?<Action label="큰 타이머로 돌아가기" onPress={()=>navigation.replace('FocusTimer')}/>:null}<Copy muted size={12}>{penalty?'지금 바꾸면 이번 단계를 못 채워 벌점이 있어요. 받은 시간과 기록은 유지돼요.':'지금까지 남긴 공부와 적립 시간은 유지돼요.'}</Copy></CardView>:null}
  {!capturing&&!toTimer?<FocusStart compact initialSubject={route.params?.subject}/>:null}
  {capturing?<HandwritingStudy declare={!!route.params?.declare} onPhotoChange={setHasPhoto} onSaving={value=>{saving.current=value}} moreRows={working?undefined:rows} afterCard={stage==='capture'&&(!timer||timer.phase==='idle')?<FocusStart compact secondary initialSubject={route.params?.subject}/>:undefined}/>:null}
  {!working&&!toTimer&&getDay(data,dayKey).orderProgress?.status==='complete'?<HabitOrderCard/>:null}
  {working||toTimer||capturing?null:<FocusList>{rows}</FocusList>}
  {notes&&!working&&!toTimer?<>{(data.bookSessions??[]).filter(s=>!s.savedAt).map(s=><NoteForm key={s.id} session={s}/>)}{[...(data.bookSessions??[])].reverse().filter(s=>s.savedAt).slice(0,5).map(s=><CardView key={s.id}><Copy weight="700">{s.subject} · {Math.round(s.seconds/60)}분</Copy><Copy>{s.note}</Copy>{s.next?<Copy muted>다음: {s.next}</Copy>:null}</CardView>)}</>:null}
  {error?<Copy>{error}</Copy>:null}
 </Page>;
}
