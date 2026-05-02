# Fluxo de migrations do TrainFlow

## Ordem oficial
1. `2026-04-27_hardening_constraints_indexes.sql`
2. `2026-04-28_plans_premium_ai_portal.sql`
3. `2026-04-28_production_billing_persistence.sql`
4. `2026-04-28_stripe_subscription_checkout.sql`
5. `2026-04-28_students_profile_fields.sql`
6. `2026-05-01_email_verification.sql`
7. `2026-05-01_stripe_pix_checkout.sql`
8. `2026-05-01_students_avatar_url.sql`
9. `2026-05-01_trial_checkout_protection.sql`
10. `2026-05-02_email_verification_trial_flow.sql`
11. `2026-05-02_notification_logs.sql`

## Regras
- Aplicar sempre na ordem acima.
- Executar primeiro em staging.
- Confirmar build, testes e logs antes de promover para producao.
- Toda nova migration deve ser idempotente ou validar existencia antes de criar/alterar objetos.
- Nao editar migrations ja aplicadas em producao. Para correcoes, criar nova migration incremental.

## Rollback basico
- Se uma migration falhar em staging, corrija com uma nova migration incremental antes de repetir.
- Se falhar em producao, suspenda o deploy da API/frontend, restaure backup do banco se necessario e aplique script corretivo versionado.
- Nunca rode SQL manual ad-hoc em producao sem registrar o passo corretivo em `database/migrations/`.
