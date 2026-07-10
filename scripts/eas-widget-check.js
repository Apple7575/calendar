// EAS 빌드 서버에서 prebuild를 미리 실행해 위젯 타겟이 생성됐는지 검증한다.
// (eas-build-post-install 훅 — 로컬/Expo Go에는 영향 없음)
// 성공 시 생성된 ios/ 를 그대로 두어 이후 단계가 검증된 프로젝트를 사용한다.

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

if (process.env.EAS_BUILD_PLATFORM !== "ios") {
  process.exit(0);
}

console.log("[widget-check] iOS prebuild를 실행해 위젯 타겟을 검증합니다…");

try {
  execSync("npx expo prebuild --platform ios --no-install", {
    stdio: "inherit",
    env: { ...process.env, CI: "1" },
  });
} catch (e) {
  console.error("[widget-check] ❌ prebuild 실행 자체가 실패했습니다.");
  process.exit(1);
}

const iosDir = path.join(process.cwd(), "ios");
const xcodeprojs = fs
  .readdirSync(iosDir)
  .filter((name) => name.endsWith(".xcodeproj"));
if (xcodeprojs.length === 0) {
  console.error("[widget-check] ❌ ios/*.xcodeproj 를 찾지 못했습니다.");
  process.exit(1);
}
const pbxprojPath = path.join(iosDir, xcodeprojs[0], "project.pbxproj");
const pbxproj = fs.readFileSync(pbxprojPath, "utf8");

// PBXNativeTarget 섹션의 타겟 이름들 출력
const targetNames = [...pbxproj.matchAll(/isa = PBXNativeTarget;[\s\S]*?name = "?([^";]+)"?;/g)].map(
  (m) => m[1]
);
console.log(`[widget-check] pbxproj 타겟 목록: ${JSON.stringify(targetNames)}`);

// EAS 서명 메타데이터는 타겟명 'widget'을 기대한다 — 정확히 일치해야 한다.
if (targetNames.includes("widget")) {
  console.log("[widget-check] ✅ 'widget' 타겟이 정상 생성되었습니다. 이 프로젝트로 빌드를 진행합니다.");
} else {
  console.error(
    "[widget-check] ❌ pbxproj에 정확히 'widget'이라는 타겟이 없습니다. " +
      "targets/widget/expo-target.config.js의 name이 ASCII 'widget'인지 확인하세요."
  );
  process.exit(1);
}
