/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  // 주의: 한글 이름을 쓰면 Xcode 타겟명(한글)과 EAS 서명 타겟명('widget')이
  // 어긋나 빌드가 실패한다. 반드시 ASCII로 유지할 것.
  name: "widget",
  deploymentTarget: "17.0",
  colors: {
    $accent: "#8B72E8",
    $widgetBackground: "#FFFFFF",
  },
  entitlements: {
    // 본체 앱과 같은 App Group으로 위젯 데이터를 공유한다
    "com.apple.security.application-groups":
      config.ios.entitlements["com.apple.security.application-groups"],
  },
});
