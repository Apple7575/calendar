import {normalizeJapanese, targetOccurrences, isSinglePronunciation as exactPronunciation} from './pronunciation-utils.mjs';
export {targetOccurrences};

// ASR spelling can differ while the sound is identical (気づく / きずく,
// ケーキ / けいき). Preserve every mora: おおう must never match おお.
export function phoneticReading(value) {
 let result='';
 const vowels={a:'あかがさざただなはばぱまやらわぁゃゎ',i:'いきぎしじちぢにひびぴみりゐぃ',u:'うくぐすずつづぬふぶぷむゆるゔぅゅ',e:'えけげせぜてでねへべぺめれゑぇ',o:'おこごそぞとどのほぼぽもよろをぉょ'};
 const vowelOf=character=>Object.entries(vowels).find(([,letters])=>letters.includes(character))?.[0];
 for(let character of normalizeJapanese(value)) {
  character=character.replace('づ','ず').replace('ぢ','じ');
  const previousVowel=vowelOf(result.at(-1));
  if(character==='ー') character=({a:'あ',i:'い',u:'う',e:'え',o:'お'})[previousVowel]??character;
  else if(character==='い'&&previousVowel==='e') character='え';
  else if(character==='う'&&previousVowel==='o') character='お';
  result+=character;
 }
 return result;
}

export function isSinglePronunciation(row) {
 if(exactPronunciation(row))return true;
 const text=row.transcription??'';
 if(/[가-힣]/.test(text)||targetOccurrences(text,row.word,row.reading)>1)return false;
 const reading=String(row.reading??'').split(/[\/／]/)[0];
 const heard=row.judgment?.heardReading??row.heardReading??text;
 return !!reading&&phoneticReading(heard)===phoneticReading(reading);
}
