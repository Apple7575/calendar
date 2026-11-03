import {newJapaneseSample,recordJapaneseAnswer,moveJapaneseSample,japaneseSampleSummary} from '../lib/japaneseSample';

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
});
