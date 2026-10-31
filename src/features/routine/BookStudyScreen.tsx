import React,{useEffect,useRef,useState} from 'react';
import {TextInput,View} from 'react-native';
import {MicButton} from '../../components/MicButton';
import {BookSession,bookNoteRewardPreview,pauseBookTimer,resumeBookTimer,saveBookNote,settleBookTimer} from '../../lib/bookStudy';
import {getDay} from '../../lib/routineModel';
import {startOutputStudy} from '../../lib/handwriting';
import * as Crypto from 'expo-crypto';
import {RootScreenProps} from '../../navigation/types';
import {useTheme} from '../../theme/ThemeContext';
import {useRoutine} from './RoutineProvider';
import {Action,CardView,Copy,Link,Page} from './ui';
import {BoriScene} from './experience';
import {FocusStart} from './FocusStart';
import {HandwritingStudy} from './HandwritingStudy';
import {HabitOrderCard} from './HabitOrderCard';

function NoteForm({session}:{session:BookSession}){
 const {update,data}=useRoutine(),{colors:c}=useTheme(),[note,setNote]=useState(session.note),[next,setNext]=useState(session.next),[error,setError]=useState(''),[busy,setBusy]=useState(false),prefix=useRef(''),reward=bookNoteRewardPreview(data,session);
 const append=(text:string)=>setNote(`${prefix.current}${prefix.current?'\n':''}${text}`);
 return <CardView><Copy weight="700">{session.subject} · {Math.round(session.seconds/60)}분 기록</Copy><TextInput accessibilityLabel="공부한 내용" value={note} onChangeText={setNote} multiline placeholder="공부한 내용 · 사진 보상과 별개로 남기는 메모" placeholderTextColor={c.textMuted} style={{backgroundColor:c.inputBg,color:c.text,borderRadius:16,padding:14,minHeight:90,textAlignVertical:'top'}}/><MicButton onText={append} onPartial={append} onListeningChange={listening=>{if(listening)prefix.current=note}}/><TextInput accessibilityLabel="다음 시작 위치" value={next} onChangeText={setNext} placeholder="다음에 이어갈 위치 · 선택" placeholderTextColor={c.textMuted} style={{backgroundColor:c.inputBg,color:c.text,borderRadius:14,padding:14}}/><Action label={reward?`이전 방식으로 끝낸 공부 기록 · +${reward}분`:'메모 저장 · 시간 보상 없음'} disabled={busy} onPress={()=>{setBusy(true);void update(s=>saveBookNote(s,session.id,note,next)).catch(e=>setError(e.message)).finally(()=>setBusy(false))}}/>{error?<Copy>{error}</Copy>:null}</CardView>;
}
export function BookStudyScreen({navigation,route}:RootScreenProps<'BookStudy'>){
 const {data,dayKey,update}=useRoutine(),[clock,setClock]=useState(Date.now()),[error,setError]=useState(''),[notes,setNotes]=useState(false),timer=data.bookTimer;
 useEffect(()=>{const id=setInterval(()=>setClock(Date.now()),500);return()=>clearInterval(id)},[]);
 useEffect(()=>{if(timer?.running&&clock>=timer.endsAt)void update(s=>settleBookTimer(s,Date.now())).catch(e=>setError(e.message))},[clock,timer?.running,timer?.endsAt,update]);
 const left=timer?.running?Math.max(0,Math.ceil((timer.endsAt-clock)/1000)):timer?.remaining??0;
 const run=(fn:Parameters<typeof update>[0])=>{void update(fn).catch(e=>setError(e.message))};
 return <Page title="손글씨 공부" right={<Link label="닫기" onPress={()=>navigation.goBack()}/>}>
  {route.params?.subject&&data.outputDraft&&route.params.subject!==data.outputDraft.subject&&!data.handwritingPending?<CardView><Copy>현재 {data.outputDraft.subject} 공부를 이어가는 중이에요.</Copy><Action secondary label={`${route.params.subject} 공부로 전환`} onPress={()=>run(s=>startOutputStudy({...s,outputDraft:undefined,bookTimer:s.bookTimer?{...s.bookTimer,phase:'idle',running:false,remaining:0}:undefined},Crypto.randomUUID(),route.params!.subject!))}/><Copy muted size={12}>지금까지 남긴 공부와 적립 시간은 유지돼요.</Copy></CardView>:null}
  {data.outputDraft||data.handwritingPending?<HandwritingStudy/>:<FocusStart initialSubject={route.params?.subject}/>}
  {timer&&timer.phase!=='idle'?<BoriScene tone="focus" size={90} mood={timer.phase==='break'?'cheer':'focus'} title={timer.phase==='break'?'잠깐 몸을 펴볼까요?':`${timer.subject} · 집중 중`} description="타이머는 공부를 돕는 도구예요. 보상은 노트 사진으로 받아요."><View style={{alignItems:'center'}}><Copy size={48} weight="800">{String(Math.floor(left/60)).padStart(2,'0')}:{String(left%60).padStart(2,'0')}</Copy></View><Action secondary label={timer.running?'타이머 잠깐 멈추기':'타이머 이어가기'} onPress={()=>run(s=>timer.running?pauseBookTimer(s):resumeBookTimer(s))}/><Link label="타이머 종료 · 공부 기록 유지" onPress={()=>run(s=>({...s,bookTimer:s.bookTimer?{...s.bookTimer,phase:'idle',running:false,remaining:0}:undefined}))}/></BoriScene>:null}
  <CardView><Copy weight="800">오늘 손글씨 공부 보상 +{getDay(data,dayKey).bonus?.handwriting??0}분</Copy><Copy muted size={13}>하루 상한 없음 · 단어 보상 60분 한도와 별개예요. 아침 루틴 완료 후 사용해요.</Copy></CardView>
  {getDay(data,dayKey).orderProgress?.status==='complete'?<HabitOrderCard/>:null}
  <Link label={notes?'타이머 메모 접기':'타이머 공부 메모·이전 기록'} onPress={()=>setNotes(!notes)}/>
  {notes?<>{(data.bookSessions??[]).filter(s=>!s.savedAt).map(s=><NoteForm key={s.id} session={s}/>)}{[...(data.bookSessions??[])].reverse().filter(s=>s.savedAt).slice(0,5).map(s=><CardView key={s.id}><Copy weight="700">{s.subject} · {Math.round(s.seconds/60)}분</Copy><Copy>{s.note}</Copy>{s.next?<Copy muted>다음: {s.next}</Copy>:null}</CardView>)}</>:null}
  {error?<Copy>{error}</Copy>:null}
 </Page>;
}
