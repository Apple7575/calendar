import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useThemeControls } from "../../theme/ThemeContext";
import { BoriMascot } from "./BoriMascot";
import { BoriStage, BoriState, boriStageLabels } from "./boriAssets";
import { Action, CardView, Copy, Link, u } from "./ui";

const states: { value: BoriState; title: string; description: string }[] = [
  { value: "blink", title: "기본", description: "가만히 숨 쉬고 눈을 깜빡여요. 보리를 눌러보세요." },
  { value: "tap", title: "터치", description: "통통 튄 뒤 기본 동작으로 돌아와요." },
  { value: "success", title: "완료", description: "실천을 마쳤을 때 한 번 기뻐하고 돌아와요." },
  { value: "failure", title: "쉬어가기", description: "잠시 쉬는 동작이에요. 루틴을 놓쳤다고 보여주지는 않아요." },
  { value: "focus", title: "집중", description: "학습하며 차분하게 호흡해요." },
  { value: "encourage", title: "응원", description: "작은 응원을 건네고 기본 동작으로 돌아와요." },
  { value: "sleepy", title: "졸림", description: "편안하게 졸며 쉬고 있어요." },
  { value: "grow", title: "성장", description: "새로운 성장 단계를 축하해요." },
];
export function BoriPreviewScreen() {
  const { theme, setThemeId } = useThemeControls(), c = theme.colors;
  const [state, setState] = useState<BoriState>("blink"), [version, setVersion] = useState(0);
  const [stage, setStage] = useState<BoriStage>("sprout");
  return <View style={{ flex: 1, backgroundColor: c.surface }}><ScrollView contentContainerStyle={{ alignItems: "center", padding: 24, paddingTop: 40, gap: 20 }}>
    <View style={{ width: "100%", maxWidth: 520, gap: 20 }}>
      <View style={u.between}><View><Copy muted size={13}>함께 자라는 루틴 친구 · v3</Copy><Copy size={32} weight="800">보리를 만나보세요</Copy></View><Link label={theme.isDark ? "밝게" : "어둡게"} onPress={() => setThemeId(theme.isDark ? "routine" : "dark")} /></View>
      <View accessibilityRole="tablist" accessibilityLabel="성장 단계" style={{ flexDirection: "row", gap: 8 }}>
        {(["sprout", "growing", "blooming"] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityLabel={boriStageLabels[value]} accessibilityState={{ selected: stage === value }}
          onPress={() => { setStage(value); setVersion(v => v + 1); }} style={{ flex: 1, minHeight: 46, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: stage === value ? c.primarySoft : c.card }}>
          <Text style={{ color: stage === value ? c.primary : c.text, fontWeight: "700" }}>{boriStageLabels[value]}</Text>
        </Pressable>)}
      </View>
      <CardView style={{ alignItems: "center", gap: 12, paddingVertical: 24 }}>
        <BoriMascot key={`${stage}-${state}-${version}`} size={230} stage={stage} state={state} />
        <Copy size={23} weight="800">{boriStageLabels[stage]} · {states.find(s => s.value === state)?.title}</Copy>
        <Copy muted size={14}>{states.find(s => s.value === state)?.description}</Copy>
      </CardView>
      <View accessibilityRole="tablist" style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {states.map(item => <Pressable key={item.value} accessibilityRole="tab" accessibilityLabel={item.title} accessibilityState={{ selected: state === item.value }}
          onPress={() => { setState(item.value); setVersion(v => v + 1); }}
          style={{ flexGrow: 1, minHeight: 48, minWidth: 70, alignItems: "center", justifyContent: "center", borderRadius: 16, padding: 10, backgroundColor: state === item.value ? c.primary : c.card }}>
          <Text style={{ color: state === item.value ? theme.isDark ? c.background : c.white : c.text, fontWeight: "700" }}>{item.title}</Text>
        </Pressable>)}
      </View>
      <Action secondary label="다시 재생" onPress={() => setVersion(v => v + 1)} />
      <Action label="앱 화면에서 보기" onPress={() => { window.location.href = "/"; }} />
      <Copy muted size={12}>3단계 × 8동작을 확인할 수 있어요. 여기서 고른 단계는 실제 성장 기록에 영향을 주지 않아요. ‘동작 줄이기’를 켜면 단계에 맞는 정적 이미지로 표시돼요.</Copy>
    </View>
  </ScrollView></View>;
}
