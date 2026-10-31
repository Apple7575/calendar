export const normalizeJapanese=s=>String(s??'').normalize('NFKC').replace(/[\s\p{P}\p{S}]/gu,'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
export function targetOccurrences(text,word,reading){
 const targets=[...new Set([word,reading].map(s=>normalizeJapanese(String(s).split(/[\/／]/)[0])).filter(Boolean))].sort((a,b)=>b.length-a.length);
 if(!targets.length)return 0;
 const pattern=targets.map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
 return [...normalizeJapanese(text).matchAll(new RegExp(pattern,'gu'))].length;
}
export function isSinglePronunciation(row){
 const text=row.transcription??'',reading=normalizeJapanese(String(row.reading??'').split(/[\/／]/)[0]);
 if(!reading||/[가-힣]/.test(text)||targetOccurrences(text,row.word,row.reading)>1)return false;
 const raw=normalizeJapanese(text),heard=normalizeJapanese(row.judgment?.heardReading??row.heardReading??'');
 const word=normalizeJapanese(String(row.word).split(/[\/／]/)[0]);
 if(raw===reading||raw===word)return true;
 if(targetOccurrences(text,row.word,row.reading)>0)return false;
 if(['はい','です','ください','もう一度','単語'].some(extra=>raw.includes(extra)&&!word.includes(extra)&&!reading.includes(extra)))return false;
 return heard===reading;
}
