-- 단어장(일기에서 만난 영어·일본어 표현) + OOTD에 날씨(기온) 기록
-- 0019_closet_ootd.sql 실행 후 이 파일을 실행한다.

create table if not exists public.vocab_words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  word text not null,
  meaning text not null,
  -- en/ja/ko
  lang text not null check (lang in ('en', 'ja', 'ko')),
  note text,
  fav boolean not null default false,
  -- 퀴즈에서 맞힌 횟수 (외웠는지 감 잡기용)
  correct_count int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, word)
);
create index if not exists vocab_words_user on public.vocab_words (user_id, created_at desc);

alter table public.vocab_words enable row level security;
create policy "own vocab_words" on public.vocab_words
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- OOTD를 기록한 순간의 날씨 (기온 ℃, open-meteo weather code)
alter table public.ootd_logs add column if not exists temp_c numeric;
alter table public.ootd_logs add column if not exists weather_code int;
