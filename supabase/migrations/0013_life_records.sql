-- 생활 기록(식단/몸무게/걸음수/지출/학습/인바디) + 인생 타임라인 + 목표 진전
-- 0012_goals_coach.sql 실행 후 이 파일을 실행한다.

create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  -- meal(식단)/weight(몸무게kg)/steps(걸음수)/money(지출원)/study(학습)/inbody(인바디)
  kind text not null,
  -- 숫자 값 (몸무게, 걸음수, 금액 등)
  value_num numeric,
  -- 텍스트 값 (식단 내용, 학습 내용, 지출 항목, 인바디 메모)
  value_text text,
  created_at timestamptz not null default now()
);
create index if not exists daily_logs_user_date on public.daily_logs (user_id, date desc);

create table if not exists public.life_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  year int not null,
  title text not null,
  emoji text not null default '⭐',
  note text,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists life_events_user_year on public.life_events (user_id, year desc);

-- 일기 저장 시 AI가 "어떤 목표에 진전이 있었는지" 자동 기록
create table if not exists public.goal_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.goals(id) on delete cascade,
  date date not null,
  note text not null,
  created_at timestamptz not null default now(),
  unique (goal_id, date)
);

alter table public.daily_logs enable row level security;
alter table public.life_events enable row level security;
alter table public.goal_checkins enable row level security;
create policy "own daily_logs" on public.daily_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own life_events" on public.life_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own goal_checkins" on public.goal_checkins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
