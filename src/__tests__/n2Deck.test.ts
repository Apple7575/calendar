import { Rating } from 'ts-fsrs';
import rawN2 from '../../assets/decks/n2-vocabulary.json';
import { validatePublishedDeck } from '../lib/japaneseDeck';
import { mergeStudyDeck, n3Deck } from '../lib/n3Deck';
import { answerWord, emptyData, getDay, mergePublishedDeck, planStudy, routineDay } from '../lib/routineModel';

const n2 = validatePublishedDeck(rawN2);
const now = new Date(2026, 10, 2, 9), dayKey = routineDay(now);

test('N2 is a complete independent deck with no N3 note IDs', () => {
  const n3Ids = new Set(n3Deck.notes.map(note => note.ID));
  expect(n2.id).toBe('hk-n2-vocabulary');
  expect(n2.id).not.toBe(n3Deck.id);
  expect(n2.notes).toHaveLength(1774);
  expect(n2.notes.every(note => note.ID.startsWith('n2_hk_') && !n3Ids.has(note.ID))).toBe(true);
  for (const note of n2.notes) {
    expect(note.Word_Audio).toMatch(/^\[sound:n2_hk_[a-zA-Z0-9_-]+\.mp3\]$/);
    expect(note.Sentence_Audio).toMatch(/^\[sound:n2_hk_[a-zA-Z0-9_-]+\.mp3\]$/);
    expect(note.Sentence && note.Sentence_Reading && note.Sentence_Meaning && note.Hint && note.Grammar_Note).toBeTruthy();
  }
});

test('receiving N2 preserves existing N3 learning, personal edits and today\'s frozen plan', () => {
  let data = planStudy(mergePublishedDeck(emptyData(), n3Deck, now), dayKey);
  data = answerWord(data, dayKey, data.words[0].id, Rating.Easy, now, 4);
  data = { ...data, words: data.words.map((word, index) => index ? word : {
    ...word, favorite: true, suspended: true, localFields: { Hint: '내가 쓴 힌트' },
  }) };
  const before = JSON.stringify(data), day = getDay(data, dayKey);
  const next = mergeStudyDeck(data, n2);
  expect(next.decks).toHaveLength(2);
  expect(next.decks.find(deck => deck.id === `pc:${n3Deck.id}`)).toEqual(data.decks[0]);
  expect(next.words.filter(word => word.deckId === `pc:${n3Deck.id}`)).toEqual(data.words);
  expect(next.words.filter(word => word.deckId === `pc:${n2.id}`)).toHaveLength(1774);
  expect(getDay(next, dayKey)).toEqual(day);
  expect(next.reviewHistory).toEqual(data.reviewHistory);
  expect(JSON.stringify(data)).toBe(before);
  expect(mergeStudyDeck(next, n2)).toBe(next);
});
