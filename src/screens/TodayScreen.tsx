import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BriefingCard } from "../components/BriefingCard";
import { DayOverview } from "../components/DayOverview";
import { MemoriesRow } from "../components/MemoriesRow";
import { formatKoreanDate, todayKey } from "../lib/dateUtils";
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

  // 자정을 넘겨 다시 열었을 때 오늘 날짜 갱신 + 홈 위젯 데이터 갱신
  useFocusEffect(
    useCallback(() => {
      setDateKey(todayKey());
      void updateWidget();
    }, [])
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>오늘</Text>
          <Text style={styles.headerDate}>{formatKoreanDate(dateKey)}</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => navigation.navigate("Gallery")} hitSlop={8}>
            <Ionicons name="images-outline" size={20} color={c.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.aiButton}
            onPress={() => navigation.navigate("Reports")}
            hitSlop={8}
          >
            <Ionicons name="sparkles" size={14} color={c.primary} />
            <Text style={styles.aiButtonText}>AI 리포트</Text>
          </TouchableOpacity>
        </View>
      </View>
      <BriefingCard dateKey={dateKey} />
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
        onOpenPhotos={(urls, index) =>
          navigation.navigate("PhotoViewer", { urls, index })
        }
        onManageRoutines={() => navigation.navigate("Routines")}
      />
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
    headerLeft: { flexDirection: "row", alignItems: "baseline" },
    headerTitle: {
      fontSize: fontSizes.title,
      fontWeight: "900",
      color: c.text,
      letterSpacing: -0.5,
    },
    headerDate: { fontSize: fontSizes.small, color: c.textMuted, marginLeft: spacing.sm },
    headerButtons: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 4 },
    aiButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: c.primarySoft,
      borderRadius: 999,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.xs + 2,
    },
    aiButtonText: { color: c.primary, fontSize: fontSizes.caption, fontWeight: "700" },
  });
