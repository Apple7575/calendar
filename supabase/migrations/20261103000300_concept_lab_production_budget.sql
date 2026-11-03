-- Offline content/audio production and interactive generation share the same $5 cap.
-- CLI-created as 20261102212020 (UTC); ordered after the existing KST-named
-- 202611030001/0002 migrations so a fresh checkout creates tables before altering them.
alter table public.concept_lab_ai_budget add column production_micros bigint not null default 0 check(production_micros between 0 and 5000000);
alter table public.concept_lab_ai_budget add column production_ledger jsonb not null default '[]'::jsonb;

create or replace function public.reserve_controlled_concept_job(p_user uuid,p_hash text,p_task text,p_daily integer)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare existing public.concept_lab_jobs; cap bigint; used bigint; production bigint; count_today integer; reservation bigint:=400000;
begin
 perform pg_advisory_xact_lock(hashtext('concept-lab-dollar-budget'));
 select limit_micros,production_micros into cap,production from public.concept_lab_ai_budget where id='n3-concept-lab' and enabled;
 if not found then return jsonb_build_object('blocked',true,'reason','disabled');end if;
 select * into existing from public.concept_lab_jobs where user_id=p_user and request_hash=p_hash;
 if found then
  if existing.status='complete' then return jsonb_build_object('cached',true,'result',existing.result);end if;
  return jsonb_build_object('blocked',true,'reason',existing.status);
 end if;
 select coalesce(sum(coalesce(charged_micros,reserved_micros)),0) into used from public.concept_lab_jobs;
 if used+production+reservation>cap then return jsonb_build_object('blocked',true,'reason','budget_limit');end if;
 select count(*) into count_today from public.concept_lab_jobs where user_id=p_user and created_at>=date_trunc('day',now())+interval '19 hours'-case when now()<date_trunc('day',now())+interval '19 hours' then interval '1 day' else interval '0 day' end;
 if count_today>=least(5,greatest(0,p_daily)) then return jsonb_build_object('blocked',true,'reason','daily_limit');end if;
 insert into public.concept_lab_jobs(user_id,request_hash,task,reserved_micros) values(p_user,p_hash,p_task,reservation);
 return jsonb_build_object('cached',false,'reservedMicros',reservation);
end $$;
revoke execute on function public.reserve_controlled_concept_job(uuid,text,text,integer) from public,anon,authenticated;
grant execute on function public.reserve_controlled_concept_job(uuid,text,text,integer) to service_role;
