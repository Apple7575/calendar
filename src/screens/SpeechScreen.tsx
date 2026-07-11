// 스피치 · 대화 가이드: 1:1 대화, 여럿이 대화, 발표, 대화 주제 등 정리된 팁 모음.
// 섹션을 누르면 펼쳐지는 아코디언.

import { CaretDown } from "phosphor-react-native/src/icons/CaretDown";
import { CaretUp } from "phosphor-react-native/src/icons/CaretUp";
import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "../theme/ThemeContext";
import { ThemeColors } from "../theme/themes";
import { cardShadow, fontSizes, radii, spacing } from "../theme/tokens";

type Section = { id: string; emoji: string; title: string; tips: string[] };

const SECTIONS: Section[] = [
  {
    id: "one",
    emoji: "☕",
    title: "1:1 대화 잘하기",
    tips: [
      "말하기 3 : 듣기 7 — 잘 듣는 사람이 대화 잘하는 사람으로 기억돼요.",
      "상대의 마지막 문장에서 단어 하나를 집어 되물어보세요. \"부산 다녀왔어\" → \"부산 어디가 제일 좋았어?\"",
      "닫힌 질문(네/아니오)보다 열린 질문: \"재밌었어?\" 대신 \"뭐가 제일 기억에 남아?\"",
      "고민을 들으면 해결책부터 주지 말고 먼저 공감: \"그건 진짜 힘들었겠다\" 한마디가 조언 열 개보다 나아요.",
      "침묵이 2~3초 흘러도 괜찮아요. 조급하게 채우려다 아무 말이나 하는 게 더 어색해요.",
      "만났을 때 지난 대화 내용을 기억해서 물어보면(\"저번에 말한 시험 어떻게 됐어?\") 호감이 확 올라가요.",
    ],
  },
  {
    id: "group",
    emoji: "👥",
    title: "여럿이 있을 때 (1:다)",
    tips: [
      "모두를 웃기려 하지 말고, 말수 적은 한 사람에게 질문을 넘겨보세요. 판을 살리는 사람이 돼요.",
      "대화에 끼어들 때는 앞사람 말을 받아서: \"방금 그 얘기 들으니까 생각난 건데…\"",
      "리액션이 절반이에요 — 고개 끄덕임, \"진짜?\", \"헐 그래서?\"만 잘해도 대화 멤버가 돼요.",
      "내 이야기는 1~2분 안에 끊고 공을 넘기세요. 긴 독백은 모임에서 가장 빨리 지루해져요.",
      "누군가 말이 끊겼으면 \"아까 하려던 얘기 뭐였어?\"라고 다시 열어주세요. 다들 그 배려를 기억해요.",
    ],
  },
  {
    id: "presentation",
    emoji: "🎤",
    title: "발표 잘하기",
    tips: [
      "첫 30초를 외우세요. 시작이 매끄러우면 긴장이 절반으로 줄어요.",
      "슬라이드는 '내가 말할 내용의 배경화면'이지 대본이 아니에요. 글자를 읽지 마세요.",
      "한 슬라이드 = 한 메시지. 청중은 두 가지를 동시에 기억하지 못해요.",
      "'말이 빨라지면 긴장한 것' — 문장이 끝날 때마다 의식적으로 한 박자 쉬세요. 그 침묵이 여유로 보여요.",
      "질문이 두려우면 예상 질문 3개를 미리 적어 답을 준비하세요. 모르는 질문엔 \"좋은 질문인데, 확인해서 알려드릴게요\"가 정답이에요.",
      "연습은 소리 내서, 서서, 시간 재면서. 눈으로 읽는 연습 10번보다 입으로 1번이 나아요.",
    ],
  },
  {
    id: "topics",
    emoji: "💬",
    title: "대화 주제 서랍",
    tips: [
      "최근에 본 것: \"요즘 본 것 중 제일 재밌었던 거 뭐야?\" (영상/드라마/책 뭐든)",
      "음식: \"요즘 꽂힌 음식 있어?\", \"인생 맛집 하나만 꼽으면?\"",
      "여행: \"돈·시간 무제한이면 어디 갈래?\", \"지금까지 최고의 여행지는?\"",
      "가정법: \"로또 되면 제일 먼저 뭐 할 거야?\", \"하루만 다른 직업 가질 수 있다면?\"",
      "취향: \"아침형이야 저녁형이야?\", \"주말에 뭐 할 때 제일 행복해?\"",
      "근황 심화: \"요즘 제일 큰 고민이 뭐야?\" (친해진 사이에서 — 대화가 깊어져요)",
      "상대 전문 분야: \"그 일 하면서 제일 뿌듯할 때가 언제야?\" — 누구나 자기 이야기엔 열려요.",
    ],
  },
  {
    id: "listening",
    emoji: "👂",
    title: "경청과 리액션",
    tips: [
      "스마트폰을 뒤집어 두세요. 시선이 화면에 가는 순간 대화의 온도가 떨어져요.",
      "요약 되돌려주기: \"그러니까 ~했다는 거지?\" — 제대로 듣고 있다는 최고의 신호예요.",
      "감정 이름 붙여주기: \"그거 좀 억울했겠다\", \"설렜겠는데?\"",
      "조언은 물어볼 때만: \"내 생각 말해도 돼?\"라고 허락을 먼저 구하면 훨씬 잘 받아들여져요.",
      "표정도 대답이에요 — 놀랄 땐 눈을 크게, 재밌을 땐 소리 내서 웃기. 무표정 경청은 안 듣는 것처럼 보여요.",
    ],
  },
  {
    id: "icebreak",
    emoji: "🧊",
    title: "어색함 깨기",
    tips: [
      "지금 이 공간에서 소재 찾기: 날씨, 장소, 음식, 오늘의 상황 — \"여기 처음 와봤는데 분위기 좋네요\"",
      "가벼운 도움 요청: \"이 메뉴 뭐가 맛있어요?\" — 사람은 도움을 주면 상대에게 호감이 생겨요.",
      "칭찬은 물건보다 선택을: \"그 가방 예쁘다\"보다 \"그 색 고른 센스 좋다\"가 대화로 이어져요.",
      "자기 개방을 먼저 조금: \"저 사실 이런 자리 좀 어색해하는 편이에요\" — 상대도 긴장을 풀어요.",
      "이름을 불러주세요. 이름을 기억해주는 것만으로 관계의 시작이 달라져요.",
    ],
  },
];

