import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useState } from "react";
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
import { colors, fontSizes, radii, spacing } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const TYPE_COLORS: Record<SearchResult["type"], string> = {
  event: colors.dotEvent,
  task: colors.dotTask,
  diary: colors.dotDiary,
};

export function SearchScreen() {
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <TextInput
          style={styles.input}
          placeholder="일정, 할 일, 일기 검색"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={loading}>
          <Text style={styles.searchButtonText}>검색</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.primary} />
      ) : (
        <FlatList
          data={results ?? []}
          keyExtractor={(r) => `${r.type}-${r.id}`}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            results !== null ? (
              <Text style={styles.emptyText}>검색 결과가 없어요.</Text>
            ) : (
              <Text style={styles.emptyText}>지난 일정이나 일기를 찾아보세요.</Text>
            )
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultRow}
              onPress={() => navigation.navigate("DayDetail", { date: item.date })}
            >
              <View style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[item.type] }]}>
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
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  headerTitle: { fontSize: fontSizes.title, fontWeight: "800", color: colors.text },
  searchRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.button,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSizes.body,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  searchButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.button,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  },
  searchButtonText: { color: colors.white, fontSize: fontSizes.small, fontWeight: "700" },
  error: { color: colors.danger, fontSize: fontSizes.small, paddingHorizontal: spacing.md },
  list: { padding: spacing.md, paddingTop: spacing.xs },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSizes.small,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  typeBadge: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    marginRight: spacing.sm,
    marginTop: 2,
  },
  typeBadgeText: { color: colors.white, fontSize: fontSizes.caption, fontWeight: "700" },
  resultBody: { flex: 1 },
  resultTitle: { fontSize: fontSizes.body, color: colors.text, fontWeight: "600" },
  resultSnippet: { fontSize: fontSizes.small, color: colors.textMuted, marginTop: 2 },
  resultDate: { fontSize: fontSizes.caption, color: colors.textMuted, marginTop: 2 },
});
