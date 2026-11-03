import {newJapaneseSample,recordJapaneseAnswer,moveJapaneseSample,japaneseSampleSummary,japaneseSampleConcepts,japaneseSampleNovelConcepts,japaneseNovelCorrect,japaneseRetryQueue,recordJapaneseRetry} from '../lib/japaneseSample';

describe('Japanese guided sample',()=>{
 it('keeps familiar and new-context results separate and preserves a completed session',()=>{
  let s=newJapaneseSample('session-1');
  s=recordJapaneseAnswer(s,{id:'review-decision',conceptId:'decision',kind:'familiar',correct:true,reason:undefined});
  s=recordJapaneseAnswer(s,{id:'apply-decision',conceptId:'decision',kind:'novel',correct:false,reason:'文法が混同'});
  expect(japaneseSampleSummary(s)).toMatchObject({familiar:{correct:1,total:1},novel:{correct:0,total:1}});
  s=moveJapaneseSample(s,4);const same=moveJapaneseSample(s,4);
  expect(same.id).toBe('session-1');expect(same.answers).toEqual(s.answers);
  expect((same as unknown as Record<string,unknown>).rewardMinutes).toBeUndefined();
 });
 it('updates a response rather than counting it twice',()=>{
  let s=newJapaneseSample('session-2');const a={id:'question',conceptId:'decision',kind:'novel' as const,correct:false};
  s=recordJapaneseAnswer(s,a);s=recordJapaneseAnswer(s,{...a,correct:true});
  expect(s.answers).toHaveLength(1);expect(japaneseSampleSummary(s).novel).toEqual({correct:1,total:1});
 });
 describe('wrong-answer review',()=>{
  const wrong=(id:string,kind:'familiar'|'novel')=>({id,conceptId:'c',kind,correct:false});
  const base=()=>{let s=newJapaneseSample('r');
   s=recordJapaneseAnswer(s,wrong('familiar-a','familiar'));
   s=recordJapaneseAnswer(s,{id:'familiar-b',conceptId:'c',kind:'familiar',correct:true});
   s=recordJapaneseAnswer(s,wrong('novel-c','novel'));
   s=recordJapaneseAnswer(s,{id:'reading-x',conceptId:'c',kind:'reading',correct:false});
   s=recordJapaneseAnswer(s,{id:'speaking-y',conceptId:'c',kind:'speaking',correct:false});
   return s;};
  const ids=(s:ReturnType<typeof base>)=>japaneseRetryQueue(s).map(a=>a.id);
  it('queues only wrong cards, not reading or speaking',()=>{
   expect(ids(base())).toEqual(['familiar-a','novel-c']);
  });
  it('repeats a card until it is answered correctly and moves a missed card behind the others',()=>{
   let s=base();
   s=recordJapaneseRetry(s,{id:'familiar-a',correct:false});
   expect(ids(s)).toEqual(['novel-c','familiar-a']);
   s=recordJapaneseRetry(s,{id:'novel-c',correct:true,selected:'c'});
   expect(ids(s)).toEqual(['familiar-a']);
   s=recordJapaneseRetry(s,{id:'familiar-a',correct:false});
   expect(ids(s)).toEqual(['familiar-a']);
   s=recordJapaneseRetry(s,{id:'familiar-a',correct:true});
   expect(ids(s)).toEqual([]);
  });
  it('keeps first-try results and reports retried cards separately',()=>{
   let s=base();const first=japaneseSampleSummary(s);
   s=recordJapaneseRetry(s,{id:'familiar-a',correct:false});
   s=recordJapaneseRetry(s,{id:'familiar-a',correct:true});
   s=recordJapaneseRetry(s,{id:'novel-c',correct:true});
   const after=japaneseSampleSummary(s);
   expect(after.familiar).toEqual(first.familiar);expect(after.novel).toEqual(first.novel);
   expect(after.retried).toBe(2);expect(first.retried).toBe(0);
   expect(s.answers.find(a=>a.id==='familiar-a')?.correct).toBe(false);
  });
  it('treats a saved session without retries as a fresh queue',()=>{
   const old=base();expect(old.retries).toBeUndefined();
   expect(ids(old)).toEqual(['familiar-a','novel-c']);
  });
 });
 it('marks a concept as unconfirmed exactly when its textbook evidence is needs_review',()=>{
  const corpus=require('../../assets/concept-lab/sourceCorpus.json') as {concepts:{id:string;evidenceIds:string[]}[];extractions:{id:string;source:{status:string}}[]};
  const flags=(japaneseSampleConcepts as {id:string;sourceId:string;sourceNeedsReview?:boolean}[]).map(item=>{
   const concept=corpus.concepts.find(row=>row.id===item.sourceId)!;
   const needsReview=concept.evidenceIds.some(id=>corpus.extractions.find(row=>row.id===id)?.source.status==='needs_review');
   return [item.id,!!item.sourceNeedsReview,needsReview];
  });
  flags.forEach(([,shown,actual])=>expect(shown).toBe(actual));
  expect(flags.filter(row=>row[2]).map(row=>row[0])).toEqual(['intention']);
 });
 it('asks every new situation once without matching the fixed option order',()=>{
  const options=japaneseSampleConcepts.map(c=>c.id),order=japaneseSampleNovelConcepts.map(c=>c.id);
  expect([...order].sort()).toEqual([...options].sort());
  order.forEach((id,position)=>expect(options[position]).not.toBe(id));
 });
 it('counts a new situation as applied only with the right expression and a positive self-rating',()=>{
  expect(japaneseNovelCorrect('decision','decision',true)).toBe(true);
  expect(japaneseNovelCorrect('decision','decision',false)).toBe(false);
  expect(japaneseNovelCorrect('arrangement','decision',true)).toBe(false);
 });
});
