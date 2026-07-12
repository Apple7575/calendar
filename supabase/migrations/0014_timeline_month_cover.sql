-- 인생 타임라인 '월' + 일기 대표사진
-- 0013_life_records.sql 실행 후 이 파일을 실행한다.

alter table public.life_events
  add column if not exists month int check (month between 1 and 12);

-- 대표사진: 그 날의 캘린더 꾸미기 배경으로 쓰이는 사진
alter table public.diary_photos
  add column if not exists is_cover boolean not null default false;
