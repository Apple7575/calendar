-- 기능 확장: 기분 기록, 반복 일정, 일정 알림
-- 0001_init.sql 실행 후 이 파일을 Supabase SQL Editor에서 실행한다.

-- 일기 기분 (이모지 문자 그대로 저장, null = 미선택)
alter table public.diaries
  add column if not exists mood text;

-- 반복 일정 + 알림
alter table public.events
  add column if not exists repeat_freq text
    check (repeat_freq in ('daily', 'weekly', 'monthly')),
  add column if not exists repeat_until date,
  add column if not exists reminder_minutes int;
