import {boundedText,checkGenerated,checkGrade,reviewed} from '../../supabase/functions/concept-lab/protocol';
import {sampleBook} from '../lib/conceptLabContent';
describe('AI publication boundary',()=>{
 test('generation must be complete, N3-compatible structured text exercise',()=>{
  const parent=sampleBook.cards[2],draft=sampleBook.variants[1];
  expect(checkGenerated(draft,parent)).toBe(true);
  expect(checkGenerated({...draft,prompt:parent.prompt},parent)).toBe(false);
  expect(checkGenerated({...draft,accepted:[]},parent)).toBe(false);
  expect(checkGenerated({...draft,type:'audio'},parent)).toBe(false);
  expect(checkGenerated({...draft,prompt:'blank missing'},parent)).toBe(false);
  expect(checkGenerated({...draft,explanation:''},parent)).toBe(false);
 });
 test('independent review requires every criterion, uncertainty blocks publication',()=>{
  const review={natural:true,targetCorrect:true,sameDifficulty:true,unambiguous:true,noLeak:true,notDuplicate:true,contextChanged:true,selfContained:true};
  expect(reviewed(review)).toBe(true);expect(reviewed({...review,contextChanged:false})).toBe(false);expect(reviewed({natural:true})).toBe(false);
 });
 test('graded output cannot silently accept malformed confidence or long text',()=>{
  expect(checkGrade({correct:true,feedback:'의미와 접속이 맞아요.',confidence:0.9})).toBe(true);
  expect(checkGrade({correct:'true',feedback:'x',confidence:1})).toBe(false);
  expect(checkGrade({correct:true,feedback:'x',confidence:2})).toBe(false);
  expect(boundedText('x'.repeat(2001),2000)).toBe(false);
 });
});
