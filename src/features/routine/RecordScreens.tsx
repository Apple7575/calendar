import { AutomaticDayNotes } from "./AutomaticDayNotes";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { useDayData } from "../../hooks/useDayData";
import { useGoogleEvents } from "../../hooks/useGoogleEvents";
import { addDays, formatTime, monthWeeks, parseDateKey, todayKey } from "../../lib/dateUtils";
import { eventsOnDate, mergeEvents } from "../../lib/eventMerge";
import { earned, getDay } from "../../lib/routineModel";
import { RootStackParamList } from "../../navigation/types";
import { useTheme, useThemeControls } from "../../theme/ThemeContext";
import { useRoutine } from "./RoutineProvider";
import { Action, CardView, Copy, Icon, Link, Mascot, Page, u } from "./ui";
import { MotionSwap } from "./motion";
import { AccountConnection } from "./AccountConnection";
import {activityDays,activityStatusLabel,isActivityComplete,routineActivities,RoutineActivity} from '../../lib/routineActivity';

function Mark({ activity }: { activity:RoutineActivity }) {
  const { colors: c } = useTheme();
  return <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: isActivityComplete(activity)?c.primary:c.border,
    alignItems: "center", justifyContent: "center", backgroundColor: isActivityComplete(activity)?c.primarySoft:'transparent' }}>
    <Copy size={12}>{activity.status==='full'?'✓':activity.status==='min'?'◐':activity.status==='progress'?'·':''}</Copy>
  </View>;
}

