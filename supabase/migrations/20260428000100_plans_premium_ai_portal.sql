-- TrainFlow
-- Upgrade migration for existing projects before billing persistence.
-- Safe to run on environments with data.

update users
set plan = case
  when plan in ('trial', 'basic', 'pro', 'premium') then plan
  when plan in ('medium', 'professional') then 'pro'
  when plan in ('advanced') then 'premium'
  else 'basic'
end
where true;

update coaches
set plan = case
  when plan in ('trial', 'basic', 'pro', 'premium') then plan
  when plan in ('medium', 'professional') then 'pro'
  when plan in ('advanced') then 'premium'
  else 'basic'
end
where true;

update users
set plan_status = case
  when lower(coalesce(plan_status, '')) = 'trial' then 'trialing'
  when lower(coalesce(plan_status, '')) in ('active', 'inactive', 'trialing', 'canceled', 'past_due', 'incomplete', 'expired') then lower(plan_status)
  else coalesce(nullif(plan_status, ''), 'active')
end
where true;

update coaches
set plan_status = case
  when lower(coalesce(plan_status, '')) = 'trial' then 'trialing'
  when lower(coalesce(plan_status, '')) in ('active', 'inactive', 'trialing', 'canceled', 'past_due', 'incomplete', 'expired') then lower(plan_status)
  else coalesce(nullif(plan_status, ''), 'active')
end
where true;

alter table users
  add column if not exists plan_status text not null default 'active',
  add column if not exists provider text not null default 'system',
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table coaches
  add column if not exists plan_status text not null default 'active',
  add column if not exists provider text not null default 'system',
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table users
  drop constraint if exists users_plan_check;

alter table users
  add constraint users_plan_check check (plan in ('trial', 'basic', 'pro', 'premium'));

alter table coaches
  drop constraint if exists coaches_plan_check;

alter table coaches
  add constraint coaches_plan_check check (plan in ('trial', 'basic', 'pro', 'premium'));

alter table users
  drop constraint if exists users_plan_status_check;

alter table users
  add constraint users_plan_status_check check (
    plan_status in ('active', 'inactive', 'trialing', 'canceled', 'past_due', 'incomplete', 'expired')
  );

alter table coaches
  drop constraint if exists coaches_plan_status_check;

alter table coaches
  add constraint coaches_plan_status_check check (
    plan_status in ('active', 'inactive', 'trialing', 'canceled', 'past_due', 'incomplete', 'expired')
  );

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  plan text not null,
  status text not null,
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  payment_provider text,
  provider text not null default 'system',
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  external_subscription_id text,
  external_customer_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table subscriptions
  drop constraint if exists subscriptions_plan_check;

alter table subscriptions
  add constraint subscriptions_plan_check check (plan in ('trial', 'basic', 'pro', 'premium'));

alter table subscriptions
  drop constraint if exists subscriptions_status_check;

alter table subscriptions
  add constraint subscriptions_status_check check (
    status in ('active', 'inactive', 'trialing', 'canceled', 'past_due', 'incomplete', 'expired')
  );

create table if not exists ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  message_count int not null default 0,
  month text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists student_ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);

alter table student_ai_messages
  drop constraint if exists student_ai_messages_role_check;

alter table student_ai_messages
  add constraint student_ai_messages_role_check check (role in ('user', 'assistant'));

create table if not exists student_portal_access (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  access_token text unique,
  access_token_hash text,
  is_active boolean not null default true,
  expires_at timestamptz,
  revoked_at timestamptz,
  last_access_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists recurring_payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  status text not null,
  provider text not null default 'config_required',
  external_id text,
  external_subscription_id text,
  next_due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists automation_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  student_id uuid references students(id) on delete cascade,
  type text not null,
  status text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists whatsapp_automation_settings (
  user_id uuid primary key references users(id) on delete cascade,
  workout_reminder boolean not null default true,
  payment_reminder boolean not null default true,
  evaluation_reminder boolean not null default false,
  renewal_message boolean not null default true,
  provider text not null default 'config_required',
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_user_id on subscriptions(user_id);
create unique index if not exists idx_subscriptions_user_provider_unique on subscriptions(user_id, provider);
create unique index if not exists idx_ai_usage_user_month_unique on ai_usage(user_id, month);
create index if not exists idx_student_ai_messages_user_student on student_ai_messages(user_id, student_id, created_at desc);
create index if not exists idx_student_portal_access_student on student_portal_access(student_id, user_id);
create index if not exists idx_recurring_payments_user_status on recurring_payments(user_id, status, next_due_date);
create index if not exists idx_automation_logs_user_created on automation_logs(user_id, created_at desc);
