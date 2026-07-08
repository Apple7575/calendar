import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DayOverview } from "../components/DayOverview";
import { MemoriesRow } from "../components/MemoriesRow";
import { formatKoreanDate, todayKey } from "../lib/dateUtils";
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

  // 자정을 넘겨 다시 열었을 때 오늘 날짜 갱신
  useFocusEffect(
    useCallback(() => {
      setDateKey(todayKey());
    }, [])
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>오늘</Text>
        <Text style={styles.headerDate}>{formatKoreanDate(dateKey)}</Text>
      </View>
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
      />
    </SafeAreaView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.surface },
    header: {
      flexDirection: "row",
      alignItems: "baseline",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: c.surface,
    },
    headerTitle: {
      fontSize: fontSizes.title,
      fontWeight: "900",
      color: c.text,
      letterSpacing: -0.5,
    },
    headerDate: { fontSize: fontSizes.small, color: c.textMuted, marginLeft: spacing.sm },
  });
