import React,{useCallback,useEffect,useRef,useState} from 'react';
import {AppState,View} from 'react-native';
import * as Crypto from 'expo-crypto';
import {useFocusEffect} from '@react-navigation/native';
import {askSpeakingQuestion,checkSpeakingFollowUp,coachSpeakingAnswer} from '../../lib/speakingApi';
import {loadSpeakingCalls,speakingCallsLeft} from '../../lib/speakingCalls';
import {SPEAKING_SAMPLE,speakingCaptureAvailable,startSpeakingCapture,type SpeakingStop} from '../../lib/speakingCapture';
import {answerForAi,attachSpeakingFeedback,canStartSpeaking,nextSpeakingQuestion,saveSpeakingAnswer,saveSpeakingFollowUp,settleSpeaking,SPEAKING_POLICY,SPEAKING_UNCOUNTED_TEXT,speakingRecords,speakingToday,spokenChars,type SpeakingRecord} from '../../lib/speaking';
import {speakingCharWeight,speakingTopic} from '../../lib/speakingTopics';
import {rewardChange} from '../../lib/rewardChange';
import {clockLabel} from '../../lib/focusJourney';
import {RootScreenProps} from '../../navigation/types';
import {koreanTitle,space} from '../../theme/tokens';
import {useTheme} from '../../theme/ThemeContext';
import {useRoutine} from './RoutineProvider';
import {Action,CardView,Copy,Field,Link,LoadingState,Notice,Page} from './ui';
import {SpeakingProgress} from './SpeakingHome';

const STOP_TEXT:Record<SpeakingStop,string>={denied:'마이크·음성 인식 권한이 필요해요. 설정에서 허용해 주세요. 지금까지 말한 내용은 남아 있어요.',silent:'한동안 말소리가 들리지 않아 잠시 멈췄어요. 지금까지 말한 내용은 남아 있어요.',failed:'음성 인식이 멈췄어요. 지금까지 말한 내용은 남아 있어요.'};
/** Only the latest words are drawn while speaking, so a long answer stays light. All of it is kept. */
const LIVE_CHARS=600;
const join=(a:string,b:string)=>a+(a&&b?' ':'')+b;
/** One spoken answer. It may be held and carried on, so what came before each stretch is kept apart from what is being heard. */
type Speaking={kind:'answer'|'followUp';before:string;text:string;secondsBefore:number;startedAt:number;held:boolean};

