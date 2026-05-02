# TrainFlow

Plataforma SaaS para personal trainers, treinadores esportivos e professores de futebol/musculacao/funcional.

## Stack
- Frontend: React + Tailwind CSS + React Router + Recharts
- Backend: Node.js + Express
- Banco: Supabase (PostgreSQL)
- Auth: Email e senha (Supabase Auth + JWT)
- Monitoramento: Sentry
- Rate limit distribuido: Upstash Redis

## Estrutura
- `frontend/`: aplicacao web SaaS responsiva
- `backend/`: API REST com modulos de negocio
- `database/`: schema SQL, migrations e seeds
- `docs/`: arquitetura, rollout e operacao

## Como rodar

### 1) Backend
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### 2) Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### 3) Banco (Supabase)
1. Crie um projeto no Supabase.
2. Projeto novo: rode `database/supabase_schema.sql`.
3. Projeto existente: siga a ordem em `database/migrations/README.md`.
4. Opcional: rode `database/seed.sql`.

## Scripts de qualidade

### Frontend
- `npm run lint`
- `npm test`
- `npm run build`

### Backend
- `npm run lint`
- `npm test`

## Variaveis obrigatorias do frontend
- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_NAME`

## Variaveis obrigatorias do backend em producao
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `JWT_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_BASIC_PRICE_ID`
- `STRIPE_PRO_PRICE_ID`
- `STRIPE_PREMIUM_PRICE_ID`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `FRONTEND_URL`
- `APP_URLS`

## Variaveis recomendadas do backend
- `SENTRY_DSN`
- `SENTRY_ENVIRONMENT`
- `SENTRY_TRACES_SAMPLE_RATE`
- `RATE_LIMIT_PREFIX`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`
- `PORTAL_TOKEN_TTL_HOURS`
- `PASSWORD_RESET_PATH`
- `EMAIL_PROVIDER`
- `EMAIL_FROM_NAME`
- `EMAIL_FROM_EMAIL`
- `EMAIL_REPLY_TO`
- `RESEND_API_KEY`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`

## Fail-fast de configuracao
- O frontend falha cedo sem `VITE_API_URL`, `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY`.
- O backend falha cedo em producao sem Supabase, JWT, Stripe, CORS final ou Upstash configurados.
- Checkout continua usando a mesma logica atual; o hardening apenas evita deploy silenciosamente quebrado.

## Rate limit em producao
- Storage compartilhado: Upstash Redis.
- Identificacao por `user_id` quando autenticado e por IP nas rotas publicas.
- Configuracao padrao via `.env`:
  - `RATE_LIMIT_PREFIX`
  - `RATE_LIMIT_WINDOW_MS`
  - `RATE_LIMIT_MAX`

## Observabilidade
- Sentry integrado no backend para erros de request, `unhandledRejection` e `uncaughtException`.
- Logs estruturados em JSON no backend.
- `GET /health` agora retorna:
  - status da API
  - timestamp
  - estado basico da conexao com banco
- Em staging e producao, monitore a latencia do banco retornada em `GET /health`.
- Se a latencia ficar consistentemente alta, investigue pool de conexoes, regiao do banco, carga e consultas mais lentas antes do go-live.

## Banco e migrations
- Fluxo oficial documentado em [docs/database_deploy.md](/C:/Users/moise/Documents/Programação/Saas/Personal/docs/database_deploy.md:1)
- Ordem oficial das migrations em [database/migrations/README.md](/C:/Users/moise/Documents/Programação/Saas/Personal/database/migrations/README.md:1)
- Regras:
  - staging antes de producao
  - nao editar migration historica ja aplicada
  - correcao sempre por nova migration incremental

## Checklist de deploy
1. Confirmar dominio final do frontend e backend.
2. Configurar todas as variaveis obrigatorias do frontend.
3. Configurar todas as variaveis obrigatorias do backend.
4. Configurar Sentry e validar ingestao de erro.
5. Configurar Upstash Redis para rate limit distribuido.
6. Aplicar schema ou migrations na ordem oficial.
7. Rodar `npm run lint` e `npm test` em `frontend/`.
8. Rodar `npm run lint` e `npm test` em `backend/`.
9. Rodar `npm run build` em `frontend/`.
10. Publicar o backend com `NODE_ENV=production`.
11. Publicar o frontend com rewrite SPA para `index.html`.
12. Validar no host final o acesso direto e refresh em `/login`, `/register`, `/dashboard` e uma rota com parametro como `/students/123`.
13. Configurar `VITE_API_URL` com a URL publica do backend.
14. Configurar `APP_URLS` com o dominio final do frontend.
15. Configurar o webhook oficial da Stripe em `POST /api/billing/webhooks/stripe`.
16. Validar `GET /health` apos deploy e registrar status + latencia do banco.
17. Testar login.
18. Testar registro.
19. Testar rota protegida sem auth.
20. Testar checkout success/cancel.
21. Testar webhook Stripe.
22. Testar IA.
23. Testar exportacao PDF e envio de email.

## Rollback basico
1. Congelar deploys do frontend/backend se a migracao falhar.
2. Restaurar backup ou point-in-time recovery do Supabase se houver impacto em producao.
3. Aplicar migration corretiva versionada antes de retomar o deploy.
4. Revalidar `GET /health`, login, checkout e webhook.

## CI
- Backend:
  - `npm ci`
  - `npm run lint`
  - `npm test`
- Frontend:
  - `npm ci`
  - `npm run lint`
  - `npm test`
  - `npm run build`
