import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { generateWeekLine, WeekLineInput } from "../lib/aiHelper";
import { formatTime, monthWeeks, todayKey } from "../lib/dateUtils";
import { annivHex } from "../lib/dday";
import { CalendarEvent, eventsOnDate, MarkedDates } from "../lib/eventMerge";
import { DayDecoration } from "../lib/highlights";
import { AnniversaryRow } from "../lib/supabase";
import { Dimensions } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { fontSizes, radii, spacing } from "../theme/tokens";
import { Sticker } from "./cute/stickers";

const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"] as const;

type Props = {
  monthKey: string;
  /** buildMarkedDates 결과 (dot 표시용) */
  markedDates: MarkedDates;
  /** 주차 요약에 쓸 병합·전개된 이벤트 */
  events: CalendarEvent[];
  taskDates: string[];
  diaryDates: string[];
  /** dateKey → 꾸미기 (사진 배경 + 스티커) */
  highlights?: Record<string, DayDecoration>;
  /** dateKey → 그날의 기념일들 (외곽선 링 표시) */
  anniversaries?: Record<string, AnniversaryRow[]>;
  /** 펼쳐진 주차 index (null = 없음) */
  expandedWeek: number | null;
  onToggleWeek: (index: number) => void;
  onPressDay: (dateKey: string) => void;
  /** 날짜 길게 누르기 → 바로 일정 추가 */
  onLongPressDay?: (dateKey: string) => void;
};

/**
 * 자체 월간 그리드.
 * 왼쪽에 주차(W1~) 바가 있고, 주차를 누르면 그 주의 요약이 해당 행 아래로 펼쳐진다.
 */
