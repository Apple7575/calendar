import {Rating} from 'ts-fsrs';
import {sampleBook} from '../lib/conceptLabContent';
import {createLab,mergeLabContent,labQueue,validateCard,beginLab,flipLab,finishLab} from '../lib/conceptLab';
import {expansionCards,expansionConcepts} from '../lib/conceptLabExpansion';
import {listeningAssets} from '../lib/conceptLabListening';
const now=new Date('2026-11-03T09:00:00Z');
test('expansion has linked grammar objectives and complete question bundles; all ready cards validate',()=>{
 expect(expansionConcepts.length).toBeGreaterThanOrEqual(40);
 expect(expansionCards.filter(c=>c.ability==='grammar').length).toBe(expansionConcepts.length);
 expect(new Set(sampleBook.cards.map(c=>c.id)).size).toBe(sampleBook.cards.length);
 for(const c of sampleBook.cards.filter(c=>c.status==='ready'))expect({id:c.id,errors:validateCard(c,sampleBook)}).toEqual({id:c.id,errors:[]});
 for(const b of sampleBook.bundles)for(const id of b.questionIds)expect(sampleBook.cards.find(c=>c.id===id)?.bundleId).toBe(b.id);
});
test('upgrading adds missing cards without overwriting edits, reports, responses or FSRS',()=>{
 const s=createLab(now),id='lab_sou_form';s.cards[id]={...s.cards[id],prompt:'my edit',status:'disabled'};
 delete s.cards[expansionCards[0].id];s.reports.push({cardId:id,at:now.toISOString(),note:'keep'});
 const old=JSON.stringify(s),merged=mergeLabContent(s);
 expect(merged.cards[expansionCards[0].id]).toEqual(expansionCards[0]);expect(merged.cards[id]).toEqual(s.cards[id]);
 expect(merged.attempts).toBe(s.attempts);expect(merged.schedules).toBe(s.schedules);expect(merged.reports).toBe(s.reports);expect(JSON.stringify(s)).toBe(old);
 expect(mergeLabContent(merged)).toBe(merged);
});
test('non-vocabulary focus excludes fresh word cards but preserves due word reviews',()=>{
 let s=mergeLabContent(createLab(now));s.settings.dailyNew=30;
 expect(labQueue(s,now).some(id=>s.cards[id].unitId.startsWith('v-'))).toBe(false);
 const all=createLab(now);let studied=beginLab(all,['lab_holiday_read'],now);studied=flipLab(studied,1000,false);studied=finishLab(studied,[{correct:false,grade:Rating.Again}],now);
 s=mergeLabContent(studied);expect(labQueue(s,new Date(+now+600000))).toContain('lab_holiday_read');
});
test('synthetic audio is registered and does not substitute for the missing original; bundle feedback stays hidden',()=>{
 expect(Object.keys(listeningAssets).length).toBeGreaterThanOrEqual(3);
 for(const id of ['lab_listening_trip','lab_listening_library','lab_listening_offer'])expect(listeningAssets[id]?.origin).toBe('synthetic');
 expect(sampleBook.cards.find(c=>c.id==='lab_listen_original')?.status).toBe('needs_review');
 let s=mergeLabContent(createLab(now));s.settings.dailyNew=30;
 const b=sampleBook.bundles.find(b=>b.id==='bundle-listen-trip')!;
 expect(b.origin).toBe('ai');expect(listeningAssets[b.audioAssetId!].origin).toBe('synthetic');
 expect(()=>beginLab(s,[b.questionIds[0]],now)).toThrow();
 s=beginLab(s,b.questionIds,now);s=flipLab(s,1000,false);expect(s.session!.revealed).toBe(false);s=flipLab(s,1000,false);expect(s.session!.revealed).toBe(true);
 const card=s.cards[b.questionIds[0]];expect(validateCard({...card,audioAssetId:'unknown'},sampleBook)).toContain('missing_audio');
});
