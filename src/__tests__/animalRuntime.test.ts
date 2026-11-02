import {animalCharacters,animalClip,loadAnimalClip,sharedClips} from '../features/routine/animalAssets';
import {routineAnimalAction,legacyAnimalActions} from '../features/routine/animalScene';
test('all supplied character and action IDs resolve with exact duration, loop and representative frame metadata',()=>{
 expect(animalCharacters.map(c=>c.id)).toEqual(['C01','C02','C03','C04']);
 for(const character of animalCharacters){
  expect(Object.keys(character.actions)).toHaveLength(60);
  for(const action of Object.keys(character.actions) as (keyof typeof character.actions)[]){
   const clip=animalClip(character.id,action),source=loadAnimalClip(character.id,action);
   expect(source.op-source.ip).toBe(clip.frames);expect((source.op-source.ip)/source.fr).toBeCloseTo(clip.duration_seconds,2);expect(clip.poster_frame).toBeGreaterThanOrEqual(source.ip);expect(clip.poster_frame).toBeLessThan(source.op);expect(typeof clip.loop).toBe('boolean');expect(clip.bitmap_assets).toBe(0);
  }
 }
});
test('completion and sleepy motion follow manifest instead of old looping rules',()=>{
 for(const character of animalCharacters)for(const action of ['A24','A25','A26','A27','A28','A29','A30','A05'] as const)expect(animalClip(character.id,action).loop).toBe(false);
 expect(animalClip('C01','A01').loop).toBe(true);expect(animalClip('C02','A36').loop).toBe(true);
 expect(legacyAnimalActions.sleepy).toBe('A05');
});
test('routine actions use activity-specific files, including custom step titles',()=>{
 expect(routineAnimalAction('bed')).toBe('A11');expect(routineAnimalAction('wash')).toBe('A12');expect(routineAnimalAction('meditation')).toBe('A16');expect(routineAnimalAction('write')).toBe('A18');expect(routineAnimalAction('custom','칫솔 준비하고 양치')).toBe('A12');
});
test('shared backgrounds and effects are JSON with no external bitmap dependency',()=>{
 expect(Object.keys(sharedClips)).toHaveLength(30);
 for(const load of Object.values(sharedClips)){const source=load();expect(source.fr).toBeGreaterThan(0);expect(source.op).toBeGreaterThan(source.ip);expect((source.assets??[]).filter((a:{p?:string})=>a.p)).toHaveLength(0);}
});
