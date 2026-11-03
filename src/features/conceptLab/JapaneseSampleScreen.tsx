import React,{useEffect,useRef,useState} from 'react';
import {Pressable,View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {RootScreenProps} from '../../navigation/types';
import {useRoutine} from '../routine/RoutineProvider';
import {Action,CardView,Copy,Link,Page} from '../routine/ui';
import {StudyCardSurface} from '../routine/StudyCardSurface';
import {useTheme} from '../../theme/ThemeContext';
import {JapaneseAnswer,JapaneseSample,japaneseSampleConcepts as concepts,japaneseSampleReading as passage,japaneseSampleReadingQuestions as questions,japaneseSampleSummary,moveJapaneseSample,newJapaneseSample,recordJapaneseAnswer} from '../../lib/japaneseSample';

const phases=['예문을 이해하고 떠올리기','짧은 지문에서 근거 찾기','새로운 상황에서 적용하기','한 문장 말하고 확인하기'];
const times=[5,8,7,5];
const reasons=['문법이 헷갈렸어요','단어를 몰랐어요','문장의 단서를 놓쳤어요'];
export function JapaneseSampleScreen({navigation}:RootScreenProps<'JapaneseSample'>){
 const {accountId}=useRoutine(),{colors:c}=useTheme(),key=`routine.japanese-sample.v1.${accountId??'local'}`;
 const [session,setSession]=useState<JapaneseSample|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [index,setIndex]=useState(0),[revealed,setRevealed]=useState(false),[details,setDetails]=useState(false),[reason,setReason]=useState<string>();
 const [evidence,setEvidence]=useState<Record<string,number>>({}),[readingFeedback,setReadingFeedback]=useState(false),[spoken,setSpoken]=useState(false);
 const [selection,setSelection]=useState('');
 const identity=useRef(key),saving=useRef(false);identity.current=key;
 useEffect(()=>{let live=true;setSession(null);setError('');AsyncStorage.getItem(key).then(raw=>{
  if(!live)return;const s=raw?JSON.parse(raw) as JapaneseSample:newJapaneseSample(`jp-${Date.now()}`);
  if(!Array.isArray(s.answers)||!Number.isInteger(s.stage)||s.stage<0||s.stage>4)throw Error('Invalid sample');
  setSession(s);const kind=s.stage===2?'novel':'familiar';
  const first=concepts.findIndex(c=>!s.answers.some(a=>a.id===`${kind}-${c.id}`));setIndex(Math.max(0,first));
  setEvidence(Object.fromEntries(s.answers.filter(a=>a.kind==='reading').map(a=>[a.id,Number(a.selected)])));
  setReadingFeedback(questions.every(q=>s.answers.some(a=>a.id===q.id)));setRevealed(false);setSpoken(false);setSelection('');setReason(undefined);setDetails(false);
 }).catch(()=>{if(live)setError('샘플 기록을 읽지 못했어요. 저장된 원본은 변경하지 않았어요.');});return()=>{live=false;};},[key]);
 async function save(next:JapaneseSample,after?:()=>void){
  if(saving.current||identity.current!==key)return;saving.current=true;setBusy(true);
  try{await AsyncStorage.setItem(key,JSON.stringify(next));if(identity.current===key){setSession(next);setError('');after?.();}}
  catch{if(identity.current===key)setError('저장하지 못했어요. 이 화면에서 다시 시도해 주세요.');}
  finally{saving.current=false;if(identity.current===key)setBusy(false);}
 }
 function reset(){setIndex(0);setRevealed(false);setDetails(false);setReason(undefined);setSelection('');}
 function nextStage(){void save(moveJapaneseSample(session!,session!.stage+1),reset);}
 if(!session)return <Page title="오늘의 일본어"><Copy>{error||'학습을 준비하고 있어요…'}</Copy></Page>;
 const stage=session.stage,concept=concepts[index],summary=japaneseSampleSummary(session);
 function record(correct:boolean,kind:'familiar'|'novel'){
  const actualCorrect=correct&&(kind!=='novel'||selection===concept.id);
  const next=recordJapaneseAnswer(session!,{id:`${kind}-${concept.id}`,conceptId:concept.sourceId,kind,correct:actualCorrect,reason:actualCorrect?undefined:reason,selected:selection||undefined});
  void save(next,()=>{if(index===concepts.length-1){setIndex(0);setRevealed(false);}else{setIndex(index+1);setRevealed(false);}setDetails(false);setReason(undefined);setSelection('');});
 }
 const answered=(kind:JapaneseAnswer['kind'])=>concepts.every(c=>session.answers.some(a=>a.id===`${kind}-${c.id}`));
 const stageComplete=stage===0?answered('familiar'):stage===2?answered('novel'):false;
 return <Page key={`${session.id}-${stage}-${index}-${revealed}-${readingFeedback}`} title="오늘의 일본어" right={<Link label="나가기" onPress={()=>navigation.goBack()}/>}>
  <Copy muted size={12}>25분 구성 샘플 · 원하는 속도로 진행 · 실제 보상 적립 없음</Copy>
  {stage===0?<Copy muted size={12}>개념 5개의 샘플 예문으로 체험합니다. 기존 단어장과 복습 일정은 바꾸지 않습니다.</Copy>:null}
  {error?<Copy>{error}</Copy>:null}
  {stage<4?<><Copy size={22} weight="800">{stage+1}. {phases[stage]}</Copy><Copy muted size={13}>권장 {times[stage]}분 · 복습 5분 → 독해 8분 → 적용 7분 → 말하기 5분</Copy></>:null}
  {(stage===0||stage===2)&&!stageComplete?<>
   <Copy muted>{index+1} / {concepts.length} · {stage===0?'기본 예문':'처음 보는 상황'}</Copy>
   <StudyCardSurface revealed={revealed} onReveal={()=>{if(stage===0||selection)setRevealed(true);}} canReveal={!busy&&(stage===0||!!selection)}>
    {stage===0?<><Copy size={22} weight="700">{concept.example}</Copy><Copy size={18}>{concept.question}</Copy></>:<><Copy size={18}>{concept.situation}</Copy><Copy muted>이 상황에 알맞은 표현을 고르고, 머릿속으로 문장을 만들어 보세요.</Copy></>}
    {revealed?<><Copy size={21} weight="700">{stage===0?concept.answer:concept.application}</Copy><Copy>{stage===0?concept.explanation:concept.criterion}</Copy><Copy muted size={13}>문장 전체를 똑같이 외울 필요는 없어요. 이번에 묻는 의미나 문법을 기준으로 평가해 주세요.</Copy></>:null}
   </StudyCardSurface>
   {stage===2&&!revealed?<View style={{gap:8}}>{concepts.map(option=><Action key={option.id} compact secondary label={`${selection===option.id?'✓ ':''}${option.title}`} disabled={busy} onPress={()=>setSelection(option.id)}/>)}</View>:null}
   {revealed?<>
    {stage===2?<Copy muted size={13}>{selection===concept.id?'상황에 맞는 표현을 골랐어요.':'이 상황에서는 '+concept.title+'가 목표 표현이에요. 다른 표현을 골랐다면 의미 차이를 확인해 주세요.'}</Copy>:null}
    <Copy muted size={13}>막힌 이유가 있다면 골라 주세요. (선택)</Copy><View style={{gap:5}}>{reasons.map(value=><Link key={value} label={`${reason===value?'✓ ':''}${value}`} disabled={busy} onPress={()=>setReason(value)}/>)}</View>
    <Action label="이해하고 떠올렸어요" disabled={busy} onPress={()=>record(true,stage===0?'familiar':'novel')}/>
    <Action secondary label="다시 연습할게요" disabled={busy} onPress={()=>record(false,stage===0?'familiar':'novel')}/>
   </>:<Action label="떠올렸어요 · 정답 보기" disabled={busy||(stage===2&&!selection)} onPress={()=>setRevealed(true)}/>}
   <Link label={details?'개념 설명 접기':'처음 배우는 표현인가요? 개념 설명 보기'} onPress={()=>setDetails(!details)}/>
   {details?<CardView><Copy weight="700">{concept.title}</Copy><Copy>{concept.meaning}</Copy><Copy>{concept.explanation}</Copy><Copy muted size={12}>개념 연결: 교재 PDF {concept.page}쪽 · 예문과 문제는 이 샘플용으로 새로 작성했습니다.</Copy></CardView>:null}
  </>:null}
  {(stage===0||stage===2)&&stageComplete?<><Copy size={20}>다섯 표현을 모두 확인했어요.</Copy><Action label={stage===0?'짧은 지문 읽으러 가기':'한 문장 말해 보기'} disabled={busy} onPress={nextStage}/></>:null}
  {stage===1?<>
   <Copy>일본어 클럽 안내문입니다. 각 질문에 답하고, 답의 근거가 되는 문장을 직접 골라 보세요. 두 질문을 모두 푼 뒤 해설을 확인합니다.</Copy>
   <CardView>{passage.map((line,i)=><Copy key={line} size={18}>{i+1}. {line}</Copy>)}</CardView>
   {questions.map(q=><CardView key={q.id}><Copy weight="700">{q.question}</Copy><View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{passage.map((line,i)=><Pressable key={line} accessibilityRole="button" accessibilityLabel={`${q.id} 근거 ${i+1}`} accessibilityState={{selected:evidence[q.id]===i}} disabled={busy||readingFeedback} onPress={()=>setEvidence(old=>({...old,[q.id]:i}))} style={{padding:13,minHeight:46,minWidth:100,borderRadius:12,borderWidth:1,borderColor:evidence[q.id]===i?c.primary:c.border}}><Copy size={15}>{evidence[q.id]===i?'✓ ':''}{i+1}번 문장</Copy></Pressable>)}</View>{readingFeedback?<><Copy weight="700">{q.answer}</Copy><Copy>{q.explanation}</Copy><Copy muted>{evidence[q.id]===q.evidence?'답의 근거를 찾았어요.':'근거는 '+(q.evidence+1)+'번 문장입니다.'}</Copy></>:null}</CardView>)}
   {!readingFeedback?<Action label="두 질문의 정답·해설 보기" disabled={busy||questions.some(q=>evidence[q.id]===undefined)} onPress={()=>{let next=session;for(const q of questions)next=recordJapaneseAnswer(next,{id:q.id,conceptId:q.conceptId,kind:'reading',correct:evidence[q.id]===q.evidence,selected:String(evidence[q.id])});void save(next,()=>setReadingFeedback(true));}}/>:<Action label="새 상황에서 연습하기" disabled={busy} onPress={nextStage}/>}
  </>:null}
  {stage===3?<>
   <Copy>오늘 배운 표현을 써 봅시다. 네가 스스로 결정했어요. “내일부터 매일 20분씩 일본어 책을 읽기로 했어.”라고 일본어로 말해 보세요.</Copy>
   <Copy muted>소리 내어 한 번 말해 보세요. 이 샘플은 녹음하거나 AI로 음성을 채점하지 않습니다.</Copy>
   {!spoken?<Action label="말했어요 · 예시와 비교하기" onPress={()=>setSpoken(true)}/>:<CardView><Copy size={22} weight="700">明日から毎日20分、日本語の本を読むことにした。</Copy><Copy>자신이 결정한 일을 ことにした로 전달했는지 확인하세요. 毎日、日本語の本を20分読むことにした처럼 자연스러운 어순은 달라도 됩니다.</Copy><Copy muted>회사나 학교에서 정해진 일이 아니라, 내가 정한 결심을 말하는 상황입니다.</Copy><Action label="의도한 뜻을 말했어요" disabled={busy} onPress={()=>void save(moveJapaneseSample(recordJapaneseAnswer(session,{id:'speaking-decision',conceptId:concepts[0].sourceId,kind:'speaking',correct:true}),4))}/><Action secondary label="표현을 보고 다시 말했어요" disabled={busy} onPress={()=>void save(moveJapaneseSample(recordJapaneseAnswer(session,{id:'speaking-decision',conceptId:concepts[0].sourceId,kind:'speaking',correct:false}),4))}/></CardView>}
   <Link label="종이에 썼다면 기존 사진 제출로 이동" onPress={()=>navigation.navigate('BookStudy',{subject:'일본어 · 표현 적용'})}/>
   <Copy muted size={12}>사진 제출은 기존 공부 흐름에서 진행합니다. 샘플을 마친 기록만으로 25분 공부나 검수 완료로 처리하지 않습니다.</Copy>
  </>:null}
  {stage===4?<>
   <Copy size={28} weight="800">오늘의 일본어를 마쳤어요</Copy><Copy>맞힌 문제뿐 아니라 끝까지 응답하고 확인한 과정을 남겼어요.</Copy>
   <CardView><Copy>익숙한 예문에서 맞힘: {summary.familiar.correct}/{summary.familiar.total}</Copy><Copy>새 상황에서도 맞힘: {summary.novel.correct}/{summary.novel.total}</Copy><Copy>독해 근거 찾기: {summary.reading.correct}/{summary.reading.total}</Copy><Copy>말하기 자기 평가: {summary.speaking.correct}/{summary.speaking.total}</Copy></CardView>
   <CardView><Copy weight="700">표현별 확인 결과</Copy>{concepts.map(item=><View key={item.id} style={{gap:4}}><Copy weight="700">{item.title}</Copy><Copy muted size={13}>기본 예문: {session.answers.find(a=>a.id===`familiar-${item.id}`)?.correct?'떠올림':'다시 연습'} · 새 상황: {session.answers.find(a=>a.id===`novel-${item.id}`)?.correct?'적용함':'다시 연습'}</Copy></View>)}</CardView>
   <Copy>새 상황에서 막힌 표현은 다음 연습 후보예요. 원래 카드의 학습 기록을 초기화하거나 새 문제를 자동으로 만들지 않았어요.</Copy>
   <CardView><Copy weight="700">보상 미리보기: 25분 공부 → 5분 이용 시간</Copy><Copy>이 샘플에서는 실제 시간을 측정하거나 보상을 지급하지 않아요. 정식 연결 시에는 기존 공부·제출·검수 조건을 충족한 기록으로 한 번만 적립해야 합니다.</Copy></CardView>
   <Action label="학습으로 돌아가기" onPress={()=>navigation.goBack()}/>
  </>:null}
 </Page>;
}
