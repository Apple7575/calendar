# 보리 성장형 캐릭터 v3 — 키프레임 수정판

3 persistent growth stages × 8 vector Lottie animations = 24 JSON files. 400×400, 30fps, transparent. See GROWTH_RULES.md for unlock rules and SwiftUI setup.

Stages: sprout (base), growing (larger leaves and bud), blooming (flower). No stage ever goes backwards. Modes: blink, tap, success, failure, focus, encourage, sleepy, grow. Use bori_<stage>_<mode>.json; grow is a one-shot celebration, while blink/focus/sleepy loop.

Fixed animated scalar keyframes for rotation and opacity according to the Lottie specification. The validation script checks all 24 compositions, every frame's transforms and geometry bounds; see QA_REPORT.md for results and limitations. Native iOS Lottie playback and Swift compilation still need testing in Xcode.
