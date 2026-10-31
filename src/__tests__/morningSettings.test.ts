import { checkMorning, DEFAULT_MORNING, emptyData, getDay, morningSteps, saveMorningSteps } from "../lib/routineModel";

describe("editable morning routines", () => {
  const key = "2026-10-29";
  const custom = [
    { id: "water", title: "물 마시기", detail: "물 한 잔", minimum: true },
    { id: "desk", title: "책상 정리", detail: "", minimum: false },
    { id: "brush", title: "양치", detail: "", minimum: true },
  ];
  it("completes selected minimum steps and pays only the upgrade difference", () => {
    let state = saveMorningSteps(emptyData(), custom);
    state = checkMorning(state, key, "min", 0); expect(getDay(state, key).paid.morning).toBe(0);
    state = checkMorning(state, key, "min", 2); expect(getDay(state, key).paid.morning).toBe(5);
    state = checkMorning(state, key, "full", 1); expect(getDay(state, key).paid.morning).toBe(10);
    state = checkMorning(state, key, "full"); expect(getDay(state, key).paid.morning).toBe(10);
  });
  it("freezes the actual started list while future days use edited settings", () => {
    let state = checkMorning(emptyData(), key, "full", 0);
    state = saveMorningSteps(state, custom);
    expect(morningSteps(state, key)).toEqual(DEFAULT_MORNING);
    expect(morningSteps(state, "2026-10-30")).toEqual(custom);
    expect(getDay(state, key).morning).toEqual([true, false, false]);
  });
  it("preserves old-version partial records against changed settings", () => {
    const state = saveMorningSteps({ ...emptyData(), days: { [key]: { paid: {morning:0,words:0,gym:0}, morning:[true,false,false], complete:[], responses:0, studySeconds:0 } } }, custom);
    expect(morningSteps(state, key)).toEqual(DEFAULT_MORNING);
  });
  it("rejects an empty list, missing minimum, or blank name", () => {
    expect(() => saveMorningSteps(emptyData(), [])).toThrow();
    expect(() => saveMorningSteps(emptyData(), custom.map(s=>({...s,minimum:false})))).toThrow();
    expect(() => saveMorningSteps(emptyData(), [{...custom[0],title:" "}])).toThrow();
  });
});
