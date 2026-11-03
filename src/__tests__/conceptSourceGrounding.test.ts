const {check}=require('../../scripts/lib/concept-source-grounding.cjs');
test('Japanese source remains grounded with furigana/noise inserted, but a reconstructed Korean translation is held',()=>{
 const quote='明日は図書館が休みなので、本を返しに行くのは火曜日にします。';
 expect(check({quote,localText:quote,contextText:quote,mainHangul:20,mainKana:100,kind:'reading'}).pass).toBe(true);
 const translation='내일은 도서관이 쉬는 날이므로 화요일에 책을 반납하러 갑니다.';
 expect(check({quote,localText:translation,contextText:quote,mainHangul:200,mainKana:0,kind:'reading'}).pass).toBe(false);
});
test('the adjacent source page cannot by itself establish a concept on the wrong page',()=>{
 const quote='雨が降っても、試合は続きます。';
 expect(check({quote,localText:'図書館の利用時間が変わります。',contextText:quote,kind:'concept'}).pass).toBe(false);
});
