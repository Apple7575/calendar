import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatKoreanDate } from "../lib/dateUtils";
import { searchAll, SearchResult, typeLabel } from "../lib/search";
import { RootStackParamList } from "../navigation/types";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { fontSizes, radii, spacing } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function SearchScreen() {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typeColors: Record<SearchResult["type"], string> = {
    event: c.dotEvent,
    task: c.dotTask,
    diary: c.dotDiary,
  };

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    try {
      setResults(await searchAll(q));
    } catch (e) {
      setError(e instanceof Error ? e.message : "검색에 실패했어요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>검색</Text>
      </View>
      <View style={styles.searchRow}>
        <View style={styles.inputWrap}>
          <Ionicons name="search" size={17} color={c.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="일정, 할 일, 일기 검색"
            placeholderTextColor={c.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <TouchableOpacity onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={17} color={c.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={loading}>
          <Text style={styles.searchButtonText}>검색</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.lg }} color={c.primary} />
      ) : (
        <FlatList
          data={results ?? []}
          keyExtractor={(r) => `${r.type}-${r.id}`}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons
                name={results !== null ? "file-tray-outline" : "sparkles-outline"}
                size={28}
                color={c.textMuted}
              />
              <Text style={styles.emptyText}>
                {results !== null
                  ? "검색 결과가 없어요."
                  : "지난 일정이나 일기를 찾아보세요."}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultRow}
              onPress={() => navigation.navigate("DayDetail", { date: item.date })}
            >
              <View style={[styles.typeBadge, { backgroundColor: typeColors[item.type] }]}>
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
      )}
    </SafeAreaView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    headerTitle: {
      fontSize: fontSizes.title,
      fontWeight: "900",
      color: c.text,
      letterSpacing: -0.5,
    },
    searchRow: {
      flexDirection: "row",
      paddingHorizontal: spacing.md,
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    inputWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: radii.button,
      paddingHorizontal: spacing.sm + 4,
      backgroundColor: c.inputBg,
    },
    input: {
      flex: 1,
      paddingVertical: spacing.sm + 2,
      fontSize: fontSizes.body,
      color: c.text,
    },
    searchButton: {
      backgroundColor: c.primary,
      borderRadius: radii.button,
      paddingHorizontal: spacing.md,
      justifyContent: "center",
    },
    searchButtonText: { color: c.white, fontSize: fontSizes.small, fontWeight: "700" },
    error: { color: c.danger, fontSize: fontSizes.small, paddingHorizontal: spacing.md },
    list: { padding: spacing.md, paddingTop: spacing.xs },
    emptyWrap: { alignItems: "center", marginTop: spacing.xl, gap: spacing.sm },
    emptyText: { color: c.textMuted, fontSize: fontSizes.small, textAlign: "center" },
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
  });
