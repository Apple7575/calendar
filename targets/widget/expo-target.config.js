/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "나의 캘린더 위젯",
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
