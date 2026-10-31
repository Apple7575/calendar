import { Rating } from 'ts-fsrs';
import oldFirst from '../../assets/decks/n3-reading-01.json';
import oldSecond from '../../assets/decks/n3-reading-p003.json';
import { validatePublishedDeck } from '../lib/japaneseDeck';
import { mergeStudyDeck, migrateN3Deck, n3Deck } from '../lib/n3Deck';
import { answerWord, emptyData, getDay, mergePublishedDeck, planStudy, routineDay } from '../lib/routineModel';
const now=new Date(2026,9,30,9), key=routineDay(now);
const first=validatePublishedDeck(oldFirst),second=validatePublishedDeck(oldSecond);
test('the published N3 pack contains all reviewed notes in one stable deck',()=>{
  expect(n3Deck.notes).toHaveLength(1587);expect(n3Deck.id).toBe(first.id);
  expect(new Set(n3Deck.notes.map(n=>n.ID)).size).toBe(1587);
  expect(n3Deck.notes.every(n=>n.Word_Audio&&n.Sentence_Audio)).toBe(true);
});
test('upgrades an existing first-page import without resetting FSRS or expanding a frozen day plan',()=>{
  let data=planStudy(mergePublishedDeck(emptyData(),first,now),key);
  data=answerWord(data,key,data.words[0].id,Rating.Easy,now,7);
  const card=data.words[0].card,day=getDay(data,key),before=JSON.stringify(data);
  const next=migrateN3Deck(data);
  expect(next.decks).toHaveLength(1);expect(next.decks[0].name).toBe(n3Deck.name);expect(next.words).toHaveLength(n3Deck.notes.length);
  expect(next.words[0].card).toEqual(card);expect(getDay(next,key)).toEqual(day);expect(JSON.stringify(data)).toBe(before);
  expect(migrateN3Deck(next)).toBe(next);
});
test('moves second-page FSRS and historical plan/completion IDs to the unified deck',()=>{
  let data=mergePublishedDeck(mergePublishedDeck(emptyData(),first,now),second,now);
  data={...data,newLimit:100};data=planStudy(data,key);
  const old=data.words.find(w=>w.deckId===`pc:${second.id}`)!;
  data=answerWord(data,key,old.id,Rating.Easy,now,8);
  const reviewed=data.words.find(w=>w.id===old.id)!;const history=getDay(data,key);
  const next=migrateN3Deck(data);const moved=next.words.find(w=>w.fields?.ID===old.fields!.ID)!;
  expect(next.decks.map(d=>d.id)).toEqual([`pc:${first.id}`]);expect(next.words).toHaveLength(n3Deck.notes.length);
  expect(moved.card).toEqual(reviewed.card);expect(moved.deckId).toBe(`pc:${first.id}`);
  expect(getDay(next,key).complete).toContain(moved.id);expect(getDay(next,key).complete).not.toContain(old.id);
  expect(getDay(next,key).plan!.ids).toContain(moved.id);expect(getDay(next,key).responses).toBe(history.responses);
  expect(getDay(next,key).paid).toEqual(history.paid);expect(getDay(next,key).studySeconds).toBe(history.studySeconds);
});
test('supports a user who imported only the second page, retaining its disabled state',()=>{
  let data=mergePublishedDeck(emptyData(),second,now);data={...data,decks:data.decks.map(d=>({...d,active:false}))};
  const next=migrateN3Deck(data);expect(next.decks).toHaveLength(1);expect(next.decks[0].active).toBe(false);expect(next.words).toHaveLength(n3Deck.notes.length);
});
test('duplicate old/new copies keep the latest reviewed card and remap every historical reference once',()=>{
  let data=mergePublishedDeck(mergePublishedDeck(emptyData(),n3Deck,now),second,now);
  const old=data.words.find(w=>w.deckId===`pc:${second.id}`)!;
  const unified=data.words.find(w=>w.deckId===`pc:${first.id}`&&w.fields?.ID===old.fields!.ID)!;
  data={...data,days:{[key]:{...getDay(data,key),plan:{ids:[old.id],reviewIds:[old.id],newLimit:0}}}};
  data=answerWord(data,key,old.id,Rating.Easy,now,5);
  const card=data.words.find(w=>w.id===old.id)!.card;
  const yesterday='2026-10-29';data.days[yesterday]={...getDay(data,key),complete:[old.id,unified.id],plan:{ids:[old.id,unified.id],reviewIds:[old.id,unified.id],newLimit:0}};
  const next=migrateN3Deck(data);
  expect(next.words).toHaveLength(n3Deck.notes.length);expect(next.words.find(w=>w.id===unified.id)!.card).toEqual(card);
  expect(next.days[yesterday].complete).toEqual([unified.id]);expect(next.days[yesterday].plan!.ids).toEqual([unified.id]);
  expect(next.days[yesterday].plan!.reviewIds).toEqual([unified.id]);expect(next.days[yesterday].paid).toEqual(data.days[yesterday].paid);
  expect(next.days[yesterday].responses).toBe(data.days[yesterday].responses);
});
test('old cloud page files cannot split or shrink N3 after migration, regardless of receive order',()=>{
  for(const incoming of [[first,second],[second,first]]){
    let data=incoming.reduce((s,d)=>mergeStudyDeck(s,d),emptyData());
    expect(data.decks).toHaveLength(1);expect(data.words.filter(w=>w.active!==false)).toHaveLength(n3Deck.notes.length);
    const same=incoming.reduce((s,d)=>mergeStudyDeck(s,d),data);expect(same).toBe(data);
  }
});
test('future unified content updates retain existing FSRS history',()=>{
  let data=planStudy(mergeStudyDeck(emptyData(),n3Deck),key);data=answerWord(data,key,data.words[0].id,Rating.Easy,now,5);
  const card=data.words[0].card;const next=mergeStudyDeck(data,{...n3Deck,revision:'20261101_01',notes:n3Deck.notes.map(n=>({...n,Hint:'new hint'}))});
  expect(next.words[0].card).toEqual(card);expect(next.words[0].fields!.Hint).toBe('new hint');expect(next.decks).toHaveLength(1);
});
test('does not create N3 for unrelated decks or alter their cards',()=>{
  const other={...first,id:'english',name:'English'};const data=mergePublishedDeck(emptyData(),other,now);
  expect(migrateN3Deck(data)).toBe(data);expect(mergeStudyDeck(emptyData(),other).decks[0].name).toBe('English');
});
test('full corpus upgrade preserves the old 97-card deck, personal changes, frozen goals and history',()=>{
 const legacy={...first,revision:'20261030_n3_unified02',name:n3Deck.name,notes:[...first.notes,...second.notes]};
 let data=planStudy(mergePublishedDeck(emptyData(),legacy,now),key);data=answerWord(data,key,data.words[0].id,Rating.Easy,now,4);
 data.words[0]={...data.words[0],favorite:true,suspended:true,issue:{categories:['wordAudio'],note:'확인할 발음',updatedAt:now.toISOString()},localFields:{Hint:'내 힌트'}};
 const before=data.words[0],day=getDay(data,key),history=data.reviewHistory;
 const full=migrateN3Deck(data);expect(full.words).toHaveLength(1587);expect(full.words[0].card).toEqual(before.card);expect(full.words[0].favorite).toBe(true);expect(full.words[0].suspended).toBe(true);expect(full.words[0].issue).toEqual(before.issue);expect(full.words[0].fields?.Hint).toBe('내 힌트');expect(getDay(full,key)).toEqual(day);expect(full.reviewHistory).toEqual(history);
 expect(mergeStudyDeck(full,legacy)).toBe(full);expect(migrateN3Deck(full)).toBe(full);
});
