-- 목표(방면별) + 갓생 코칭 리포트
-- 0011_quarterly_report.sql 실행 후 이 파일을 실행한다.

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- 방면: career/dream/money/home/health/learning/relationship/etc
  category text not null default 'etc',
  title text not null,
  done boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists goals_user on public.goals (user_id, category, position);

alter table public.goals enable row level security;
create policy "own goals" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 갓생 코칭 리포트 타입 (period_key = 주 시작일)
alter table public.ai_reports drop constraint if exists ai_reports_type_check;
alter table public.ai_reports add constraint ai_reports_type_check
  check (type in ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'mood', 'coach'));
