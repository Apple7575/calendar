-- 일기 기록 필드 확장: AI 한 줄 하이라이트, 에너지, 수면, 함께한 사람, 감사
-- 0004_mood_report.sql 실행 후 이 파일을 Supabase SQL Editor에서 실행한다.

alter table public.diaries
  add column if not exists highlight text,
  add column if not exists energy int check (energy between 1 and 5),
  add column if not exists sleep_hours numeric(3,1) check (sleep_hours between 0 and 24),
  add column if not exists people text[] not null default '{}',
  add column if not exists gratitude text;
