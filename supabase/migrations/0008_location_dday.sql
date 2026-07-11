-- 사진 위치 기록 + D-day/기념일
-- 0007_photolog_lang.sql 실행 후 이 파일을 Supabase SQL Editor에서 실행한다.

-- 사진 촬영 위치 (EXIF GPS 또는 카메라 촬영 시 현재 위치)
alter table public.diary_photos
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  -- 역지오코딩한 장소명 (예: "서울 마포구")
  add column if not exists place text;

-- D-day / 기념일
create table if not exists public.anniversaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  date date not null,
  -- true면 매년 반복(생일 등), false면 1회성 카운트다운/카운트업
  repeat_yearly boolean not null default false,
  emoji text not null default '🎉',
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists anniversaries_user on public.anniversaries (user_id, position);

alter table public.anniversaries enable row level security;
create policy "own anniversaries" on public.anniversaries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
