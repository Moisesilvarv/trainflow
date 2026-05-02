alter table if exists recurring_payments
  alter column student_id drop not null;

alter table if exists subscriptions
  add column if not exists provider text not null default 'stripe',
  add column if not exists external_subscription_id text,
  add column if not exists external_customer_id text,
  add column if not exists current_period_end timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_subscriptions_user_provider_unique
  on subscriptions(user_id, provider);

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
