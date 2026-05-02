# Arquitetura TrainFlow

## Visão geral
- Frontend web React (camada de apresentação)
- API Node/Express (camada de domínio e orquestração)
- Supabase PostgreSQL + Auth (persistência e identidade)

## Preparação para mobile
- API REST desacoplada da interface
- Tokens JWT stateless
- Entidades normalizadas por `coach_id`
- Endpoints reutilizáveis para app React Native/Flutter
- Uploads e mídia prontos para mover para Supabase Storage/CDN

## Módulos
- Auth
- Dashboard
- Alunos
- Treinos
- Evolução
- Agenda
- Financeiro
- Futebol
- Admin

## Endpoints principais
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/dashboard`
- `GET|POST /api/students`
- `GET|PUT|DELETE /api/students/:id`
- `GET|POST /api/workouts`
- `PUT|DELETE /api/workouts/:id`
- `GET /api/workouts/:id/pdf`
- `GET|POST /api/progress`
- `GET|POST /api/schedule`
- `POST /api/schedule/reminders/dispatch`
- `PATCH /api/schedule/:id/cancel`
- `GET|POST /api/finance`
- `GET /api/finance/summary`
- `PATCH /api/finance/:id/paid`
- `GET|POST /api/football/assessments`
- `GET /api/admin/overview`

## Planos
- Basico: ate 20 alunos
- Pro: ate 80 alunos
- Premium: ilimitado, com automacoes, portal do aluno e dashboard inteligente

## Escala
- Horizontal scale da API atrás de load balancer
- Supabase gerenciando conexão e backup
- Cache de dashboard com Redis (próxima etapa)
- Processamento assíncrono para lembretes e notificações (fila)
