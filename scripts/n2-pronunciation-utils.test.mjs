import test from 'node:test';
import assert from 'node:assert/strict';
import {isSinglePronunciation} from './n2-pronunciation-utils.mjs';

test('accepts identical Japanese sounds with alternative ASR spelling',()=>{
 assert.equal(isSinglePronunciation({word:'築く',reading:'きずく',transcription:'気づく',heardReading:'きづく'}),true);
 assert.equal(isSinglePronunciation({word:'契機',reading:'けいき',transcription:'ケーキ'}),true);
});
test('does not lose mora length, consonants, repeats or extra speech',()=>{
 for(const [reading,transcription] of [['おおう','おお'],['でんえん','でんげん'],['じゅじゅ','じゅうじゅう'],['けいき','ケーキ ケーキ'],['きずく','きつく'],['つきる','すきる'],['よす','よすです']]) {
  assert.equal(isSinglePronunciation({word:'テスト',reading,transcription}),false,reading+': '+transcription);
 }
});
