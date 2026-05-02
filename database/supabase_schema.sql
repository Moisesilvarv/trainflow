-- TrainFlow Supabase schema
-- Use this file for fresh projects. It already reflects the current
-- application model for trial access, billing persistence, AI history
-- and student portal access.

create extension if not exists "pgcrypto";

create table if not exists coaches (
  id uuid primary key,
  name text not null,
  email text unique not null,
  email_verified boolean not null default false,
  email_verification_token text,
  email_verification_expires_at timestamptz,
  coach_type text not null,
  role text not null default 'coach',
  plan text not null default 'trial',
  plan_status text not null default 'pending_email',
  provider text not null default 'system',
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key,
  name text not null,
  email text unique not null,
  email_verified boolean not null default false,
  email_verification_token text,
  email_verification_expires_at timestamptz,
  account_type text not null default 'personal',
  plan text not null default 'trial',
  plan_status text not null default 'pending_email',
  provider text not null default 'system',
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches(id) on delete cascade,
  name text not null,
  birth_date date,
  age int,
  weight numeric(5,2),
  height numeric(4,2),
  goal text,
  level text,
  objective_notes text,
  restrictions text,
  phone text,
  email text,
  avatar_url text,
  status text not null default 'active',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches(id) on delete cascade,
  student_id uuid references students(id) on delete set null,
  name text not null,
  exercises jsonb not null default '[]'::jsonb,
  notes text,
  demo_video_url text,
  demo_image_url text,
  category text,
  created_at timestamptz not null default now()
);