/** Keeps the screen on while speaking, since an answer can outlast auto-lock. */
function useKeepAwakeWhile(on:boolean){
 useEffect(()=>{
  if(!on)return;
  const tag='routine-speaking';
  try{void Promise.resolve(require('expo-keep-awake').activateKeepAwakeAsync(tag)).catch(()=>{})}catch{}
  return()=>{try{void Promise.resolve(require('expo-keep-awake').deactivateKeepAwake(tag)).catch(()=>{})}catch{}};
 },[on]);
}
export function SpeakingSessionScreen({route,navigation}:RootScreenProps<'SpeakingSession'>){
 const {data,dayKey,update,ready}=useRoutine(),{colors:c}=useTheme();
 const topic=route.params?.topicId?speakingTopic(route.params.topicId):undefined;
 const [recordId,setRecordId]=useState(route.params?.recordId),record:SpeakingRecord|undefined=speakingRecords(data).find(r=>r.id===recordId);
 const [question,setQuestion]=useState<string|undefined>(topic?nextSpeakingQuestion(data,topic,dayKey):undefined);
 const [speaking,setSpeaking]=useState<Speaking|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[clock,setClock]=useState(Date.now()),[callsLeft,setCallsLeft]=useState<number>(SPEAKING_POLICY.dailyAiCalls),[customTopic,setCustomTopic]=useState('');
 const stopper=useRef<(()=>Promise<string>)|null>(null),asked=useRef(false),current=useRef(speaking);current.current=speaking;
 const P=SPEAKING_POLICY;
 const listening=!!speaking&&!speaking.held;
 useKeepAwakeWhile(listening);
 useEffect(()=>{void loadSpeakingCalls().then(()=>setCallsLeft(speakingCallsLeft(dayKey)))},[dayKey,busy]);
 useEffect(()=>{if(!listening)return;const id=setInterval(()=>setClock(Date.now()),250);return()=>clearInterval(id)},[listening]);
 /** A topic the AI writes for gets its question here. */
 const fetchQuestion=useCallback(async(avoid?:string)=>{
  if(!topic||topic.questions?.length)return;
  const about=topic.askTopic?customTopic.trim():topic.title;if(!about)return;
  setBusy(true);setError('');
  try{setQuestion(await askSpeakingQuestion(dayKey,about,topic.aiBrief,avoid))}catch(e){setError(e instanceof Error?e.message:'질문을 받지 못했어요.')}finally{setBusy(false)}
 },[topic,dayKey,customTopic]);
 useEffect(()=>{if(ready&&topic&&topic.aiBrief&&!topic.questions?.length&&!question&&!recordId&&!asked.current){asked.current=true;void fetchQuestion()}},[ready,topic,question,recordId,fetchQuestion]);
 const shownTopic=topic??(record?speakingTopic(record.topicId):undefined),language=shownTopic?.language??'ko-KR',style={language:shownTopic?.language,coach:shownTopic?.coach},weight=speakingCharWeight(shownTopic?.id??'');

 /** Stops listening and keeps it all on screen to carry on or finish. Nothing is sent, so nothing can be lost here. */
 const hold=useCallback(async(message?:string)=>{
  const stop=stopper.current;stopper.current=null;
  let heard:string|undefined;
  if(stop){try{heard=await stop()}catch{}}
  setSpeaking(s=>s&&!s.held?{...s,text:heard||s.text,secondsBefore:s.secondsBefore+(Date.now()-s.startedAt)/1000,held:true}:s);
  if(message)setError(message);
 },[]);
 const listen=async(kind:'answer'|'followUp',before='',secondsBefore=0)=>{
  if(listening||busy)return;
  setError('');
  try{
   stopper.current=await startSpeakingCapture(kind,language,text=>setSpeaking(s=>s&&!s.held?{...s,text}:s),reason=>{stopper.current=null;void hold(STOP_TEXT[reason])});
   setSpeaking({kind,before,text:'',secondsBefore,startedAt:Date.now(),held:false});setClock(Date.now());
  }catch(e){setError(e instanceof Error?e.message:'음성 인식을 시작하지 못했어요.')}
 };
 /** Leaving mid-answer holds what was heard instead of dropping it. */
 useEffect(()=>{const sub=AppState.addEventListener('change',state=>{if(state!=='active')void hold()});return()=>sub.remove()},[hold]);
 useFocusEffect(useCallback(()=>()=>{void hold()},[hold]));

 const askCoach=async(id:string,asking:string,answer:string)=>{
  setBusy(true);setError('');
  try{const {feedback,verdict}=await coachSpeakingAnswer(dayKey,asking,answerForAi(answer),style);await update(s=>attachSpeakingFeedback(s,id,feedback,verdict))}
  catch(e){setError(e instanceof Error?e.message:'AI 답변을 받지 못했어요. 말한 내용은 남아 있어요.')}
  finally{setBusy(false)}
 };
 /** Ends the session. A retry after a failure lands here again, and the record pays once. */
 const finish=async(r:SpeakingRecord,followUpAnswer?:string)=>{
  setBusy(true);setError('');
  try{
   const verdict=followUpAnswer?await checkSpeakingFollowUp(dayKey,r.question,answerForAi(r.answer),r.feedback!.followUp,followUpAnswer,style):undefined;
   let reward:ReturnType<typeof rewardChange>|undefined,credited=0;
   await update(s=>{const next=settleSpeaking(s,r.id,verdict);reward=rewardChange(s,next,dayKey);credited=speakingRecords(next).find(x=>x.id===r.id)?.creditedChars??0;return next});
   if(reward&&reward.minutes>0)navigation.replace('EarnedReward',{id:r.id,kind:'speaking',quantity:credited,...reward});
  }catch(e){setError(e instanceof Error?e.message:'마치지 못했어요. 말한 내용은 남아 있어요.')}
  finally{setBusy(false)}
 };
 const finishSpeaking=async()=>{
  const now=current.current;if(!now)return;
  const stop=stopper.current;stopper.current=null;
  let heard=now.text;
  if(stop&&!now.held){setBusy(true);try{heard=(await stop())||heard}catch{}setBusy(false)}
  const said=join(now.before,heard),seconds=now.secondsBefore+(now.held?0:(Date.now()-now.startedAt)/1000);
  if(spokenChars(said)<P.minChars){setSpeaking(null);setError('말한 내용이 거의 없어요. 다시 말해 주세요.');return}
  setSpeaking(null);
  if(now.kind==='answer'){
   if(!question||!topic)return;
   const id=Crypto.randomUUID(),asking=question,about=topic;
   await update(s=>saveSpeakingAnswer(s,{id,topicId:about.id,topicTitle:about.askTopic&&customTopic.trim()?about.title+' · '+customTopic.trim():about.title,question:asking,answer:said,seconds}));
   setRecordId(id);await askCoach(id,asking,said);
  }else if(record){
   const r=record;
   await update(s=>saveSpeakingFollowUp(s,r.id,said));
   await finish(r,said.slice(0,P.storeFollowUpChars));
  }
 };

 const close=<Link label="닫기" onPress={()=>navigation.goBack()}/>;
 const shownQuestion=record?.question??question;
 const questionCard=shownQuestion?<CardView><Copy variant="caption" muted>{record?.topicTitle??topic?.title}</Copy><Copy {...koreanTitle.props} variant="heading" style={koreanTitle.style}>{shownQuestion}</Copy></CardView>:null;
 const fixed=topic?.questions,other=fixed&&fixed.length>1?()=>setQuestion(q=>fixed[(fixed.indexOf(q!)+1)%fixed.length]):question&&topic?()=>void fetchQuestion(question):undefined,missedLabel=shownTopic?.missedLabel??'빠뜨린 점';

 if(speaking){
  const said=join(speaking.before,speaking.text),chars=spokenChars(said),seconds=Math.floor(speaking.secondsBefore+(speaking.held?0:Math.max(0,clock-speaking.startedAt)/1000));
  const saying=(speaking.kind==='followUp'?chars*P.followUpWeight:chars)*weight,next=speakingToday(data,dayKey,saying);
  return <Page title={speaking.kind==='answer'?'말로 답하기':'되묻는 질문에 답하기'} footer={<View style={{gap:space.xs}}>{speaking.held?<Action label="이어서 말하기" icon="mic-outline" onPress={()=>void listen(speaking.kind,said,speaking.secondsBefore)}/>:null}<Action secondary={speaking.held} label="다 말했어요" disabled={busy} onPress={()=>void finishSpeaking()}/></View>}>
   {speaking.kind==='followUp'&&record?.feedback?<CardView><Copy variant="label">{record.feedback.followUp}</Copy></CardView>:questionCard}
   <CardView>
    <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:space.sm}}>
     <View style={{flexDirection:'row',alignItems:'center',gap:space.xs}}><View style={{width:10,height:10,borderRadius:5,backgroundColor:speaking.held?c.textMuted:c.primary}}/><Copy variant="label">{speaking.held?'잠시 멈췄어요':'듣고 있어요'}</Copy></View>
     <Copy variant="heading" style={{fontVariant:['tabular-nums']}}>{clockLabel(seconds)}</Copy>
    </View>
    <SpeakingProgress data={data} dayKey={dayKey} saying={saying}/>
    <Copy variant="caption" muted>{chars.toLocaleString('ko-KR')+'자'+(speaking.kind==='followUp'?' · 되묻는 답변은 2배로 인정해요':'')+(next.upcomingSteps?' · 이번에 +'+next.upcomingSteps*P.stepMinutes+'분 예정':'')}</Copy>
    <View testID="speaking-live-text"><Copy>{said?(said.length>LIVE_CHARS?'… '+said.slice(-LIVE_CHARS):said):'말하면 여기에 글자로 나와요.'}</Copy></View>
    {SPEAKING_SAMPLE?<Copy variant="caption" muted>웹 미리보기라 예시 답변이 자동으로 입력돼요. 마이크를 쓰지 않아요.</Copy>:null}
   </CardView>
   {error?<Notice tone="warning">{error}</Notice>:null}
  </Page>;
 }
 if(!record&&!topic)return <Page title="말하기" right={close}><CardView><Copy>이 말하기를 찾지 못했어요.</Copy></CardView></Page>;
 if(!speakingCaptureAvailable())return <Page title="말하기" right={close}><Notice tone="warning">말하기는 새 아이폰 빌드에서 쓸 수 있어요.</Notice></Page>;

 if(record?.status==='settled'){
  const earned=record.minutes??0,credited=record.creditedChars??0;
  const again=speakingTopic(record.topicId);
  return <Page title="말하기 결과" right={close} footer={again?<Action label="한 번 더 말하기" icon="mic-outline" onPress={()=>navigation.replace('SpeakingSession',{topicId:again.id})}/>:undefined}>
   {questionCard}
   <CardView>
    <Copy variant="section">{earned?earned+'분 · '+(earned*P.wonPerMinute).toLocaleString('ko-KR')+'원을 받았어요':credited?credited.toLocaleString('ko-KR')+'자를 인정했어요':'이번 글자는 인정되지 않았어요'}</Copy>
    {record.uncounted?<Copy>{SPEAKING_UNCOUNTED_TEXT[record.uncounted]}</Copy>:null}
    <SpeakingProgress data={data} dayKey={dayKey}/>
    <Copy variant="caption" muted>말한 내용과 AI 답변은 하루 기록에서 다시 볼 수 있어요.</Copy>
   </CardView>
  </Page>;
 }
 if(record){
  const fb=record.feedback,waiting=record.followUpAnswer;
  const actions=busy?null:!fb?<><Action label="AI 답변 다시 받기" disabled={!callsLeft} onPress={()=>void askCoach(record.id,record.question,record.answer)}/><Link label="글자 인정 없이 연습만 마치기" onPress={()=>void finish(record)}/></>:waiting?<><Action label="다시 확인하고 마치기" disabled={!callsLeft} onPress={()=>void finish(record,waiting)}/><Link label="되묻는 답변 빼고 마치기" onPress={()=>void finish(record)}/></>:<><Action label="되묻는 질문에 답하기" icon="mic-outline" disabled={!callsLeft} onPress={()=>void listen('followUp')}/><Link label="건너뛰고 마치기" onPress={()=>void finish(record)}/></>;
  return <Page title={fb?'AI 답변':'답변 저장됨'} right={close} footer={actions?<View style={{gap:space.xxs}}>{actions}</View>:undefined}>
   {questionCard}
   {fb?<>
    <CardView><Copy variant="label">되묻는 질문</Copy><Copy {...koreanTitle.props} variant="section" style={koreanTitle.style}>{fb.followUp}</Copy>{waiting?<Copy>{waiting}</Copy>:<Copy variant="caption" muted>답하면 글자를 2배로 인정해요. 건너뛰어도 돼요.</Copy>}</CardView>
    <CardView><Copy variant="label">잘한 점</Copy><Copy>{fb.good}</Copy><Copy variant="label">{missedLabel}</Copy><Copy>{fb.missed}</Copy></CardView>
   </>:busy?null:<Notice tone="warning">아직 AI 답변을 받지 못했어요. 말한 내용은 저장되어 있어요.</Notice>}
   {!callsLeft&&!busy?<Notice tone="warning">오늘 AI 답변 100회를 모두 썼어요. 말한 내용은 남아 있고, 내일 이어서 받을 수 있어요.</Notice>:null}
   {error?<Notice tone="error">{error}</Notice>:null}
   {busy?<LoadingState label="AI 답변을 기다리고 있어요"/>:null}
   <CardView><Copy variant="caption" muted>{'내가 말한 내용 · '+(record.answerChars??spokenChars(record.answer)).toLocaleString('ko-KR')+'자'}</Copy><Copy>{record.answer}</Copy>{(record.answerChars??0)>record.answer.length?<Copy variant="caption" muted>긴 답변은 앞부분만 저장해요. 글자 수는 말한 만큼 모두 인정해요.</Copy>:null}</CardView>
  </Page>;
 }
 const blocked=!canStartSpeaking(data);
 const start=question?<Action label="말로 답하기" icon="mic-outline" disabled={!ready||busy||blocked||!callsLeft} onPress={()=>void listen('answer')}/>:topic?.aiBrief&&!busy?<Action label="질문 다시 받기" disabled={!callsLeft} onPress={()=>void fetchQuestion()}/>:null,another=other&&!busy?<Link label="다른 질문" onPress={other}/>:null;
 return <Page title="말하기" right={close} footer={start||another?<View style={{gap:space.xxs}}>{start}{another}</View>:undefined}>
  {questionCard}
  {!question&&busy?<LoadingState label="질문을 받고 있어요"/>:null}
  <CardView>
   <SpeakingProgress data={data} dayKey={dayKey}/>
   <Copy variant="caption" muted>길게 말해도 끊기지 않아요. 말한 글자를 모두 인정하고, 같은 질문도 고쳐 말하면 다시 인정돼요.{weight>1?' 일본어는 글자를 '+weight+'배로 인정해요.':''}</Copy>
   {topic?.notice?<Copy variant="caption" muted>{topic.notice}</Copy>:null}
  </CardView>
  {topic?.askTopic&&!question?<CardView><Field label="어떤 주제로 말할까요?" value={customTopic} onChangeText={setCustomTopic} maxLength={40} placeholder="예: 좋아하는 책"/><Action label="질문 받기" disabled={!ready||busy||!customTopic.trim()||!callsLeft} onPress={()=>void fetchQuestion()}/></CardView>:null}
  {blocked?<Notice tone="warning">공부 타이머가 진행 중이에요. 쉬는 시간이나 공부를 마친 뒤 시작할 수 있어요.</Notice>:null}
  {!callsLeft?<Notice tone="warning">오늘 AI 답변 100회를 모두 썼어요. 내일 다시 할 수 있어요.</Notice>:null}
  {error?<Notice tone="error">{error}</Notice>:null}
 </Page>;
}
