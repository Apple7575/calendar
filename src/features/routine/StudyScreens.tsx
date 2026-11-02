import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Crypto from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import React, { useEffect, useRef, useState } from "react";
import { Alert, AppState, Platform, Switch,Text, View } from "react-native";
import { Grade, Rating } from "ts-fsrs";
import { additionalPlan,additionalProgress,studyDeckProgress,additionalCandidates, answerAdditionalWord, nextAdditionalWord, pendingAdditionalWords, startAdditionalStudy, addDeck, answerWord, decodeCard, earn, getDay, Level, nextStudyWord, parseDeckText, pendingWords, planStudy, scheduler, studyProgress } from "../../lib/routineModel";
import { listVocab } from "../../lib/vocab";
import { RootScreenProps, RootStackParamList } from "../../navigation/types";
import { useTheme } from "../../theme/ThemeContext";
import { useRoutine } from "./RoutineProvider";
import { Action, CardView, Copy, Icon, Link, Mascot, Page, Progress, u } from "./ui";
import { StudyCard } from "./StudyCard";
import { StudyRatingBar } from "./StudyRatingBar";
import { additionalRewardStatus } from '../../lib/studyRewards';
import { canUndoStudy } from '../../lib/studyHistory';
import { DeckRow } from "../../lib/japaneseDeck";
import { AccountConnection } from "./AccountConnection";
import { AdditionalStudyChooser } from './AdditionalStudyChooser';
import { StudyCelebration } from './StudyCelebration';
import { MotionEnter } from './motion';
import { tapSuccess } from '../../lib/haptics';
import {StudyFeedback,useStudyFeedback} from './useStudyFeedback';
import {AdditionalCompletionCard} from './AdditionalCompletionCard';
import {StudyFinishedCelebration} from './StudyFinishedCelebration';
import {usePresentedStudyWord} from './usePresentedStudyWord';
import {WordRewardProgress} from './WordRewardProgress';


export { StudySettingsScreen,StudyPreferencesScreen } from './StudySettingsScreens';
export { StudyHomeScreen } from './StudyHomeScreen';

