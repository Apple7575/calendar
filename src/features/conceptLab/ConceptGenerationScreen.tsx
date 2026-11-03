import React,{useEffect,useRef,useState} from 'react';
import {Pressable,View} from 'react-native';
import {useSession} from '../../hooks/useSession';
import {conceptGenerationBudget,ConceptBudget,generateConceptVariant,recoverConceptGeneration} from '../../lib/conceptLabAI';
import {acceptGeneratedDraft,discardGeneratedDraft,generationCountToday,generationSuggestions,prepareGenerationPlan,recordGenerationRun,reviewGeneratedDraft,stageGeneratedCard,GenerationRun} from '../../lib/conceptGeneration';
import {abilityLabels,LabState,typeLabels} from '../../lib/conceptLabTypes';
import {AccountConnection} from '../routine/AccountConnection';
import {Action,CardView,Copy,Icon,Link,Page} from '../routine/ui';
import {useTheme} from '../../theme/ThemeContext';
import {ConceptLabCard} from './ConceptLabCard';
import {labCardSummary} from '../../lib/conceptLabPresentation';

type Props={data:LabState;busy:boolean;update:(fn:(s:LabState)=>LabState)=>Promise<void>;onClose:()=>void};
export function ConceptGenerationScreen({data,busy,update,onClose}:Props){
 const {colors:c}=useTheme(),{session}=useSession(),[selected,setSelected]=useState<string[]>([]),[running,setRunning]=useState(false),[budget,setBudget]=useState<ConceptBudget|null>(null),[message,setMessage]=useState(''),[progress,setProgress]=useState(''),[preview,setPreview]=useState(''),[revealed,setRevealed]=useState(false);
 const lock=useRef(false),live=useRef(true),current=useRef(data),owner=useRef(session?.user.id);current.current=data;owner.current=session?.user.id;
 const [showBudget,setShowBudget]=useState(false),[showResults,setShowResults]=useState(false);
 useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
 async function refreshBudget(clearMessage=true){try{const value=await conceptGenerationBudget();if(live.current){setBudget(value);if(clearMessage)setMessage('');}}catch(e){if(live.current){setBudget(null);setMessage(e instanceof Error?e.message:'연결을 확인해 주세요.');}}}
 useEffect(()=>{setBudget(null);if(session&&!session.user.is_anonymous)void refreshBudget();},[session?.user.id]);
 const suggestions=generationSuggestions(data),remaining=Math.max(0,data.settings.dailyVariants-generationCountToday(data)),drafts=(data.generatedDrafts??[]).filter(d=>d.status==='ready'),draft=drafts.find(d=>d.id===preview);
 const enoughBudget=budget&&budget.remainingUSD>=selected.length*budget.reservationUSD;
 const selectable=suggestions.filter(target=>!target.blocked),bulkIds=selectable.slice(0,remaining).map(target=>target.id);
 async function mutate(fn:(s:LabState)=>LabState){let saved:LabState|undefined;await update(s=>{saved=fn(s);return saved;});if(saved)current.current=saved;}
 async function generate(){
  if(lock.current||busy)return;lock.current=true;setRunning(true);setMessage('');const account=owner.current;
  try{
   if(!account||!budget?.ready)throw new Error('계정과 AI 서버 연결을 먼저 확인해 주세요.');
   if(!enoughBudget)throw new Error('5달러 예산의 안전 예약액이 부족해요.');
   const targets=prepareGenerationPlan(current.current,selected);let completed=0,failed=0;
   for(let i=0;i<targets.length;i++){
    if(!live.current||owner.current!==account)break;
    const target=targets[i],id=`${target.id}:${Date.now()}`;
    setProgress(`${i+1}/${targets.length} · ${target.conceptLabel} · 생성 후 별도 검증`);
    await mutate(s=>recordGenerationRun(s,{id,targetId:target.id,target,at:new Date().toISOString(),status:'running'}));
    try{
     const card=await generateConceptVariant(current.current,target,id);
     if(owner.current!==account)throw new Error('계정이 바뀌어 결과를 서버에만 보관했어요.');
     await mutate(s=>recordGenerationRun(stageGeneratedCard(s,target,card,id),{id,targetId:target.id,target,at:new Date().toISOString(),status:'complete'}));completed++;
    }catch(e){failed++;const error=e instanceof Error?e.message:'생성에 실패했어요.';await mutate(s=>recordGenerationRun(s,{id,targetId:target.id,target,at:new Date().toISOString(),status:'failed',message:error}));}
   }
   if(live.current){setSelected([]);setProgress(`검토 대기 ${completed}개 · 실패 ${failed}개`);if(completed)setShowResults(true);}
  }catch(e){if(live.current)setMessage(e instanceof Error?e.message:'선택 내용을 확인해 주세요.');}
  finally{lock.current=false;if(live.current){setRunning(false);void refreshBudget(false);}}
 }
 const run=(fn:(s:LabState)=>LabState)=>void update(fn).catch(e=>setMessage(e.message));
 async function recover(job:GenerationRun){
  if(lock.current||!job.target)return;lock.current=true;setRunning(true);
  try{const card=await recoverConceptGeneration(job.id);await update(s=>recordGenerationRun(stageGeneratedCard(s,job.target!,card,job.id,new Date(job.at)),{...job,status:'complete'}));setShowResults(true);setMessage('저장된 생성 결과를 검토 대기로 가져왔어요. 새 생성 호출은 없어요.');}
  catch(e){setMessage(e instanceof Error?e.message:'아직 결과를 가져오지 못했어요.');}
  finally{lock.current=false;setRunning(false);void refreshBudget(false);}
 }
 if(draft)return <Page title="생성 문제 검토" right={<Link label="목록으로" onPress={()=>setPreview('')}/>} fillContent floatingFooter footer={!revealed?<Action label="정답·해설 확인" onPress={()=>{setRevealed(true);run(s=>reviewGeneratedDraft(s,draft.id));}}/>:<Action label="이 문제를 학습에 추가" disabled={busy||!draft.reviewedAt} onPress={()=>void update(s=>acceptGeneratedDraft(s,draft.id)).then(()=>setPreview('')).catch(e=>setMessage(e.message))}/>}>
  <Copy muted size={12}>AI 생성 · 검토 중 · 아직 학습에 포함되지 않아요</Copy>{message?<Copy>{message}</Copy>:null}
  <ConceptLabCard key={`${draft.id}-${revealed}`} card={draft.card} revealed={revealed} fill hint={false} onHint={()=>{}} onReveal={()=>{setRevealed(true);run(s=>reviewGeneratedDraft(s,draft.id));}} busy={busy}/>
 </Page>;
 return <Page title="AI 새 문제" right={<Link label="닫기" disabled={running} onPress={onClose}/>} footer={!showResults?<Action label={running?'선택한 문제 생성·검증 중…':`선택한 ${selected.length}개 생성`} disabled={running||busy||!selected.length||!budget?.ready||!enoughBudget} onPress={()=>void generate()}/>:undefined}>
  <Copy size={22} weight="700">만들 항목을 직접 골라요</Copy><Copy muted size={13}>추천은 기록만 살펴봐요. 체크한 뒤 생성 버튼을 눌러야 AI를 호출해요.</Copy>
  <CardView><Copy weight="700">누적 예산 $5</Copy>{budget?<Copy>추정 사용·예약 ${budget.estimatedUsedUSD.toFixed(3)} · 남은 예약 가능액 ${budget.remainingUSD.toFixed(3)}</Copy>:<Copy muted>로그인 후 서버 예산을 확인해요.</Copy>}<Link label={showBudget?'예산 상세 접기':'예산 상세·연결 확인'} onPress={()=>setShowBudget(!showBudget)}/>{showBudget?<><Copy muted size={12}>한 항목 최대 $0.40 안전 예약 · 생성·검증 후 토큰 사용량으로 정산</Copy><Copy muted size={12}>PDF 자료 검수·합성 음성 제작도 같은 5달러 예산을 사용해요.</Copy><Copy muted size={12}>실제 청구서 확인액은 아니며, 비용 확인에 실패한 요청은 예약액을 유지해요.</Copy><Link label="예산·연결 새로 확인" disabled={running} onPress={()=>void refreshBudget()}/></>:null}</CardView>
  {!session||session.user.is_anonymous?<CardView><AccountConnection purpose="ai"/></CardView>:null}
  {message?<Copy>{message}</Copy>:null}
  {budget&&!budget.ready?<Copy>AI 서버의 키 또는 활성화 설정을 확인해야 해요. 생성은 시작하지 않았어요.</Copy>:null}
  <View style={{flexDirection:'row',justifyContent:'space-between'}}><Link label="만들 항목" disabled={running} onPress={()=>setShowResults(false)}/><Link label={`검토 대기 ${drafts.length}개`} disabled={running} onPress={()=>setShowResults(true)}/></View>
  {!showResults?<>
  <Copy>오늘 {remaining}개 더 생성 가능 · 선택 {selected.length}개</Copy>
  <View style={{flexDirection:'row',gap:20,alignItems:'center'}}><Link label="전체 선택" disabled={running||busy||!bulkIds.length} onPress={()=>setSelected(bulkIds)}/><Link label="전체 해제" disabled={running||busy||!selected.length} onPress={()=>setSelected([])}/></View>
  {selectable.length>remaining?<Copy muted size={12}>전체 선택은 오늘 남은 한도 {remaining}개까지 추천 순서대로 선택해요.</Copy>:null}
  {selected.length>0&&budget?.ready&&!enoughBudget?<Copy>선택한 항목의 안전 예약액이 남은 예산보다 커요. 생성 개수를 줄여 주세요.</Copy>:null}
  {!suggestions.length?<CardView><Copy>아직 추천할 오답이 없어요.</Copy><Copy muted size={13}>학습에서 ‘다시’로 평가한 개념을 바탕으로 추천해요. 표본 예시 미리보기는 오답 기록에 포함되지 않아요.</Copy></CardView>:null}
  {suggestions.map(target=>{const checked=selected.includes(target.id),disabled=running||busy||!!target.blocked||(!checked&&selected.length>=remaining);return <Pressable key={target.id} accessibilityRole="checkbox" accessibilityLabel={`${target.conceptLabel} · ${target.title}`} accessibilityState={{checked,disabled}} aria-checked={checked} aria-disabled={disabled} disabled={disabled} onPress={()=>setSelected(old=>old.includes(target.id)?old.filter(id=>id!==target.id):[...old,target.id])}>
   <CardView style={{borderWidth:1,borderColor:checked?c.primary:c.border,opacity:disabled&&!checked?0.65:1}}><View style={{flexDirection:'row',gap:10,alignItems:'center'}}><Icon name={checked?'checkbox-outline':'square-outline'} color={checked?c.primary:c.textMuted}/><View style={{flex:1}}><Copy weight="700">{target.conceptLabel}</Copy><Copy>{target.title} · 1문제</Copy></View></View><Copy muted size={12}>{typeLabels[target.type]} · {abilityLabels[target.ability]} · 최근 ‘다시’ {target.wrongCount}회</Copy><Copy muted size={13}>{target.blocked??target.reason}</Copy></CardView>
  </Pressable>;})}
  <Copy muted size={12}>기존 문제를 덮어쓰지 않아요. 생성 결과를 검토하고 추가한 것만 학습해요.</Copy>
  </>:null}
  {progress?<Copy>{progress}</Copy>:null}
  {(data.generationRuns??[]).filter(r=>r.status==='failed').slice(-3).map(r=><Copy muted key={r.id} size={12}>실패: {r.message} · 다시 체크하면 새 요청으로 재시도해요. 추가 비용이 들 수 있어요.</Copy>)}
  {(data.generationRuns??[]).filter(r=>r.target&&(r.status==='running'||r.status==='failed')).slice(-3).map(r=><Link key={r.id} label="서버에 저장된 결과 확인 · 새 생성 없음" disabled={running||busy} onPress={()=>void recover(r)}/>)}
  {showResults&&!drafts.length?<CardView><Copy>아직 검토할 생성 결과가 없어요.</Copy><Link label="만들 항목 고르기" onPress={()=>setShowResults(false)}/></CardView>:null}
  {showResults?drafts.map(item=><CardView key={item.id}><Copy weight="700">{item.target.conceptLabel} · {item.target.title}</Copy><Copy muted size={13}>{labCardSummary(item.card)}</Copy><Action secondary label="문제·정답 검토" disabled={running} onPress={()=>{setPreview(item.id);setRevealed(false);setMessage('');}}/><Link label="추가하지 않고 보관" disabled={running||busy} onPress={()=>run(s=>discardGeneratedDraft(s,item.id))}/></CardView>):null}
 </Page>;
}
