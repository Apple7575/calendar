import {sampleBook} from '../lib/conceptLabContent';
import {validateCard,createLab,mergeLabContent,canStartLabCard} from '../lib/conceptLab';
import {sourceCorpus} from '../lib/conceptLabCorpus';
test('a concept can connect grammar understanding and a form unit without crossing into vocabulary',()=>{
 const source=sampleBook.cards.find(c=>c.id==='lab_sou_form')!;
 expect(validateCard({...source,unitId:'g-form'},sampleBook)).not.toContain('unknown_concept');
 expect(validateCard({...source,conceptId:'concept-holiday'},sampleBook)).toContain('unknown_concept');
});
test('labeled choices are legitimate alternatives but an answer-bearing context is not',()=>{
 const source=sampleBook.cards.find(c=>c.id==='lab_sou_cloze')!;
 const choice={...source,prompt:'雨が（　）。\na 降りそうだ\nb 降るそうだ',choices:['a 降りそうだ','b 降るそうだ']};
 expect(validateCard(choice,sampleBook)).not.toContain('answer_leak');
 expect(validateCard({...source,cue:{kind:'seen' as const,text:'정답은 降りそうだ'}},sampleBook)).toContain('answer_leak');
});
test('only source-verified corpus cards pass the app gate and upgrades preserve old state',()=>{
 for(const card of sourceCorpus.cards.filter(c=>c.status==='ready'))expect({id:card.id,errors:validateCard(card,sampleBook)}).toEqual({id:card.id,errors:[]});
 const state=createLab(),old=JSON.stringify(state),next=mergeLabContent(state);expect(next.attempts).toBe(state.attempts);expect(next.schedules).toBe(state.schedules);expect(JSON.stringify(state)).toBe(old);
 expect(sourceCorpus.cards.every(c=>c.origin==='textbook')).toBe(true);
});
test('a reviewed source card can be picked beyond the ranked queue and promoted without touching history',()=>{
 const source=sourceCorpus.cards.find(c=>c.status==='ready'&&!c.bundleId);if(!source)return;
 const state=createLab();state.cards[source.id]={...state.cards[source.id],status:'needs_review'};const next=mergeLabContent(state);
 expect(next.cards[source.id].status).toBe('ready');expect(next.schedules).toBe(state.schedules);expect(next.attempts).toBe(state.attempts);expect(canStartLabCard(next,source.id)).toBe(true);
 expect(canStartLabCard({...next,settings:{...next.settings,dailyNew:0}},source.id)).toBe(false);
 state.cards[source.id].quality={...source.quality,reviewer:'user-confirmed'};expect(mergeLabContent(state).cards[source.id].status).toBe('needs_review');
});
