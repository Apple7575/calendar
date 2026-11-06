import type {RoutineData, Word} from './routineModel';

// Cards the review engine has marked forgotten this many times (FSRS `lapses`) are collected in one list.
// Team-lead decision 2026-11-07: three or more.
export const LAPSE_MIN = 3;
export const WORD_MEMO_LIMIT = 200;

export type WordMemo = {text: string; updatedAt: string};

export const lapseCount = (word: Word): number => {
  const value = Number(word.card?.lapses);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
};

// Only cards that are still part of an existing deck; hidden or reported cards stay listed so nothing silently disappears.
export function lapseWords(data: RoutineData, min = LAPSE_MIN): Word[] {
  const decks = new Set(data.decks.map(deck => deck.id));
  return data.words
    .filter(word => word.active !== false && decks.has(word.deckId) && lapseCount(word) >= min)
    .sort((a, b) => lapseCount(b) - lapseCount(a) || a.front.localeCompare(b.front, 'ja'));
}

export const wordMemoText = (word: Word): string => (typeof word.memo?.text === 'string' ? word.memo.text : '');

// Empty text removes the memo. Returns the same object when nothing changes so the save chain can skip it.
export function setWordMemo(data: RoutineData, id: string, text: string, now = new Date()): RoutineData {
  const clean = text.replace(/\r\n?/g, '\n').trim().slice(0, WORD_MEMO_LIMIT);
  const word = data.words.find(item => item.id === id);
  if (!word || wordMemoText(word) === clean) return data;
  return {
    ...data,
    words: data.words.map(item => {
      if (item.id !== id) return item;
      if (!clean) {
        const {memo: _removed, ...rest} = item;
        return rest;
      }
      return {...item, memo: {text: clean, updatedAt: now.toISOString()}};
    }),
  };
}
