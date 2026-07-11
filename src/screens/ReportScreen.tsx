import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { InsightsView } from "../components/InsightsView";
import { PrimaryButton } from "../components/PrimaryButton";
import {
  generateReport,
  getCachedReport,
  periodLabel,
  ReportType,
} from "../lib/aiReports";
import { addDays, addMonths, formatKoreanDate, todayKey, weekStartOf } from "../lib/dateUtils";
import { GalleryPhoto, galleryPhotoToViewer, listLikedPhotos } from "../lib/gallery";
import { searchAll, SearchResult, typeLabel } from "../lib/search";
import { RootStackParamList } from "../navigation/types";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { fontSizes, radii, spacing } from "../theme/tokens";
import { GalleryScreen } from "./GalleryScreen";

type TabType = ReportType | "metrics" | "gallery";

const TYPES: { value: TabType; label: string }[] = [
  { value: "metrics", label: "지표" },
  { value: "daily", label: "하루" },
  { value: "weekly", label: "주간" },
  { value: "monthly", label: "월간" },
  { value: "yearly", label: "연간" },
  { value: "mood", label: "기분" },
  { value: "gallery", label: "사진첩" },
];

function defaultPeriod(type: ReportType): string {
  const today = todayKey();
  if (type === "daily") return today;
  if (type === "weekly") return weekStartOf(today);
  if (type === "monthly" || type === "mood") return today.slice(0, 7);
  return today.slice(0, 4);
}

function shiftPeriod(type: ReportType, periodKey: string, delta: number): string {
  if (type === "daily") return addDays(periodKey, delta);
  if (type === "weekly") return addDays(periodKey, delta * 7);
  if (type === "monthly" || type === "mood") return addMonths(periodKey, delta);
  return String(Number(periodKey) + delta);
}

/** '## 제목' 마크다운 소제목만 간단히 스타일링해 표시 */
function ReportBody({ content, styles }: { content: string; styles: Styles }) {
  const lines = content.split("\n");
  return (
    <View>
      {lines.map((line, i) => {
        if (line.startsWith("## ")) {
          return (
            <Text key={i} style={styles.reportHeading}>
              {line.slice(3)}
            </Text>
          );
        }
        if (line.trim() === "") return <View key={i} style={{ height: spacing.sm }} />;
        return (
          <Text key={i} style={styles.reportText}>
            {line}
          </Text>
        );
      })}
    </View>
  );
}

const REPORT_TYPES: ReportType[] = ["daily", "weekly", "monthly", "yearly", "mood"];
function isReportType(t: TabType): t is ReportType {
  return (REPORT_TYPES as TabType[]).includes(t);
}

