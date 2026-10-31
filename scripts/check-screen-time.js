const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const { getConfig } = require("@expo/config");

require("./sync-screen-time");
const config = getConfig(path.resolve(__dirname, "..")).exp;
const entitlement = "com.apple.developer.family-controls";
const appGroup = "group.com.newblueday.mycalendar";
assert.equal(config.ios.entitlements[entitlement], true);
const extensions = config.extra.eas.build.experimental.ios.appExtensions;
const monitor = extensions.find((target) => target.targetName === "screentime");
assert.ok(monitor, "Screen Time monitor is missing from EAS signing metadata");
assert.equal(monitor.bundleIdentifier, `${config.ios.bundleIdentifier}.screentime`);
assert.equal(monitor.entitlements[entitlement], true);
assert.ok(monitor.entitlements["com.apple.security.application-groups"].includes(appGroup));
assert.ok(config.ios.entitlements["com.apple.security.application-groups"].includes(appGroup));
assert.ok(extensions.some((target) => target.targetName === "widget"), "Existing widget must remain");

const output = execFileSync(process.execPath, [
  require.resolve("expo-modules-autolinking/bin/expo-modules-autolinking"),
  "resolve", "--platform", "apple", "--json",
], { encoding: "utf8", cwd: path.resolve(__dirname, "..") });
const nativeModule = JSON.parse(output).modules.find((item) => item.packageName === "routine-screen-time");
assert.ok(nativeModule?.modules.includes("RoutineScreenTimeModule"), "Native module is not autolinked");
assert.ok(nativeModule?.pods.some((pod) => pod.podName === "RoutineScreenTime"));
console.log("Screen Time: host/extension entitlements, shared storage, widget and native autolinking verified.");
console.log("Swift compilation and real-device behavior still require an iOS build.");
