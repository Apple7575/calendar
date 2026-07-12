-- 식단에 3대 영양소 (영양 DB 검색 자동 채움용)
-- 0016_meals_avoid.sql 실행 후 이 파일을 실행한다.

alter table public.meals
  add column if not exists carb_g numeric,
  add column if not exists protein_g numeric,
  add column if not exists fat_g numeric;
