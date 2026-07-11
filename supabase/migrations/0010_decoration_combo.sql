-- 날짜 꾸미기: 사진 배경 + 스티커 동시 사용 허용, 기념일 외곽선 색
-- 0009_day_highlights.sql 실행 후 이 파일을 실행한다.

-- 사진과 스티커를 한 날짜에 같이 쓸 수 있게 상호배타 제약을 푼다
alter table public.day_highlights drop constraint if exists day_highlights_check;

-- 기념일 외곽선 색 (달력에서 그 날짜 둘레 링으로 표시 — 분야/중요도 구분용)
alter table public.anniversaries
  add column if not exists color text not null default 'rose';
