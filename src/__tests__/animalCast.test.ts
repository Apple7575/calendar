import {characterForAction,animalRoles} from '../features/routine/animalCast';
import type {AnimalCharacterId} from '../features/routine/animalAssets';
test('activity roles remain stable when the chosen home companion changes',()=>{
 for(const companion of ['C01','C02','C03','C04'] as AnimalCharacterId[]){
  expect(characterForAction('A11',companion)).toBe('C01');
  expect(characterForAction('A26',companion)).toBe('C02');
  expect(characterForAction('A36',companion)).toBe('C03');
  expect(characterForAction('A29',companion)).toBe('C03');
  expect(characterForAction('A30',companion)).toBe('C04');
  expect(characterForAction('A51',companion)).toBe('C04');
  expect(characterForAction('A02',companion)).toBe(companion);
 }
});
test('every character has a distinct role and an appropriate portrait action',()=>{
 expect(Object.keys(animalRoles)).toHaveLength(4);
 expect(new Set(Object.values(animalRoles).map(r=>r.label)).size).toBe(4);
 expect(animalRoles.C01.pose).toBe('A04');expect(animalRoles.C02.pose).toBe('A17');expect(animalRoles.C03.pose).toBe('A36');expect(animalRoles.C04.pose).toBe('A45');
});
