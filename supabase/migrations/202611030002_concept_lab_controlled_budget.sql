-- Isolated experiment budget. Existing calendar/reward/word tables are untouched.
create table public.concept_lab_ai_budget (
 id text primary key check(id='n3-concept-lab'),
 limit_micros bigint not null check(limit_micros between 0 and 5000000),
 enabled boolean not null default true
);
alter table public.concept_lab_ai_budget enable row level security;
revoke all on public.concept_lab_ai_budget from public,anon,authenticated;
grant select on public.concept_lab_ai_budget to service_role;
insert into public.concept_lab_ai_budget(id,limit_micros) values('n3-concept-lab',5000000);
alter table public.concept_lab_jobs add column reserved_micros bigint not null default 0;
alter table public.concept_lab_jobs add column charged_micros bigint;
alter table public.concept_lab_jobs add column usage jsonb;

-- Only Edge's service role may reserve. All users share the same cumulative $5 cap.
create function public.reserve_controlled_concept_job(p_user uuid,p_hash text,p_task text,p_daily integer)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare existing public.concept_lab_jobs; cap bigint; used bigint; count_today integer; reservation bigint:=400000;
begin
 perform pg_advisory_xact_lock(hashtext('concept-lab-dollar-budget'));
 select limit_micros into cap from public.concept_lab_ai_budget where id='n3-concept-lab' and enabled;
 if not found then return jsonb_build_object('blocked',true,'reason','disabled');end if;
 select * into existing from public.concept_lab_jobs where user_id=p_user and request_hash=p_hash;
 if found then
  if existing.status='complete' then return jsonb_build_object('cached',true,'result',existing.result);end if;
  -- Same request never automatically retries and never starts a concurrent duplicate.
  return jsonb_build_object('blocked',true,'reason',existing.status);
 end if;
 select coalesce(sum(coalesce(charged_micros,reserved_micros)),0) into used from public.concept_lab_jobs;
 if used+reservation>cap then return jsonb_build_object('blocked',true,'reason','budget_limit');end if;
 select count(*) into count_today from public.concept_lab_jobs where user_id=p_user and created_at>=date_trunc('day',now())+interval '19 hours'-case when now()<date_trunc('day',now())+interval '19 hours' then interval '1 day' else interval '0 day' end;
 -- UTC 19:00 is Korea 04:00, matching this project's primary routine timezone.
 if count_today>=least(5,greatest(0,p_daily)) then return jsonb_build_object('blocked',true,'reason','daily_limit');end if;
 insert into public.concept_lab_jobs(user_id,request_hash,task,reserved_micros) values(p_user,p_hash,p_task,reservation);
 return jsonb_build_object('cached',false,'reservedMicros',reservation);
end $$;
revoke execute on function public.reserve_controlled_concept_job(uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.reserve_controlled_concept_job(uuid,text,text,integer) to service_role;