export function SpeechScreen() {
  const { colors: c } = useTheme();
  const styles = useMemo(() => createStyles(c), [c]);
  const [open, setOpen] = useState<string | null>("one");

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        대화와 스피치는 재능이 아니라 기술이에요. 한 번에 하나씩만 써먹어 보세요.
      </Text>
      {SECTIONS.map((s) => {
        const expanded = open === s.id;
        return (
          <View key={s.id} style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() => setOpen(expanded ? null : s.id)}
            >
              <Text style={styles.cardEmoji}>{s.emoji}</Text>
              <Text style={styles.cardTitle}>{s.title}</Text>
              {expanded ? (
                <CaretUp size={16} color={c.textMuted} />
              ) : (
                <CaretDown size={16} color={c.textMuted} />
              )}
            </TouchableOpacity>
            {expanded
              ? s.tips.map((tip, i) => (
                  <View key={i} style={styles.tipRow}>
                    <Text style={styles.tipBullet}>{i + 1}</Text>
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))
              : null}
          </View>
        );
      })}
      <Text style={styles.footer}>
        연습한 대화를 일기에 기록해 보세요 — 갓생 코칭이 성장을 짚어줄 거예요.
      </Text>
    </ScrollView>
  );
}

const createStyles = (c: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    content: { padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.sm },
    intro: {
      fontSize: fontSizes.small,
      color: c.textMuted,
      lineHeight: 20,
      marginBottom: spacing.xs,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: radii.card,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      padding: spacing.md,
      ...cardShadow(c.shadow),
    },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    cardEmoji: { fontSize: 18 },
    cardTitle: { flex: 1, fontSize: fontSizes.body, fontWeight: "800", color: c.text },
    tipRow: {
      flexDirection: "row",
      gap: spacing.sm,
      marginTop: spacing.sm + 2,
      paddingRight: spacing.xs,
    },
    tipBullet: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: c.primarySoft,
      color: c.primary,
      fontSize: fontSizes.caption,
      fontWeight: "800",
      textAlign: "center",
      lineHeight: 20,
      overflow: "hidden",
    },
    tipText: { flex: 1, fontSize: fontSizes.small, color: c.text, lineHeight: 21 },
    footer: {
      fontSize: fontSizes.caption,
      color: c.textMuted,
      textAlign: "center",
      marginTop: spacing.sm,
    },
  });
