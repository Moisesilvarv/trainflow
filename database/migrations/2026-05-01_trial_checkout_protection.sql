create table if not exists trial_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  email_normalized text,
  ip_address text,
  user_agent text,
  fingerprint text,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now()
);

alter table trial_claims
  add column if not exists email_normalized text,
  add column if not exists ip_address text,
  add column if not exists user_agent text,
  add column if not exists fingerprint text,
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'trial_claims'
      and column_name = 'email'
  ) then
    update trial_claims
    set email_normalized = lower(trim(coalesce(email_normalized, email)))
    where coalesce(email_normalized, email) is not null;
  else
    update trial_claims
    set email_normalized = lower(trim(email_normalized))
    where email_normalized is not null;
  end if;
end $$;

alter table trial_claims
  alter column email_normalized set not null;

alter table trial_claims
  drop column if exists email;

alter table if exists subscriptions
  drop constraint if exists subscriptions_plan_check;

alter table if exists subscriptions
  add constraint subscriptions_plan_check check (plan in ('trial', 'basic', 'basic_free', 'pro', 'premium'));

alter table if exists subscriptions
  drop constraint if exists subscriptions_status_check;

alter table if exists subscriptions
  add constraint subscriptions_status_check check (
    status in ('active', 'inactive', 'free', 'limited', 'trialing', 'canceled', 'past_due', 'incomplete', 'expired')
  );

alter table if exists users
  drop constraint if exists users_plan_check;

alter table if exists users
  add constraint users_plan_check check (plan in ('trial', 'basic', 'basic_free', 'pro', 'premium'));

alter table if exists coaches
  drop constraint if exists coaches_plan_check;

alter table if exists coaches
  add constraint coaches_plan_check check (plan in ('trial', 'basic', 'basic_free', 'pro', 'premium'));

alter table if exists users
  drop constraint if exists users_plan_status_check;

alter table if exists users
  add constraint users_plan_status_check check (
    plan_status in ('active', 'inactive', 'limited', 'trialing', 'canceled', 'past_due', 'incomplete', 'expired')
  );

alter table if exists coaches
  drop constraint if exists coaches_plan_status_check;

alter table if exists coaches
  add constraint coaches_plan_status_check check (
    plan_status in ('active', 'inactive', 'limited', 'trialing', 'canceled', 'past_due', 'incomplete', 'expired')
  );

create index if not exists idx_trial_claims_user_id
  on trial_claims(user_id);

create unique index if not exists idx_trial_claims_email_normalized_unique
  on trial_claims(email_normalized);

create index if not exists idx_trial_claims_ip_address_created_at
  on trial_claims(ip_address, created_at desc);

create index if not exists idx_trial_claims_fingerprint
  on trial_claims(fingerprint);
