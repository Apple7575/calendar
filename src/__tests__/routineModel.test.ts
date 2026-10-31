import { Rating, State } from "ts-fsrs";
import { additionalCandidates, startAdditionalStudy, answerAdditionalWord, nextAdditionalWord, pendingAdditionalWords, achieved, addDeck, answerWord, dayEnd, earn, earned, emptyData, getDay, parseDeckText, pendingWords, planStudy, routineDay, studyProgress } from "../lib/routineModel";

const now = new Date(2026, 9, 29, 9);
const key = routineDay(now);
const words = (count = 3) => addDeck(emptyData(), "나의 덱", Array.from({ length: count }, (_, i) => ({ front: `word${i}`, back: `뜻${i}` })), "deck1", now);

describe("routine rewards and day boundary", () => {
  it("tops up minimum rewards once without duplicate payment", () => {
    let data = earn(emptyData(), key, "words", "min");
    data = earn(data, key, "words", "full");
    data = earn(data, key, "words", "full");
    expect(getDay(data, key).paid.words).toBe(20);
    expect(getDay(data, key).paid.morning).toBe(0);
  });
  it("counts a gym-only day as an achievement", () => {
    const day = getDay(earn(emptyData(), key, "gym", "full"), key);
    expect(achieved(day)).toBe(true);
    expect(earned(day)).toBe(30);
  });
  it("changes day at 04:00, including month boundaries", () => {
    expect(routineDay(new Date(2026, 10, 1, 3, 59))).toBe("2026-10-31");
    expect(routineDay(new Date(2026, 10, 1, 4))).toBe("2026-11-01");
    expect(dayEnd("2026-10-31").getTime()).toBe(new Date(2026, 10, 1, 4).getTime());
  });
  it("starts the new day empty while retaining old rewards and card memory", () => {
    let data = planStudy(words(1), key);
    data = answerWord(data, key, "deck1:0", Rating.Easy, now, 15);
    const restored = JSON.parse(JSON.stringify(data));
    const tomorrow = routineDay(new Date(2026, 9, 30, 9));
    expect(earned(getDay(restored, tomorrow))).toBe(0);
    expect(getDay(restored, tomorrow).morning).toEqual([false, false, false]);
    expect(getDay(restored, key).responses).toBe(1);
    expect(restored.words[0].card.reps).toBe(1);
    expect(getDay(restored, key).paid.words).toBe(20);
  });
});

describe("persistent FSRS study plan", () => {
  it("freezes the plan even if the new-card limit changes during study", () => {
    let data = words(8); data.newLimit = 8;
    data = planStudy(data, key);
    const changed = planStudy({ ...data, newLimit: 0 }, key);
    expect(getDay(changed, key).plan?.ids).toHaveLength(8);
    expect(getDay(changed, key).plan?.newLimit).toBe(8);
    expect(studyProgress(getDay(changed, key)).full).toBe(false);
  });
  it("retains an Again card and due time after app restart", () => {
    let data = planStudy(words(1), key);
    data = answerWord(data, key, "deck1:0", Rating.Again, now, 12);
    const restored = JSON.parse(JSON.stringify(data));
    const pending = pendingWords(restored, key, "full");
    expect(pending.map(w => w.id)).toEqual(["deck1:0"]);
    expect(new Date(pending[0].card.due).getTime()).toBeGreaterThan(now.getTime());
    expect(getDay(restored, key).complete).toEqual([]);
    expect(getDay(restored, key).paid.words).toBe(0);
  });
  it("allows learning ahead when no other cards remain instead of forcing a wait", () => {
    let data = planStudy(words(1), key);
    data = answerWord(data, key, "deck1:0", Rating.Again, now, 5);
    data = answerWord(data, key, "deck1:0", Rating.Easy, now, 5);
    expect(getDay(data, key).responses).toBe(2);
    expect(getDay(data, key).paid.words).toBe(20);
  });
  it("awards only after the non-empty plan is completed", () => {
    let data = planStudy(words(2), key);
    data = answerWord(data, key, "deck1:0", Rating.Easy, now, 5);
    expect(getDay(data, key).paid.words).toBe(0);
    data = answerWord(data, key, "deck1:1", Rating.Easy, now, 5);
    expect(getDay(data, key).paid.words).toBe(20);
    expect(studyProgress(getDay(data, key)).full).toBe(true);
    expect(getDay(data, key).responses).toBe(2);
  });
  it("does not award an empty plan or include decks added after starting", () => {
    const blank = planStudy(emptyData(), key);
    expect(studyProgress(getDay(blank, key)).full).toBe(false);
    const imported = addDeck(blank, "뒤늦게 추가", [{ front: "hello", back: "안녕" }], "late", now);
    expect(getDay(planStudy(imported, key), key).plan?.ids).toEqual([]);
  });
  it("rejects a stale session crossing the 04:00 boundary", () => {
    const data = planStudy(words(1), key);
    expect(() => answerWord(data, key, "deck1:0", Rating.Easy, new Date(2026, 9, 30, 4), 5)).toThrow("새 하루");
  });
});