export function RoutineStudySessionScreen({ route, navigation }: RootScreenProps<"RoutineStudySession">) {
  const { data, ready, dayKey, update,undoStudy,retryStudyAdjustment } = useRoutine();
  const deckId=route.params.deckId;
  const additional = route.params.mode === "additional";
  const level: Level = route.params.level;
  const [revealedKey, setRevealedKey] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(() => new Date());
  const [error, setError] = useState<string | null>(null);
  const [addedMinutes,setAddedMinutes]=useState(0);
  const [encouragement,setEncouragement]=useState('');
  const [milestone,setMilestone]=useState<number|null>(null);
  const [finishedCelebration,setFinishedCelebration]=useState(false);
  const [feedback,setFeedback]=useState<StudyFeedback|null>(null);
  useStudyFeedback(feedback);
  const celebrated=useRef(new Set<string>());
  const startedAt = useRef(Date.now());
  const sessionDay = useRef(dayKey);
  const day = getDay(data, dayKey);
  const extra=additionalPlan(data,dayKey,deckId);
  const reward=additionalRewardStatus(data,dayKey);
  const progress = additional ? additionalProgress(data,dayKey,deckId) : studyDeckProgress(data,dayKey,deckId);
  const pending = additional ? pendingAdditionalWords(data,dayKey,deckId) : pendingWords(data, dayKey, level,deckId);
  const candidate = additional ? nextAdditionalWord(data,dayKey,clock,deckId) : nextStudyWord(data, dayKey, level, clock,deckId);
  const lastEvent=data.reviewHistory?.at(-1);
  const restored=lastEvent?.voidedAt&&lastEvent.day===dayKey&&(lastEvent.mode==='additional')===additional&&(!deckId||lastEvent.deckId===deckId)?{id:lastEvent.wordId,reps:lastEvent.before.reps,token:lastEvent.id}:undefined;
  const word=usePresentedStudyWord(`${dayKey}:${additional}:${level}:${deckId??'all'}`,pending,candidate,restored);
  const startMore = async (kind:'new'|'review'|'quick',count=10) => {
    if(busy)return;setBusy(true);setError(null);setFeedback(null);
    try {await update(s=>startAdditionalStudy(s,dayKey,kind,count,new Date(),deckId));navigation.setParams({mode:'additional',level:'full'});setAddedMinutes(0);setMilestone(null);setRevealedKey(null);setClock(new Date());}
    catch(e){setError(e instanceof Error?e.message:'학습을 준비하지 못했어요.');}finally{setBusy(false);}
  };
  const wordKey = word ? `${word.id}:${word.card.reps}` : "waiting";
  const revealed = revealedKey === wordKey;
  useEffect(() => {
    if (!additional && ready && !day.plan && sessionDay.current === dayKey) void update(s => planStudy(s, dayKey)).catch(e => setError(e.message));
  }, [additional, ready, !!day.plan, dayKey, update]);
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    const listener = AppState.addEventListener("change", state => {
      startedAt.current = Date.now(); if (state === "active") setClock(new Date());
    });
    return () => { clearInterval(timer); listener.remove(); };
  }, []);
  useEffect(() => { startedAt.current = Date.now(); }, [wordKey]);
  const finishMinimum = async (goalLevel:Level='min') => {
    setBusy(true);
    try {
      let added=0;
      await update(s => {
        const p=studyProgress(getDay(s,dayKey));if(goalLevel==='full'?!p.full:!p.min)return s;
        return s;
      });
      navigation.replace("RoutineReward", { unit: "words", level: goalLevel, added });
    } catch (e) { setError(e instanceof Error ? e.message : "저장하지 못했어요."); }
    finally { setBusy(false); }
  };
  const answer = async (grade: Grade) => {
    if (!word || busy) return;
    setBusy(true); setError(null);
    let target = 0, previous = 0, completed=0, previousDone=0, total=0, batch='';
    try {
      await update(s => {
        if(additional){
          const before=getDay(s,dayKey),next=answerAdditionalWord(s,dayKey,word.id,grade,new Date(),(Date.now()-startedAt.current)/1000,deckId,word.card.reps),after=getDay(next,dayKey);
          target=(after.bonus?.words??0)+(after.bonus?.quick??0);previous=(before.bonus?.words??0)+(before.bonus?.quick??0);
          const a=additionalProgress(s,dayKey,deckId),b=additionalProgress(next,dayKey,deckId);previousDone=a.done;completed=b.done;total=b.total;batch=additionalPlan(next,dayKey,deckId)?.ids.join('|')??'';
          return next;
        }
        previous = getDay(s, dayKey).paid.words;
        let next = answerWord(s, dayKey, word.id, grade, new Date(), (Date.now() - startedAt.current) / 1000, level,deckId,word.card.reps);
        const a=studyDeckProgress(s,dayKey,deckId),b=studyDeckProgress(next,dayKey,deckId);previousDone=a.done;completed=b.done;total=b.total;batch=getDay(next,dayKey).plan?.ids.join('|')??'';
        target=getDay(next,dayKey).paid.words;
        return next;
      });
      setRevealedKey(null); startedAt.current = Date.now(); setClock(new Date());
      setEncouragement(grade===Rating.Again?'다시 만나는 것도 공부예요. 편하게 기억을 확인해요.':'');
      setAddedMinutes(value=>value+Math.max(0,target-previous));
      const celebrationKey=`${dayKey}:${additional}:${deckId??'all'}:${batch}:${completed}`;
      if(completed>previousDone&&completed%10===0&&completed<total&&!celebrated.current.has(celebrationKey)){
        celebrated.current.add(celebrationKey);setMilestone(completed);setFeedback({kind:'milestone',id:celebrationKey});tapSuccess();
      }else if(completed>previousDone&&completed===total&&!celebrated.current.has(celebrationKey)){
        celebrated.current.add(celebrationKey);setFeedback({kind:'complete',id:celebrationKey});tapSuccess();setFinishedCelebration(true);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "응답을 저장하지 못했어요."); }
    finally { setBusy(false); }
  };
  const previews = word ? scheduler.repeat(decodeCard(word.card), clock) : null;
  const intervalLabel = (due: Date) => {
    const minutes = Math.max(1, Math.ceil((due.getTime() - clock.getTime()) / 60000));
    return minutes < 60 ? `${minutes}분 후` : minutes < 1440 ? `${Math.round(minutes / 60)}시간 후` : `${Math.round(minutes / 1440)}일 후`;
  };
  const grading = !word || sessionDay.current !== dayKey ? undefined : <StudyRatingBar revealed={revealed} busy={busy||milestone!==null||!!data.pendingStudyAdjustment} onReveal={()=>setRevealedKey(wordKey)} onAnswer={grade=>void answer(grade)} interval={grade=>previews?intervalLabel(previews[grade].card.due):''}/>;
  const undo=async()=>{if(busy)return;const event=data.reviewHistory?.find(e=>e.id===data.studyUndo?.eventId);setBusy(true);setFeedback(null);try{await undoStudy();if(event)navigation.setParams({level:event.level??'full',deckId:event.deckId,mode:event.mode==='additional'?'additional':undefined});setRevealedKey(null);setAddedMinutes(0);setMilestone(null);setFinishedCelebration(false);setClock(new Date());}catch(e){setError(e instanceof Error?e.message:'채점을 취소하지 못했어요.');}finally{setBusy(false);}};
  return <Page title={additional ? "추가 학습" : level === "min" ? "작게 복습하기" : "오늘의 학습"} right={<View style={u.row}>{canUndoStudy(data,dayKey)?<Link label="채점 취소" onPress={()=>void undo()}/>:null}<Link label="닫기" onPress={() => navigation.goBack()} /></View>} footer={grading} floatingFooter fillContent={!!word}>
    {deckId?<Copy muted size={12}>{data.decks.find(d=>d.id===deckId)?.name} · 이 덱만 학습 중</Copy>:null}
    <Progress value={progress.total ? progress.done / progress.total : 0} label="학습 진행률" />
    <View style={u.between}><Copy muted>{progress.done}/{progress.total}장 완료{progress.excluded?` · ${progress.excluded}장 제외`:''}</Copy><Copy muted>응답 {additional?extra?.responses??0:day.responses}회</Copy></View>
    {encouragement?<View style={u.row}><Mascot size={30} character="C02" mood="cheer"/><View style={{flex:1}}><Copy muted size={12}>{encouragement}</Copy></View></View>:null}
    {error ? <Copy>{error}</Copy> : null}
    {data.pendingStudyAdjustment?<CardView><Copy>채점을 취소했어요. 기기의 학습 보상을 되돌리는 중이에요.</Copy><Link label="보상 복원 다시 시도" onPress={retryStudyAdjustment}/></CardView>:null}
    <Copy size={13} weight="700">이번 구간 {reward.pending}/{reward.required}장 · {reward.untilNext}장 더 완료하면 +5분</Copy>
    <Copy muted size={12}>다음 구간은 {reward.required+5}장에 +5분 · 오늘 단어 적립 합계 {reward.earned}분</Copy>
    <StudyCelebration count={milestone} onContinue={()=>{setFeedback(null);setMilestone(null);startedAt.current=Date.now();}}/>
    <StudyFinishedCelebration visible={finishedCelebration} granted={additional?extra?.reward?.granted:addedMinutes} excluded={progress.excluded} additional={additional} plan={additional?extra:undefined} count={progress.total} onClose={()=>{setFinishedCelebration(false);setFeedback(null)}}/>
    {sessionDay.current !== dayKey ? <CardView><Copy>새 하루가 시작됐어요. 기록은 저장했어요.</Copy><Action label="오늘 학습으로 돌아가기" onPress={() => navigation.goBack()} /></CardView> : word ? <StudyCard fill key={wordKey} word={word} revealed={revealed} paused={milestone!==null} onReveal={()=>setRevealedKey(wordKey)}/> : <CardView>
      <Copy size={23} weight="800">{!ready || !day.plan ? "오늘 카드를 준비하고 있어요" : additional ? "추가 분량을 마쳤어요" : progress.full ? "오늘 분량을 마쳤어요" : "계속 공부할 수 있어요"}</Copy>
      {!additional&&pendingAdditionalWords(data,dayKey,deckId).length?<Action label="하던 추가 학습 이어하기" disabled={busy} onPress={()=>navigation.setParams({mode:'additional',level:'full'})}/>:<AdditionalStudyChooser newCount={additionalCandidates(data,dayKey,'new',deckId).length} reviewCount={additionalCandidates(data,dayKey,'review',deckId).length} busy={busy||!ready} onStart={(kind,count)=>void startMore(kind,count)}/>}
      {ready&&progress.full?(additional?<AdditionalCompletionCard plan={extra} count={progress.total} excluded={progress.excluded}/>:<View testID="study-batch-complete" style={{alignItems:'center',gap:4,paddingBottom:10}}><MotionEnter celebration><Mascot size={160} action="A26"/></MotionEnter><Copy size={13} muted>{progress.total}장, 끝까지 해냈어요!</Copy><WordRewardProgress excluded={progress.excluded}/></View>):null}
      {level === "min" && progress.min ? <Link label="작은 목표 보상 보기" onPress={() => void finishMinimum()} /> : null}
      {data.studyRewardPolicy?.quickEnabled?<Action secondary label="짧은 복습 3장 · 완료 수에 합산" disabled={busy||!ready} onPress={()=>void startMore('quick')}/>:null}
      {deckId?<Link label="다른 덱의 오늘 학습 이어가기" onPress={()=>navigation.setParams({deckId:undefined,mode:undefined})}/>:null}
      <Copy muted size={12}>다음 복습이 내일 이후로 넘어가야 1장 완료예요. ‘다시’와 당일 재학습은 응답 횟수에만 기록돼요. 기본·추가 학습을 합쳐 10장, 그다음 15장, 20장처럼 5장씩 늘어난 분량마다 5분이에요. 하루 상한 없이 새벽 4시에 10장부터 다시 시작해요.</Copy>
    </CardView>}
  </Page>;
}


