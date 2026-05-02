import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  Crown,
  Lock,
  Sparkles,
  UserPlus2,
  Users
} from 'lucide-react';
import api from '../api/client';
import { RetentionChart } from '../components/charts/RetentionChart';
import { RevenueChart } from '../components/charts/RevenueChart';
import { StatCard } from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import { getPlanById, getStudentLimitByPlan, getUpgradeCopy, hasPlanFeature } from '../constants/plans';

function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200 ${className}`} />;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value) || 0);
}

function getInitials(name = '') {
  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!parts.length) return 'TF';
  return parts.map((part) => part[0]).join('').toUpperCase();
}

function monthBounds(offset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  return { start, end };
}

function countInMonth(list = [], field, offset = 0) {
  const { start, end } = monthBounds(offset);
  return (list || []).filter((item) => {
    const raw = item?.[field];
    if (!raw) return false;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return false;
    return date >= start && date < end;
  }).length;
}

function deltaInfo(current = 0, previous = 0, suffix = 'vs mes anterior') {
  const diff = Number(current) - Number(previous);
  if (diff > 0) return { text: `+${diff} ${suffix}`, tone: 'positive' };
  if (diff < 0) return { text: `${diff} ${suffix}`, tone: 'negative' };
  return { text: `0 ${suffix}`, tone: 'neutral' };
}

export function DashboardPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [students, setStudents] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [payments, setPayments] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [smartDashboard, setSmartDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const canSmartDashboard = hasPlanFeature(user?.plan, 'smart_dashboard');
  const isExpiredTrial = user?.planStatus === 'expired';

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [metricsRes, studentsRes, scheduleRes, paymentsRes, workoutsRes, smartRes] = await Promise.all([
          api.get('/dashboard'),
          api.get('/students'),
          api.get('/schedule'),
          api.get('/finance').catch(() => ({ data: [] })),
          api.get('/workouts'),
          canSmartDashboard && !isExpiredTrial ? api.get('/premium/dashboard').catch(() => ({ data: null })) : Promise.resolve({ data: null })
        ]);

        setMetrics(metricsRes.data || {});
        setStudents(studentsRes.data || []);
        setSchedule(scheduleRes.data || []);
        setPayments(paymentsRes.data || []);
        setWorkouts(workoutsRes.data || []);
        setSmartDashboard(smartRes.data || null);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [canSmartDashboard, isExpiredTrial]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <SkeletonBlock className="h-10 w-56" />
          <SkeletonBlock className="mt-2 h-5 w-80" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
          <SkeletonBlock className="h-44" />
          <SkeletonBlock className="h-44" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <SkeletonBlock key={item} className="h-36" />
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <SkeletonBlock className="h-80" />
          <SkeletonBlock className="h-80" />
        </div>
      </div>
    );
  }

  const pendingPayments = [...(payments || [])].filter((item) => item.status === 'pending').slice(0, 5);
  const recentStudents = [...(students || [])]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 6);
  const upcomingClasses = [...(schedule || [])]
    .filter((item) => item.status !== 'cancelled')
    .sort((a, b) => new Date(a.class_date || 0) - new Date(b.class_date || 0))
    .slice(0, 5);

  const revenueSeries = metrics?.monthlyRevenue || [];
  const currentRevenue = Number(revenueSeries[revenueSeries.length - 1]?.value || 0);
  const previousRevenue = Number(revenueSeries[revenueSeries.length - 2]?.value || 0);

  const studentsDelta = deltaInfo(countInMonth(students, 'created_at', 0), countInMonth(students, 'created_at', -1));
  const workoutsDelta = deltaInfo(countInMonth(workouts, 'created_at', 0), countInMonth(workouts, 'created_at', -1));
  const revenueDelta = deltaInfo(currentRevenue, previousRevenue, 'vs ultimo mes');
  const classesDelta = deltaInfo(countInMonth(schedule, 'class_date', 0), countInMonth(schedule, 'class_date', -1));

  const isNewAccount =
    (metrics?.totalStudents || 0) === 0 &&
    (metrics?.workoutsCreated || 0) === 0 &&
    (payments || []).length === 0 &&
    (schedule || []).length === 0;

  const onboardingSteps = [
    { label: 'Cadastrar o primeiro aluno', done: (metrics?.totalStudents || 0) > 0, to: '/students', cta: 'Ir para alunos' },
    { label: 'Criar o primeiro treino', done: (metrics?.workoutsCreated || 0) > 0, to: '/workouts', cta: 'Ir para treinos' },
    isExpiredTrial
      ? { label: 'Agendar a primeira sessao', done: (metrics?.upcomingClasses || 0) > 0, to: '/schedule', cta: 'Ir para agenda' }
      : { label: 'Lancar primeira cobranca', done: (payments || []).length > 0, to: '/finance', cta: 'Ir para financeiro' }
  ];

  const currentPlan = getPlanById(user?.plan);
  const activeStudents = metrics?.activeStudents || 0;
  const planLimit = getStudentLimitByPlan(user?.plan);
  const usagePercent = planLimit ? Math.min(100, Math.round((activeStudents / Math.max(planLimit, 1)) * 100)) : 0;
  const smartDashboardTeaser = getUpgradeCopy('smart_dashboard');
  const showTrialNotice = user?.planStatus === 'trialing' && user?.trialDaysRemaining > 0;
  const trialNoticeText = user?.trialDaysRemaining === 1
    ? 'Seu teste gratis termina amanha.'
    : `Teste gratis: ${user?.trialDaysRemaining || 0} dias restantes`;

  const statsCards = [
    {
      title: 'Alunos ativos',
      value: metrics?.activeStudents ?? 0,
      subtitle: 'Base com status ativo',
      icon: Users,
      deltaText: studentsDelta.text,
      deltaTone: studentsDelta.tone
    },
    {
      title: 'Treinos criados',
      value: metrics?.workoutsCreated ?? 0,
      subtitle: 'Biblioteca de planejamentos',
      icon: ClipboardList,
      deltaText: workoutsDelta.text,
      deltaTone: workoutsDelta.tone
    },
    {
      title: 'Receita mensal',
      value: formatCurrency(currentRevenue),
      subtitle: 'Receita do mes atual',
      icon: CircleDollarSign,
      deltaText: revenueDelta.text,
      deltaTone: revenueDelta.tone
    },
    {
      title: 'Sessoes agendadas',
      value: metrics?.upcomingClasses ?? 0,
      subtitle: 'Compromissos futuros',
      icon: CalendarClock,
      deltaText: classesDelta.text,
      deltaTone: classesDelta.tone
    }
  ];

  return (
    <div className="space-y-6">
      {showTrialNotice ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800">
          {trialNoticeText}
        </div>
      ) : null}

      {isExpiredTrial ? (
        <div className="overflow-hidden rounded-[30px] border border-amber-200/80 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_28%),linear-gradient(145deg,#fffdf7_0%,#fff6e5_58%,#ffffff_100%)] shadow-[0_20px_44px_rgba(146,64,14,0.10)]">
          <div className="flex flex-wrap items-center justify-between gap-6 px-5 py-5 lg:px-7">
            <div className="max-w-3xl">
              <p className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700">
                <Crown size={13} />
                Trial expirado
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
                Sua base continua aqui. O ritmo de criacao fica pausado ate a reativacao.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Consulte alunos, treinos e indicadores existentes. Criar, enviar e automatizar volta a ficar liberado assim que voce fizer upgrade.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {[
                'Novos alunos',
                'Novos treinos',
                'IA e envios'
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/80 bg-white/75 px-4 py-3 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <Lock size={12} />
                    Bloqueado
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <section className="card p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                <Sparkles size={12} />
                {isExpiredTrial ? 'Leitura liberada' : 'Dashboard inteligente'}
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">Painel principal</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                {isExpiredTrial
                  ? 'Acompanhe seus dados existentes enquanto decide o upgrade. Acoes de criacao, envio e IA ficam bloqueadas ate reativar o plano.'
                  : 'Visao consolidada da sua operacao, com indicadores, receita, sessoes e atividades mais recentes.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link to="/students" className="btn-secondary inline-flex items-center gap-2">
                <UserPlus2 size={15} />
                Novo aluno
              </Link>
              {isExpiredTrial ? (
                <Link to="/schedule" className="btn-primary inline-flex items-center gap-2">
                  <CalendarClock size={15} />
                  Nova sessao
                </Link>
              ) : (
                <Link to="/finance" className="btn-primary inline-flex items-center gap-2">
                  <CreditCard size={15} />
                  Nova cobranca
                </Link>
              )}
            </div>
          </div>

          {isNewAccount ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">Onboarding inicial</p>
              <p className="mt-1 text-sm text-slate-500">Complete os primeiros passos para ativar seu painel com dados reais.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {onboardingSteps.map((step) => (
                  <div key={step.label} className="rounded-xl border border-slate-200 bg-white p-3">
                    <p className={`text-sm font-medium ${step.done ? 'text-emerald-700' : 'text-slate-700'}`}>{step.label}</p>
                    <div className="mt-2">
                      {step.done ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle2 size={12} /> Concluido
                        </span>
                      ) : (
                        <Link to={step.to} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-500">
                          {step.cta} <ArrowRight size={12} />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <aside className="card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-sm font-bold text-blue-700">
              {getInitials(user?.name)}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{user?.name || 'Treinador'}</p>
              <p className="text-xs text-slate-500">Plano {currentPlan.name}</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-500">Uso do plano</p>
            {planLimit ? (
              <>
                <p className="mt-1 text-sm font-semibold text-slate-800">{activeStudents}/{planLimit} alunos ativos</p>
                <div className="mt-2 h-2.5 w-full rounded-full bg-slate-200">
                  <div className="h-2.5 rounded-full bg-blue-600" style={{ width: `${usagePercent}%` }} />
                </div>
                <p className="mt-1 text-xs text-slate-500">{usagePercent}% da capacidade utilizada</p>
              </>
            ) : (
              <p className="mt-1 text-sm font-semibold text-slate-800">Alunos ilimitados no plano atual</p>
            )}
          </div>
        </aside>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statsCards.map((card) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
            icon={card.icon}
            deltaText={card.deltaText}
            deltaTone={card.deltaTone}
          />
        ))}
      </div>

      {isExpiredTrial ? null : (
        <div className="grid gap-4 xl:grid-cols-2">
          <RevenueChart data={metrics?.monthlyRevenue || []} />
          <RetentionChart rate={metrics?.retentionRate || 0} total={metrics?.totalStudents || 0} active={metrics?.activeStudents || 0} />
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="card p-5">
          <h3 className="text-lg font-semibold text-slate-900">Proximos agendamentos</h3>
          <p className="mt-1 text-sm text-slate-500">Sessoes, aulas e compromissos mais proximos.</p>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            {upcomingClasses.map((event) => (
              <li key={event.id} className="rounded-xl bg-slate-50 px-3 py-2.5">
                <p className="font-medium text-slate-700">{event.title}</p>
                <p className="text-xs text-slate-500">{new Date(event.class_date).toLocaleString('pt-BR')}</p>
              </li>
            ))}
            {upcomingClasses.length === 0 ? (
              <li className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                Nenhum agendamento no momento.
              </li>
            ) : null}
          </ul>
        </section>

        <section className="card p-5">
          <h3 className="text-lg font-semibold text-slate-900">Alunos recentes</h3>
          <p className="mt-1 text-sm text-slate-500">Novos alunos adicionados na sua base.</p>
          <ul className="mt-4 space-y-2">
            {recentStudents.map((student) => (
              <li key={student.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-xs font-bold text-blue-700">
                    {getInitials(student.name)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{student.name}</p>
                    <p className="text-xs text-slate-500">{student.goal || 'Sem objetivo'}{student.age ? ` â€¢ ${student.age} anos` : ''}</p>
                  </div>
                </div>
                <span className="text-xs text-slate-400">{student.phone || student.email || '-'}</span>
              </li>
            ))}
            {recentStudents.length === 0 ? (
              <li className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                Nenhum aluno cadastrado ainda.
              </li>
            ) : null}
          </ul>
        </section>

        {isExpiredTrial ? null : (
          <section className="card p-5">
            <h3 className="text-lg font-semibold text-slate-900">Pagamentos pendentes</h3>
            <p className="mt-1 text-sm text-slate-500">Itens que requerem acompanhamento financeiro.</p>
            <ul className="mt-4 space-y-2">
              {pendingPayments.map((payment) => (
                <li key={payment.id} className="rounded-xl bg-slate-50 px-3 py-2.5">
                  <p className="text-sm font-semibold text-slate-700">{payment.description || 'Mensalidade'}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{formatCurrency(payment.amount)} â€¢ Vence em {payment.due_date || '-'}</p>
                </li>
              ))}
              {pendingPayments.length === 0 ? (
                <li className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  Sem pagamentos pendentes. Fluxo financeiro em dia.
                </li>
              ) : null}
            </ul>
          </section>
        )}
      </div>

      {isExpiredTrial ? null : (
        <section className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-black tracking-tight text-slate-900">Dashboard inteligente</h3>
              <p className="mt-1 text-sm text-slate-500">Alertas de risco e saude da carteira para agir antes de perder receita ou alunos.</p>
            </div>
            <Link to="/reports" className="btn-secondary">Abrir recursos Premium</Link>
          </div>

          {canSmartDashboard && smartDashboard ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Inadimplentes</p>
                <p className="mt-2 text-3xl font-black text-slate-900">{smartDashboard.alerts?.overdueStudents?.length || 0}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Sem treino recente</p>
                <p className="mt-2 text-3xl font-black text-slate-900">{smartDashboard.alerts?.studentsWithoutRecentWorkout?.length || 0}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Sem agendamento</p>
                <p className="mt-2 text-3xl font-black text-slate-900">{smartDashboard.alerts?.studentsWithoutRecentSchedule?.length || 0}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Risco de cancelamento</p>
                <p className="mt-2 text-3xl font-black text-slate-900">{smartDashboard.alerts?.cancellationRisk?.length || 0}</p>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-3xl border border-blue-100 bg-gradient-to-r from-white via-blue-50 to-cyan-50 p-5">
              <p className="text-sm font-semibold text-blue-800">{smartDashboardTeaser.title}</p>
              <p className="mt-2 text-sm text-blue-700">{smartDashboardTeaser.description}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default DashboardPage;
