-- 캘린더 앱 초기 스키마
-- Supabase SQL Editor에서 그대로 실행하면 된다.

-- ===== 테이블 =====

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz not null,
  all_day boolean not null default false,
  google_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, google_event_id)
);
create index if not exists events_user_range on public.events (user_id, start_at);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  title text not null,
  done boolean not null default false,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists tasks_user_date on public.tasks (user_id, date);

create table if not exists public.diaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.diary_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  diary_id uuid not null references public.diaries(id) on delete cascade,
  storage_path text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists diary_photos_diary on public.diary_photos (diary_id);

-- 구글 refresh token 저장소.
-- 클라이언트는 저장(INSERT/UPDATE)만 가능하고 읽기는 Edge Function(service role)만 한다.
create table if not exists public.google_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token text not null,
  updated_at timestamptz not null default now()
);

-- ===== RLS =====

alter table public.events enable row level security;
alter table public.tasks enable row level security;
alter table public.diaries enable row level security;
alter table public.diary_photos enable row level security;
alter table public.google_tokens enable row level security;

create policy "own events" on public.events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own tasks" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own diaries" on public.diaries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own diary_photos" on public.diary_photos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- google_tokens: SELECT 정책 없음 (클라이언트가 토큰을 읽을 수 없음)
create policy "insert own google token" on public.google_tokens
  for insert with check (auth.uid() = user_id);
create policy "update own google token" on public.google_tokens
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ===== Storage: diary-photos 비공개 버킷 =====

insert into storage.buckets (id, name, public)
values ('diary-photos', 'diary-photos', false)
on conflict (id) do nothing;

-- 경로 규약: {user_id}/{diary_id}/{uuid}.jpg — 첫 폴더가 본인 uid일 때만 접근 허용
create policy "diary photos select own" on storage.objects
  for select to authenticated
  using (bucket_id = 'diary-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "diary photos insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'diary-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "diary photos delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'diary-photos' and (storage.foldername(name))[1] = auth.uid()::text);
