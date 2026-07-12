-- 식단(끼니별 사진·그람·칼로리) + 하지 않기 목록
-- 0015_monthtop_workouts.sql 실행 후 이 파일을 실행한다.

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  -- 아침/점심/저녁/간식
  slot text not null check (slot in ('아침', '점심', '저녁', '간식')),
  title text not null,
  grams numeric,
  kcal numeric,
  image_path text,
  created_at timestamptz not null default now()
);
create index if not exists meals_user_date on public.meals (user_id, date desc);

-- 하지 말아야 할 것들
create table if not exists public.avoid_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, title)
);

alter table public.meals enable row level security;
alter table public.avoid_items enable row level security;
create policy "own meals" on public.meals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own avoid_items" on public.avoid_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
