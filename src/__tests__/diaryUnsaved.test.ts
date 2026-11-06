import {diarySnapshot,hasUnsavedDiary} from '../lib/diaryUnsaved';

// S1-06 ①(팀장 2026-11-07 "추천대로"): 일기를 쓰다 닫기·밀어서 뒤로 가면 확인 없이 글이 사라지던 것. 바뀐 게 있을 때만 묻는다.
const loaded=diarySnapshot({content:'오늘은 비',mood:'calm',highlight:'',energy:3,sleepHours:7,people:['민수'],gratitude:''});

describe('일기에 저장하지 않은 내용이 있나',()=>{
 test('불러온 그대로면 묻지 않는다',()=>{
  expect(hasUnsavedDiary(loaded,diarySnapshot({content:'오늘은 비',mood:'calm',highlight:'',energy:3,sleepHours:7,people:['민수'],gratitude:''}))).toBe(false);
 });
 test('글·기분·한 줄·기운·잠·사람·감사 중 하나라도 바뀌면 묻는다',()=>{
  const base={content:'오늘은 비',mood:'calm',highlight:'',energy:3,sleepHours:7,people:['민수'],gratitude:''};
  for(const change of [{content:'오늘은 비. 우산'},{mood:'happy'},{highlight:'비 오는 날'},{energy:4},{sleepHours:6},{people:['민수','지은']},{gratitude:'따뜻한 차'}])
   expect(hasUnsavedDiary(loaded,diarySnapshot({...base,...change}))).toBe(true);
 });
 test('앞뒤 빈칸만 다르면 바뀐 것으로 보지 않는다',()=>{
  expect(hasUnsavedDiary(loaded,diarySnapshot({content:'오늘은 비\n',mood:'calm',highlight:' ',energy:3,sleepHours:7,people:['민수'],gratitude:''}))).toBe(false);
 });
 test('아직 올리지 않은 사진이나 입력 중인 글자가 있으면 묻는다',()=>{
  expect(hasUnsavedDiary(loaded,loaded,{pendingPhotos:1})).toBe(true);
  expect(hasUnsavedDiary(loaded,loaded,{typing:['지은']})).toBe(true);
  expect(hasUnsavedDiary(loaded,loaded,{pendingPhotos:0,typing:['',' ']})).toBe(false);
 });
 test('아직 불러오는 중(불러온 값이 없음)이면 묻지 않는다',()=>{
  expect(hasUnsavedDiary(null,loaded)).toBe(false);
 });
});
