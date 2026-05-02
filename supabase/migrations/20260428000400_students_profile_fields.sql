alter table if exists students
  add column if not exists birth_date date,
  add column if not exists level text,
  add column if not exists objective_notes text,
  add column if not exists avatar_url text;
