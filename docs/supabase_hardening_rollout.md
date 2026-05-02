# Rollout do Hardening SQL (Staging -> Producao)

## Script
- `database/migrations/2026-04-27_hardening_constraints_indexes.sql`

## Ordem recomendada
1. Executar em **staging**.
2. Validar aplicacao (fluxos principais e logs).
3. Executar em **producao**.

## Execucao via Supabase SQL Editor
1. Abra o projeto staging no Supabase.
2. Abra **SQL Editor**.
3. Cole o conteudo completo do arquivo de migracao.
4. Rode e confirme que finalizou sem erro.
5. Repita os mesmos passos no projeto de producao.

## Validacao rapida (pos-migracao)
Execute estas queries:

```sql
select conname
from pg_constraint
where conname in (
  'students_status_check',
  'students_age_check',
  'students_weight_check',
  'students_height_check',
  'schedule_status_check',
  'payments_status_check',
  'payments_amount_check',
  'coaches_plan_check',
  'users_plan_check'
)
order by conname;
```

```sql
select indexname
from pg_indexes
where indexname in (
  'idx_students_coach_status',
  'idx_students_coach_created_at',
  'idx_workouts_coach_student_created',
  'idx_schedule_coach_status_date',
  'idx_payments_coach_status_due',
  'idx_progress_coach_student_record',
  'idx_football_coach_student_date'
)
order by indexname;
```

## Checklist de seguranca antes de producao
- Staging sem erro ao criar/editar aluno, treino, agenda, pagamento e progresso.
- Nenhum erro novo nos logs do backend apos deploy.
- Build frontend/backend validado na branch atual.
