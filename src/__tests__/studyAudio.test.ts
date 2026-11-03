jest.mock('../../assets/decks/studyAudioAssets', () => ({ studyAudioAssets: {
  test: { Word:'価格',Word_Reading:'かかく',Sentence:'価格を調べます。',word:{name:'word.mp3',aliases:['old-word.mp3'],source:1},sentence:{name:'sentence.mp3',source:2} }
} }));
jest.mock('../../assets/decks/n2StudyAudioAssets', () => ({ n2StudyAudioAssets: {
  n2_hk_test: { Word:'価格',Word_Reading:'かかく',Sentence:'価格を調べます。',word:{name:'n2-word.mp3',source:3},sentence:{name:'n2-sentence.mp3',source:4} }
} }), { virtual: true });
import { normalizeNote } from '../lib/japaneseDeck';
import { resolveStudyAudio } from '../lib/studyAudio';
const original = () => normalizeNote({ID:'test',Word:'価格',Word_Reading:'かかく',Sentence:'価格を調べます。',Word_Audio:'[sound:word.mp3]',Sentence_Audio:'[sound:sentence.mp3]'},0);
test('N2 resolves its own recordings while matching N3 text cannot share or replace audio',()=>{
  const n2 = {...original(),ID:'n2_hk_test',Word_Audio:'[sound:n2-word.mp3]',Sentence_Audio:'[sound:n2-sentence.mp3]'};
  expect(resolveStudyAudio(n2,'word')).toBe(3);
  expect(resolveStudyAudio(n2,'sentence')).toBe(4);
  expect(resolveStudyAudio({...n2,Word_Audio:'[sound:word.mp3]'},'word')).toBeNull();
  expect(resolveStudyAudio({...n2,Word_Reading:'ちがう'},'word')).toBeNull();
  expect(resolveStudyAudio(original(),'word')).toBe(1);
});
test('selects different reviewed recordings for a word and its sentence',()=>{
  expect(resolveStudyAudio(original(),'word')).toBe(1);
  expect(resolveStudyAudio(original(),'sentence')).toBe(2);
});
test('existing imported notes with blank audio fields still resolve by reviewed content',()=>{
  expect(resolveStudyAudio({...original(),Word_Audio:'',Sentence_Audio:''},'word')).toBe(1);
});

test('a known replaced recording resolves to its new file without reimporting the deck',()=>{
  expect(resolveStudyAudio({...original(),Word_Audio:'[sound:old-word.mp3]'},'word')).toBe(1);
  expect(resolveStudyAudio({...original(),Word_Audio:'[sound:old-word.mp3]',Word_Reading:'ちがう'},'word')).toBeNull();
});
test('never plays stale audio after the target reading or word changes',()=>{
  expect(resolveStudyAudio({...original(),Word_Reading:'ちがう'},'word')).toBeNull();
  expect(resolveStudyAudio({...original(),Word:'価額'},'sentence')).toBeNull();
});
test('changed example invalidates sentence audio while preserving word audio',()=>{
  const changed={...original(),Sentence:'例文を変更しました。'};
  expect(resolveStudyAudio(changed,'sentence')).toBeNull();expect(resolveStudyAudio(changed,'word')).toBe(1);
});
test('an explicit different recording is not silently replaced with the bundled one',()=>{
  expect(resolveStudyAudio({...original(),Word_Audio:'[sound:other.mp3]'},'word')).toBeNull();
});
test('unknown IDs and ordinary unstructured cards have no recording',()=>{
  expect(resolveStudyAudio({...original(),ID:'missing'},'word')).toBeNull();
  expect(resolveStudyAudio(undefined,'word')).toBeNull();
});
