import {Rating} from 'ts-fsrs';
import {sampleBook} from '../lib/conceptLabContent';
import {createLab} from '../lib/conceptLab';
import {labCardFace,labCardSummary,labIntervalLabel} from '../lib/conceptLabPresentation';
import {briefCardExample} from '../lib/conceptLabBriefExamples';
test('basic word cards use the original word/reading/meaning presentation; reverse preserves direction',()=>{
 expect(labCardFace(sampleBook.cards.find(c=>c.id==='lab_holiday_read')!)).toMatchObject({front:'休日',reading:'きゅうじつ',back:'휴일',large:true});
 expect(labCardFace(sampleBook.cards.find(c=>c.id==='lab_holiday_reverse')!)).toMatchObject({front:'휴일',back:'休日（きゅうじつ）'});
});
test('listening and edited cards never receive an answer-bearing word heading',()=>{
 const audio=sampleBook.cards.find(c=>c.id==='lab_audio')!;expect(labCardFace(audio).front).toBe(audio.prompt.replace(/。(?=[^\n])/g,'。\n'));expect(labCardFace(audio).reading).toBeUndefined();
 const edited={...sampleBook.cards[0],prompt:'수정한 질문',quality:{...sampleBook.cards[0].quality,reviewer:'user-confirmed'}};
 expect(labCardFace(edited).front).toBe('수정한 질문');
});
test('full wording returns after withdrawing the brief rule without changing stored content',()=>{
 const card=sampleBook.cards.find(c=>c.id==='lab_sou_form')!,before=JSON.stringify(card);
 expect(briefCardExample(card)).toBeUndefined();
 expect(labCardFace(card).front).toBe(card.prompt.replace(/。(?=[^\n])/g,'。\n'));
 expect(labCardSummary(card)).toBe(labCardFace(card).front);
 expect(labCardSummary(card)).not.toContain(card.answer);expect(JSON.stringify(card)).toBe(before);
 const edited={...card,prompt:'직접 수정한 조건은 그대로',quality:{...card.quality,reviewer:'user-confirmed'}};
 expect(labCardSummary(edited)).toBe(edited.prompt);
});
test('hinted interval previews respect the actual Hard cap without changing history',()=>{
 const now=new Date('2026-11-03T10:00:00Z'),s=createLab(now),before=JSON.stringify(s);
 expect(labIntervalLabel(s,'lab_holiday_read',Rating.Easy,true,now)).toBe(labIntervalLabel(s,'lab_holiday_read',Rating.Hard,false,now));
 expect(labIntervalLabel(s,'lab_holiday_read',Rating.Again,false,now)).toMatch(/분 후/);expect(JSON.stringify(s)).toBe(before);
});
