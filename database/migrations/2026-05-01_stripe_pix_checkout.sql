alter table subscriptions add column if not exists payment_method text;
alter table subscriptions add column if not exists expires_at timestamptz;
alter table subscriptions add column if not exists current_period_end timestamptz;
alter table subscriptions add column if not exists external_checkout_session_id text;
