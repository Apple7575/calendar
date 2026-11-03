import React,{useState} from 'react';
import {TextInput,View} from 'react-native';
import {Rating} from 'ts-fsrs';
import {useRoutine} from '../routine/RoutineProvider';
import {Action,CardView,Copy,Link,Page} from '../routine/ui';
import {BoriScene} from '../routine/experience';
import {useTheme} from '../../theme/ThemeContext';
import {beginLab,canStartLabCard,correctAttempt,effectiveAttempt,labQueue,labStats,reportCard,reviseCard} from '../../lib/conceptLab';
import {sampleBook} from '../../lib/conceptLabContent';
import {abilityLabels,Ability,LabState} from '../../lib/conceptLabTypes';
import {conceptAIEnabled} from '../../lib/conceptLabAI';
import {ConceptGenerationScreen} from './ConceptGenerationScreen';
import {ConceptTrends} from './ConceptTrends';
import {useConceptLab} from './useConceptLab';
import {ConceptLabSession} from './ConceptLabSession';
import {ConceptLabBriefPreview} from './ConceptLabBriefPreview';
import {labCardSummary} from '../../lib/conceptLabPresentation';
import {sourceCorpus} from '../../lib/conceptLabCorpus';
import {listeningAssets} from '../../lib/conceptLabListening';

