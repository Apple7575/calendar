// 일기 듣기 · 쉐도잉 플레이어.
// 문장 단위로 재생하며 현재 문장(과 단어)을 하이라이트한다.
// - 배속: 0.75x ~ 1.5x
// - 문장 앞/뒤 이동, 문장 탭 → 거기부터 재생
// - 구간: 문장을 길게 눌러 시작/끝을 정하면 그 구간만 (반복) 재생
// - 쉐도잉: 문장을 읽은 뒤 같은 길이만큼 쉬어서 따라 말할 시간을 준다

import * as Speech from "expo-speech";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { detectTtsLang, splitSentences, TTS_LOCALES } from "../lib/tts";
import { RootScreenProps } from "../navigation/types";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { cardShadow, fontSizes, radii, spacing } from "../theme/tokens";
import {Mascot,Copy,Link} from '../features/routine/ui';
import {SafeAreaView} from 'react-native-safe-area-context';

const RATES = [0.75, 1.0, 1.25, 1.5] as const;

type Boundary = { start: number; end: number } | null;

export function DiaryListenScreen({ route,navigation }: RootScreenProps<"DiaryListen">) {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const { text } = route.params;
  const sentences = useMemo(() => splitSentences(text), [text]);

  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rateIdx, setRateIdx] = useState(1); // 1.0x
  const [shadowing, setShadowing] = useState(false);
  const [loop, setLoop] = useState(false);
  const [range, setRange] = useState<{ start: number; end: number } | null>(null);
  const [boundary, setBoundary] = useState<Boundary>(null);

  // 재생 콜백은 비동기로 돌아오므로 최신 설정을 ref로 본다
  const stateRef = useRef({ playing, rateIdx, shadowing, loop, range });
  stateRef.current = { playing, rateIdx, shadowing, loop, range };
  const sessionRef = useRef(0); // 재생 세션 토큰 (이전 재생의 콜백 무시용)
  const shadowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const sentenceY = useRef<number[]>([]);

  const stopAll = () => {
    sessionRef.current += 1;
    if (shadowTimer.current) clearTimeout(shadowTimer.current);
    Speech.stop();
    setPlaying(false);
    setBoundary(null);
  };

  // 화면을 떠나면 정지
  useEffect(() => stopAll, []);

  const rangeStart = range?.start ?? 0;
  const rangeEnd = range?.end ?? sentences.length - 1;

  const speakSentence = (i: number, session: number) => {
    const sentence = sentences[i];
    setCur(i);
    setBoundary(null);
    // 현재 문장이 보이게 스크롤
    const y = sentenceY.current[i];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 140), animated: true });

    const startedAt = Date.now();
    Speech.speak(sentence, {
      language: TTS_LOCALES[detectTtsLang(sentence)],
      rate: RATES[stateRef.current.rateIdx],
      onBoundary: (ev: { charIndex: number; charLength: number }) => {
        if (session !== sessionRef.current) return;
        if (ev.charLength > 0)
          setBoundary({ start: ev.charIndex, end: ev.charIndex + ev.charLength });
      },
      onDone: () => {
        if (session !== sessionRef.current) return;
        setBoundary(null);
        const advance = () => {
          if (session !== sessionRef.current) return;
          const { loop: l, range: r } = stateRef.current;
          const end = r?.end ?? sentences.length - 1;
          const start = r?.start ?? 0;
          if (i < end) speakSentence(i + 1, session);
          else if (l) speakSentence(start, session);
          else {
            setPlaying(false);
            setCur(start);
          }
        };
        if (stateRef.current.shadowing) {
          // 방금 문장을 읽은 시간만큼 쉬면서 따라 말할 틈을 준다
          const gap = Math.max(900, Date.now() - startedAt);
          shadowTimer.current = setTimeout(advance, gap);
        } else {
          advance();
        }
      },
      onError: () => {
        if (session !== sessionRef.current) return;
        setPlaying(false);
      },
    });
  };

  const playFrom = (i: number) => {
    stopAll();
    const clamped = Math.min(Math.max(i, rangeStart), rangeEnd);
    const session = sessionRef.current;
    setPlaying(true);
    speakSentence(clamped, session);
  };

  const togglePlay = () => {
    if (playing) stopAll();
    else playFrom(cur);
  };

  /** 배속 변경 — 재생 중이면 현재 문장부터 새 배속으로 */
  const cycleRate = () => {
    const next = (rateIdx + 1) % RATES.length;
    setRateIdx(next);
    stateRef.current.rateIdx = next;
    if (playing) playFrom(cur);
  };

  const sentenceMenu = (i: number) => {
    Alert.alert(`문장 ${i + 1}`, sentences[i], [
      {
        text: "⏩ 여기부터 구간 시작",
        onPress: () => {
          const end = range && range.end >= i ? range.end : sentences.length - 1;
          setRange({ start: i, end });
        },
      },
      {
        text: "⏸ 여기까지 구간 끝",
        onPress: () => {
          const start = range && range.start <= i ? range.start : 0;
          setRange({ start, end: i });
        },
      },
      ...(range
        ? [{ text: "구간 해제", onPress: () => setRange(null) }]
        : []),
      { text: "취소", style: "cancel" as const },
    ]);
  };

  if (sentences.length === 0) {
    return (
      <View style={[styles.container, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={styles.hint}>읽을 내용이 없어요.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top','bottom']}>
      <View style={{paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}}><Copy weight="700">일기 듣기</Copy><Link label="닫기" onPress={()=>navigation.goBack()}/></View>
      <View style={{padding:18,flexDirection:'row',gap:14,alignItems:'center',backgroundColor:c.primarySoft}}><Mascot size={60} action="A40"/><View style={{flex:1}}><Text style={{fontSize:20,fontWeight:'800',color:c.text}}>내 하루로 배우는 일본어</Text><Text style={{fontSize:12,color:c.textMuted,lineHeight:18}}>문장을 눌러 듣고, 반복과 따라 말하기를 골라요. 발음 채점 기능은 없어요.</Text></View></View>
      {route.params.original?<View style={{paddingHorizontal:18,paddingVertical:10}}><Text style={{fontSize:11,color:c.textMuted}}>한국어 원문 · 아래는 일본어로 들을 문장이에요.</Text><Text numberOfLines={3} style={{fontSize:13,lineHeight:20,color:c.textMuted}}>{route.params.original}</Text></View>:null}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.hint}>
          문장을 누르면 거기부터 재생돼요. 길게 누르면 구간(여기부터~여기까지)을 정할 수 있어요.
        </Text>
        {sentences.map((s, i) => {
          const isCur = i === cur;
          const inRange = i >= rangeStart && i <= rangeEnd;
          return (
            <TouchableOpacity
              key={i}
              onLayout={(e) => {
                sentenceY.current[i] = e.nativeEvent.layout.y;
              }}
              style={[
                styles.sentence,
                isCur && styles.sentenceCurrent,
                !inRange && styles.sentenceOutside,
              ]}
              onPress={() => playFrom(i)}
              onLongPress={() => sentenceMenu(i)}
              activeOpacity={0.7}
            >
              {range && i === rangeStart ? (
                <Text style={styles.rangeMark}>구간 시작</Text>
              ) : null}
              {isCur && playing && boundary ? (
                <Text style={[styles.sentenceText, styles.sentenceTextCurrent]} selectable>
                  {s.slice(0, boundary.start)}
                  <Text style={styles.word}>{s.slice(boundary.start, boundary.end)}</Text>
                  {s.slice(boundary.end)}
                </Text>
              ) : (
                <Text
                  style={[styles.sentenceText, isCur && styles.sentenceTextCurrent]}
                  selectable
                >
                  {s}
                </Text>
              )}
              {range && i === rangeEnd ? (
                <Text style={styles.rangeMark}>구간 끝</Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 컨트롤 바 */}
      <View style={styles.controls}>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleChip, shadowing && styles.toggleChipActive]}
            onPress={() => setShadowing((v) => !v)}
          >
            <Text style={[styles.toggleText, shadowing && styles.toggleTextActive]}>
              🎧 쉐도잉
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleChip, loop && styles.toggleChipActive]}
            onPress={() => setLoop((v) => !v)}
          >
            <Text style={[styles.toggleText, loop && styles.toggleTextActive]}>🔁 반복</Text>
          </TouchableOpacity>
          {range ? (
            <TouchableOpacity style={styles.toggleChip} onPress={() => setRange(null)}>
              <Text style={styles.toggleText}>
                구간 {rangeStart + 1}–{rangeEnd + 1} ✕
              </Text>
            </TouchableOpacity>
          ) : null}
          <Text style={styles.progress}>
            {cur + 1} / {sentences.length}
          </Text>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.rateButton} onPress={cycleRate}>
            <Text style={styles.rateText}>{RATES[rateIdx]}x</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => playFrom(cur - 1)}
            hitSlop={6}
          >
            <Ionicons name="play-back" size={22} color={c.text} />
            <Text style={styles.skipLabel}>이전 문장</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.playButton} onPress={togglePlay}>
            <Ionicons name={playing ? "pause" : "play"} size={28} color={c.white} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => playFrom(cur + 1)}
            hitSlop={6}
          >
            <Ionicons name="play-forward" size={22} color={c.text} />
            <Text style={styles.skipLabel}>다음 문장</Text>
          </TouchableOpacity>
          {/* 배속 버튼과 좌우 균형 맞춤 */}
          <View style={styles.rateButtonGhost} />
        </View>
        {shadowing ? (
          <Text style={styles.shadowHint}>문장을 읽은 뒤 같은 길이만큼 쉬어요 — 따라 말해보세요</Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    body: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.xs },
    hint: {
      fontSize: fontSizes.caption,
      color: c.textMuted,
      lineHeight: 18,
      marginBottom: spacing.sm,
    },
    sentence: {
      borderRadius: radii.button,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: spacing.sm,
    },
    sentenceCurrent: { backgroundColor: c.primarySoft },
    sentenceOutside: { opacity: 0.35 },
    sentenceText: { fontSize: fontSizes.body, color: c.text, lineHeight: 26 },
    sentenceTextCurrent: { fontWeight: "600" },
    word: {
      backgroundColor: c.primary,
      color: c.white,
      fontWeight: "800",
      borderRadius: 4,
    },
    rangeMark: {
      fontSize: fontSizes.caption,
      fontWeight: "800",
      color: c.primary,
      marginBottom: 2,
    },
    controls: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      backgroundColor: c.card,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.lg,
      gap: spacing.sm,
      ...cardShadow(c.shadow),
    },
    toggleRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs + 2 },
    toggleChip: {
      backgroundColor: c.surface,
      borderRadius: 999,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: spacing.xs + 2,
    },
    toggleChipActive: { backgroundColor: c.primary },
    toggleText: { fontSize: fontSizes.caption, fontWeight: "700", color: c.textMuted },
    toggleTextActive: { color: c.white },
    progress: {
      marginLeft: "auto",
      fontSize: fontSizes.caption,
      fontWeight: "700",
      color: c.textMuted,
    },
    buttonRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.md,
    },
    playButton: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    skipButton: { alignItems: "center", gap: 2, width: 56 },
    skipLabel: { fontSize: 10, color: c.textMuted, fontWeight: "700" },
    rateButton: {
      width: 48,
      paddingVertical: spacing.xs + 2,
      borderRadius: 999,
      backgroundColor: c.surface,
      alignItems: "center",
    },
    rateText: { fontSize: fontSizes.small, fontWeight: "800", color: c.primary },
    rateButtonGhost: { width: 48 },
    shadowHint: { textAlign: "center", fontSize: fontSizes.caption, color: c.textMuted },
  });
