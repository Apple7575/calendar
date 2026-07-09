-- AI 리포트 타입에 기분 트렌드(mood) 추가
-- 0003_routines_reports.sql 실행 후 이 파일을 Supabase SQL Editor에서 실행한다.

alter table public.ai_reports drop constraint if exists ai_reports_type_check;
alter table public.ai_reports
  add constraint ai_reports_type_check
  check (type in ('daily', 'weekly', 'monthly', 'yearly', 'mood'));
