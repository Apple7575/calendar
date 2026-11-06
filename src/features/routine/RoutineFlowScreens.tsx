import React, { useEffect, useRef, useState } from "react";
import { Alert, View, useWindowDimensions } from "react-native";
import { RootScreenProps } from "../../navigation/types";
import { earned,checkMorning, earn, getDay, Level, morningSteps, Unit } from "../../lib/routineModel";
import { tapLight, tapSuccess } from "../../lib/haptics";
import { CountUp, MotionEnter, MotionSwap } from "./motion";
import { useRoutine } from "./RoutineProvider";
import { Action, CardView, Copy, Icon, Link, Mascot, Page, Progress, u } from "./ui";
import { useTheme } from "../../theme/ThemeContext";
import { canUndoStudy } from '../../lib/studyHistory';
import {useStudyFeedback} from './useStudyFeedback';

export function RoutineMorningScreen({navigation}:RootScreenProps<'RoutineMorning'>){
 useEffect(()=>{navigation.replace('GuidedRoutine',{slot:'morning'})},[navigation]);return <View/>;
}
export {CompletionScreen as RoutineRewardScreen} from './CompletionScreen';
function LegacyRoutineMorningScreen({ navigation }: RootScreenProps<"RoutineMorning">) {
  const { data, dayKey, update, ready } = useRoutine();
  const [level, setLevel] = useState<Level>("full");
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const day = getDay(data, dayKey), steps = morningSteps(data, dayKey);
  const minimumCount = steps.filter(s => s.minimum).length;
  const required = steps.map((s, i) => level === "full" || s.minimum ? i : -1).filter(i => i >= 0);
  const current = required.find(i => !day.morning[i]);
  const count = required.filter(i => day.morning[i]).length;
  const finish = async () => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    let previous = 0, paid = 0;
    try {
      await update(state => {
        const old = getDay(state, dayKey); previous = old.paid.morning;
        const next = checkMorning(state, dayKey, level, current); paid = getDay(next, dayKey).paid.morning;
        return next;
      });
      if (count + (current === undefined ? 0 : 1) >= required.length) {
        // 행동을 다 해도 아침 단어가 남았으면 단어 안내가 있는 아침 루틴 화면으로 보낸다.
        if (!paid) navigation.replace("GuidedRoutine", { slot: "morning" });
        else navigation.replace("RoutineReward", { unit: "morning", level, added: Math.max(0, paid - previous) });
      }
      else tapLight();
    } catch (e) { Alert.alert("저장하지 못했어요", e instanceof Error ? e.message : "다시 시도해 주세요."); }
    finally { saving.current = false; setBusy(false); }
  };
  return <Page title="아침 루틴" right={<Link label="닫기" onPress={() => navigation.goBack()} />}>
    <Progress value={count / required.length} label={`아침 루틴 ${count}/${required.length}`} />
    <MotionSwap transitionKey={`${level}-${current ?? "done"}`}><View style={{ alignItems: "center", paddingVertical: 30, gap: 22 }}>
      <Copy muted>{level === "min" ? "오늘은 작게 시작해요" : "하나씩, 가볍게 시작해요"} · {count}/{required.length}</Copy>
      <Mascot character="C01" size={150} mood={current === undefined ? "celebrate" : count === 0 ? "sleepy" : count === 1 ? "cheer" : "proud"} />
      <Copy size={32} weight="800">{current === undefined ? "아침 준비 끝!" : steps[current].title}</Copy>
      <Copy muted>{current === undefined ? "작은 약속 하나를 지켰어요." : steps[current].detail || "이 행동을 마친 뒤 ‘했어요!’를 눌러 주세요."}</Copy>
    </View></MotionSwap>
    <Action label={busy ? "저장하고 있어요…" : current === undefined ? "완료 기록하기" : "했어요!"} disabled={!ready || busy} onPress={() => void finish()} />
    <Link label={level === "full" ? `힘들면 ${minimumCount}개만 할래요 · 5분` : `전체 ${steps.length}개 할래요 · 총 10분`} onPress={() => setLevel(level === "full" ? "min" : "full")} />
    <Copy muted size={13}>중간에 닫아도 체크한 행동은 저장돼요. 이미 받은 시간은 중복 지급되지 않아요.</Copy>
  </Page>;
}

