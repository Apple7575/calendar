import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BriefingCard } from "../components/BriefingCard";
import { DaySky } from "../components/cute/DaySky";
import { DayOverview } from "../components/DayOverview";
import { DdayRow } from "../components/DdayRow";
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
          <DaySky size={26} />
          <Text style={styles.headerTitle}>오늘</Text>
          <Text style={styles.headerDate}>{formatKoreanDate(dateKey)}</Text>
        </View>
      </View>
      <DdayRow todayKey={dateKey} />
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
        onOpenPhotos={(photos, index) =>
          navigation.navigate("PhotoViewer", { photos, index })
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
    headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    headerTitle: {
      fontSize: fontSizes.title,
      fontWeight: "900",
      color: c.text,
      letterSpacing: -0.5,
    },
    headerDate: { fontSize: fontSizes.small, color: c.textMuted, marginLeft: spacing.sm },
  });
