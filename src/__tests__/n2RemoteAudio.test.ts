jest.mock('expo-file-system/legacy',()=>({}));
jest.mock('../lib/supabase',()=>({supabase:{}}));
jest.mock('../../assets/decks/remoteStudyAudio.json',()=>({
  n3_test:{Word:'価格',Word_Reading:'かかく',Sentence:'価格を調べます。',word:'n3-word.mp3',sentence:'n3-sentence.mp3'},
}));
jest.mock('../../assets/decks/n2RemoteStudyAudio.json',()=>({
  n2_hk_test:{Word:'価格',Word_Reading:'かかく',Sentence:'価格を調べます。',word:'n2-word.mp3',sentence:'n2-sentence.mp3'},
}),{virtual:true});
import { normalizeNote } from '../lib/japaneseDeck';
import { remoteAudioName } from '../lib/remoteStudyAudio';

test('remote names stay separate even when N2 and N3 contain the same word',()=>{
  const n2=normalizeNote({ID:'n2_hk_test',Word:'価格',Word_Reading:'かかく',Sentence:'価格を調べます。',Word_Audio:'[sound:n2-word.mp3]',Sentence_Audio:'[sound:n2-sentence.mp3]'},0);
  expect(remoteAudioName(n2,'word')).toBe('n2-word.mp3');
  expect(remoteAudioName(n2,'sentence')).toBe('n2-sentence.mp3');
  expect(remoteAudioName({...n2,Word_Audio:'[sound:n3-word.mp3]'},'word')).toBeNull();
  expect(remoteAudioName({...n2,Word_Reading:'かがく'},'word')).toBeNull();
  expect(remoteAudioName({...n2,Sentence:'例文を変えました。'},'sentence')).toBeNull();
  expect(remoteAudioName({...n2,ID:'n3_test',Word_Audio:'',Sentence_Audio:''},'word')).toBe('n3-word.mp3');
});
