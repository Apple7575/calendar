import {restoreThemeId,THEMES} from '../theme/themes';

// 팀장 결정(2026-11-06): 옛 테마 4개를 뺀다. 옛 테마를 저장해 둔 사용자는 다크(기본)로 연다.
describe('저장된 테마 읽기',()=>{
 test('설정에는 다크와 라이트만 남는다',()=>{
  expect(THEMES.map(t=>t.id)).toEqual(['dark','routine']);
  expect(THEMES.find(t=>t.id==='routine')!.isDark).toBe(false);
 });
 test.each(['lavender','classic','peach','mint'])('옛 테마 %s는 다크로 연다',old=>{
  expect(restoreThemeId(old,null)).toBe('dark');
 });
 test('다크와 라이트는 그대로 연다',()=>{
  expect(restoreThemeId('dark',null)).toBe('dark');
  expect(restoreThemeId('routine',null)).toBe('routine');
 });
 test('저장값이 없거나 깨졌으면 다크로 연다',()=>{
  expect(restoreThemeId(null,null)).toBe('dark');
  expect(restoreThemeId('',null)).toBe('dark');
  expect(restoreThemeId('{"broken":',null)).toBe('dark');
 });
 test('예전 키(theme.id)는 다크만 이어받는다',()=>{
  expect(restoreThemeId(null,'dark')).toBe('dark');
  expect(restoreThemeId(null,'lavender')).toBe('dark');
 });
});
