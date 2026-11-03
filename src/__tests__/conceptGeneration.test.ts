import {Rating} from 'ts-fsrs';
import {answerLab,beginLab,createLab,finishLab,revealLab} from '../lib/conceptLab';
import {sampleBook} from '../lib/conceptLabContent';
import {generationSuggestions,prepareGenerationPlan,stageGeneratedCard,acceptGeneratedDraft,discardGeneratedDraft,conceptTrends,reviewGeneratedDraft,generationCountToday,recordGenerationRun} from '../lib/conceptGeneration';
const now=new Date('2026-11-03T09:00:00Z');
function wrong(){let s=beginLab(createLab(now),['lab_sou_form'],now);s=answerLab(s,'',1000,false);s=revealLab(s);return finishLab(s,[{correct:false,grade:Rating.Again}],now);}
test('opening recommendations never generates cards and selections start empty',()=>{
 const s=wrong(),before=JSON.stringify(s),items=generationSuggestions(s,now);expect(items.length).toBeGreaterThan(0);expect(items[0].conceptId).toBe('concept-sou');expect(items.every(i=>i.reason.length>0)).toBe(true);expect(JSON.stringify(s)).toBe(before);
 expect(()=>prepareGenerationPlan(s,[],now)).toThrow();expect(generationSuggestions(createLab(now),now)).toHaveLength(0);
});
test('only selected targets are planned, with no duplicate selection or over-limit request',()=>{
 const s=wrong(),items=generationSuggestions(s,now),target=items[0];
 expect(prepareGenerationPlan(s,[target.id],now)).toHaveLength(1);expect(()=>prepareGenerationPlan(s,[target.id,target.id],now)).toThrow();expect(()=>prepareGenerationPlan(s,['unknown'],now)).toThrow();s.settings.dailyVariants=0;expect(()=>prepareGenerationPlan(s,[target.id],now)).toThrow();
});
test('generated results stay outside study until accepted; history and schedule are preserved',()=>{
 const s=wrong(),target=generationSuggestions(s,now).find(i=>i.parentId==='lab_sou_form')!;
 const card={...sampleBook.variants.find(c=>c.id==='lab_sou_variant')!,id:'lab_ai_test'};
 const staged=stageGeneratedCard(s,target,card,'request-1',now);expect(staged.cards[card.id]).toBeUndefined();expect(staged.generatedDrafts![0].status).toBe('ready');
 expect(()=>acceptGeneratedDraft(staged,'request-1',now)).toThrow();const accepted=acceptGeneratedDraft(reviewGeneratedDraft(staged,'request-1',now),'request-1',now);expect(accepted.cards[card.id].parentId).toBe('lab_sou_form');expect(accepted.attempts).toEqual(s.attempts);expect(accepted.schedules).toEqual(s.schedules);
 expect(acceptGeneratedDraft(accepted,'request-1',now)).toBe(accepted);
 const discarded=discardGeneratedDraft(staged,'request-1');expect(discarded.cards[card.id]).toBeUndefined();expect(discarded.generatedDrafts![0].status).toBe('discarded');expect(()=>acceptGeneratedDraft(discarded,'request-1',now)).toThrow();
});
test('invalid generation preserves everything and duplicate response is idempotent',()=>{
 const s=wrong(),target=generationSuggestions(s,now)[0],bad={...sampleBook.variants[1],conceptId:'different'},before=JSON.stringify(s);expect(()=>stageGeneratedCard(s,target,bad,'x',now)).toThrow();expect(JSON.stringify(s)).toBe(before);
 const good={...sampleBook.variants[1],id:'lab_ai_one',parentId:target.parentId,type:target.type,ability:target.ability};const next=stageGeneratedCard(s,target,good,'x',now);expect(stageGeneratedCard(next,target,good,'x',now)).toBe(next);
});
test('concept trends compare matched seven-day windows, mark sparse evidence and count unseen variants separately',()=>{
 const s=wrong(),a=s.attempts[0];s.attempts=[...Array.from({length:3},(_,i)=>({...a,id:`old${i}`,at:'2026-10-25T09:00:00Z',correct:false})),...Array.from({length:3},(_,i)=>({...a,id:`new${i}`,at:'2026-11-02T09:00:00Z',correct:true,novel:i===0,firstSeen:i===0}))];
 const trend=conceptTrends(s,now).find(t=>t.id==='concept-sou')!;expect(trend.previous.total).toBe(3);expect(trend.current.correct).toBe(3);expect(trend.change).toBe(100);expect(trend.status).toBe('improved');expect(trend.current.novelFirst.total).toBe(1);expect(trend.abilities.form.current.total).toBe(3);
 expect(conceptTrends(createLab(now),now)[0].status).toBe('insufficient');
});
test('repeat confusion and listening errors produce explicit supported or unavailable targets',()=>{
 const s=wrong(),a=s.attempts[0];s.attempts.push({...a,id:'repeat',reason:'confusion'});let choices=generationSuggestions(s,now);expect(choices.some(t=>t.strategy==='reinforce')).toBe(true);expect(choices.some(t=>t.strategy==='contrast')).toBe(true);
 const audio=sampleBook.cards.find(c=>c.id==='lab_audio')!;s.attempts=[{...a,cardId:audio.id,conceptId:audio.conceptId,ability:'listening'}];choices=generationSuggestions(s,now);expect(choices.find(t=>t.strategy==='listening')!.blocked).toBeTruthy();expect(s.cards[choices.find(t=>t.strategy==='transfer')!.parentId].type).not.toBe('audio');
 s.cards[audio.id]={...audio,status:'disabled'};expect(generationSuggestions(s,now)).toHaveLength(0);
});
test('a batch uses only its planned targets; future suggestions respect pending drafts and cooldown',()=>{
 const s=wrong(),targets=prepareGenerationPlan(s,generationSuggestions(s,now).map(t=>t.id),now);expect(targets).toHaveLength(2);
 let staged=stageGeneratedCard(s,targets[0],{...sampleBook.variants[1],id:'lab_first'},'run1',now);
 const second={...sampleBook.cards.find(c=>c.id==='lab_sou_apply')!,id:'lab_second',parentId:targets[1].parentId,novel:true,prompt:'친구에게 새 소식을 전하는 상황. 보통형과 そうだ로 전달해 보세요.'};
 staged=stageGeneratedCard(staged,targets[1],second,'run2',now);expect(staged.generatedDrafts).toHaveLength(2);expect(generationSuggestions(staged,now).every(t=>t.blocked)).toBe(true);expect(generationCountToday(staged,now)).toBe(2);
 staged=recordGenerationRun(staged,{id:'run1',targetId:targets[0].id,at:now.toISOString(),status:'running'});expect(generationCountToday(staged,now)).toBe(2);
 staged=recordGenerationRun(staged,{id:'run1',targetId:targets[0].id,at:now.toISOString(),status:'failed',message:'network'});expect(staged.generationRuns).toHaveLength(1);expect(generationCountToday(staged,new Date(+now+86400000))).toBe(0);
});
test('duplicates, modified originals and unreviewed result acceptance are blocked',()=>{
 const s=wrong(),target=generationSuggestions(s,now)[0];expect(()=>stageGeneratedCard(s,target,{...sampleBook.variants[1],id:'lab_duplicate',prompt:s.cards.lab_sou_cloze.prompt},'x',now)).toThrow('중복');
 s.cards.lab_sou_form={...s.cards.lab_sou_form,quality:{...s.cards.lab_sou_form.quality,reviewer:'user-confirmed'}};expect(generationSuggestions(s,now).every(t=>!!t.blocked)).toBe(true);expect(discardGeneratedDraft(s,'unknown')).toBe(s);expect(()=>acceptGeneratedDraft(s,'unknown',now)).toThrow();
});
test('concept changes honor corrections, distinguish decline from stability and never reset progress',()=>{
 const s=wrong(),a=s.attempts[0],old=Array.from({length:3},(_,i)=>({...a,id:`old-${i}`,at:'2026-10-25T09:00:00Z',correct:true})),recent=Array.from({length:3},(_,i)=>({...a,id:`new-${i}`,at:'2026-11-02T09:00:00Z',correct:false}));s.attempts=[...old,...recent];const schedules=JSON.stringify(s.schedules);
 expect(conceptTrends(s,now).find(t=>t.id===a.conceptId)!.status).toBe('declined');s.corrections=recent.map(r=>({attemptId:r.id,at:now.toISOString(),correct:true,grade:Rating.Good,note:'corrected'}));expect(conceptTrends(s,now).find(t=>t.id===a.conceptId)!.status).toBe('stable');expect(JSON.stringify(s.schedules)).toBe(schedules);
});
