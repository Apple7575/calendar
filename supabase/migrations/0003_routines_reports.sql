-- 루틴 + AI 리포트
-- 0002_features.sql 실행 후 이 파일을 Supabase SQL Editor에서 실행한다.

-- 루틴: repeat_days = 빈 배열이면 "매일", 아니면 요일 배열(0=일 … 6=토)
create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  repeat_days int[] not null default '{}',
  active boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.routine_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  routine_id uuid not null references public.routines(id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  unique (routine_id, date)
);
create index if not exists routine_checks_user_date on public.routine_checks (user_id, date);

-- AI 리포트 캐시 (하루/주간/월간/연간)
create table if not exists public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('daily', 'weekly', 'monthly', 'yearly')),
  -- daily: YYYY-MM-DD, weekly: 주 시작일 YYYY-MM-DD, monthly: YYYY-MM, yearly: YYYY
  period_key text not null,
  content text not null,
  created_at timestamptz not null default now(),
  unique (user_id, type, period_key)
);

alter table public.routines enable row level security;
alter table public.routine_checks enable row level security;
alter table public.ai_reports enable row level security;

create policy "own routines" on public.routines
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own routine_checks" on public.routine_checks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own ai_reports" on public.ai_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
