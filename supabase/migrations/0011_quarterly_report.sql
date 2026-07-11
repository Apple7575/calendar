-- 분기 리포트 타입 추가 (period_key 예: "2026-Q3")
-- 0010_decoration_combo.sql 실행 후 이 파일을 실행한다.

alter table public.ai_reports drop constraint if exists ai_reports_type_check;
alter table public.ai_reports add constraint ai_reports_type_check
  check (type in ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'mood'));
