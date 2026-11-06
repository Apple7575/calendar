import {backupMessage} from '../lib/backupMessage';

// S1-06 ②(팀장 2026-11-07 "추천대로"): 파일 고르기를 취소해도 "완료했어요."가 뜨던 것을 고친다. 무엇이 됐는지 말한다.
const AT=new Date(2026,10,7,15,12).getTime();

describe('백업 화면 결과 문구',()=>{
 test('취소하면 아무 말도 하지 않는다',()=>{
  expect(backupMessage('import',{ok:false,cancelled:true},AT)).toBe('');
 });
 test('지금 백업은 시각과 함께',()=>{
  expect(backupMessage('backup',{ok:true},AT)).toBe('백업했어요 · 오후 3:12');
 });
 test('복구·파일 만들기·파일 복구는 무엇이 됐는지 말한다',()=>{
  expect(backupMessage('restore',{ok:true},AT)).toBe('최근 백업으로 복구했어요');
  // 공유 창을 닫았는지는 앱이 알 수 없어서 "만들었어요"까지만 말한다.
  expect(backupMessage('export',{ok:true},AT)).toBe('백업 파일을 만들었어요');
  expect(backupMessage('import',{ok:true},AT)).toBe('백업 파일로 복구했어요');
 });
 test('실패하면 그 이유를 그대로 보여 준다',()=>{
  expect(backupMessage('import',{ok:false,error:'20MB 이하의 파일을 선택해 주세요.'},AT)).toBe('20MB 이하의 파일을 선택해 주세요.');
  expect(backupMessage('backup',{ok:false},AT)).toBe('처리하지 못했어요. 다시 시도해 주세요.');
 });
 test('오전 시각',()=>{
  expect(backupMessage('backup',{ok:true},new Date(2026,10,7,9,5).getTime())).toBe('백업했어요 · 오전 9:05');
 });
});