export function MonthGrid({
  monthKey,
  markedDates,
  events,
  taskDates,
  diaryDates,
  highlights,
  anniversaries,
  expandedWeek,
  onToggleWeek,
  onPressDay,
  onLongPressDay,
}: Props) {
  const { colors: c, isDark } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const weeks = useMemo(() => monthWeeks(monthKey), [monthKey]);
  const today = todayKey();
  const taskSet = useMemo(() => new Set(taskDates), [taskDates]);
  const diarySet = useMemo(() => new Set(diaryDates), [diaryDates]);

  return (
    <View style={styles.container}>
      {/* 요일 헤더 */}
      <View style={styles.row}>
        <View style={styles.weekBarSpacer} />
        {WEEKDAY_LABELS.map((w, i) => (
          <View key={w} style={styles.dayCell}>
            <Text style={[styles.weekdayLabel, i === 6 && { color: c.danger }]}>{w}</Text>
          </View>
        ))}
      </View>

      {weeks.map((week, wi) => {
        const expanded = expandedWeek === wi;
        const isCurrentWeek = week.includes(today);
        return (
          <View key={week[0]}>
            <View style={styles.row}>
              {/* 주차 바 (이번 주는 테두리 강조) */}
              <TouchableOpacity
                style={[
                  styles.weekBar,
                  isCurrentWeek && styles.weekBarCurrent,
                  expanded && styles.weekBarActive,
                ]}
                onPress={() => onToggleWeek(wi)}
              >
                <Text style={[styles.weekBarText, expanded && styles.weekBarTextActive]}>
                  W{wi + 1}
                </Text>
                <Ionicons
                  name={expanded ? "chevron-up" : "chevron-down"}
                  size={10}
                  color={expanded ? c.white : c.textMuted}
                />
              </TouchableOpacity>

              {/* 날짜 셀 */}
              {week.map((dateKey, di) => {
                const inMonth = dateKey.startsWith(monthKey);
                const isToday = dateKey === today;
                const dots = markedDates[dateKey]?.dots ?? [];
                const deco = highlights?.[dateKey];
                const imageBg = deco?.imageUrl ?? null;
                // 기념일 외곽선: 사진과 같은 둥근 네모로 셀을 두르고,
                // 여러 개면 테두리를 색깔별 구간으로 나눈다 (최대 3색)
                const ringColors = (anniversaries?.[dateKey] ?? [])
                  .slice(0, 3)
                  .map((a) => annivHex(a.color));
                return (
                  <TouchableOpacity
                    key={dateKey}
                    style={styles.dayCell}
                    onPress={() => onPressDay(dateKey)}
                    onLongPress={onLongPressDay ? () => onLongPressDay(dateKey) : undefined}
                  >
                    {imageBg ? (
                      <View style={styles.bgWrap} pointerEvents="none">
                        <Image source={{ uri: imageBg }} style={styles.bgImage} />
                        {/* 다크 테마에선 밝은 사진이 튀지 않게 더 어둡게 */}
                        <View
                          style={[
                            styles.bgScrim,
                            isDark && { backgroundColor: "rgba(0,0,0,0.4)" },
                          ]}
                        />
                      </View>
                    ) : null}
                    {ringColors.length > 0 ? <AnnivBorder colors={ringColors} /> : null}
                    <View style={styles.dayNumOuter}>
                      <View style={[styles.dayNumWrap, isToday && styles.todayWrap]}>
                        <Text
                          style={[
                            styles.dayNum,
                            di === 6 && { color: c.danger },
                            !inMonth && styles.dayNumMuted,
                            imageBg && styles.dayNumOnImage,
                            isToday && styles.todayText,
                          ]}
                        >
                          {Number(dateKey.slice(8, 10))}
                        </Text>
                        {deco?.stickerId ? (
                          <View style={styles.stickerBadge}>
                            <Sticker id={deco.stickerId} size={14} />
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.dotRow}>
                      {dots.slice(0, 4).map((d) => (
                        <View
                          key={d.key}
                          style={[
                            styles.dot,
                            { backgroundColor: d.color },
                            imageBg ? styles.dotOnImage : null,
                          ]}
                        />
                      ))}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 주차 아코디언 */}
            {expanded ? (
              <View style={styles.accordion}>
                <WeekSummary
                  week={week}
                  monthKey={monthKey}
                  events={events}
                  taskSet={taskSet}
                  diarySet={diarySet}
                  onPressDay={onPressDay}
                  styles={styles}
                  c={c}
                />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function WeekSummary({
  week,
  monthKey,
  events,
  taskSet,
  diarySet,
  onPressDay,
  styles,
  c,
}: {
  week: string[];
  monthKey: string;
  events: CalendarEvent[];
  taskSet: Set<string>;
  diarySet: Set<string>;
  onPressDay: (dateKey: string) => void;
  styles: ReturnType<typeof createStyles>;
  c: ThemeColors;
}) {
  const daysWithContent = week
    .map((dateKey, i) => ({
      dateKey,
      weekday: WEEKDAY_LABELS[i],
      events: eventsOnDate(events, dateKey),
      hasTask: taskSet.has(dateKey),
      hasDiary: diarySet.has(dateKey),
    }))
    .filter((d) => d.events.length > 0 || d.hasTask || d.hasDiary);

  const weekEvents = week.flatMap((d) => eventsOnDate(events, d));

  if (daysWithContent.length === 0) {
    return <Text style={styles.accordionEmpty}>이번 주는 아직 비어 있어요.</Text>;
  }

  return (
    <>
      <WeekLine
        weekStart={week[0]}
        input={{
          range: `${week[0]} ~ ${week[6]}`,
          events: weekEvents.slice(0, 20).map((e) => ({
            title: e.title,
            time: e.allDay ? "종일" : formatTime(e.startAt),
          })),
          taskDays: week.filter((d) => taskSet.has(d)).length,
          diaryDays: week.filter((d) => diarySet.has(d)).length,
        }}
        styles={styles}
        c={c}
      />
      {daysWithContent.map((d) => (
        <TouchableOpacity
          key={d.dateKey}
          style={styles.summaryDay}
          onPress={() => onPressDay(d.dateKey)}
        >
          <View style={styles.summaryDateCol}>
            <Text
              style={[
                styles.summaryDate,
                !d.dateKey.startsWith(monthKey) && { color: c.textMuted },
              ]}
            >
              {Number(d.dateKey.slice(8, 10))}일 ({d.weekday})
            </Text>
            <View style={styles.summaryBadges}>
              {d.hasTask ? <Ionicons name="checkbox-outline" size={12} color={c.dotTask} /> : null}
              {d.hasDiary ? <Ionicons name="book-outline" size={12} color={c.dotDiary} /> : null}
            </View>
          </View>
          <View style={styles.summaryEvents}>
            {d.events.slice(0, 3).map((e) => (
              <View key={`${e.source}-${e.id}-${e.startAt}`} style={styles.summaryEventRow}>
                <View
                  style={[
                    styles.summaryEventDot,
                    {
                      backgroundColor:
                        e.colorHex ?? (e.source === "google" ? c.dotGoogle : c.dotEvent),
                    },
                  ]}
                />
                <Text style={styles.summaryEventTitle} numberOfLines={1}>
                  {e.title}
                </Text>
                <Text style={styles.summaryEventTime}>
                  {e.allDay ? "종일" : formatTime(e.startAt)}
                </Text>
              </View>
            ))}
            {d.events.length > 3 ? (
              <Text style={styles.summaryMore}>외 {d.events.length - 3}개</Text>
            ) : null}
            {d.events.length === 0 ? (
              <Text style={styles.summaryMore}>일정 없음</Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={14} color={c.textMuted} />
        </TouchableOpacity>
      ))}
    </>
  );
}

// 날짜 셀 크기 (컨테이너 좌우 패딩 + 주차 바 제외)
const CELL_W = (Dimensions.get("window").width - spacing.sm * 2 - 30) / 7;
const CELL_H = 52;

/**
 * 기념일 외곽선: 사진 배경과 같은 둥근 네모 테두리.
 * 색이 여러 개면 테두리 둘레를 색깔별 구간(dash)으로 나눠 한 날짜에
 * 여러 기념일이 있어도 모두 보인다.
 */
function AnnivBorder({ colors }: { colors: string[] }) {
  const inset = 2;
  const sw = 2.5;
  const x = inset + sw / 2;
  const rw = CELL_W - x * 2;
  const rh = CELL_H - x * 2;
  const rr = Math.min(9, rw / 2, rh / 2);
  // 둥근 네모 둘레 근사값
  const perimeter = 2 * (rw + rh) - 8 * rr + 2 * Math.PI * rr;
  const seg = perimeter / colors.length;
  return (
    <Svg
      width={CELL_W}
      height={CELL_H}
      style={{ position: "absolute", top: 0, left: 0 }}
      pointerEvents="none"
    >
      {colors.map((color, i) => (
        <Rect
          key={i}
          x={x}
          y={x}
          width={rw}
          height={rh}
          rx={rr}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          {...(colors.length > 1
            ? {
                strokeDasharray: `${seg} ${perimeter - seg}`,
                strokeDashoffset: -(i * seg),
              }
            : {})}
        />
      ))}
    </Svg>
  );
}

/** 이번 주 한 줄 AI 요약 — 아코디언을 열 때 생성하고 AsyncStorage에 캐시한다 */
function WeekLine({
  weekStart,
  input,
  styles,
  c,
}: {
  weekStart: string;
  input: WeekLineInput;
  styles: ReturnType<typeof createStyles>;
  c: ThemeColors;
}) {
  const [line, setLine] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  // 내용이 바뀌면(개수 기준) 다시 생성
  const signature = `${input.events.length}-${input.taskDays}-${input.diaryDays}`;
  const cacheKey = `weekline.${weekStart}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(cacheKey);
        if (raw) {
          const cached = JSON.parse(raw) as { text: string; sig: string };
          if (cached.sig === signature) {
            if (!cancelled) setLine(cached.text);
            return;
          }
        }
        setLoading(true);
        const text = await generateWeekLine(input);
        await AsyncStorage.setItem(cacheKey, JSON.stringify({ text, sig: signature }));
        if (!cancelled) {
          setLine(text);
          setFailed(false);
        }
      } catch {
        if (!cancelled) {
          setLine(null);
          setFailed(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, signature]);

  if (!loading && !line && !failed) return null;
  return (
    <View style={styles.weekLineRow}>
      <Ionicons name="sparkles" size={12} color={c.primary} />
      {loading ? (
        <>
          <ActivityIndicator size="small" color={c.primary} />
          <Text style={styles.weekLineLoading}>이번 주 한 줄을 만드는 중…</Text>
        </>
      ) : failed ? (
        <Text style={styles.weekLineLoading}>
          한 줄 요약을 만들지 못했어요 — ai-helper 최신 배포·AI 키를 확인해 주세요
        </Text>
      ) : (
        <Text style={styles.weekLineText}>{line}</Text>
      )}
    </View>
  );
}

const WEEK_BAR_W = 30;

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { paddingHorizontal: spacing.sm },
    row: { flexDirection: "row", alignItems: "stretch" },
    weekBarSpacer: { width: WEEK_BAR_W },
    weekBar: {
      width: WEEK_BAR_W - 4,
      marginRight: 4,
      marginVertical: 3,
      borderRadius: 8,
      backgroundColor: c.surface,
      alignItems: "center",
      justifyContent: "center",
      gap: 1,
    },
    weekBarActive: { backgroundColor: c.primary },
    weekBarCurrent: { borderWidth: 1.5, borderColor: c.primary },
    weekLineRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    weekLineText: {
      flex: 1,
      fontSize: fontSizes.small,
      fontWeight: "700",
      color: c.text,
      lineHeight: 19,
    },
    weekLineLoading: { flex: 1, fontSize: fontSizes.caption, color: c.textMuted },
    weekBarText: { fontSize: 10, fontWeight: "800", color: c.textMuted },
    weekBarTextActive: { color: c.white },
    weekdayLabel: {
      fontSize: fontSizes.caption,
      color: c.textMuted,
      textAlign: "center",
      paddingVertical: 4,
    },
    dayCell: { flex: 1, alignItems: "center", paddingVertical: 5, minHeight: 52 },
    dayNumOuter: { width: 30, height: 30 },
    dayNumWrap: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
    },
    stickerBadge: {
      position: "absolute",
      top: -6,
      right: -8,
    },
    // 이미지 스티커: 셀 전체 배경 + 살짝 어둡게 → 날짜 텍스트 가독 확보
    bgWrap: {
      position: "absolute",
      top: 2,
      left: 2,
      right: 2,
      bottom: 2,
      borderRadius: 10,
      overflow: "hidden",
    },
    bgImage: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
    bgScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.22)" },
    dayNumOnImage: {
      color: "#FFFFFF",
      fontWeight: "800",
      textShadowColor: "rgba(0,0,0,0.7)",
      textShadowRadius: 3,
    },
    dotOnImage: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "rgba(255,255,255,0.8)",
    },
    todayWrap: { backgroundColor: c.primary },
    dayNum: { fontSize: fontSizes.body, color: c.text },
    dayNumMuted: { color: c.textMuted, opacity: 0.45 },
    todayText: { color: c.white, fontWeight: "800" },
    dotRow: { flexDirection: "row", gap: 3, marginTop: 3, height: 6 },
    dot: { width: 5, height: 5, borderRadius: 3 },
    accordion: {
      marginLeft: WEEK_BAR_W,
      marginRight: spacing.xs,
      marginBottom: spacing.sm,
      backgroundColor: c.card,
      borderRadius: radii.button,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: spacing.xs,
    },
    accordionEmpty: {
      color: c.textMuted,
      fontSize: fontSizes.small,
      paddingVertical: spacing.sm,
    },
    summaryDay: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.sm,
      gap: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    summaryDateCol: { width: 64 },
    summaryDate: { fontSize: fontSizes.small, fontWeight: "700", color: c.text },
    summaryBadges: { flexDirection: "row", gap: 3, marginTop: 2 },
    summaryEvents: { flex: 1, gap: 2 },
    summaryEventRow: { flexDirection: "row", alignItems: "center", gap: 5 },
    summaryEventDot: { width: 5, height: 5, borderRadius: 3 },
    summaryEventTitle: { flex: 1, fontSize: fontSizes.small, color: c.text },
    summaryEventTime: { fontSize: fontSizes.caption, color: c.textMuted },
    summaryMore: { fontSize: fontSizes.caption, color: c.textMuted },
  });
