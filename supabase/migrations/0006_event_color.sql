-- 일정 색상(카테고리)
-- 0005_diary_fields.sql 실행 후 이 파일을 Supabase SQL Editor에서 실행한다.

alter table public.events
  add column if not exists color text
    check (color in ('blue', 'green', 'orange', 'pink', 'purple', 'red', 'teal'));
