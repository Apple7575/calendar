import { Rating } from "ts-fsrs";
import { parseNoteText, validatePublishedDeck } from "../lib/japaneseDeck";
import { answerWord, emptyData, getDay, mergePublishedDeck, planStudy, routineDay } from "../lib/routineModel";
import sample from "../../assets/decks/n3-reading-01.json";

const now = new Date(2026, 9, 29, 9);
describe("Japanese computer decks", () => {
  it("preserves the user's fields instead of treating ID as the word", () => {
    const [row] = parseNoteText('ID\tWord\tWord_Reading\tWord_Meaning\tSentence\tWord_Audio\tTags\nn3_001\t改札\tかいさつ\t개찰구\t改札を通ります。\t[sound:word.mp3]\tN3 駅');
    expect(row.front).toBe("改札"); expect(row.back).toBe("개찰구");
    expect(row.fields).toMatchObject({ ID: "n3_001", Word_Reading: "かいさつ", Sentence: "改札を通ります。", Word_Audio: "[sound:word.mp3]", Tags: ["N3", "駅"] });
  });
  it("supports Anki text headers, quoted fields, and published JSON", () => {
    const [row] = parseNoteText('#separator:tab\n#html:false\n#columns:ID\tWord\tWord_Meaning\nx\t価格\t"가격\n금액"');
    expect(row.front).toBe("価格"); expect(row.back).toBe("가격\n금액");
    expect(parseNoteText(JSON.stringify(sample))).toHaveLength(49);
  });
  it("validates unique note IDs and the need for a complete sentence card", () => {
    expect(() => validatePublishedDeck({ ...sample, notes: [sample.notes[0], sample.notes[0]] })).toThrow("중복");
    expect(() => validatePublishedDeck({ ...sample, notes: [{ ...sample.notes[0], Make_Sentence_Card: true, Sentence: "" }] })).toThrow("예문");
    expect(() => validatePublishedDeck({ ...sample, id: "../escape" })).toThrow("ID");
  });
  it("imports repeatably and preserves FSRS and today's frozen plan when content updates", () => {
    const deck = validatePublishedDeck(sample), dayKey = routineDay(now);
    let state = planStudy(mergePublishedDeck(emptyData(), deck, now), dayKey);
    const first = state.words[0];
    state = answerWord(state, dayKey, first.id, Rating.Easy, now, 4);
    const before = state.words[0].card, plan = getDay(state, dayKey).plan;
    expect(mergePublishedDeck(state, deck, now)).toBe(state);
    const updated = mergePublishedDeck(state, { ...deck, revision: "v2", notes: deck.notes.map((n, i) => i ? n : { ...n, Hint: "수정한 힌트" }) }, now);
    expect(updated.words).toHaveLength(49); expect(updated.words[0].card).toEqual(before);
    expect(updated.words[0].fields?.Hint).toBe("수정한 힌트"); expect(getDay(updated, dayKey).plan).toEqual(plan);
    expect(getDay(updated, dayKey).responses).toBe(1);
  });
  it("keeps sentence FSRS independently and retires removed cards without deleting their history", () => {
    const base = validatePublishedDeck(sample);
    const deck = { ...base, notes: [{ ...base.notes[0], Make_Sentence_Card: true }] };
    const state = mergePublishedDeck(emptyData(), deck, now);
    expect(state.words.map(w => w.kind)).toEqual(["word", "sentence"]);
    const updated = mergePublishedDeck(state, { ...deck, revision: "v2", notes: [{ ...deck.notes[0], Make_Sentence_Card: false }] }, now);
    expect(updated.words).toHaveLength(2); expect(updated.words[1].active).toBe(false);
    expect(getDay(planStudy(updated, routineDay(now)), routineDay(now)).plan?.ids).toHaveLength(1);
  });
});
