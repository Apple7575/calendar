-- 사진 로그(촬영 시각/좋아요/원본 보관) + 일기 다국어 번역/표현 카드
-- 0006_event_color.sql 실행 후 이 파일을 Supabase SQL Editor에서 실행한다.

-- 사진: 촬영 시각, 좋아요, (오버레이 합성 시) 원본 파일 경로
alter table public.diary_photos
  add column if not exists taken_at timestamptz,
  add column if not exists liked boolean not null default false,
  add column if not exists original_path text;

create index if not exists diary_photos_liked on public.diary_photos (user_id, liked)
  where liked;

-- 일기 번역 캐시: 일기당 언어별 1행. source_hash가 다르면(일기 수정) 다시 생성한다.
create table if not exists public.diary_translations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  diary_id uuid not null references public.diaries(id) on delete cascade,
  -- 'ko' | 'en' | 'ja'
  lang text not null check (lang in ('ko', 'en', 'ja')),
  content text not null,
  -- 원문(일기 content)의 해시 — 원문이 바뀌면 캐시 무효
  source_hash text not null,
  -- AI가 감지한 원문 언어 (세 행에 동일하게 저장)
  detected_lang text not null default 'ko' check (detected_lang in ('ko', 'en', 'ja')),
  -- 외국어로 쓴 일기의 첨삭 [{original, corrected, note}] — 원문 언어 행에만 저장
  corrections jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (diary_id, lang)
);

-- 표현 카드: 일기에서 AI가 뽑은 영어/일본어 학습 표현
create table if not exists public.expressions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  diary_id uuid references public.diaries(id) on delete set null,
  date date not null,
  -- 'en' | 'ja'
  lang text not null check (lang in ('en', 'ja')),
  expression text not null,
  -- 뜻 (한국어)
  meaning text not null,
  -- 예문 (해당 언어)
  example text not null,
  created_at timestamptz not null default now(),
  unique (user_id, lang, expression)
);
create index if not exists expressions_user_date on public.expressions (user_id, date desc);

alter table public.diary_translations enable row level security;
alter table public.expressions enable row level security;

create policy "own diary_translations" on public.diary_translations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own expressions" on public.expressions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
