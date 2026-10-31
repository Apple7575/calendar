# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

이 프로젝트는 **Expo SDK 54 고정**이다. 사용자의 iPhone Expo Go가 SDK 54를 지원하므로
SDK를 올리지 말 것 (사용자가 직접 확인한 사항).

## iOS 배포와 빌드 사용량

- 웹 미리보기에서 사용자와 확인한 뒤 사용자가 배포를 승인할 때만 EAS Build/Update를 실행한다. 기능 수정 요청만으로 자동 배포하지 않는다.

- 사용자는 EAS 무료 iOS 빌드 한도를 아끼기를 원한다. 화면·문구·JS 변경마다 새 바이너리를 빌드하지 않는다.
- 웹 미리보기로 변경 사항을 모아서 검증한다. 설치된 바이너리와 네이티브 런타임이 호환될 때 EAS Update를 사용한다.
- Update 채널은 production, runtimeVersion 정책은 fingerprint다. 네이티브 의존성·Swift·권한 변경은 새 빌드가 필요하다.
- expo-updates를 처음 포함하는 빌드 27 이전 앱에는 OTA 업데이트가 전달되지 않는다.
- 루틴 타이머의 시간·완료 정책은 사용자와 논의 중이다. 타이머 만료만으로 루틴 보상을 지급하지 않는다.
