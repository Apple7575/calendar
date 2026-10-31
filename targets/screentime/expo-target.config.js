module.exports = (config) => ({
  type: "device-activity-monitor",
  name: "screentime",
  bundleIdentifier: ".screentime",
  deploymentTarget: "17.4",
  frameworks: ["FamilyControls", "ManagedSettings", "UserNotifications"],
  entitlements: {
    "com.apple.developer.family-controls": true,
    "com.apple.security.application-groups":
      config.ios.entitlements["com.apple.security.application-groups"],
  },
});
