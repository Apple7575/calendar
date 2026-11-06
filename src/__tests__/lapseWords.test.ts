jest.mock('../lib/supabase',()=>({supabase:{}}));
import {createEmptyCard} from 'ts-fsrs';
import {lapseCount, lapseWords, LAPSE_MIN, setWordMemo, WORD_MEMO_LIMIT, wordMemoText} from '../lib/lapseWords';
import {emptyData, encodeCard, mergePublishedDeck, RoutineData, Word} from '../lib/routineModel';

const card = (lapses: number) => encodeCard({...createEmptyCard(new Date('2026-11-01T00:00:00Z')), lapses, reps: lapses + 1});
const word = (id: string, lapses: number, over: Partial<Word> = {}): Word => ({id, deckId: 'n3', front: id, back: `${id} 뜻`, card: card(lapses), kind: 'word', ...over});
const data = (words: Word[]): RoutineData => ({...emptyData(), decks: [{id: 'n3', name: 'N3', active: true}], words});

test('collects cards forgotten three or more times, most forgotten first', () => {
  expect(LAPSE_MIN).toBe(3);
  const d = data([word('a', 2), word('b', 3), word('c', 7), word('d', 3), word('e', 0)]);
  expect(lapseWords(d).map(w => w.id)).toEqual(['c', 'b', 'd']);
});

test('skips cards that left their deck but keeps hidden or reported cards visible', () => {
  const d = data([
    word('gone', 5, {active: false}),
    word('other', 5, {deckId: 'deleted'}),
    word('hidden', 4, {suspended: true}),
    word('flagged', 4, {issue: {categories: ['meaning'], note: '', updatedAt: '2026-11-01T00:00:00Z'}}),
  ]);
  expect(lapseWords(d).map(w => w.id).sort()).toEqual(['flagged', 'hidden']);
});

test('reads a broken lapses value as zero', () => {
  const bad = word('x', 3);
  (bad.card as any).lapses = 'oops';
  expect(lapseCount(bad)).toBe(0);
});

test('saves, trims, caps and removes a memo without touching the review schedule', () => {
  const d = data([word('a', 3), word('b', 1)]);
  const now = new Date('2026-11-07T01:00:00Z');
  const saved = setWordMemo(d, 'a', '  覚える ≠ 思い出す \r\n', now);
  const a = saved.words.find(w => w.id === 'a')!;
  expect(a.memo).toEqual({text: '覚える ≠ 思い出す', updatedAt: now.toISOString()});
  expect(a.card).toEqual(d.words[0].card);
  expect(saved.words[1]).toBe(d.words[1]);
  expect(wordMemoText(setWordMemo(d, 'a', 'x'.repeat(500)).words[0])).toHaveLength(WORD_MEMO_LIMIT);
  expect(setWordMemo(saved, 'a', '覚える ≠ 思い出す')).toBe(saved);
  const removed = setWordMemo(saved, 'a', '   ');
  expect('memo' in removed.words[0]).toBe(false);
  expect(setWordMemo(d, 'missing', 'memo')).toBe(d);
});

test('a deck update keeps the memo and the lapse count', () => {
  const note = {ID: 'n1', Word: '忘れる', Word_Reading: 'わすれる', Word_Meaning: '잊다', Hint: '', Sentence: '', Sentence_Reading: '', Sentence_Meaning: '', Grammar_Note: '', Card_Level: '', Make_Sentence_Card: false, Word_Audio: '', Sentence_Audio: '', Tags: []};
  let d = mergePublishedDeck(emptyData(), {schema: 'routine.japanese-deck.v1', id: 'n3', name: 'N3', revision: 'r1', notes: [note]} as any);
  const id = d.words[0].id;
  d = {...d, words: d.words.map(w => ({...w, card: card(4)}))};
  d = setWordMemo(d, id, '잊다 = 忘れる');
  const next = mergePublishedDeck(d, {schema: 'routine.japanese-deck.v1', id: 'n3', name: 'N3', revision: 'r2', notes: [{...note, Word_Meaning: '잊어버리다'}]} as any);
  const w = next.words.find(item => item.id === id)!;
  expect(wordMemoText(w)).toBe('잊다 = 忘れる');
  expect(lapseCount(w)).toBe(4);
  expect(lapseWords(next).map(item => item.id)).toEqual([id]);
});

test('a backup round trip keeps the memo', () => {
  const {makeBackup, validateBackup} = require('../lib/routineBackup');
  const uid = '00000000-0000-4000-8000-00000000abcd';
  const d = setWordMemo(data([word('a', 3)]), 'a', '메모', new Date('2026-11-07T01:00:00Z'));
  const back = validateBackup(JSON.parse(JSON.stringify(makeBackup(d, uid))), uid);
  expect(back.data.words[0].memo).toEqual({text: '메모', updatedAt: '2026-11-07T01:00:00.000Z'});
});