export function RoutineCalendarScreen({embedded=false}:{embedded?:boolean}={}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors: c } = useTheme();
  const { data, dayKey } = useRoutine();
  const [month, setMonth] = useState(todayKey().slice(0, 7)), [selected, setSelected] = useState(todayKey());
  const [direction, setDirection] = useState<1 | -1>(1);
  const day = getDay(data, selected);
  const local = useDayData(selected), google = useGoogleEvents(month);
  const events = eventsOnDate(mergeEvents(local.localEvents, google.events), selected);
  const monthly = activityDays(data).filter(key=>key.startsWith(month)&&routineActivities(data,key).some(isActivityComplete));
  const move = (delta: number) => {
    setDirection(delta > 0 ? 1 : -1);
    const date = parseDateKey(month + "-01"); date.setMonth(date.getMonth() + delta);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    setMonth(key); setSelected(key + "-01");
  };
  return <Page embedded={embedded} title="캘린더" right={<Link label="일정 보기" onPress={() => navigation.navigate("LegacyCalendar")} />}>
    <View style={{gap:12}}><View style={u.row}><Mascot size={58} happy={monthly.length > 0} /><View style={{ flex: 1 }}><Copy size={22} weight="800">차곡차곡 쌓이는 하루</Copy><Copy muted size={13}>작게 한 날도, 운동한 날도 남아요.</Copy></View></View>
      <View style={u.row}><View style={{ flex: 1 }}><Copy muted>이번 달 실천</Copy><Copy size={30} weight="800">{monthly.length}일</Copy></View><View style={{ flex: 1 }}><Copy muted>작게만 한 날</Copy><Copy size={30} weight="800">{monthly.filter(key=>!routineActivities(data,key).some(a=>a.status==='full')).length}일</Copy></View></View>
    </View>
    <CardView style={{ padding: 16 }}>
      <View style={u.between}><Link label="〈 이전" onPress={() => move(-1)} /><Copy size={19} weight="800">{month.replace("-", "년 ")}월</Copy><Link label="다음 〉" onPress={() => move(1)} /></View>
      <View style={{ flexDirection: "row" }}>{["월", "화", "수", "목", "금", "토", "일"].map(d => <View style={{ width: `${100 / 7}%`, alignItems: "center" }} key={d}><Copy muted size={12}>{d}</Copy></View>)}</View>
      <MotionSwap transitionKey={month} direction={direction}>{monthWeeks(month).map((week, i) => <View key={i} style={{ flexDirection: "row" }}>{week.map(key => {
        const activities=routineActivities(data,key),count=activities.filter(isActivityComplete).length,partial=activities.some(a=>a.status==='progress'),inMonth = key.startsWith(month), selectedDay = key === selected;
        return <Pressable key={key} accessibilityRole="button" accessibilityLabel={`${key}, ${count}개 실천${partial?' · 진행 중 기록 있음':''}`} onPress={() => { setDirection(key > selected ? 1 : -1); setSelected(key); if (!inMonth) setMonth(key.slice(0, 7)); navigation.navigate('DayDetail',{date:key}); }}
          style={{ width: `${100 / 7}%`, minHeight: 69, alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 14,
            backgroundColor: selectedDay ? c.primarySoft : "transparent", opacity: inMonth ? 1 : 0.35 }}>
          <View style={{ minWidth: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: count ? c.primarySoft : "transparent",
            borderWidth: key === dayKey ? 1.5 : 0, borderColor: c.primary }}><Copy size={14} weight={key === dayKey ? "800" : "600"}>{Number(key.slice(-2))}</Copy></View>
          <Copy muted size={10}>{count?`${count}개 실천`:partial?'진행 중':' '}</Copy>
        </Pressable>;
      })}</View>)}</MotionSwap>
      <Copy muted size={11}>간단한 완료도 실천 1개예요. 날짜를 누르면 저녁 루틴과 집중 공부까지 볼 수 있어요.</Copy>
      <View style={u.between}><Link label="일정 추가" onPress={()=>navigation.navigate('EventEdit',{date:selected})}/><Link label="일정 전체·편집" onPress={()=>navigation.navigate('LegacyCalendar')}/></View>
    </CardView>
    <MotionSwap transitionKey={selected} direction={direction}><CardView><Copy size={20} weight="800">{selected.replace(/-/g, ".")}의 기록</Copy>
      {routineActivities(data,selected).map(activity => <View key={activity.id} style={u.between}>
        <View style={u.row}><Mark activity={activity} /><Copy weight="700">{activity.title}</Copy></View>
        <Copy muted size={13}>{activityStatusLabel[activity.status]}</Copy>
      </View>)}
      <Copy muted size={13}>학습 {day.complete.length}장 · 응답 {day.responses}회 · {Math.round(day.studySeconds / 60)}분</Copy>
      {events.map(event => <View key={event.id} style={u.row}><Copy size={13} muted>{event.allDay ? "종일" : formatTime(event.startAt)}</Copy><View style={{ flex: 1 }}><Copy>{event.title}</Copy></View></View>)}
      {local.error || google.error ? <Copy muted size={12}>일부 일정을 불러오지 못했어요. 기존 캘린더에서 다시 확인할 수 있어요.</Copy> : null}
      <AutomaticDayNotes date={selected}/>
      <Link label="이날의 일기 · 사진 · 할 일 보기" onPress={() => navigation.navigate("DayDetail", { date: selected })} />
    </CardView></MotionSwap>
  </Page>;
}

export function RoutineHistoryScreen({embedded=false}:{embedded?:boolean}={}) {
  const { data, dayKey } = useRoutine();
  const { colors: c } = useTheme();
  const records = Array.from({ length: 7 }, (_, i) => {
    const key = addDays(dayKey, i - 6); return { key, day: getDay(data, key) };
  });
  const max = Math.max(1, ...records.map(r => r.day.responses));
  const total = records.reduce((sum, r) => sum + r.day.responses, 0);
  return <Page embedded={embedded} title="나의 기록">
    <CardView><Copy muted>최근 7일 학습 응답</Copy><Copy size={42} weight="800">{total}회</Copy>
      <View style={{ flexDirection: "row", alignItems: "flex-end", height: 150, gap: 10 }}>{records.map(({ key, day }) => <View key={key} style={{ flex: 1, alignItems: "center", gap: 8 }}>
        <Copy size={11} muted>{day.responses || "–"}</Copy><View style={{ width: "70%", height: Math.max(3, day.responses / max * 100), borderRadius: 6, backgroundColor: key === dayKey ? c.primary : c.primarySoft }} />
        <Copy size={11} muted>{Number(key.slice(-2))}일</Copy>
      </View>)}</View>
      <Copy muted size={12}>같은 카드를 여러 번 학습하면 응답 횟수에 각각 포함돼요.</Copy>
    </CardView>
    <CardView><Copy size={20} weight="800">꾸준히 쌓아 온 실천</Copy>
      <View style={u.between}><Copy muted>이번 주 실천한 날 · 최소 목표 포함</Copy><Copy weight="800">{records.filter(r => routineActivities(data,r.key).some(isActivityComplete)).length}일</Copy></View>
      <View style={u.between}><Copy muted>누적 실천일</Copy><Copy weight="800">{activityDays(data).filter(key=>routineActivities(data,key).some(isActivityComplete)).length}일</Copy></View>
      <View style={u.between}><Copy muted>이번 주 학습 시간</Copy><Copy weight="800">{Math.round(records.reduce((n, r) => n + r.day.studySeconds, 0) / 60)}분</Copy></View>
      <View style={u.between}><Copy muted>이번 주 적립 시간</Copy><Copy weight="800">{records.reduce((n, r) => n + earned(r.day), 0)}분</Copy></View>
    </CardView>
    <Copy muted size={12}>이 화면은 새 루틴 기능으로 실제 저장한 기록을 보여줘요. 기존 일기와 리포트는 더보기에서 볼 수 있어요.</Copy>
  </Page>;
}

