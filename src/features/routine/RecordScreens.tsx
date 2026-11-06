import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { Image, Pressable, View } from "react-native";
import { addDays, monthWeeks, parseDateKey, todayKey } from "../../lib/dateUtils";
import { earned, getDay } from "../../lib/routineModel";
import { RootStackParamList } from "../../navigation/types";
import { useTheme, useThemeControls } from "../../theme/ThemeContext";
import { control, space } from "../../theme/tokens";
import { useRoutine } from "./RoutineProvider";
import { Action, CardView, Copy, Icon, Link, Mascot, Page, u } from "./ui";
import { MotionSwap } from "./motion";
import { AccountConnection } from "./AccountConnection";
import {activityDays,isActivityComplete,routineActivities} from '../../lib/routineActivity';
import {stickerFor} from '../../lib/calendarSticker';

const STICKERS={
  'done1-otter':require('../../../assets/stickers/done1-otter.png'),'done1-cat':require('../../../assets/stickers/done1-cat.png'),'done1-bear':require('../../../assets/stickers/done1-bear.png'),'done1-hedgehog':require('../../../assets/stickers/done1-hedgehog.png'),
  'done2-otter':require('../../../assets/stickers/done2-otter.png'),'done2-cat':require('../../../assets/stickers/done2-cat.png'),'done2-bear':require('../../../assets/stickers/done2-bear.png'),'done2-hedgehog':require('../../../assets/stickers/done2-hedgehog.png'),
} as const;
const ANIMAL_NAME={otter:'수달',cat:'고양이',bear:'북극곰',hedgehog:'고슴도치'} as const;
/** 실천한 날의 친구 스티커(팀장 결정 2026-11-06). 동물·포즈는 연속 실천 위젯과 같은 날짜 순서다. */
function DaySticker({dayKey,today}:{dayKey:string;today:boolean}){
  const { colors: c } = useTheme(),{animal,pose}=stickerFor(dayKey);
  return <View style={{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center',backgroundColor:c.primarySoft,borderWidth:today?1.5:0,borderColor:c.primary}}>
    <Image source={STICKERS[`done${pose}-${animal}`]} style={{width:34,height:34}} resizeMode="contain" accessibilityIgnoresInvertColors/>
    <View style={{position:'absolute',right:-4,bottom:-4,minWidth:18,height:18,paddingHorizontal:3,borderRadius:9,alignItems:'center',justifyContent:'center',backgroundColor:c.card}}><Copy variant="caption" weight="800" style={{fontSize:11,lineHeight:14}}>{Number(dayKey.slice(-2))}</Copy></View>
  </View>;
}

/** 달력 칸에 실천 수를 점으로 보여 준다. 정확한 수는 접근성 설명에 있다. */
function DayDots({count,partial}:{count:number;partial:boolean}){
  const { colors: c } = useTheme();
  return <View style={{flexDirection:"row",gap:2,height:4}}>{count?Array.from({length:Math.min(count,4)},(_,i)=><View key={i} style={{width:4,height:4,borderRadius:2,backgroundColor:c.primary}}/>):partial?<View style={{width:4,height:4,borderRadius:2,backgroundColor:c.textMuted}}/>:null}</View>;
}

export function RoutineCalendarScreen({embedded=false}:{embedded?:boolean}={}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { colors: c } = useTheme();
  const { data, dayKey } = useRoutine();
  const [month, setMonth] = useState(todayKey().slice(0, 7));
  const [direction, setDirection] = useState<1 | -1>(1);
  const monthly = activityDays(data).filter(key=>key.startsWith(month)&&routineActivities(data,key).some(isActivityComplete));
  const small = monthly.filter(key=>!routineActivities(data,key).some(a=>a.status==='full')).length;
  const move = (delta: number) => {
    setDirection(delta > 0 ? 1 : -1);
    const date = parseDateKey(month + "-01"); date.setMonth(date.getMonth() + delta);
    setMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  };
  return <Page embedded={embedded} title="캘린더">
    <CardView style={{ padding: space.sm, gap: space.xs }}>
      <View style={u.between}><Link label="〈 이전" onPress={() => move(-1)} /><View style={{alignItems:"center"}}><Copy variant="section">{month.replace("-", "년 ")}월</Copy><Copy variant="caption" muted>실천 {monthly.length}일 · 작게만 {small}일</Copy></View><Link label="다음 〉" onPress={() => move(1)} /></View>
      <View style={{ flexDirection: "row" }}>{["월", "화", "수", "목", "금", "토", "일"].map(d => <View style={{ width: `${100 / 7}%`, alignItems: "center" }} key={d}><Copy variant="caption" muted>{d}</Copy></View>)}</View>
      <MotionSwap transitionKey={month} direction={direction}>{monthWeeks(month).map((week, i) => <View key={i} style={{ flexDirection: "row" }}>{week.map(key => {
        const activities=routineActivities(data,key),count=activities.filter(isActivityComplete).length,partial=activities.some(a=>a.status==='progress'),inMonth = key.startsWith(month);
        const sticker=count>0&&key<=dayKey;
        return <Pressable key={key} accessibilityRole="button" accessibilityLabel={`${key}, ${count}개 실천${partial?' · 진행 중 기록 있음':''}${sticker?' · '+ANIMAL_NAME[stickerFor(key).animal]+' 스티커':''}`} onPress={() => navigation.navigate('DayDetail',{date:key})}
          style={{ width: `${100 / 7}%`, minHeight: control.touch, alignItems: "center", justifyContent: "center", gap: 2, opacity: inMonth ? 1 : 0.35 }}>
          {sticker?<DaySticker dayKey={key} today={key===dayKey}/>:<><View style={{ minWidth: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: count ? c.primarySoft : "transparent",
            borderWidth: key === dayKey ? 1.5 : 0, borderColor: c.primary }}><Copy variant="caption" weight={key === dayKey ? "800" : "600"}>{Number(key.slice(-2))}</Copy></View>
          <DayDots count={count} partial={partial}/></>}
        </Pressable>;
      })}</View>)}</MotionSwap>
      <Copy variant="caption" muted>간단한 완료도 실천 1개. 날짜를 누르면 자세히 봐요.</Copy>
      <View style={u.between}><Link label="일정 추가" onPress={()=>navigation.navigate('EventEdit',{date:dayKey})}/><Link label="일정 전체·편집" onPress={()=>navigation.navigate('LegacyCalendar')}/></View>
    </CardView>
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
    <CardView><View style={u.between}><Copy muted>최근 7일 학습 응답</Copy><Copy variant="heading">{total}회</Copy></View>
      <View style={{ flexDirection: "row", alignItems: "flex-end", height: 84, gap: 10 }}>{records.map(({ key, day }) => <View key={key} style={{ flex: 1, alignItems: "center", gap: 8 }}>
        <Copy variant="caption" muted>{day.responses || "–"}</Copy><View style={{ width: "70%", height: Math.max(3, day.responses / max * 36), borderRadius: 6, backgroundColor: key === dayKey ? c.primary : c.primarySoft }} />
        <Copy variant="caption" muted>{Number(key.slice(-2))}일</Copy>
      </View>)}</View>
      <Copy muted size={12}>같은 카드를 여러 번 학습하면 횟수마다 세요.</Copy>
    </CardView>
    <CardView style={{ gap: space.xs }}>
      <View style={u.between}><Copy muted>이번 주 실천한 날 · 최소 목표 포함</Copy><Copy weight="800">{records.filter(r => routineActivities(data,r.key).some(isActivityComplete)).length}일</Copy></View>
      <View style={u.between}><Copy muted>누적 실천일</Copy><Copy weight="800">{activityDays(data).filter(key=>routineActivities(data,key).some(isActivityComplete)).length}일</Copy></View>
      <View style={u.between}><Copy muted>이번 주 학습 시간</Copy><Copy weight="800">{Math.round(records.reduce((n, r) => n + r.day.studySeconds, 0) / 60)}분</Copy></View>
      <View style={u.between}><Copy muted>이번 주 적립 시간</Copy><Copy weight="800">{records.reduce((n, r) => n + earned(r.day), 0)}분</Copy></View>
    </CardView>
    {embedded?null:<Copy muted size={12}>이 화면은 새 루틴 기능으로 실제 저장한 기록을 보여줘요. 기존 일기와 리포트는 더보기에서 볼 수 있어요.</Copy>}
  </Page>;
}

export function RoutineMoreScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { dayKey } = useRoutine();
  const { themeId, setThemeId } = useThemeControls();
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
      <Copy>아침 루틴 10분 · 작게 5분</Copy><Copy>단어 완료 10장 → 15장 → 20장마다 5분</Copy><Copy>헬스장 운동 30분 · 집 운동 10분</Copy>
      <Copy muted size={13}>최소 목표 뒤 전체 목표까지 해내면 차액을 더 받아요. 새벽 4시에 잔액만 초기화돼요.</Copy>
    </CardView>
    <Action label={themeId === "dark" ? "라이트 모드로 보기" : "다크 모드로 보기"} secondary onPress={() => setThemeId(themeId === "dark" ? "routine" : "dark")} />
  </Page>;
}