export {WorkoutDetailScreen as RoutineWorkoutScreen} from './WorkoutDetailScreen';
function LegacyRoutineWorkoutScreen({ navigation }: RootScreenProps<"RoutineWorkout">) {
  const { data, dayKey, update, ready } = useRoutine();
  const [level, setLevel] = useState<Level>("full"), [busy, setBusy] = useState(false);
  const current = getDay(data, dayKey).paid.gym;
  const target = level === "full" ? 30 : 10;
  const complete = async () => {
    setBusy(true);
    try {
      await update(state => earn(state, dayKey, "gym", level));
      navigation.replace("RoutineReward", { unit: "gym", level, added: Math.max(0, target - current) });
    } catch (e) { Alert.alert("저장하지 못했어요", e instanceof Error ? e.message : "다시 시도해 주세요."); }
    finally { setBusy(false); }
  };
  return <Page title="오늘의 운동" right={<Link label="닫기" onPress={() => navigation.goBack()} />}>
    <View style={{ alignItems: "center", padding: 20 }}><Mascot character="C03" size={120} mood={current ? "proud" : "cheer"} /><Copy size={25} weight="800">오늘, 몸을 움직였나요?</Copy></View>
    {([['full', '헬스장 운동', '계획한 운동을 마쳤어요', 30], ['min', '집에서 작게 운동', '가벼운 스트레칭이나 정한 집 운동', 10]] as const).map(([value, title, detail, minutes]) => <CardView key={value}>
      <View style={u.between}><Icon name="barbell-outline" /><Copy size={21} weight="800">{minutes}분</Copy></View>
      <Copy size={18} weight="700">{title}</Copy><Copy muted>{detail}</Copy>
      <Action compact secondary={level !== value} label={level === value ? "선택했어요 ✓" : "선택하기"} onPress={() => setLevel(value)} />
    </CardView>)}
    <Action label={busy ? "저장하고 있어요…" : current >= target ? "이미 기록했어요" : "운동 완료"} disabled={busy || !ready || current >= target} onPress={() => void complete()} />
    <Link label="자세한 운동 기록 보기" onPress={() => navigation.navigate("Workout")} />
  </Page>;
}

function LegacyRoutineRewardScreen({ route, navigation }: RootScreenProps<"RoutineReward">) {
  const { height } = useWindowDimensions();
  const compact = height < 740;
  const tiny = height < 660;
  const { colors: c } = useTheme();
  const { data, dayKey, native,undoStudy } = useRoutine();
  const { unit, level, added } = route.params;
  useStudyFeedback(unit==='words'&&added>0?{kind:'complete',id:route.key}:null);
  useEffect(() => { if (added > 0) tapSuccess(); }, [added]);
  const day = getDay(data, dayKey);
  const total = earned(day);
  const connected = native?.enabled && native.authorized && native.rewardMode;
  const titles: Record<Unit, string> = { morning: "아침 루틴", words: "오늘의 학습", gym: level === "full" ? "헬스장 운동" : "집 운동" };
  const available = Math.max(0, total - (connected && native.day === dayKey ? native.consumedMinutes : 0));
  return <Page title="해냈어요!" scrollable={false} footer={<View style={{ gap: 4 }}>
    <Action label={!day.paid.morning ? "아침 루틴 하러 가기" : unit === "words" && level === "min" ? "전체 학습 계속하기" : "좋아요!"} onPress={() => {
      if (!day.paid.morning) navigation.replace("RoutineMorning");
      else if (unit === "words" && level === "min") navigation.replace("RoutineStudySession", { level: "full" });
      else navigation.popToTop();
    }} />
    {unit === "words" ? <Link label="단어 더 공부하기" onPress={() => navigation.replace("RoutineStudySession", {level:"full"})} /> : null}
    {unit==='words'&&canUndoStudy(data,dayKey)?<Link label="마지막 채점 취소" onPress={()=>{const event=data.reviewHistory?.find(e=>e.id===data.studyUndo?.eventId);void undoStudy().then(()=>navigation.replace('RoutineStudySession',{level:event?.level??'full',deckId:event?.deckId,mode:event?.mode==='additional'?'additional':undefined})).catch(e=>Alert.alert('채점 취소',e.message));}}/>:null}
    {(!day.paid.morning || unit === "words" && level === "min") ? <Link label="오늘로 돌아가기" onPress={() => navigation.popToTop()} /> : null}
  </View>}>
    <CardView style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: compact ? 12 : 24, gap: compact ? 8 : 16 }}>
      {!tiny ? <MotionEnter celebration><Mascot size={compact ? 76 : 110} mood="celebrate" /></MotionEnter> : null}
      <MotionEnter delay={80}><Copy size={compact ? 21 : 25} weight="800">{titles[unit]} {level === "min" ? "작게 완료" : "완료"}</Copy></MotionEnter>
      {!compact ? <Copy muted size={13}>나와 한 약속을 지켰어요</Copy> : null}
      <Copy size={compact ? 50 : 64} weight="800"><CountUp value={added} prefix="+" suffix="분" animateInitial delay={150} /></Copy>
      <View style={{ backgroundColor: c.inputBg, borderRadius: 20, padding: compact ? 12 : 18, alignSelf: "stretch", gap: 6 }}>
        <View style={u.between}><Copy muted size={13}>오늘 모은 시간</Copy><Copy weight="700">{total}분</Copy></View>
        <Copy size={13}>{!day.paid.morning ? "아침 루틴을 마치면 사용할 수 있어요" : connected ? `사용 가능 약 ${available}분 · 기기에 반영 중` : "스크린타임을 연결하면 사용할 수 있어요"}</Copy>
      </View>
      <View style={u.row}><Icon name="checkmark-circle" size={18} color={c.primary} /><Copy size={13} muted>오늘 캘린더에 실천을 남겼어요</Copy></View>
    </CardView>
  </Page>;
}