export function RoutineMoreScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { dayKey } = useRoutine();
  const { theme, setThemeId } = useThemeControls();
  const items = [
    { title: "저녁 루틴 설정", icon: "moon-outline" as const, open: () => navigation.navigate("RoutineSetup",{slot:"evening"}) },
    { title: "25분 집중 공부", icon: "timer-outline" as const, open: () => navigation.navigate("BookStudy") },
    { title: "백업·복구", icon: "cloud-upload-outline" as const, open: () => navigation.navigate("RoutineBackup") },
    { title: "아침 루틴 설정", icon: "sunny-outline" as const, open: () => navigation.navigate("RoutineSetup") },
    { title: "오늘 일기 쓰기", icon: "create-outline" as const, open: () => navigation.navigate("DiaryEdit", { date: dayKey }) },
    { title: "사진첩", icon: "images-outline" as const, open: () => navigation.navigate("Gallery") },
    { title: "순간 찍기", icon: "camera-outline" as const, open: () => navigation.navigate("Camera") },
    { title: "리포트", icon: "stats-chart-outline" as const, open: () => navigation.navigate("LegacyReport") },
    { title: "기존 관심사 · 모든 기능", icon: "grid-outline" as const, open: () => navigation.navigate("LegacyInterests") },
    { title: "이전 캘린더 체크리스트", icon: "list-outline" as const, open: () => navigation.navigate("Routines") },
    { title: "제한할 앱 · 스크린타임", icon: "shield-checkmark-outline" as const, open: () => navigation.navigate("RoutineScreenTime") },
    { title: "설정", icon: "settings-outline" as const, open: () => navigation.navigate("Settings") },
  ];
  return <Page title="더보기">
    <CardView><AccountConnection /></CardView>
    <CardView><View style={u.row}><Mascot size={72} happy /><View style={{ flex: 1 }}><Copy size={23} weight="800">나의 하루를 가꾸는 곳</Copy><Copy muted>실천도, 소중한 기록도 함께.</Copy></View></View></CardView>
    <CardView>{items.map(item => <Pressable accessibilityRole="button" accessibilityLabel={item.title} key={item.title} onPress={item.open} style={[u.between, { minHeight: 53 }]}><View style={u.row}><Icon name={item.icon} size={22} /><Copy weight="600">{item.title}</Copy></View><Icon name="chevron-forward" size={18} /></Pressable>)}</CardView>
    <CardView><Copy size={18} weight="800">나와 정한 보상</Copy>
      <Copy>아침 루틴 10분 · 작게 5분</Copy><Copy>오늘 단어 학습 20분 · 작게 5분</Copy><Copy>헬스장 운동 30분 · 집 운동 10분</Copy>
      <Copy muted size={13}>최소 목표 뒤 전체 목표까지 해내면 차액을 더 받아요. 새벽 4시에 잔액만 초기화돼요.</Copy>
    </CardView>
    <Action label={theme.isDark ? "라이트 모드로 보기" : "다크 모드로 보기"} secondary onPress={() => setThemeId(theme.isDark ? "routine" : "dark")} />
  </Page>;
}
