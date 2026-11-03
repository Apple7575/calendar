-- Optional online AI lane; not applied automatically by the app.
create table public.concept_lab_jobs (
 user_id uuid not null references auth.users(id) on delete cascade,
 request_hash text not null check(length(request_hash)=64),
 task text not null check(task in ('grade','generate')),
 status text not null default 'running' check(status in ('running','complete','failed')),
 result jsonb,
 attempts integer not null default 1,
 updated_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 primary key(user_id,request_hash)
);
alter table public.concept_lab_jobs enable row level security;
revoke all on public.concept_lab_jobs from public,anon,authenticated;
grant select,insert,update on public.concept_lab_jobs to service_role;
create index concept_lab_jobs_created on public.concept_lab_jobs(created_at);

-- Only the authenticated Edge Function's service client can reserve calls.
-- No SECURITY DEFINER: quotas and inserts are one transaction under an advisory lock.
create function public.reserve_concept_lab_job(p_user uuid,p_hash text,p_task text)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare existing public.concept_lab_jobs; daily integer; total integer;
begin
 perform pg_advisory_xact_lock(hashtext('concept-lab-quota'));
 select * into existing from public.concept_lab_jobs where user_id=p_user and request_hash=p_hash;
 if found then
  if existing.status='complete' then return jsonb_build_object('cached',true,'result',existing.result); end if;
  -- One bounded retry after a cooldown; failures still count against quotas.
  if existing.attempts<2 and
     ((existing.status='failed' and existing.updated_at<now()-interval '60 seconds') or
      (existing.status='running' and existing.updated_at<now()-interval '5 minutes')) then
   select coalesce(sum(attempts),0) into daily from public.concept_lab_jobs where user_id=p_user and created_at>=date_trunc('day',now());
   select coalesce(sum(attempts),0) into total from public.concept_lab_jobs where created_at>=date_trunc('day',now());
   if daily>=10 or total>=50 then return jsonb_build_object('blocked',true,'reason','daily_limit');end if;
   update public.concept_lab_jobs set status='running',attempts=attempts+1,updated_at=now() where user_id=p_user and request_hash=p_hash;
   return jsonb_build_object('cached',false);
  end if;
  return jsonb_build_object('blocked',true,'reason',existing.status);
 end if;
 select coalesce(sum(attempts),0) into daily from public.concept_lab_jobs where user_id=p_user and created_at>=date_trunc('day',now());
 select coalesce(sum(attempts),0) into total from public.concept_lab_jobs where created_at>=date_trunc('day',now());
 if daily>=10 or total>=50 then return jsonb_build_object('blocked',true,'reason','daily_limit');end if;
 insert into public.concept_lab_jobs(user_id,request_hash,task) values(p_user,p_hash,p_task);
 return jsonb_build_object('cached',false);
end $$;
revoke execute on function public.reserve_concept_lab_job(uuid,text,text) from public,anon,authenticated;
grant execute on function public.reserve_concept_lab_job(uuid,text,text) to service_role;