const fraction=(v:{correct:number;total:number})=>v.total?`${v.correct}/${v.total} · ${Math.round(v.correct/v.total*100)}%`:'아직 응답 없음';
export function ConceptLabScreen(){
 const {accountId}=useRoutine(),{data,error,busy,update}=useConceptLab(accountId),{colors:c}=useTheme();
 const [view,setView]=useState<'home'|'study'|'stats'|'source'|'settings'|'cards'|'brief'|'generate'>('home'),[localError,setLocalError]=useState('');
 const [note,setNote]=useState(''),[selected,setSelected]=useState(''),[edit,setEdit]=useState<{prompt:string;answer:string;accepted:string;explanation:string}|null>(null);
 const [cardSearch,setCardSearch]=useState(''),[cardDomain,setCardDomain]=useState(''),[visibleCards,setVisibleCards]=useState(40);
 const run=(fn:(s:LabState)=>LabState)=>void update(fn).catch(()=>{});
 if(view==='generate'&&data)return <ConceptGenerationScreen data={data} busy={busy} update={update} onClose={()=>setView('home')}/>;
 if(view==='brief')return <ConceptLabBriefPreview onClose={()=>setView('home')}/>;
 if(!data)return <Page title="N3 문법·독해·청해"><Copy>{error??'학습 기록을 불러오는 중…'}</Copy></Page>;
 if(view==='study'&&data.session&&!data.session.finished)return <ConceptLabSession key={data.session.id} data={data} error={error} busy={busy} update={update} onDone={()=>setView('home')}/>;
 const stats=labStats(data),queue=labQueue(data),input={padding:14,minHeight:48,borderWidth:1,borderColor:c.border,borderRadius:14,color:c.text,backgroundColor:c.card};
 const active=data.session&&!data.session.finished;
 const matchedCards=Object.values(data.cards).filter(card=>(!cardDomain||card.unitId.startsWith(cardDomain))&&(!cardSearch.trim()||(labCardSummary(card)+' '+(sampleBook.concepts.find(c=>c.id===card.conceptId)?.label??'')+' '+sampleBook.extractions.filter(e=>card.evidenceIds.includes(e.id)).map(e=>'PDF '+e.source.pdfPage).join(' ')).normalize('NFKC').toLowerCase().includes(cardSearch.trim().normalize('NFKC').toLowerCase())));
 const areaQueue=(prefix:string)=>labQueue({...data,cards:Object.fromEntries(Object.entries(data.cards).filter(([,card])=>card.unitId.startsWith(prefix)))});
 function start(id?:string){
  const first=id??queue[0],card=data!.cards[first],bundle=sampleBook.bundles.find(b=>b.id===card?.bundleId);
  void update(s=>{
   const switching=!!id&&s.session&&!s.session.finished&&!s.session.ids.includes(id);
   const current=switching?{...s,archivedSessions:[...(s.archivedSessions??[]),s.session!],session:{...s.session!,finished:true}}:s;
   return beginLab(current,bundle?.questionIds??[first]);
  }).then(()=>setView('study')).catch(()=>{});
 }
 return <Page key={view} title="N3 문법·독해·청해" right={view==='home'?undefined:<Link label="학습으로" onPress={()=>setView('home')}/>}>
  {error||localError?<Copy>{error??localError}</Copy>:null}
  {view==='home'?<>
   <BoriScene character="C02" action="A17" tone="focus" size={100} title="새로운 상황에서도 이해할까요?" description="별도 실험 단어장 · 기존 N3/N2 기록은 그대로"/>
   <View style={{paddingHorizontal:5,gap:8}}><Copy size={42} weight="800">오늘 {queue.length}문제</Copy><Copy muted>기존 문제를 복습하고, 새 상황에 적용해 봐요.</Copy></View>
   <Action label={active?'중단한 학습 이어 하기':queue.length?'오늘 학습 시작':'오늘 예정된 문제를 마쳤어요'} disabled={busy||(!active&&!queue.length)} onPress={()=>active?setView('study'):start()}/>
   <View style={{flexDirection:'row',gap:20,flexWrap:'wrap'}}>{[['g-','문법'],['r-','독해'],['l-','청해']].map(([prefix,label])=>{const ids=areaQueue(prefix);return <Link key={prefix} label={`${label} 연습 · ${ids.length}문제`} disabled={busy||!ids.length} onPress={()=>start(ids[0])}/>;})}</View>
   {stats.feedback?<Copy muted size={13}>응답·피드백 {stats.feedback}회 완료 · 실험에서는 시간·돈 보상을 지급하지 않아요.</Copy>:null}
   <Copy muted size={12}>문법 → 독해 중심 · 청해는 AI 합성 음성으로 연습해요. 교재 전체 추출 완료를 뜻하지 않아요.</Copy>
   <Link label="오답으로 AI 새 문제 만들기" onPress={()=>setView('generate')}/>
   <Link label="카드 유형 예시 · 4장" onPress={()=>setView('brief')}/>
   <Link label="학습 현황·평가 수정" onPress={()=>setView('stats')}/><Link label="카드 찾기·오류 신고" onPress={()=>setView('cards')}/><Link label="교재 근거·단원별 처리 현황" onPress={()=>setView('source')}/><Link label="실험 학습량 설정" onPress={()=>setView('settings')}/>
  </>:null}
  {view==='stats'?<>
   <Copy size={24} weight="800">내가 아는 것과 적용하는 것</Copy>
   <ConceptTrends data={data}/>
   <Copy>현재 표본: 미학습 {stats.unlearned} · 학습 중 {stats.learning} · 복습 중 {stats.reviewing} · 보류 {stats.held}</Copy>
   <CardView><Copy>기존 문제: {fraction(stats.original)}</Copy><Copy>새 적용 문제 첫 응답: {fraction(stats.novel)}</Copy><Copy muted size={13}>변형 문제 재복습: {fraction(stats.variantReview)}</Copy><Copy muted size={13}>교재 기반: {fraction(stats.textbook)}</Copy><Copy muted size={13}>AI 작성: {fraction(stats.ai)}</Copy></CardView>
   <Copy weight="700">능력별 응답</Copy>{Object.entries(stats.ability).map(([key,result])=><Copy key={key}>{abilityLabels[key as Ability]}: {fraction(result)}</Copy>)}
   <Copy weight="700">반복 오답 개념</Copy>{stats.concepts.filter(concept=>concept.wrong>=2).map(concept=><Copy key={concept.id}>{concept.label} · 오답 {concept.wrong}회</Copy>)}{!stats.concepts.some(concept=>concept.wrong>=2)?<Copy muted>아직 반복 오답이 쌓이지 않았어요.</Copy>:null}
   <Copy muted size={12}>읽기·의미·문법·듣기는 별도 응답으로 집계해요. 여러 날의 새 문제 정답은 카드별 FSRS에 반영되며, 속도만으로 암기 여부를 판단하지 않아요.</Copy>
   {stats.concepts.filter(concept=>concept.novelDays>0).map(concept=><Copy muted key={concept.id} size={13}>{concept.label} · 새 문제를 힌트 없이 맞힌 날 {concept.novelDays}일</Copy>)}
   <Copy weight="700">최근 평가 · 수정·이의 기록</Copy>
   {data.attempts.slice(-10).reverse().map(a=>{const result=effectiveAttempt(data,a);return <CardView key={a.id}><Copy>{labCardSummary(data.cards[a.cardId])}</Copy><Copy muted size={12}>{new Date(a.at).toLocaleString()} · {a.elapsedMs/1000}초 · {a.hint?'힌트 사용':'힌트 없음'} · {result.correct?'정답':'보완 필요'}</Copy><Copy size={13}>내 응답: {a.text||'자기 회상'} · 자기 평가 {a.selfGrade}</Copy>{a.ai?<Copy size={13}>AI 평가: {a.ai.correct?'정답':'보완 필요'} · {a.ai.feedback}</Copy>:null}<Link label="이 평가 수정·이의 남기기" onPress={()=>{setSelected(a.id);setNote('');}}/>{selected===a.id?<><TextInput accessibilityLabel="평가 수정 이유" style={input} placeholder="수정 이유 또는 이의 내용" placeholderTextColor={c.textMuted} maxLength={500} value={note} onChangeText={setNote}/><Action secondary label={result.correct?'보완 필요로 수정':'정답으로 수정'} disabled={busy||!note.trim()} onPress={()=>{run(s=>correctAttempt(s,a.id,!result.correct,result.correct?Rating.Again:Rating.Good,note));setSelected('');}}/></>:null}</CardView>;})}
  </>:null}
  {view==='cards'?<><Copy muted size={13}>카드 선택은 하루 새 학습량과 복습 일정을 따릅니다.</Copy><TextInput accessibilityLabel="카드 검색" placeholder="표현·문제로 검색" placeholderTextColor={c.textMuted} style={input} value={cardSearch} onChangeText={value=>{setCardSearch(value);setVisibleCards(40);}}/><View style={{flexDirection:'row',gap:18,flexWrap:'wrap'}}>{[['','전체'],['g-','문법'],['r-','독해'],['l-','청해'],['v-','어휘 표본']].map(([prefix,label])=><Link key={prefix} label={`${cardDomain===prefix?'✓ ':''}${label}`} onPress={()=>{setCardDomain(prefix);setVisibleCards(40);}}/>)}</View><Copy muted size={12}>{matchedCards.length}문항 · {Math.min(visibleCards,matchedCards.length)}개 표시</Copy>{matchedCards.slice(0,visibleCards).map(card=><CardView key={card.id}>
   <Copy weight="700">{labCardSummary(card)}</Copy><Copy muted size={12}>{abilityLabels[card.ability]} · {card.status==='ready'?'검수 표본':card.status==='disabled'?'신고로 중단':'확인 필요'} · {card.novel?'변형':'기존'}</Copy>
   {canStartLabCard(data,card.id)?<Action secondary compact label="이 표본 학습" disabled={busy} onPress={()=>start(card.id)}/>:null}
   <Link label="오류 신고·수정" onPress={()=>{setSelected(card.id);setNote('');setEdit(null);}}/>
   {selected===card.id?<><TextInput accessibilityLabel="오류 신고 내용" style={input} value={note} placeholder="오류 또는 확인할 부분" placeholderTextColor={c.textMuted} maxLength={500} onChangeText={setNote}/><Action secondary compact label="신고하고 학습에서 제외" disabled={busy||!note.trim()} onPress={()=>run(s=>reportCard(s,card.id,note))}/><Link label="문제·허용 답안 수정 열기" onPress={()=>setEdit({prompt:card.prompt,answer:card.answer,accepted:card.accepted.join('\n'),explanation:card.explanation})}/>{edit?<>{(['prompt','answer','accepted','explanation'] as const).map(field=><View key={field}><Copy muted size={12}>{{prompt:'문제',answer:'예상 답안',accepted:'허용 답안 (한 줄에 하나)',explanation:'짧은 해설'}[field]}</Copy><TextInput accessibilityLabel={`카드 수정 ${field}`} style={input} multiline value={edit[field]} onChangeText={value=>setEdit({...edit,[field]:value})}/></View>)}<Action secondary label="내용·허용 답안을 확인했어요 · 수정 적용" disabled={busy} onPress={()=>{run(s=>reviseCard(s,{...card,...edit,accepted:edit.accepted.split('\n').map(a=>a.trim()).filter(Boolean),quality:{natural:true,unambiguous:true,level:true,grounded:true,reviewer:'user-confirmed'}}));setEdit(null);}}/><Copy muted size={12}>수정 전 내용과 복습 이력은 보존해요. 교재 원음이 없는 청해는 이 버튼만으로 활성화할 수 없어요.</Copy></>:null}</>:null}
  </CardView>)}{visibleCards<matchedCards.length?<Link label="40개 더 보기" onPress={()=>setVisibleCards(n=>n+40)}/>:null}</>:null}
  {view==='source'?<>
   <Copy size={22} weight="700">{sampleBook.title}</Copy><Copy>374쪽 스캔 · 원본 페이지별 추출 후 별도 이미지 대조</Copy><Copy muted size={13}>어휘는 기존 단어장을 사용해요. 일본어 본문과 후리가나를 분리하고, 불확실한 문항은 보류해요.</Copy>
   <Copy>문법·독해·청해 검토 처리 {Number(sourceCorpus.coverage.processedPages??0)}/209쪽</Copy><Copy>교재 항목 추출 {Number(sourceCorpus.coverage.rawItems??0)}건 · 학습 가능 {Number(sourceCorpus.coverage.ready??0)}문항 · 보류 {Number(sourceCorpus.coverage.held??0)}문항</Copy>
   <Copy muted size={13}>검토 처리는 누락·판독 불가 항목까지 모두 해결했다는 뜻이 아니에요. 청해는 읽을 수 있는 대본을 합성하고 별도로 표시해요. 원음과 376쪽 이후 모의고사는 첨부되지 않았어요.</Copy>
   {sampleBook.units.map(unit=>{const progress=(sourceCorpus.coverage.byUnit as Record<string,{pages:number;ready:number;held:number}>|undefined)?.[unit.id];return <CardView key={unit.id}><Copy weight="700">{unit.name} · PDF {unit.pages.join('–')}</Copy><Copy muted size={12}>{unit.domain==='vocabulary'?'별도 단어장 이용 · 이번 처리 제외':progress?`검토 ${progress.pages}/${unit.pages[1]-unit.pages[0]+1}쪽 · 학습 ${progress.ready} · 보류 ${progress.held}`:'추출 대기'}</Copy><Copy size={13}>목표: {unit.abilities.map(a=>abilityLabels[a]).join(' · ')}</Copy><Copy size={13}>추출: {unit.extract}</Copy><Copy size={13}>채점: {unit.rubric}</Copy><Copy size={13}>변형 시 유지: {unit.preserve}</Copy><Copy size={13}>변경 가능: {unit.change}</Copy></CardView>;})}
  </>:null}
  {view==='settings'?<>
   <Copy weight="700">학습 범위: {data.studyVocabulary===false?'문법·독해·청해 우선':'어휘 표본 포함'}</Copy><Link label={data.studyVocabulary===false?'기존 어휘 표본도 새 학습에 포함':'새 어휘 표본 제외'} onPress={()=>run(s=>({...s,studyVocabulary:s.studyVocabulary===false}))}/><Copy muted size={12}>기존 단어장은 별도로 유지해요. 이미 학습한 어휘 표본의 복습 이력도 보존해요.</Copy>
   <Copy weight="700">하루 새 문제 {data.settings.dailyNew}개</Copy><View style={{flexDirection:'row',gap:15}}><Link label="새 문제 줄이기" disabled={busy||data.settings.dailyNew===0} onPress={()=>run(s=>({...s,settings:{...s.settings,dailyNew:Math.max(0,s.settings.dailyNew-1)}}))}/><Link label="새 문제 늘리기" disabled={busy||data.settings.dailyNew===30} onPress={()=>run(s=>({...s,settings:{...s.settings,dailyNew:Math.min(30,s.settings.dailyNew+1)}}))}/></View>
   <Copy weight="700">새 적용 문제 추가: 하루 {data.settings.dailyVariants}개</Copy><View style={{flexDirection:'row',gap:15}}><Link label="생성 한도 줄이기" disabled={busy||data.settings.dailyVariants===0} onPress={()=>run(s=>({...s,settings:{...s.settings,dailyVariants:Math.max(0,s.settings.dailyVariants-1)}}))}/><Link label="생성 한도 늘리기" disabled={busy||data.settings.dailyVariants===5} onPress={()=>run(s=>({...s,settings:{...s.settings,dailyVariants:Math.min(5,s.settings.dailyVariants+1)}}))}/></View>
   <Copy>같은 개념의 생성 간격: {data.settings.variantCooldownDays}일</Copy>{[1,3,7].map(days=><Link key={days} label={`${days}일 간격으로 설정`} onPress={()=>run(s=>({...s,settings:{...s.settings,variantCooldownDays:days}}))}/>)}
   <Copy muted>기존 카드 복습을 우선하고 새 문제는 한도 안에서만 추가해요. 현재는 수동 추가 방식이며 자동 무한 생성은 하지 않아요.</Copy>
   <CardView><Copy weight="700">AI·음성 연결 상태</Copy><Copy>{conceptAIEnabled?'오답으로 AI 새 문제 만들기에서 계정·누적 예산 확인':'온라인 AI 서버 미연결 · 자기 평가·검수된 AI 표본 사용'}</Copy><Copy muted size={13}>합성 청해 음성 {Object.keys(listeningAssets).length}개를 저장했어요. 재생에는 새 생성 비용이 없어요. 교재 원음과는 구분하며, 대본은 묶음 응답 후 공개해요.</Copy></CardView>
  </>:null}
 </Page>;
}