export function ReportScreen() {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [type, setType] = useState<TabType>("metrics");
  const [periodKey, setPeriodKey] = useState(defaultPeriod("daily"));
  const [content, setContent] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [likedInMonth, setLikedInMonth] = useState<GalleryPhoto[]>([]);

  // 검색 (탭 최상단 검색창)
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const searchTypeColors: Record<SearchResult["type"], string> = {
    event: c.dotEvent,
    task: c.dotTask,
    diary: c.dotDiary,
  };
  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      setSearchResults(await searchAll(q));
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "검색에 실패했어요.");
    } finally {
      setSearching(false);
    }
  };
  const clearSearch = () => {
    setQuery("");
    setSearchResults(null);
  };

  // 월간 탭: 그 달의 ♥ 사진 하이라이트
  useEffect(() => {
    if (type !== "monthly") {
      setLikedInMonth([]);
      return;
    }
    let cancelled = false;
    listLikedPhotos()
      .then((all) => {
        if (!cancelled) setLikedInMonth(all.filter((p) => p.date.startsWith(periodKey)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [type, periodKey]);

  const changeType = (t: TabType) => {
    setType(t);
    if (isReportType(t)) setPeriodKey(defaultPeriod(t));
  };

  // 기간 변경 시 캐시된 리포트 확인
  const loadCached = useCallback(async () => {
    if (!isReportType(type)) return;
    setChecking(true);
    setContent(null);
    try {
      setContent(await getCachedReport(type, periodKey));
    } finally {
      setChecking(false);
    }
  }, [type, periodKey]);

  useEffect(() => {
    loadCached();
  }, [loadCached]);

  const handleGenerate = async (force: boolean) => {
    if (!isReportType(type)) return;
    setGenerating(true);
    try {
      setContent(await generateReport(type, periodKey, force));
    } catch (e) {
      Alert.alert("오류", e instanceof Error ? e.message : "리포트 생성에 실패했어요.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 검색창 */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={16} color={c.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="일정, 할 일, 일기 검색"
            placeholderTextColor={c.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <TouchableOpacity onPress={clearSearch} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={c.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {searchResults !== null ? (
        <FlatList
          data={searchResults}
          keyExtractor={(r) => `${r.type}-${r.id}`}
          contentContainerStyle={styles.searchList}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="file-tray-outline" size={28} color={c.textMuted} />
              <Text style={styles.emptyText}>검색 결과가 없어요.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultRow}
              onPress={() => navigation.navigate("DayDetail", { date: item.date })}
            >
              <View style={[styles.typeBadge, { backgroundColor: searchTypeColors[item.type] }]}>
                <Text style={styles.typeBadgeText}>{typeLabel(item.type)}</Text>
              </View>
              <View style={styles.resultBody}>
                <Text style={styles.resultTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                {item.snippet ? (
                  <Text style={styles.resultSnippet} numberOfLines={1}>
                    {item.snippet}
                  </Text>
                ) : null}
                <Text style={styles.resultDate}>{formatKoreanDate(item.date)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
            </TouchableOpacity>
          )}
        />
      ) : searching ? (
        <ActivityIndicator style={{ marginTop: spacing.lg }} color={c.primary} />
      ) : (
        <>
      {/* 종류 선택 */}
      <View style={styles.typeRow}>
        {TYPES.map((t) => (
          <TouchableOpacity
            key={t.value}
            style={[styles.typeChip, type === t.value && styles.typeChipActive]}
            onPress={() => changeType(t.value)}
          >
            <Text style={[styles.typeText, type === t.value && styles.typeTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {type === "metrics" ? (
        <View style={[styles.body, { paddingTop: spacing.md }]}>
          <InsightsView />
        </View>
      ) : type === "gallery" ? (
        <GalleryScreen />
      ) : (
        <>
      {/* 기간 이동 */}
      <View style={styles.periodRow}>
        <TouchableOpacity onPress={() => setPeriodKey(shiftPeriod(type, periodKey, -1))} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={c.primary} />
        </TouchableOpacity>
        <Text style={styles.periodText}>{periodLabel(type, periodKey)}</Text>
        <TouchableOpacity onPress={() => setPeriodKey(shiftPeriod(type, periodKey, 1))} hitSlop={8}>
          <Ionicons name="chevron-forward" size={20} color={c.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: spacing.xl }}>
        {type === "monthly" && likedInMonth.length > 0 ? (
          <View style={styles.likedBlock}>
            <View style={styles.likedHeader}>
              <Ionicons name="heart" size={13} color="#FF5A79" />
              <Text style={styles.likedTitle}>이달의 좋아요 {likedInMonth.length}장</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.likedRow}>
                {likedInMonth.map((p, i) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() =>
                      navigation.navigate("PhotoViewer", {
                        photos: likedInMonth.map(galleryPhotoToViewer),
                        index: i,
                      })
                    }
                  >
                    <Image source={{ uri: p.url }} style={styles.likedThumb} />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        ) : null}
        {checking ? (
          <ActivityIndicator style={{ marginTop: spacing.xl }} color={c.primary} />
        ) : generating ? (
          <View style={styles.generating}>
            <ActivityIndicator size="large" color={c.primary} />
            <Text style={styles.generatingText}>
              AI가 기록을 정리하는 중이에요…{"\n"}수십 초 정도 걸릴 수 있어요 ☕
            </Text>
          </View>
        ) : content ? (
          <View style={styles.reportCard}>
            <ReportBody content={content} styles={styles} />
            <View style={{ marginTop: spacing.lg }}>
              <PrimaryButton
                title="다시 생성"
                variant="secondary"
                onPress={() => handleGenerate(true)}
              />
            </View>
          </View>
        ) : (
          <View style={styles.emptyWrap}>
            <Ionicons name="sparkles-outline" size={36} color={c.textMuted} />
            <Text style={styles.emptyText}>
              {type === "mood"
                ? "최근 3개월의 기분 기록을 분석해서\n기분 흐름과 패턴을 알려드려요."
                : `이 기간의 일정, 할 일, 루틴, 일기${
                    type === "daily" ? ", 사진" : ""
                  }을 모아\nAI가 회고 리포트를 써드려요.`}
            </Text>
            <View style={{ alignSelf: "stretch" }}>
              <PrimaryButton title="리포트 생성" onPress={() => handleGenerate(false)} />
            </View>
          </View>
        )}
      </ScrollView>
        </>
      )}
      </>
      )}
    </View>
  );
}

type Styles = ReturnType<typeof createStyles>;

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.surface },
    searchRow: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xs },
    searchInputWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.button,
      paddingHorizontal: spacing.sm + 4,
      backgroundColor: c.inputBg,
    },
    searchInput: {
      flex: 1,
      paddingVertical: spacing.sm + 2,
      fontSize: fontSizes.body,
      color: c.text,
    },
    searchList: { padding: spacing.md, paddingTop: spacing.xs },
    resultRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.sm + 2,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    typeBadge: {
      borderRadius: radii.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      marginRight: spacing.sm,
    },
    typeBadgeText: { color: c.white, fontSize: fontSizes.caption, fontWeight: "700" },
    resultBody: { flex: 1 },
    resultTitle: { fontSize: fontSizes.body, color: c.text, fontWeight: "600" },
    resultSnippet: { fontSize: fontSizes.small, color: c.textMuted, marginTop: 2 },
    resultDate: { fontSize: fontSizes.caption, color: c.textMuted, marginTop: 2 },
    typeRow: {
      flexDirection: "row",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
    },
    typeChip: {
      flex: 1,
      alignItems: "center",
      paddingVertical: spacing.sm,
      paddingHorizontal: 2,
      borderRadius: radii.pill,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    typeChipActive: { backgroundColor: c.primary, borderColor: c.primary },
    typeText: { fontSize: fontSizes.small, fontWeight: "700", color: c.textMuted },
    typeTextActive: { color: c.white },
    periodRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.md,
      paddingVertical: spacing.md,
    },
    periodText: {
      fontSize: fontSizes.emphasis,
      fontWeight: "800",
      color: c.text,
      minWidth: 140,
      textAlign: "center",
    },
    body: { flex: 1, paddingHorizontal: spacing.md },
    generating: { alignItems: "center", marginTop: spacing.xl, gap: spacing.md },
    generatingText: {
      color: c.textMuted,
      fontSize: fontSizes.small,
      textAlign: "center",
      lineHeight: 20,
    },
    emptyWrap: { alignItems: "center", marginTop: spacing.xl, gap: spacing.md },
    emptyText: {
      color: c.textMuted,
      fontSize: fontSizes.small,
      textAlign: "center",
      lineHeight: 20,
    },
    reportCard: {
      backgroundColor: c.card,
      borderRadius: radii.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: spacing.md + 2,
    },
    reportHeading: {
      fontSize: fontSizes.emphasis,
      fontWeight: "800",
      color: c.primary,
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    reportText: { fontSize: fontSizes.body, color: c.text, lineHeight: 25 },
    likedBlock: { marginBottom: spacing.md },
    likedHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      marginBottom: spacing.sm,
    },
    likedTitle: { fontSize: fontSizes.small, fontWeight: "800", color: c.text },
    likedRow: { flexDirection: "row", gap: spacing.sm },
    likedThumb: {
      width: 84,
      height: 84,
      borderRadius: radii.button,
      backgroundColor: c.card,
    },
  });