describe("deck text import", () => {
  it("reads BOM headers and quoted multi-line CSV", () => {
    expect(parseDeckText('\uFEFFfront,back\n"give it a shot","한 번, 해봐\n도전해"')).toEqual([{ front: "give it a shot", back: "한 번, 해봐\n도전해" }]);
  });
  it("supports TSV and rejects broken quoting", () => {
    expect(parseDeckText("단어\t뜻\n容器\t용기")).toEqual([{ front: "容器", back: "용기" }]);
    expect(() => parseDeckText('"open,뜻')).toThrow("따옴표");
  });
});


describe("custom study continuation",()=>{
 it("keeps the frozen goal and base rewards while persisting extra study",()=>{
  let data=words(15);data.newLimit=1;data=planStudy(data,key);
  data=answerWord(data,key,'deck1:0',Rating.Easy,now,10);
  const before=JSON.parse(JSON.stringify(getDay(data,key)));
  data=startAdditionalStudy(data,key,'new',10,now);
  expect(getDay(data,key).additional?.ids).toHaveLength(10);
  expect(getDay(data,key).additional?.ids).not.toContain('deck1:0');
  const word=nextAdditionalWord(data,key,now)!;
  data=answerAdditionalWord(data,key,word.id,Rating.Again,now,12);
  const future=nextAdditionalWord(data,key,now)!;
  expect(future.id).not.toBe(word.id);
  const restored=JSON.parse(JSON.stringify(data));
  expect(startAdditionalStudy(restored,key,'review',10,now)).toBe(restored);
  expect(pendingAdditionalWords(restored,key)).toHaveLength(10);
  data=answerAdditionalWord(data,key,future.id,Rating.Easy,now,12);
  expect(getDay(data,key).plan).toEqual(before.plan);
  expect(getDay(data,key).complete).toEqual(before.complete);
  expect(getDay(data,key).paid).toEqual(before.paid);
  expect(getDay(data,key).additional?.completedIds).toContain(future.id);
 });
 it("allows explicitly selected future review with the actual answer time",()=>{
  let data=planStudy(words(1),key);
  data=answerWord(data,key,'deck1:0',Rating.Easy,now,10);
  expect(additionalCandidates(data,key,'review')).toHaveLength(1);
  data=startAdditionalStudy(data,key,'review',10,now);
  const word=nextAdditionalWord(data,key,now)!;
  expect(new Date(word.card.due).getTime()).toBeGreaterThan(now.getTime());
  data=answerAdditionalWord(data,key,word.id,Rating.Good,now,10);
  expect(data.words[0].card.last_review).toBe(now.toISOString());
  expect(getDay(data,key).paid.words).toBe(20);
  expect(()=>startAdditionalStudy(data,key,'review',10,new Date(2026,9,30,9))).toThrow('새 하루');
 });
});
