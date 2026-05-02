-- TrainFlow
-- Compatibility patch for environments that already have users/coaches/subscriptions
-- but still lack the current trial access columns and accepted states.

alter table if exists public.subscriptions
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists provider text not null default 'system',
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.users
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists provider text not null default 'system',
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.coaches
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists provider text not null default 'system',
  add column if not exists updated_at timestamptz not null default now();

update public.subscriptions
set status = case
  when lower(coalesce(status, '')) = 'trial' then 'trialing'
  when lower(coalesce(status, '')) in ('active', 'inactive', 'trialing', 'canceled', 'past_due', 'incomplete', 'expired') then lower(status)
  else coalesce(nullif(status, ''), 'inactive')
end
where true;

update public.users
set plan_status = case
  when lower(coalesce(plan_status, '')) = 'trial' then 'trialing'
  when lower(coalesce(plan_status, '')) in ('active', 'inactive', 'trialing', 'canceled', 'past_due', 'incomplete', 'expired') then lower(plan_status)
  else coalesce(nullif(plan_status, ''), 'active')
end
where true;

update public.coaches
set plan_status = case
  when lower(coalesce(plan_status, '')) = 'trial' then 'trialing'
  when lower(coalesce(plan_status, '')) in ('active', 'inactive', 'trialing', 'canceled', 'past_due', 'incomplete', 'expired') then lower(plan_status)
  else coalesce(nullif(plan_status, ''), 'active')
end
where true;

alter table if exists public.subscriptions
  drop constraint if exists subscriptions_plan_check;

alter table if exists public.subscriptions
  add constraint subscriptions_plan_check check (plan in ('trial', 'basic', 'basic_free', 'pro', 'premium'));

alter table if exists public.subscriptions
  drop constraint if exists subscriptions_status_check;

alter table if exists public.subscriptions
  add constraint subscriptions_status_check check (
    status in ('active', 'inactive', 'free', 'limited', 'trialing', 'canceled', 'past_due', 'incomplete', 'expired')
  );

alter table if exists public.users
  drop constraint if exists users_plan_check;

alter table if exists public.users
  add constraint users_plan_check check (plan in ('trial', 'basic', 'basic_free', 'pro', 'premium'));

alter table if exists public.users
  drop constraint if exists users_plan_status_check;

alter table if exists public.users
  add constraint users_plan_status_check check (
    plan_status in ('active', 'inactive', 'limited', 'trialing', 'canceled', 'past_due', 'incomplete', 'expired')
  );

alter table if exists public.coaches
  drop constraint if exists coaches_plan_check;

alter table if exists public.coaches
  add constraint coaches_plan_check check (plan in ('trial', 'basic', 'basic_free', 'pro', 'premium'));

alter table if exists public.coaches
  drop constraint if exists coaches_plan_status_check;

alter table if exists public.coaches
  add constraint coaches_plan_status_check check (
    plan_status in ('active', 'inactive', 'limited', 'trialing', 'canceled', 'past_due', 'incomplete', 'expired')
  );
