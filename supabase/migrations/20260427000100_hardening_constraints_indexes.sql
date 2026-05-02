-- TrainFlow - Hardening de schema (constraints + indices compostos)
-- Idempotente: pode ser executado em staging e depois em producao com seguranca.

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
    alter table coaches add constraint coaches_plan_check check (plan in ('basic', 'medium', 'advanced'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'users_plan_check'
      and conrelid = 'users'::regclass
  ) then
    alter table users add constraint users_plan_check check (plan in ('basic', 'medium', 'advanced'));
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

create index if not exists idx_students_coach_status on students(coach_id, status);
create index if not exists idx_students_coach_created_at on students(coach_id, created_at desc);
create index if not exists idx_workouts_coach_student_created on workouts(coach_id, student_id, created_at desc);
create index if not exists idx_schedule_coach_status_date on schedule(coach_id, status, class_date);
create index if not exists idx_payments_coach_status_due on payments(coach_id, status, due_date);
create index if not exists idx_progress_coach_student_record on progress_records(coach_id, student_id, record_date desc);
create index if not exists idx_football_coach_student_date on football_assessments(coach_id, student_id, assessment_date desc);
