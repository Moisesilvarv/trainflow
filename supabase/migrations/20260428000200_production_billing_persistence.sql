-- TrainFlow
-- Finalize billing persistence, AI conversation history and premium tables.
-- Run after 2026-04-28_plans_premium_ai_portal.sql.

alter table if exists subscriptions
  add column if not exists provider text not null default 'system',
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists external_subscription_id text,
  add column if not exists external_customer_id text,
  add column if not exists current_period_end timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

update subscriptions
set status = case
  when lower(coalesce(status, '')) = 'trial' then 'trialing'
  when lower(coalesce(status, '')) in ('active', 'inactive', 'trialing', 'canceled', 'past_due', 'incomplete', 'expired') then lower(status)
  else coalesce(nullif(status, ''), 'inactive')
end
where true;

update subscriptions
set plan = case
  when lower(coalesce(plan, '')) in ('trial', 'basic', 'pro', 'premium') then lower(plan)
  when lower(coalesce(plan, '')) in ('medium', 'professional') then 'pro'
  when lower(coalesce(plan, '')) in ('advanced') then 'premium'
  else 'basic'
end
where true;

alter table if exists subscriptions
  drop constraint if exists subscriptions_plan_check;

alter table if exists subscriptions
  add constraint subscriptions_plan_check check (plan in ('trial', 'basic', 'pro', 'premium'));

alter table if exists subscriptions
  drop constraint if exists subscriptions_status_check;

alter table if exists subscriptions
  add constraint subscriptions_status_check check (
    status in ('active', 'inactive', 'trialing', 'canceled', 'past_due', 'incomplete', 'expired')
  );

create unique index if not exists idx_subscriptions_user_provider_unique
  on subscriptions(user_id, provider);

alter table if exists ai_usage
  add column if not exists updated_at timestamptz not null default now();

drop index if exists idx_ai_usage_user_month;
create unique index if not exists idx_ai_usage_user_month_unique
  on ai_usage(user_id, month);

create table if not exists ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  message text not null,
  created_at timestamptz not null default now()
);

insert into ai_conversations (user_id, student_id, role, message, created_at)
select user_id, student_id, role, content, created_at
from student_ai_messages
where not exists (
  select 1
  from ai_conversations
  where ai_conversations.user_id = student_ai_messages.user_id
    and ai_conversations.student_id = student_ai_messages.student_id
    and ai_conversations.role = student_ai_messages.role
    and ai_conversations.message = student_ai_messages.content
    and ai_conversations.created_at = student_ai_messages.created_at
);

create index if not exists idx_ai_conversations_user_student_created
  on ai_conversations(user_id, student_id, created_at desc);

alter table if exists student_portal_access
  add column if not exists access_token_hash text,
  add column if not exists expires_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists last_access_at timestamptz;

update student_portal_access
set expires_at = coalesce(expires_at, created_at + interval '7 days'),
    access_token_hash = coalesce(access_token_hash, md5(access_token)),
    is_active = coalesce(is_active, true)
where true;

alter table if exists student_portal_access
  alter column access_token_hash set not null;

create unique index if not exists idx_student_portal_access_token_hash_unique
  on student_portal_access(access_token_hash);

alter table if exists recurring_payments
  add column if not exists provider text not null default 'config_required',
  add column if not exists external_id text,
  add column if not exists external_subscription_id text,
  add column if not exists next_due_date date,
  add column if not exists updated_at timestamptz not null default now();

alter table if exists recurring_payments
  drop column if exists due_date;

alter table if exists automation_logs
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider text not null check (provider in ('whatsapp', 'google_calendar', 'email')),
  status text not null check (status in ('connected', 'disconnected', 'coming_soon', 'config_required')),
  config jsonb not null default '{}'::jsonb,
  connected_at timestamptz,
  disconnected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_integrations_user_provider_unique
  on integrations(user_id, provider);

create table if not exists user_preferences (
  user_id uuid primary key references users(id) on delete cascade,
  notifications jsonb not null default '{}'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  student_id uuid references students(id) on delete set null,
  title text not null,
  content text not null,
  status text not null check (status in ('draft', 'sent', 'signed', 'canceled')),
  signer_name text,
  signed_at timestamptz,
  file_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists billing_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider text not null check (provider in ('stripe', 'mercado_pago')),
  external_customer_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_billing_customers_user_provider_unique
  on billing_customers(user_id, provider);

create unique index if not exists idx_billing_customers_external_unique
  on billing_customers(provider, external_customer_id);

create table if not exists billing_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider text not null check (provider in ('stripe', 'mercado_pago')),
  target_plan text not null check (target_plan in ('basic', 'pro', 'premium')),
  external_session_id text not null,
  external_customer_id text,
  external_subscription_id text,
  status text not null,
  checkout_url text,
  amount_total numeric(10,2),
  currency text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_billing_checkout_sessions_external_unique
  on billing_checkout_sessions(provider, external_session_id);

create table if not exists billing_gateway_settings (
  user_id uuid primary key references users(id) on delete cascade,
  pix_connected boolean not null default false,
  mercado_pago_connected boolean not null default false,
  stripe_connected boolean not null default false,
  provider_status text not null default 'config_required',
  updated_at timestamptz not null default now()
);

alter table if exists subscriptions enable row level security;
alter table if exists ai_usage enable row level security;
alter table if exists student_ai_messages enable row level security;
alter table if exists ai_conversations enable row level security;
alter table if exists student_portal_access enable row level security;
alter table if exists recurring_payments enable row level security;
alter table if exists billing_customers enable row level security;
alter table if exists billing_checkout_sessions enable row level security;
alter table if exists billing_gateway_settings enable row level security;
alter table if exists automation_logs enable row level security;
alter table if exists whatsapp_automation_settings enable row level security;
alter table if exists integrations enable row level security;
alter table if exists user_preferences enable row level security;
alter table if exists contracts enable row level security;

drop policy if exists user_own_subscriptions on subscriptions;
create policy user_own_subscriptions on subscriptions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists user_own_ai_usage on ai_usage;
create policy user_own_ai_usage on ai_usage
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists user_own_student_ai_messages on student_ai_messages;
create policy user_own_student_ai_messages on student_ai_messages
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists user_own_ai_conversations on ai_conversations;
create policy user_own_ai_conversations on ai_conversations
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists user_own_student_portal_access on student_portal_access;
create policy user_own_student_portal_access on student_portal_access
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists user_own_recurring_payments on recurring_payments;
create policy user_own_recurring_payments on recurring_payments
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists user_own_billing_customers on billing_customers;
create policy user_own_billing_customers on billing_customers
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists user_own_billing_checkout_sessions on billing_checkout_sessions;
create policy user_own_billing_checkout_sessions on billing_checkout_sessions
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists user_own_billing_gateway_settings on billing_gateway_settings;
create policy user_own_billing_gateway_settings on billing_gateway_settings
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists user_own_automation_logs on automation_logs;
create policy user_own_automation_logs on automation_logs
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists user_own_whatsapp_automation_settings on whatsapp_automation_settings;
create policy user_own_whatsapp_automation_settings on whatsapp_automation_settings
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists user_own_integrations on integrations;
create policy user_own_integrations on integrations
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists user_own_preferences on user_preferences;
create policy user_own_preferences on user_preferences
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists user_own_contracts on contracts;
create policy user_own_contracts on contracts
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
