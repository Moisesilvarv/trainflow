alter table if exists users
  add column if not exists email_verified boolean not null default false,
  add column if not exists email_verification_token text,
  add column if not exists email_verification_expires_at timestamptz;

alter table if exists coaches
  add column if not exists email_verified boolean not null default false,
  add column if not exists email_verification_token text,
  add column if not exists email_verification_expires_at timestamptz;

create index if not exists idx_users_email_verification_token
  on users(email_verification_token);

create index if not exists idx_coaches_email_verification_token
  on coaches(email_verification_token);
