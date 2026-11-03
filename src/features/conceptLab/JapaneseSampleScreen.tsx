import React,{useEffect,useRef,useState} from 'react';
import {Pressable,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {RootScreenProps} from '../../navigation/types';
import {useRoutine} from '../routine/RoutineProvider';
import {Action,CardView,Choice,Copy,Link,Page} from '../routine/ui';
import {StudyCardSurface} from '../routine/StudyCardSurface';
import {useTheme} from '../../theme/ThemeContext';
import {BoriScene} from '../routine/experience';
import {JapaneseAnswer,JapaneseSample,japaneseNovelCorrect,japaneseRetryQueue,recordJapaneseRetry,japaneseSampleConcepts as concepts,japaneseSampleNovelConcepts as novelConcepts,japaneseSampleReading as passage,japaneseSampleReadingQuestions as questions,japaneseSampleSummary,moveJapaneseSample,newJapaneseSample,recordJapaneseAnswer} from '../../lib/japaneseSample';

const phases=['예문을 이해하고 떠올리기','짧은 지문에서 근거 찾기','새로운 상황에서 적용하기','한 문장 말하고 자기 평가'];
const reasons=['문법 헷갈림','단어 모름','단서 놓침'];
export function JapaneseSampleScreen({navigation}:RootScreenProps<'JapaneseSample'>){
 const {accountId}=useRoutine(),{colors:c}=useTheme(),key=`routine.japanese-sample.v1.${accountId??'local'}`;
 const [session,setSession]=useState<JapaneseSample|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [index,setIndex]=useState(0),[revealed,setRevealed]=useState(false),[details,setDetails]=useState(false),[asking,setAsking]=useState(false),[retrying,setRetrying]=useState(false);
 const [evidence,setEvidence]=useState<Record<string,number>>({}),[readingFeedback,setReadingFeedback]=useState(false),[spoken,setSpoken]=useState(false);
 const [selection,setSelection]=useState('');
 const identity=useRef(key),saving=useRef(false);identity.current=key;
 useEffect(()=>{let live=true;setSession(null);setError('');AsyncStorage.getItem(key).then(raw=>{
  if(!live)return;const s=raw?JSON.parse(raw) as JapaneseSample:newJapaneseSample(`jp-${Date.now()}`);
  if(!Array.isArray(s.answers)||!Number.isInteger(s.stage)||s.stage<0||s.stage>4||(s.retries!==undefined&&!Array.isArray(s.retries)))throw Error('Invalid sample');
  setSession(s);const kind=s.stage===2?'novel':'familiar';
  const first=(s.stage===2?novelConcepts:concepts).findIndex(c=>!s.answers.some(a=>a.id===`${kind}-${c.id}`));setIndex(Math.max(0,first));
  setEvidence(Object.fromEntries(s.answers.filter(a=>a.kind==='reading').map(a=>[a.id,Number(a.selected)])));
  setReadingFeedback(questions.every(q=>s.answers.some(a=>a.id===q.id)));setRevealed(false);setSpoken(false);setSelection('');setAsking(false);setRetrying(false);setDetails(false);
 }).catch(()=>{if(live)setError('샘플 기록을 읽지 못했어요. 저장된 원본은 변경하지 않았어요.');});return()=>{live=false;};},[key]);
 async function save(next:JapaneseSample,after?:()=>void){
  if(saving.current||identity.current!==key)return;saving.current=true;setBusy(true);
  try{await AsyncStorage.setItem(key,JSON.stringify(next));if(identity.current===key){setSession(next);setError('');after?.();}}
  catch{if(identity.current===key)setError('저장하지 못했어요. 이 화면에서 다시 시도해 주세요.');}
  finally{saving.current=false;if(identity.current===key)setBusy(false);}
 }
 function clearCard(){setRevealed(false);setDetails(false);setAsking(false);setSelection('');}
 function reset(){setIndex(0);clearCard();}
 function nextStage(){void save(moveJapaneseSample(session!,session!.stage+1),reset);}
 function restart(){void save(newJapaneseSample(`jp-${Date.now()}`),()=>{reset();setRetrying(false);setEvidence({});setReadingFeedback(false);setSpoken(false);});}
 function reveal(){setRevealed(true);setDetails(false);}
 if(!session)return <Page title="오늘의 일본어"><Copy>{error||'학습을 준비하고 있어요…'}</Copy></Page>;
 const stage=session.stage,queue=japaneseRetryQueue(session),retryItem=stage===4&&retrying?queue[0]:undefined,kind:'familiar'|'novel'=retryItem?(retryItem.kind==='novel'?'novel':'familiar'):stage===2?'novel':'familiar';
 const concept=retryItem?concepts.find(c=>retryItem.id===`${kind}-${c.id}`)!:(stage===2?novelConcepts:concepts)[index],summary=japaneseSampleSummary(session);
 function record(correct:boolean,reason?:string){
  const actualCorrect=kind==='novel'?japaneseNovelCorrect(selection,concept.id,correct):correct,id=`${kind}-${concept.id}`,selected=selection||undefined;
  if(retryItem){void save(recordJapaneseRetry(session!,{id,correct:actualCorrect,selected}),clearCard);return;}
  void save(recordJapaneseAnswer(session!,{id,conceptId:concept.sourceId,kind,correct:actualCorrect,reason:actualCorrect?undefined:reason,selected}),()=>{setIndex(index===concepts.length-1?0:index+1);clearCard();});
 }
 const answered=(kind:JapaneseAnswer['kind'])=>concepts.every(c=>session.answers.some(a=>a.id===`${kind}-${c.id}`));
 const stageComplete=stage===0?answered('familiar'):stage===2?answered('novel'):false;
 const pickedWrong=kind==='novel'&&selection!==concept.id;
 const firstResult=(id:string,ok:string)=>session.answers.find(a=>a.id===id)?.correct?ok:session.retries?.some(r=>r.id===id&&r.correct)?'다시 풀어 맞힘':'다시 연습';
 return <Page key={`${session.id}-${stage}-${index}-${readingFeedback}-${retrying}-${session.retries?.length??0}`} title="오늘의 일본어" right={<></>}>
  {error?<Copy>{error}</Copy>:null}
  {stage<4?<><Copy size={22} weight="800">{stage+1}. {phases[stage]}</Copy></>:null}
  {stage===4&&queue.length>0&&!retrying?<>
   <BoriScene character="C02" action="A17" tone="focus" title="틀린 문제 다시 풀어 볼까요?" description={`${queue.length}문제`}/>
   <Action label="다시 풀기" disabled={busy} onPress={()=>{clearCard();setRetrying(true);}}/>
  </>:null}
  {retryItem||((stage===0||stage===2)&&!stageComplete)?<>
   {retryItem?<Copy size={22} weight="800">틀린 문제 다시 풀기</Copy>:null}
   <Copy muted>{retryItem?`남은 문제 ${queue.length}개`:`${index+1} / ${concepts.length}`} · {kind==='familiar'?'기본 예문':'처음 보는 상황'}</Copy>
   <StudyCardSurface hug={kind==='novel'} revealed={revealed} onReveal={reveal} canReveal={!busy&&(kind==='familiar'||!!selection)}>
    {kind==='familiar'?<><Copy size={22} weight="700">{concept.example}</Copy><Copy size={18}>{concept.question}</Copy></>:<><Copy size={18}>{concept.situation}</Copy><Copy muted>이 상황에 알맞은 표현을 고르고, 머릿속으로 문장을 만들어 보세요.</Copy></>}
    {revealed?<><Copy muted size={13} weight="700">{kind==='familiar'?'기본 예문 정답':'새 상황 정답 예시'}</Copy><Copy size={21} weight="700">{kind==='familiar'?concept.answer:concept.application}</Copy><Copy>{kind==='familiar'?concept.explanation:concept.criterion}</Copy></>:null}
   </StudyCardSurface>
   {kind==='novel'&&!revealed?<View style={{gap:8}}>{concepts.map(option=><Choice key={option.id} fill labelVariant="lead" label={option.title} selected={selection===option.id} disabled={busy} onPress={()=>setSelection(option.id)}/>)}</View>:null}
   {revealed?<>
    {kind==='novel'?<Copy size={14} weight="700">{selection===concept.id?`고른 표현 ${concepts.find(o=>o.id===selection)?.title} · 정답`:`고른 표현 ${concepts.find(o=>o.id===selection)?.title} · 정답 ${concept.title}`}</Copy>:null}
    {(pickedWrong||asking)&&!retryItem?<><Copy muted size={13} weight="700">막힌 이유</Copy><View style={{flexDirection:'row',gap:8}}>{reasons.map(value=><Pressable key={value} accessibilityRole="button" accessibilityLabel={value} accessibilityState={{disabled:busy}} disabled={busy} onPress={()=>record(false,value)} style={{flex:1,minHeight:46,paddingHorizontal:4,alignItems:'center',justifyContent:'center',borderRadius:12,borderWidth:1,borderColor:c.border,backgroundColor:c.card}}><Copy size={13} weight="700">{value}</Copy></Pressable>)}</View></>:null}
    {pickedWrong||asking?<Action secondary={!pickedWrong} label="다음" disabled={busy} onPress={()=>record(false)}/>:<><Action label="맞힘" disabled={busy} onPress={()=>record(true)}/>
    <Action secondary label="다시 연습" disabled={busy} onPress={()=>{if(retryItem)record(false);else setAsking(true);}}/></>}
   </>:<Action label="정답 보기" disabled={busy||(kind==='novel'&&!selection)} onPress={reveal}/>}
   <Link label={details?'설명 접기':revealed?'개념 설명 보기':'다섯 표현 뜻 보기'} onPress={()=>setDetails(!details)}/>
   {details?revealed?<CardView><Copy weight="700">{concept.title}</Copy><Copy>{concept.meaning}</Copy>{stage===2?<><Copy muted size={13} weight="700">기본 예문 해설</Copy><Copy size={18}>{concept.example}</Copy><Copy>{concept.explanation}</Copy></>:null}<Copy muted size={12}>{concept.sourceNeedsReview?'교재 근거 확인 필요 · 샘플 예문은 별도 작성':`개념 연결: 교재 PDF ${concept.page}쪽 · 예문과 문제는 이 샘플용으로 새로 작성했습니다.`}</Copy></CardView>:<CardView>{concepts.map(item=><View key={item.id} style={{gap:2}}><Copy weight="700">{item.title}</Copy><Copy size={14}>{item.meaning}</Copy></View>)}</CardView>:null}
  </>:null}
  {(stage===0||stage===2)&&stageComplete?<><Copy size={20}>다섯 표현을 모두 확인했어요.</Copy><Action label={stage===0?'독해로 이동':'말하기로 이동'} disabled={busy} onPress={nextStage}/></>:null}
  {stage===1?<>
   <Copy>일본어 클럽 안내문입니다.</Copy>
   <CardView>{passage.map((line,i)=><Copy key={line} size={18}>{i+1}. {line}</Copy>)}</CardView>
   {questions.map((q,number)=><CardView key={q.id}><Copy weight="700">{q.question}</Copy><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{passage.map((line,i)=><Pressable key={line} accessibilityRole="button" accessibilityLabel={`질문 ${number+1}의 근거로 ${i+1}번 문장 선택`} accessibilityState={{selected:evidence[q.id]===i}} disabled={busy||readingFeedback} onPress={()=>setEvidence(old=>({...old,[q.id]:i}))} style={{padding:13,minHeight:46,minWidth:100,borderRadius:12,borderWidth:1,borderColor:evidence[q.id]===i?c.primary:c.border}}><Copy size={15}>{evidence[q.id]===i?'✓ ':''}{i+1}번 문장</Copy></Pressable>)}</View>{readingFeedback?<><Copy weight="700">{q.answer}</Copy><Copy>{q.explanation}</Copy><Copy muted>{evidence[q.id]===q.evidence?'답의 근거를 찾았어요.':'근거는 '+(q.evidence+1)+'번 문장입니다.'}</Copy></>:null}</CardView>)}
   {!readingFeedback?<Action label="정답·해설 보기" disabled={busy||questions.some(q=>evidence[q.id]===undefined)} onPress={()=>{let next=session;for(const q of questions)next=recordJapaneseAnswer(next,{id:q.id,conceptId:q.conceptId,kind:'reading',correct:evidence[q.id]===q.evidence,selected:String(evidence[q.id])});void save(next,()=>setReadingFeedback(true));}}/>:<Action label="새 상황으로 이동" disabled={busy} onPress={nextStage}/>}
  </>:null}
  {stage===3?<>
   <Copy>오늘 배운 표현을 써 봅시다. 누가 시킨 일이 아니라 스스로 결정한 계획입니다. “내일부터 매일 20분씩 일본어 책을 읽기로 했어.”라고 일본어로 말해 보세요.</Copy>
   {!spoken?<Action label="예시와 비교" onPress={()=>setSpoken(true)}/>:<CardView><Copy size={22} weight="700">明日から毎日20分、日本語の本を読むことにした。</Copy><Copy>자신이 결정한 일을 ことにした로 전달했는지 확인하세요. 毎日、日本語の本を20分読むことにした처럼 자연스러운 어순은 달라도 됩니다.</Copy><Copy muted>회사나 학교에서 정해진 일이 아니라, 내가 정한 결심을 말하는 상황입니다.</Copy><Action label="의도대로 말함" disabled={busy} onPress={()=>void save(moveJapaneseSample(recordJapaneseAnswer(session,{id:'speaking-decision',conceptId:concepts[0].sourceId,kind:'speaking',correct:true}),4))}/><Action secondary label="보고 다시 말함" disabled={busy} onPress={()=>void save(moveJapaneseSample(recordJapaneseAnswer(session,{id:'speaking-decision',conceptId:concepts[0].sourceId,kind:'speaking',correct:false}),4))}/></CardView>}
  </>:null}
  {stage===4&&queue.length===0?<>
   <Copy size={28} weight="800">오늘의 일본어를 마쳤어요</Copy>
   <CardView><Copy>기본 예문 회상 (자기 평가): {summary.familiar.correct}/{summary.familiar.total}</Copy><Copy>새 상황 적용 (표현 선택과 자기 평가): {summary.novel.correct}/{summary.novel.total}</Copy><Copy>독해 근거 선택: {summary.reading.correct}/{summary.reading.total}</Copy><Copy>말하기 (자기 평가 · 음성 채점 없음): {summary.speaking.correct}/{summary.speaking.total}</Copy>{summary.retried>0?<Copy>틀린 문제 다시 풀어 맞힘: {summary.retried}문제</Copy>:null}</CardView>
   <CardView><Copy weight="700">표현별 확인 결과</Copy>{concepts.map(item=><View key={item.id} style={{gap:4}}><Copy weight="700">{item.title}</Copy><Copy muted size={13}>기본 예문: {firstResult(`familiar-${item.id}`,'떠올림')} · 새 상황: {firstResult(`novel-${item.id}`,'적용함')}</Copy></View>)}</CardView>
   <CardView><Copy weight="700">보상 미리보기: 25분 공부 → 5분 이용 시간</Copy><Copy>실제 시간 측정과 보상 지급은 없습니다.</Copy></CardView>
   <Action label="학습으로 돌아가기" onPress={()=>navigation.goBack()}/>
   <Link label="결과 지우고 다시 하기" disabled={busy} onPress={restart}/>
  </>:null}
 </Page>;
}
