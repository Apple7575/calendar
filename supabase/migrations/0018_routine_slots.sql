-- 루틴 아침/저녁 구분 (모닝루틴·나이트루틴 플레이어용)
-- 0017_meal_macros.sql 실행 후 이 파일을 실행한다.

alter table public.routines
  add column if not exists time_slot text not null default 'any'
  check (time_slot in ('morning', 'evening', 'any'));
