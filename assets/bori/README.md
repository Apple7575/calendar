# 보리 (Bori) Mascot v1

## App integration correction

The app copies normalize animated scalar keyframe `s`/`e` values to one-element arrays, as required by the Lottie format. The supplied ZIP is unchanged. Run `node scripts/normalize-bori.js` when importing an updated v1 pack. Bare scalar keyframes caused root rotation near 78 degrees in lottie-web; after normalization the intended maximum body tilt is 7 degrees (tap/success) and 5 degrees (failure). All frames of all five animations were checked in the SVG renderer; native iOS rendering remains pending a future combined native build.

A tiny peach-colored seed mascot growing two asymmetrical sage leaves, for a personal productivity / memorization / focus / routine app. All source animations are Lottie Bodymovin JSON, 400×400, 30fps, vector-only, transparent background, no external image assets.

| File | Behavior | Duration | Repeat |
| --- | --- | --- | --- |
| bori_blink.json | 자연스러운 눈 깜빡임과 잔잔한 호흡 | 4.00 s | yes |
| bori_tap.json | 터치 순간 통통 눌렸다가 복원되고 잎이 흔들림 | 1.73 s | no |
| bori_success.json | 큰 점프와 회전, 활짝 웃는 표정과 반짝임 | 3.00 s | no |
| bori_failure.json | 새싹 잎과 몸이 축 처지고 시무룩한 표정 | 2.80 s | no |
| bori_focus.json | 눈을 편안히 뜨고 고르게 숨 쉬는 명상형 움직임 | 4.00 s | yes |

Recommended triggers: blink at idle/home; tap on physical tap; success on flashcard or routine completion; failure for errors (avoid punishing negative feedback); focus while timer is running.

**Source:** bori_master.svg (editable vector). **Colors:** bori_palette.json. **Integration:** Set loop=true only for blink/focus; play tap/success/failure once, then return to blink/focus. Respect iOS Reduce Motion settings by showing the static master asset.

This prototype is generated and structurally checked; a device-level Lottie renderer check is still recommended before production.

## Supplied extras

- `bori_concept.png`: refined transparent concept illustration (the visual style reference).
- `bori_master.svg`: lightweight, reproducible vector geometry; this is the shape source used for the Lottie JSON.
- `bori_static.png`: static transparent raster fallback for accessibility.
- `bori_preview_*.gif`: animation previews rendered from the JSON transforms using a separate local renderer (not a native Lottie runtime).
- `BoriMascotView.swift`: SwiftUI usage sample using Airbnb Lottie and Reduce Motion.

To integrate into Xcode: add the JSON files as app bundle resources, add `bori_static.png` to Assets as `bori_static`, add the official `lottie-ios` Swift package, then use `BoriMascotView(state: .blink)`. Validate on an iOS device and adjust the vector silhouette/motion if needed before shipping.
