function loadBridge(native: unknown, platform = "ios") {
  jest.resetModules();
  jest.doMock("expo", () => ({ requireOptionalNativeModule: () => native }));
  jest.doMock("react-native", () => ({ Platform: { OS: platform } }));
  return require("../lib/screenTime") as typeof import("../lib/screenTime");
}

describe("Screen Time native availability", () => {
  it("does not pretend a missing native build can unlock apps", async () => {
    const bridge = loadBridge(null);
    expect(bridge.isScreenTimeInstalled()).toBe(false);
    expect(await bridge.getScreenTimeStatus()).toBeNull();
    await expect(bridge.runScreenTimeAction("grantTestTime")).rejects.toThrow("새 아이폰 빌드");
  });

  it("does not expose iOS actions on other platforms", async () => {
    const grant = jest.fn();
    const bridge = loadBridge({ grantTestTime: grant }, "android");
    await expect(bridge.runScreenTimeAction("grantTestTime")).rejects.toThrow();
    expect(grant).not.toHaveBeenCalled();
  });

  it("does not turn an unsupported iOS version into a usable status", async () => {
    const bridge = loadBridge({ getStatus: async () => ({ supported: false }) });
    expect(await bridge.getScreenTimeStatus()).toBeNull();
  });

  it("propagates native monitoring failures instead of reporting a reward", async () => {
    const bridge = loadBridge({ grantTestTime: async () => { throw new Error("monitoring failed"); } });
    await expect(bridge.runScreenTimeAction("grantTestTime")).rejects.toThrow("monitoring failed");
  });

  it("propagates storage failures rather than replacing them with a zero balance", async () => {
    const bridge = loadBridge({ getStatus: async () => { throw new Error("storage failed"); } });
    await expect(bridge.getScreenTimeStatus()).rejects.toThrow("storage failed");
  });
});
