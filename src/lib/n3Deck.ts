import rawN3 from '../../assets/decks/n3-vocabulary.json';
import { PublishedDeck, validatePublishedDeck } from './japaneseDeck';
import { mergePublishedDeck, RoutineData, Word } from './routineModel';

export const n3Deck = validatePublishedDeck(rawN3);
const targetId = `pc:${n3Deck.id}`;
const oldId = 'pc:hk-n3-kanji-p003';
const oldRevisions = new Set(['20261029_01', '20261030_01', '20261030_cedar01','20261030_n3_unified02','20261031_legacy97_bridge01']);

/** Re-key page-three cards AND references to them without changing review/reward history. */
export function migrateN3Deck(data: RoutineData): RoutineData {
  const target = data.decks.find(d => d.id === targetId);
  const old = data.decks.find(d => d.id === oldId);
  if (!old && (!target || target.name === n3Deck.name)) {
    if(target&&oldRevisions.has(target.revision??'')&&n3Deck.notes.length>data.words.filter(w=>w.deckId===targetId&&w.active!==false).length)return mergePublishedDeck(data,n3Deck);
    return data;
  }
  const remap = new Map<string, string>();
  const words = new Map<string, Word>();
  for (const word of data.words) {
    const moved = word.deckId === oldId;
    const id = moved ? word.id.replace(`${oldId}:`, `${targetId}:`) : word.id;
    if (moved) remap.set(word.id, id);
    const next = moved ? { ...word, id, deckId: targetId } : word;
    const previous = words.get(id);
    // Keep the latest actual response if both old and unified copies are present.
    if (!previous || (next.card.last_review ?? '') > (previous.card.last_review ?? '') ||
      (next.card.last_review === previous.card.last_review && next.card.reps > previous.card.reps)) words.set(id, next);
  }
  const ids = (items: string[]) => [...new Set(items.map(id => remap.get(id) ?? id))];
  const days = Object.fromEntries(Object.entries(data.days).map(([key, day]) => [key, {
    ...day, complete: ids(day.complete),
    ...(day.wordRewards?{wordRewards:{...day.wordRewards,countedIds:ids(day.wordRewards.countedIds),pendingIds:ids(day.wordRewards.pendingIds)}}:{}),
    ...(day.rewardedStudyIds?{rewardedStudyIds:ids(day.rewardedStudyIds)}:{}),
    ...(day.extraPendingIds?{extraPendingIds:ids(day.extraPendingIds)}:{}),
    ...(day.lastStudyWordId ? { lastStudyWordId: remap.get(day.lastStudyWordId) ?? day.lastStudyWordId } : {}),
    ...(day.additional ? { additional: { ...day.additional, ids: ids(day.additional.ids), complete: ids(day.additional.complete),
      completedIds: ids(day.additional.completedIds), lastWordId: day.additional.lastWordId ? remap.get(day.additional.lastWordId) ?? day.additional.lastWordId : undefined } } : {}),
    ...(day.additionalByDeck?{additionalByDeck:Object.fromEntries(Object.entries(day.additionalByDeck).map(([deckId,p])=>[deckId===oldId?targetId:deckId,{...p,ids:ids(p.ids),complete:ids(p.complete),completedIds:ids(p.completedIds),lastWordId:p.lastWordId?remap.get(p.lastWordId)??p.lastWordId:undefined}]))}:{}),
    ...(day.plan ? { plan: { ...day.plan, ids: ids(day.plan.ids), reviewIds: ids(day.plan.reviewIds) } } : {}),
  }]));
  const record = { ...(target ?? old!), id: targetId, name: n3Deck.name, active: !!(target?.active || old?.active) };
  const decks = data.decks.filter(d => d.id !== oldId && d.id !== targetId);
  const noteMap = new Map(n3Deck.notes.map(n => [n.ID, n]));
  for (const word of words.values()) if (word.deckId === targetId && word.fields) noteMap.set(word.fields.ID, word.fields);
  // Force a content merge once; stable note IDs preserve all existing FSRS cards.
  const base: RoutineData = { ...data, studyUndo:undefined,reviewHistory:data.reviewHistory?.map(e=>({...e,wordId:remap.get(e.wordId)??e.wordId,deckId:e.deckId===oldId?targetId:e.deckId})),words: [...words.values()], days, decks: [...decks, { ...record, revision: undefined }] };
  return mergePublishedDeck(base, { ...n3Deck, notes: [...noteMap.values()] });
}

/** Old page files may still exist in private storage; they must not split/replace N3 again. */
export function mergeStudyDeck(data: RoutineData, deck: PublishedDeck): RoutineData {
  if (deck.id !== n3Deck.id && `pc:${deck.id}` !== oldId) return mergePublishedDeck(data, deck);
  const migrated = migrateN3Deck(data);
  const legacy = `pc:${deck.id}` === oldId || oldRevisions.has(deck.revision);
  if (legacy) return migrated.decks.some(d => d.id === targetId) ? migrated : mergePublishedDeck(migrated, n3Deck);
  return mergePublishedDeck(migrated, { ...deck, name: n3Deck.name });
}
