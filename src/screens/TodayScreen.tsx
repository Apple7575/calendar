import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  LayoutAnimation,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BriefingCard } from "../components/BriefingCard";
import { DaySky } from "../components/cute/DaySky";
import { DayOverview } from "../components/DayOverview";
import { DdayRow } from "../components/DdayRow";
import { MemoriesRow } from "../components/MemoriesRow";
import { addDays, formatKoreanDate, todayKey } from "../lib/dateUtils";
import { tapLight } from "../lib/haptics";
import { updateWidget } from "../lib/widget";
import { RootStackParamList } from "../navigation/types";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { fontSizes, spacing } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function TodayScreen() {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const navigation = useNavigation<Nav>();
  const [dateKey, setDateKey] = useState(todayKey());
  const isToday = dateKey === todayKey();

  // 자정을 넘겨 다시 열었을 때 오늘 날짜 갱신 + 홈 위젯 데이터 갱신
  useFocusEffect(
    useCallback(() => {
      setDateKey(todayKey());
      void updateWidget();
    }, [])
  );

  // 좌우 스와이프로 이전날/다음날 이동
  const changeDay = (delta: number) => {
    tapLight();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDateKey((prev) => addDays(prev, delta));
  };
  const changeDayRef = useRef(changeDay);
  changeDayRef.current = changeDay;
  const swipe = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -40) changeDayRef.current(1);
        else if (g.dx > 40) changeDayRef.current(-1);
      },
    })
  ).current;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <DaySky size={26} />
          <Text style={styles.headerTitle}>{isToday ? "오늘" : "다른 날"}</Text>
          <Text style={styles.headerDate}>{formatKoreanDate(dateKey)}</Text>
        </View>
        {!isToday ? (
          <TouchableOpacity
            style={styles.todayChip}
            onPress={() => {
              tapLight();
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setDateKey(todayKey());
            }}
          >
            <Text style={styles.todayChipText}>오늘로</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={{ flex: 1 }} {...swipe.panHandlers}>
        <DdayRow todayKey={dateKey} />
        {isToday ? <BriefingCard dateKey={dateKey} /> : null}
        <MemoriesRow
          todayKey={dateKey}
          onPressMemory={(date) => navigation.navigate("DayDetail", { date })}
        />
        <DayOverview
          dateKey={dateKey}
          onEditEvent={(eventId) =>
            navigation.navigate("EventEdit", { date: dateKey, eventId })
          }
          onEditDiary={() => navigation.navigate("DiaryEdit", { date: dateKey })}
          onOpenPhotos={(photos, index) =>
            navigation.navigate("PhotoViewer", { photos, index })
          }
          onManageRoutines={() => navigation.navigate("Routines")}
        />
      </View>
    </SafeAreaView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.surface },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: c.surface,
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    headerTitle: {
      fontSize: fontSizes.title,
      fontWeight: "900",
      color: c.text,
      letterSpacing: -0.5,
    },
    headerDate: { fontSize: fontSizes.small, color: c.textMuted, marginLeft: spacing.sm },
    todayChip: {
      backgroundColor: c.primary,
      borderRadius: 999,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.xs + 2,
    },
    todayChipText: { color: c.white, fontSize: fontSizes.caption, fontWeight: "800" },
  });