create table if not exists progress_records (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  weight numeric(5,2),
  body_fat numeric(5,2),
  body_measurements jsonb default '{}'::jsonb,
  performance_notes text,
  evolution_photo_url text,
  record_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists schedule (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches(id) on delete cascade,
  student_id uuid references students(id) on delete set null,
  title text not null,
  class_date timestamptz not null,
  status text not null default 'scheduled',
  reminder_sent boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches(id) on delete cascade,
  student_id uuid references students(id) on delete set null,
  description text,
  amount numeric(10,2) not null,
  due_date date not null,
  status text not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists football_assessments (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches(id) on delete cascade,
  student_id uuid references students(id) on delete set null,
  pass_score int,
  finishing_score int,
  speed_score int,
  endurance_score int,
  positioning_score int,
  decision_making_score int,
  psychological_score int,
  training_focus jsonb default '{}'::jsonb,
  notes text,
  assessment_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  plan text not null,
  status text not null,
  subscription_status text,
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  payment_method text,
  payment_provider text,
  provider text not null default 'system',
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  external_subscription_id text,
  external_customer_id text,
  external_checkout_session_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists email_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  email text not null,
  token_hash text not null,
  expires_at timestamptz not null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists notification_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type text not null,
  reference_id text,
  channel text not null default 'email',
  status text not null,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
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

create table if not exists ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  role text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists student_portal_access (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  access_token text unique,
  access_token_hash text not null,
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
  amount numeric(10,2) not null,
  status text not null,
  provider text not null default 'config_required',
  external_id text,
  external_subscription_id text,
  next_due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists billing_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider text not null,
  external_customer_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists trial_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  email_normalized text not null,
  ip_address text,
  user_agent text,
  fingerprint text,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists billing_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider text not null,
  target_plan text not null,
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

create table if not exists billing_gateway_settings (
  user_id uuid primary key references users(id) on delete cascade,
  pix_connected boolean not null default false,
  mercado_pago_connected boolean not null default false,
  stripe_connected boolean not null default false,
  provider_status text not null default 'config_required',
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

create table if not exists integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  provider text not null,
  status text not null,
  config jsonb not null default '{}'::jsonb,
  connected_at timestamptz,
  disconnected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  status text not null,
  signer_name text,
  signed_at timestamptz,
  file_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists dashboard_stats (
  user_id uuid primary key references users(id) on delete cascade,
  active_students int not null default 0,
  workouts_created int not null default 0,
  monthly_revenue numeric(10,2) not null default 0,
  scheduled_classes int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists platform_revenue (
  id uuid primary key default gen_random_uuid(),
  amount numeric(10,2) not null,
  source text,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'students_status_check'
      and conrelid = 'students'::regclass
  ) then
    alter table students add constraint students_status_check check (status in ('active', 'inactive'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'students_age_check'
      and conrelid = 'students'::regclass
  ) then
    alter table students add constraint students_age_check check (age is null or age between 0 and 120);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'students_weight_check'
      and conrelid = 'students'::regclass
  ) then
    alter table students add constraint students_weight_check check (weight is null or weight > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'students_height_check'
      and conrelid = 'students'::regclass
  ) then
    alter table students add constraint students_height_check check (height is null or height > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'schedule_status_check'
      and conrelid = 'schedule'::regclass
  ) then
    alter table schedule add constraint schedule_status_check check (status in ('scheduled', 'cancelled'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'payments_status_check'
      and conrelid = 'payments'::regclass
  ) then
    alter table payments add constraint payments_status_check check (status in ('pending', 'paid'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'payments_amount_check'
      and conrelid = 'payments'::regclass
  ) then
    alter table payments add constraint payments_amount_check check (amount > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'coaches_plan_check'
      and conrelid = 'coaches'::regclass
  ) then
    alter table coaches add constraint coaches_plan_check check (plan in ('trial', 'basic', 'basic_free', 'pro', 'premium'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'coaches_plan_status_check'
      and conrelid = 'coaches'::regclass
  ) then
    alter table coaches add constraint coaches_plan_status_check check (
      plan_status in ('active', 'inactive', 'limited', 'pending_email', 'trialing', 'canceled', 'past_due', 'incomplete', 'expired')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'users_plan_check'
      and conrelid = 'users'::regclass
  ) then
    alter table users add constraint users_plan_check check (plan in ('trial', 'basic', 'basic_free', 'pro', 'premium'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'users_plan_status_check'
      and conrelid = 'users'::regclass
  ) then
    alter table users add constraint users_plan_status_check check (
      plan_status in ('active', 'inactive', 'limited', 'pending_email', 'trialing', 'canceled', 'past_due', 'incomplete', 'expired')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'subscriptions_plan_check'
      and conrelid = 'subscriptions'::regclass
  ) then
    alter table subscriptions add constraint subscriptions_plan_check check (
      plan in ('trial', 'basic', 'basic_free', 'pro', 'premium')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'subscriptions_status_check'
      and conrelid = 'subscriptions'::regclass
  ) then
    alter table subscriptions add constraint subscriptions_status_check check (
      status in ('active', 'inactive', 'free', 'limited', 'pending_email', 'trialing', 'canceled', 'past_due', 'incomplete', 'expired')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'subscriptions_subscription_status_check'
      and conrelid = 'subscriptions'::regclass
  ) then
    alter table subscriptions add constraint subscriptions_subscription_status_check check (
      subscription_status is null
      or subscription_status in ('active', 'inactive', 'free', 'limited', 'pending_email', 'trialing', 'canceled', 'past_due', 'incomplete', 'expired')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'student_ai_messages_role_check'
      and conrelid = 'student_ai_messages'::regclass
  ) then
    alter table student_ai_messages add constraint student_ai_messages_role_check check (role in ('user', 'assistant'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ai_conversations_role_check'
      and conrelid = 'ai_conversations'::regclass
  ) then
    alter table ai_conversations add constraint ai_conversations_role_check check (role in ('user', 'assistant'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'billing_customers_provider_check'
      and conrelid = 'billing_customers'::regclass
  ) then
    alter table billing_customers add constraint billing_customers_provider_check check (provider in ('stripe', 'mercado_pago'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'billing_checkout_sessions_provider_check'
      and conrelid = 'billing_checkout_sessions'::regclass
  ) then
    alter table billing_checkout_sessions add constraint billing_checkout_sessions_provider_check check (
      provider in ('stripe', 'mercado_pago')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'billing_checkout_sessions_target_plan_check'
      and conrelid = 'billing_checkout_sessions'::regclass
  ) then
    alter table billing_checkout_sessions add constraint billing_checkout_sessions_target_plan_check check (
      target_plan in ('basic', 'pro', 'premium')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'integrations_provider_check'
      and conrelid = 'integrations'::regclass
  ) then
    alter table integrations add constraint integrations_provider_check check (
      provider in ('whatsapp', 'google_calendar', 'email')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'integrations_status_check'
      and conrelid = 'integrations'::regclass
  ) then
    alter table integrations add constraint integrations_status_check check (
      status in ('connected', 'disconnected', 'coming_soon', 'config_required')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'contracts_status_check'
      and conrelid = 'contracts'::regclass
  ) then
    alter table contracts add constraint contracts_status_check check (
      status in ('draft', 'sent', 'signed', 'canceled')
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'football_pass_score_check'
      and conrelid = 'football_assessments'::regclass
  ) then
    alter table football_assessments add constraint football_pass_score_check check (pass_score is null or pass_score between 0 and 10);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'football_finishing_score_check'
      and conrelid = 'football_assessments'::regclass
  ) then
    alter table football_assessments add constraint football_finishing_score_check check (finishing_score is null or finishing_score between 0 and 10);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'football_speed_score_check'
      and conrelid = 'football_assessments'::regclass
  ) then
    alter table football_assessments add constraint football_speed_score_check check (speed_score is null or speed_score between 0 and 10);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'football_endurance_score_check'
      and conrelid = 'football_assessments'::regclass
  ) then
    alter table football_assessments add constraint football_endurance_score_check check (endurance_score is null or endurance_score between 0 and 10);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'football_positioning_score_check'
      and conrelid = 'football_assessments'::regclass
  ) then
    alter table football_assessments add constraint football_positioning_score_check check (positioning_score is null or positioning_score between 0 and 10);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'football_decision_making_score_check'
      and conrelid = 'football_assessments'::regclass
  ) then
    alter table football_assessments add constraint football_decision_making_score_check check (decision_making_score is null or decision_making_score between 0 and 10);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'football_psychological_score_check'
      and conrelid = 'football_assessments'::regclass
  ) then
    alter table football_assessments add constraint football_psychological_score_check check (psychological_score is null or psychological_score between 0 and 10);
  end if;
end $$;

create index if not exists idx_users_email on users(email);
create index if not exists idx_students_coach_id on students(coach_id);
create index if not exists idx_students_coach_status on students(coach_id, status);
create index if not exists idx_students_coach_created_at on students(coach_id, created_at desc);
create index if not exists idx_workouts_coach_id on workouts(coach_id);
create index if not exists idx_workouts_coach_student_created on workouts(coach_id, student_id, created_at desc);
create index if not exists idx_progress_coach_id on progress_records(coach_id);
create index if not exists idx_progress_coach_student_record on progress_records(coach_id, student_id, record_date desc);
create index if not exists idx_schedule_coach_id on schedule(coach_id);
create index if not exists idx_schedule_coach_status_date on schedule(coach_id, status, class_date);
create index if not exists idx_payments_coach_id on payments(coach_id);
create index if not exists idx_payments_coach_status_due on payments(coach_id, status, due_date);
create index if not exists idx_football_coach_id on football_assessments(coach_id);
create index if not exists idx_football_coach_student_date on football_assessments(coach_id, student_id, assessment_date desc);
create index if not exists idx_subscriptions_user_id on subscriptions(user_id);
create unique index if not exists idx_subscriptions_user_provider_unique on subscriptions(user_id, provider);
create index if not exists idx_email_verifications_user_id_created_at on email_verifications(user_id, created_at desc);
create unique index if not exists idx_email_verifications_active_token_hash on email_verifications(token_hash) where confirmed_at is null;
create index if not exists idx_notification_logs_user_created on notification_logs(user_id, created_at desc);
create index if not exists idx_notification_logs_type_created on notification_logs(type, created_at desc);
create unique index if not exists idx_notification_logs_sent_dedupe on notification_logs(user_id, type, channel, coalesce(reference_id, '')) where status = 'sent';
create index if not exists idx_trial_claims_user_id on trial_claims(user_id);
create unique index if not exists idx_trial_claims_email_normalized_unique on trial_claims(email_normalized);
create index if not exists idx_trial_claims_ip_address_created_at on trial_claims(ip_address, created_at desc);
create index if not exists idx_trial_claims_fingerprint on trial_claims(fingerprint);
create unique index if not exists idx_ai_usage_user_month_unique on ai_usage(user_id, month);
create index if not exists idx_student_ai_messages_user_student on student_ai_messages(user_id, student_id, created_at desc);
create index if not exists idx_ai_conversations_user_student_created on ai_conversations(user_id, student_id, created_at desc);
create index if not exists idx_student_portal_access_student on student_portal_access(student_id, user_id);
create unique index if not exists idx_student_portal_access_token_hash_unique on student_portal_access(access_token_hash);
create index if not exists idx_recurring_payments_user_status on recurring_payments(user_id, status, next_due_date);
create index if not exists idx_automation_logs_user_created on automation_logs(user_id, created_at desc);
create unique index if not exists idx_integrations_user_provider_unique on integrations(user_id, provider);
create unique index if not exists idx_billing_customers_user_provider_unique on billing_customers(user_id, provider);
create unique index if not exists idx_billing_customers_external_unique on billing_customers(provider, external_customer_id);
create unique index if not exists idx_billing_checkout_sessions_external_unique on billing_checkout_sessions(provider, external_session_id);

alter table coaches enable row level security;
alter table students enable row level security;
alter table workouts enable row level security;
alter table progress_records enable row level security;
alter table schedule enable row level security;
alter table payments enable row level security;
alter table football_assessments enable row level security;
alter table users enable row level security;
alter table dashboard_stats enable row level security;
alter table subscriptions enable row level security;
alter table email_verifications enable row level security;
alter table notification_logs enable row level security;
alter table ai_usage enable row level security;
alter table student_ai_messages enable row level security;
alter table ai_conversations enable row level security;
alter table student_portal_access enable row level security;
alter table recurring_payments enable row level security;
alter table billing_customers enable row level security;
alter table billing_checkout_sessions enable row level security;
alter table billing_gateway_settings enable row level security;
alter table automation_logs enable row level security;
alter table whatsapp_automation_settings enable row level security;
alter table integrations enable row level security;
alter table user_preferences enable row level security;
alter table contracts enable row level security;

drop policy if exists coach_own_profile on coaches;
create policy coach_own_profile on coaches
for all using (auth.uid() = id);

drop policy if exists coach_students on students;
create policy coach_students on students
for all using (auth.uid() = coach_id);

drop policy if exists coach_workouts on workouts;
create policy coach_workouts on workouts
for all using (auth.uid() = coach_id);

drop policy if exists coach_progress on progress_records;
create policy coach_progress on progress_records
for all using (auth.uid() = coach_id);

drop policy if exists coach_schedule on schedule;
create policy coach_schedule on schedule
for all using (auth.uid() = coach_id);

drop policy if exists coach_payments on payments;
create policy coach_payments on payments
for all using (auth.uid() = coach_id);

drop policy if exists coach_football on football_assessments;
create policy coach_football on football_assessments
for all using (auth.uid() = coach_id);

drop policy if exists user_own_profile on users;
create policy user_own_profile on users
for all using (auth.uid() = id);

drop policy if exists user_own_dashboard_stats on dashboard_stats;
create policy user_own_dashboard_stats on dashboard_stats
for all using (auth.uid() = user_id);

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
