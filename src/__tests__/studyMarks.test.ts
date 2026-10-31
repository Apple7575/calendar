import deck from '../../assets/decks/n3-vocabulary.json';
import { emptyData,favoriteWord,flagWord,mergePublishedDeck } from '../lib/routineModel';
const published={...deck,schema:'routine.japanese-deck.v1' as const};
test('favorites and reports persist without changing FSRS and survive content updates',()=>{
 let data=mergePublishedDeck(emptyData(),published);const original=data.words[0],id=original.id;
 data=favoriteWord(data,id);data=flagWord(data,id,['audio','example','audio'],'두 번 읽어요');
 const restored=JSON.parse(JSON.stringify(data));
 data=mergePublishedDeck(restored,{...published,revision:'new-content'});
 expect(data.words.find(w=>w.id===id)).toMatchObject({favorite:true,issue:{categories:['audio','example'],note:'두 번 읽어요'},card:JSON.parse(JSON.stringify(original.card))});
 expect(data.days).toEqual({});
 data=flagWord(data,id,[],'');data=favoriteWord(data,id);
 expect(data.words.find(w=>w.id===id)?.issue).toBeUndefined();expect(data.words.find(w=>w.id===id)?.favorite).toBe(false);
});
