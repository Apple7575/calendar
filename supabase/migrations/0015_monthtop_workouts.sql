-- 이달의 TOP 5 사진 + 헬스 앱식 운동 기록(종목/횟수)
-- 0014_timeline_month_cover.sql 실행 후 이 파일을 실행한다.

-- 캘린더 상단 "이달의 TOP 5": 직접 고른 사진 + 한 줄 설명
create table if not exists public.month_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- "YYYY-MM"
  month_key text not null,
  image_path text not null,
  caption text not null default '',
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists month_highlights_user_month
  on public.month_highlights (user_id, month_key, position);

-- 운동 종목 (기본 종목도 사용자별 행으로 생성)
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  -- 단위: 개/kg/km/초/분 등
  unit text not null default '개',
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- 운동 기록: 하루에 여러 번 기록 가능, 합계로 본다
create table if not exists public.workout_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  date date not null,
  value numeric not null,
  created_at timestamptz not null default now()
);
create index if not exists workout_records_ex_date
  on public.workout_records (exercise_id, date desc);

alter table public.month_highlights enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_records enable row level security;
create policy "own month_highlights" on public.month_highlights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own exercises" on public.exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own workout_records" on public.workout_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
