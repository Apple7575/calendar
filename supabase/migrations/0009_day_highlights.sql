-- 날짜 꾸미기: 스티커 한 개를 날짜에 붙인다 (내장 스티커 또는 내 이미지)

create table if not exists public.day_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  -- 앱에 내장된 스티커 id (예: "cat", "star" ...) — 이미지 스티커면 null
  sticker_id text,
  -- 사용자가 올린 이미지 스티커의 storage 경로 (앱이 256px로 압축해 저장)
  image_path text,
  created_at timestamptz not null default now(),
  unique (user_id, date),
  check (sticker_id is not null or image_path is not null)
);
create index if not exists day_highlights_user_date on public.day_highlights (user_id, date);

alter table public.day_highlights enable row level security;
create policy "own day_highlights" on public.day_highlights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
