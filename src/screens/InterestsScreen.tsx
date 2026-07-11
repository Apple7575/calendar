// 관심사 탭: 지금 관심 있는 주제별 모듈을 카드로 보여준다.
// 카드는 숨기고 다시 보이게 할 수 있다 (AsyncStorage에 숨김 목록 저장).
// 새로운 관심사(예: 미래 목표)가 생기면 이 등록부에 화면을 추가해서 늘려간다.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BookOpenText } from "phosphor-react-native/src/icons/BookOpenText";
import { ChatCircleDots } from "phosphor-react-native/src/icons/ChatCircleDots";
import { Gear } from "phosphor-react-native/src/icons/Gear";
import { MapPin } from "phosphor-react-native/src/icons/MapPin";
import { PathIcon } from "phosphor-react-native/src/icons/Path";
import { Target } from "phosphor-react-native/src/icons/Target";
import { XCircle } from "phosphor-react-native/src/icons/XCircle";
import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RootStackParamList } from "../navigation/types";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { cardShadow, fontSizes, radii, spacing } from "../theme/tokens";

const HIDDEN_KEY = "interests.hidden";

type ModuleScreen = "Expressions" | "MemoryMap" | "Goals" | "Timeline" | "Speech";

type ModuleDef = {
  id: string;
  title: string;
  desc: string;
  icon: typeof BookOpenText;
  screen: ModuleScreen;
};

const MODULES: ModuleDef[] = [
  {
    id: "goals",
    title: "목표 · 갓생",
    desc: "직장·꿈·돈·집… 방면별 목표와 AI 갓생 코칭",
    icon: Target,
    screen: "Goals",
  },
  {
    id: "expressions",
    title: "표현 카드",
    desc: "내 일기에서 뽑은 영어·일본어 표현 모음",
    icon: BookOpenText,
    screen: "Expressions",
  },
  {
    id: "memoryMap",
    title: "추억 지도",
    desc: "사진을 찍은 장소들을 모아봐요",
    icon: MapPin,
    screen: "MemoryMap",
  },
  {
    id: "timeline",
    title: "인생 타임라인",
    desc: "입학·취업·이사… 인생의 큰 순간들을 연도별로",
    icon: PathIcon,
    screen: "Timeline",
  },
  {
    id: "speech",
    title: "스피치 · 대화",
    desc: "1:1 대화, 모임, 발표, 대화 주제까지 실전 팁",
    icon: ChatCircleDots,
    screen: "Speech",
  },
];

export function InterestsScreen() {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(HIDDEN_KEY)
        .then((raw) => setHidden(new Set(raw ? (JSON.parse(raw) as string[]) : [])))
        .catch(() => {});
    }, [])
  );

  const persist = async (next: Set<string>) => {
    setHidden(next);
    await AsyncStorage.setItem(HIDDEN_KEY, JSON.stringify([...next]));
  };

  const hide = (id: string) => persist(new Set([...hidden, id]));
  const show = (id: string) => {
    const next = new Set(hidden);
    next.delete(id);
    persist(next);
  };

  const visible = MODULES.filter((m) => !hidden.has(m.id));
  const hiddenModules = MODULES.filter((m) => hidden.has(m.id));

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>관심사</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Settings")} hitSlop={8}>
          <Gear size={22} color={c.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {visible.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={styles.card}
            onPress={() => navigation.navigate(m.screen)}
            activeOpacity={0.8}
          >
            <View style={styles.cardIcon}>
              <m.icon size={22} weight="duotone" color={c.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{m.title}</Text>
              <Text style={styles.cardDesc}>{m.desc}</Text>
            </View>
            <TouchableOpacity onPress={() => hide(m.id)} hitSlop={8}>
              <XCircle size={18} color={c.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        {visible.length === 0 ? (
          <Text style={styles.emptyText}>
            전부 숨겼어요. 아래에서 다시 보이게 할 수 있어요.
          </Text>
        ) : null}

        {hiddenModules.length > 0 ? (
          <>
            <Text style={styles.hiddenLabel}>숨긴 관심사</Text>
            <View style={styles.hiddenRow}>
              {hiddenModules.map((m) => (
                <TouchableOpacity key={m.id} style={styles.hiddenChip} onPress={() => show(m.id)}>
                  <Text style={styles.hiddenChipText}>+ {m.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.hint}>
          앞으로 관심 있는 주제가 생기면 여기에 새 카드를 추가해 갈 수 있어요.
        </Text>
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
    },
    headerTitle: {
      fontSize: fontSizes.title,
      fontWeight: "900",
      color: c.text,
      letterSpacing: -0.5,
    },
    body: { padding: spacing.md, gap: spacing.sm },
    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm + 2,
      backgroundColor: c.card,
      borderRadius: radii.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: spacing.md,
      ...cardShadow(c.shadow),
    },
    cardIcon: {
      width: 42,
      height: 42,
      borderRadius: radii.button,
      backgroundColor: c.primarySoft,
      alignItems: "center",
      justifyContent: "center",
    },
    cardTitle: { fontSize: fontSizes.body, fontWeight: "800", color: c.text },
    cardDesc: { fontSize: fontSizes.caption, color: c.textMuted, marginTop: 2 },
    emptyText: {
      textAlign: "center",
      color: c.textMuted,
      fontSize: fontSizes.small,
      marginTop: spacing.lg,
    },
    hiddenLabel: {
      fontSize: fontSizes.caption,
      color: c.textMuted,
      fontWeight: "700",
      marginTop: spacing.md,
    },
    hiddenRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    hiddenChip: {
      backgroundColor: c.surface,
      borderRadius: 999,
      paddingHorizontal: spacing.sm + 4,
      paddingVertical: spacing.xs + 2,
    },
    hiddenChipText: { fontSize: fontSizes.caption, color: c.textMuted, fontWeight: "700" },
    hint: {
      fontSize: fontSizes.caption,
      color: c.textMuted,
      textAlign: "center",
      marginTop: spacing.lg,
      lineHeight: 18,
    },
  });
