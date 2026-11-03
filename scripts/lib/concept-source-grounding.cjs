const normalize=text=>String(text??'').normalize('NFKC').replace(/[^ぁ-ゖァ-ヺ一-龯々0-9]/g,'');
function overlap(quote,source){const q=normalize(quote),s=normalize(source);if(!q)return 0;if(q.length<9)return s.includes(q)?1:0;const grams=new Set(Array.from({length:q.length-1},(_,i)=>q.slice(i,i+2)));let hit=0;for(const gram of grams)if(s.includes(gram))hit++;return hit/grams.size;}
function check({quote,localText,contextText,mainHangul=0,mainKana=0,kind}){
 const local=overlap(quote,localText),context=overlap(quote,contextText),length=normalize(quote).length;
 const koreanDominant=mainHangul>100&&mainHangul>5*Math.max(1,mainKana);
 if(length<3)return {pass:false,local,context,reason:'원문 대조할 일본어 근거 부족'};
 if(koreanDominant&&length>60&&local<.85)return {pass:false,local,context,reason:'한국어 해석 본문에서 일본어 원문을 재구성한 것으로 의심'};
 if(kind==='concept'&&local<.45)return {pass:false,local,context,reason:'개념의 일본어 원문과 로컬 OCR 불일치'};
 if(local<.30||context<.52)return {pass:false,local,context,reason:'질문·지문·대본의 일본어 근거와 로컬 OCR 불일치'};
 return {pass:true,local,context,reason:''};
}
module.exports={normalize,overlap,check};
