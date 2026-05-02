create table if not exists email_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  email text not null,
  token_hash text not null,
  expires_at timestamptz not null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table email_verifications
  add column if not exists email text,
  add column if not exists token_hash text,
  add column if not exists expires_at timestamptz,
  add column if not exists confirmed_at timestamptz,
  add column if not exists created_at timestamptz not null default now();

alter table if exists subscriptions
  add column if not exists subscription_status text;

update subscriptions
set subscription_status = status
where subscription_status is null;

alter table if exists subscriptions
  alter column subscription_status set default 'inactive';

alter table if exists subscriptions
  drop constraint if exists subscriptions_status_check;

alter table if exists subscriptions
  add constraint subscriptions_status_check check (
    status in ('active', 'inactive', 'free', 'limited', 'pending_email', 'trialing', 'canceled', 'past_due', 'incomplete', 'expired')
  );

alter table if exists subscriptions
  drop constraint if exists subscriptions_subscription_status_check;

alter table if exists subscriptions
  add constraint subscriptions_subscription_status_check check (
    subscription_status is null
    or subscription_status in ('active', 'inactive', 'free', 'limited', 'pending_email', 'trialing', 'canceled', 'past_due', 'incomplete', 'expired')
  );

alter table if exists users
  drop constraint if exists users_plan_status_check;

alter table if exists users
  add constraint users_plan_status_check check (
    plan_status in ('active', 'inactive', 'limited', 'pending_email', 'trialing', 'canceled', 'past_due', 'incomplete', 'expired')
  );

alter table if exists coaches
  drop constraint if exists coaches_plan_status_check;

alter table if exists coaches
  add constraint coaches_plan_status_check check (
    plan_status in ('active', 'inactive', 'limited', 'pending_email', 'trialing', 'canceled', 'past_due', 'incomplete', 'expired')
  );

create index if not exists idx_email_verifications_user_id_created_at
  on email_verifications(user_id, created_at desc);

create unique index if not exists idx_email_verifications_active_token_hash
  on email_verifications(token_hash)
  where confirmed_at is null;
