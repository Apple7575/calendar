-- 코디: 옷장 아이템(옷·신발·헤어·향수 등) + OOTD 사진 기록
-- 0018_routine_slots.sql 실행 후 이 파일을 실행한다.

create table if not exists public.closet_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- 옷/신발/헤어/향수/기타
  category text not null check (category in ('옷', '신발', '헤어', '향수', '기타')),
  title text not null,
  note text,
  image_path text,
  fav boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists closet_items_user on public.closet_items (user_id, category, created_at desc);

create table if not exists public.ootd_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  note text,
  image_path text not null,
  created_at timestamptz not null default now()
);
create index if not exists ootd_logs_user_date on public.ootd_logs (user_id, date desc);

alter table public.closet_items enable row level security;
alter table public.ootd_logs enable row level security;
create policy "own closet_items" on public.closet_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own ootd_logs" on public.ootd_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
