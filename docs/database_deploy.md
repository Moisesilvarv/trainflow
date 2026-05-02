# Deploy de banco: staging -> producao

## Ordem
1. Confirmar o tipo do projeto:
   - projeto novo: aplicar `database/supabase_schema.sql`
   - projeto existente: aplicar as migrations em `database/migrations/README.md`
2. Rodar primeiro em staging.
3. Validar fluxos principais no ambiente staging.
4. Promover a mesma sequencia para producao.

## Validacao minima em staging
- cadastro e login
- CRUD de alunos
- criacao de treino e exportacao PDF
- agenda
- financeiro
- checkout Stripe + webhook
- portal do aluno
- `GET /health` com status `ok` e latencia de banco dentro do esperado para o ambiente

## Frontend SPA rewrite
- Validar no host final que qualquer rota do app responde `index.html` antes do React assumir o roteamento.
- Testar acesso direto, refresh e abrir em nova aba para pelo menos:
  - `/login`
  - `/register`
  - `/dashboard`
  - `/students/123`
- Se alguma dessas rotas retornar `404`, `403` ou pagina padrao do provedor, o rewrite SPA nao esta configurado corretamente e o deploy nao deve ir para producao.

## Rollback basico
- Se uma migration ainda nao foi para producao, corrigir com nova migration e reaplicar apenas em staging.
- Se ja houve impacto em producao, congelar deploy, restaurar backup/point-in-time recovery do Supabase se necessario e publicar migration corretiva.
- Registrar toda correcao em arquivo versionado dentro de `database/migrations/`.
