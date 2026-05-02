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

alter table notification_logs
  add column if not exists reference_id text,
  add column if not exists channel text not null default 'email',
  add column if not exists status text not null default 'pending',
  add column if not exists sent_at timestamptz,
  add column if not exists error_message text,
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_notification_logs_user_created
  on notification_logs(user_id, created_at desc);

create index if not exists idx_notification_logs_type_created
  on notification_logs(type, created_at desc);

create unique index if not exists idx_notification_logs_sent_dedupe
  on notification_logs(user_id, type, channel, coalesce(reference_id, ''))
  where status = 'sent';
