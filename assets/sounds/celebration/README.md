# 축하 효과음 (S1-07)

팀장이 2026-11-07에 순간마다 하나씩 골랐다(후보 페이지: routine-portfolio/sound-candidates). 같은 순간에는 늘 같은 소리가 난다.
고르는 규칙은 `src/lib/celebration.ts`의 `celebrationSound`, 휴식 차임은 `useStudyFeedback`의 `break`.

| 파일 | 순간 | 후보 | 원본 | 만든이 | 출처 | 길이(초) |
|---|---|---|---|---|---|---|
| planSaved.mp3 | 내일 약속·계획 저장 (작은) | planSaved-c3 | Kenney Interface Sounds 1.0 — glass_002.ogg | Kenney | https://kenney.nl/assets/interface-sounds | 0.08 |
| routineStep.mp3 | 루틴 한 단계 (작은) | routineStep-c2 | Kenney Interface Sounds 1.0 — glass_005.ogg | Kenney | https://kenney.nl/assets/interface-sounds | 0.05 |
| wordStep.mp3 | 단어 보상 구간 +5분 (중간) | wordStep-c3 | Kenney Digital SFX set — powerUp12.mp3 | Kenney | https://opengameart.org/content/63-digital-sound-effects-lasers-phasers-space-etc | 0.62 |
| interest.mp3 | 안 쓴 시간 이자 (중간), 낮아진 예치금 성공 | interest-c4 | Kenney Casino Audio 1.1 — chips-stack-3.ogg | Kenney | https://kenney.nl/assets/casino-audio | 0.35 |
| promiseKept.mp3 | 약속 지킴 (중간) | promiseKept-c4 | Kenney Music Jingles — jingles_STEEL08.ogg | Kenney | https://kenney.nl/assets/music-jingles | 0.78 |
| breakReward.mp3 | 집중을 마쳐 휴식을 얻은 순간 (학습 피드백) | breakReward-c2 | Kenney Music Jingles — jingles_PIZZA08.ogg | Kenney | https://kenney.nl/assets/music-jingles | 0.56 |
| weekCheck.mp3 | 주간 점검 완료 (중간) | weekCheck-c3 | Kenney Music Jingles — jingles_STEEL10.ogg | Kenney | https://kenney.nl/assets/music-jingles | 0.91 |
| priorityAll.mp3 | 우선 과제 전부·성장 (중간), 낮아진 큰 축하 | priorityAll-c4 | Kenney Music Jingles — jingles_NES12.ogg | Kenney | https://kenney.nl/assets/music-jingles | 0.76 |
| dayComplete.mp3 | 오늘 4개 전부 (큰) | dayComplete-c5 | Kenney Music Jingles — jingles_HIT15.ogg | Kenney | https://kenney.nl/assets/music-jingles | 1.11 |
| streak3.mp3 | 연속 3·7일 (큰) | streak3-c3 | Kenney Music Jingles — jingles_STEEL06.ogg | Kenney | https://kenney.nl/assets/music-jingles | 1.26 |
| streak14.mp3 | 연속 14·30일 (큰) | streak14-c4 | Hyper-Ultra-Fanfare — sboe.wav | Zane Little Music | https://opengameart.org/content/hyper-ultra-fanfare | 3.0 |
| comeback.mp3 | 다시 돌아온 날 (큰) | comeback-c3 | Kenney Music Jingles — jingles_SAX03.ogg | Kenney | https://kenney.nl/assets/music-jingles | 0.99 |
| stakeWon.mp3 | 예치금 성공 (큰) | stakeWon-c4 | Victory Fanfare Short — Heavy_ConceptB.wav | cynicmusic | https://opengameart.org/content/victory-fanfare-short | 3.0 |

- 라이선스: 모두 CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/). Kenney 묶음의 라이선스 원문은 이 폴더의 LICENSE-kenney-*.txt.
- 가공: 앞뒤 무음 제거, 음량 -20 LUFS·true peak -3 dB 이하로 맞춤(짧은 소리는 12번 이어 붙여 측정), mp3 96k. 14·30일과 예치금은 3초에서 자르고 페이드.
- interest.mp3만 원본 후보(-26 LUFS)가 코인 순간 피크 때문에 작게 들려서 +10 dB 뒤 리미터(피크 -3.9 dBFS)로 -21.6 LUFS까지 올렸다. 나머지는 -20.4~-20.5 LUFS.
- 재생 크기는 모두 0.65(학습 피드백과 같음). 무음 모드에서는 진동만, 밤(21:00~04:30)에는 소리 없음, 발음이 나오는 중에는 소리 없음.
