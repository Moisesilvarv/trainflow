import {
  ArrowUpRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Dumbbell,
  LineChart,
  LogIn,
  MessageCircle,
  ShieldCheck
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { Logo } from '../components/Logo';
import { formatPersonName } from '../utils/personName';

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit'
  });
}

function formatDateLabel(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short'
  }).replace('.', '').toUpperCase();
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getInitials(name = '') {
  const parts = formatPersonName(name).split(/\s+/).filter(Boolean).slice(0, 2);
  if (!parts.length) return 'AL';
  return parts.map((part) => part[0]).join('').toUpperCase();
}

function getStudentAvatar(student = {}) {
  return student.avatar_url || student.avatarUrl || '';
}

function getFirstName(name = '') {
  return formatPersonName(name || '').split(/\s+/)[0] || 'Aluno';
}

function statusLabel(status = '') {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('paid')) return 'Em dia';
  if (normalized.includes('pending')) return 'Pendente';
  if (normalized.includes('cancel')) return 'Cancelado';
  if (normalized.includes('confirm')) return 'Confirmado';
  if (normalized.includes('agend')) return 'Agendado';
  return 'Ativo';
}

function statusClass(status = '', type = 'default') {
  const normalized = String(status || '').toLowerCase();

  if (type === 'schedule') {
    if (normalized.includes('confirm')) return 'bg-emerald-50 text-emerald-700';
    if (normalized.includes('agend')) return 'bg-slate-100 text-slate-600';
  }

  if (normalized.includes('paid')) return 'bg-emerald-50 text-emerald-700';
  if (normalized.includes('pending')) return 'bg-amber-50 text-amber-700';
  return 'bg-slate-100 text-slate-600';
}

function parseDurationLabel(exercise = {}) {
  const duration = exercise.duration || exercise.time || exercise.tempo || exercise.minutes || exercise.repetitions;
  if (!duration) return '--';
  return String(duration);
}

function normalizeExercises(workout) {
  const rawExercises = Array.isArray(workout?.exercises) ? workout.exercises : [];
  return rawExercises.map((exercise, index) => ({
    id: exercise.id || `${workout?.id || 'workout'}-${index}`,
    name: exercise.name || exercise.title || exercise.exercise || `Atividade ${index + 1}`,
    subtitle: exercise.notes || exercise.observations || exercise.description || exercise.focus || 'Sem observacoes tecnicas.',
    duration: parseDurationLabel(exercise)
  }));
}

function estimateWorkoutDuration(exercises) {
  const total = exercises.reduce((sum, item) => {
    const match = String(item.duration || '').match(/\d+/);
    return sum + (match ? Number(match[0]) : 0);
  }, 0);

  if (!total) return '45 min';
  return `${total} min`;
}

function Sparkline({ values = [], tone = 'blue' }) {
  const safeValues = values.filter((value) => Number.isFinite(value));
  if (!safeValues.length) {
    return <div className="h-14 rounded-2xl bg-slate-50" />;
  }

  const colors = {
    blue: '#2563eb',
    green: '#16a34a',
    amber: '#f59e0b',
    purple: '#7c3aed'
  };

  const min = Math.min(...safeValues);
  const max = Math.max(...safeValues);
  const range = max - min || 1;
  const points = safeValues.map((value, index) => {
    const x = (index / Math.max(safeValues.length - 1, 1)) * 100;
    const y = 42 - (((value - min) / range) * 32 + 5);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 100 46" className="h-14 w-full">
      <polyline
        fill="none"
        stroke={colors[tone] || colors.blue}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function PortalShell({ children }) {
  return (
    <div className="rounded-[30px] border border-slate-200 bg-white/90 shadow-[0_20px_50px_rgba(15,23,42,0.06)] backdrop-blur-sm">
      {children}
    </div>
  );
}

function MetricCard({ icon: Icon, iconTone, title, value, subtitle, chart, badge }) {
  return (
    <PortalShell>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <span className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${iconTone}`}>
            <Icon size={22} />
          </span>
          {badge ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{badge}</span> : null}
        </div>
        <p className="mt-4 text-sm text-slate-500">{title}</p>
        <p className="mt-1 text-4xl font-black tracking-tight text-slate-900">{value}</p>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        <div className="mt-4">{chart}</div>
      </div>
    </PortalShell>
  );
}

function SectionCard({ id, title, subtitle, action, children }) {
  return (
    <PortalShell>
      <section id={id} className="p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[32px] font-black tracking-tight text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          {action}
        </div>
        {children}
      </section>
    </PortalShell>
  );
}

export function AthleteAreaPage() {
  const navigate = useNavigate();
  const { token: routeToken } = useParams();
  const [manualToken, setManualToken] = useState(routeToken || '');
  const [portal, setPortal] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(Boolean(routeToken));

  async function loadPortal(token) {
    try {
      setLoading(true);
      setError('');
      const { data } = await api.get(`/student-portal/session/${token}`);
      setPortal(data);
    } catch (err) {
      setPortal(null);
      setError(err.response?.data?.message || 'Nao foi possivel acessar a area do aluno.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!routeToken) return;
    setManualToken(routeToken);
    loadPortal(routeToken);
  }, [routeToken]);

  function handleSubmit(event) {
    event.preventDefault();
    const rawValue = manualToken.trim();
    if (!rawValue) return;

    try {
      const parsedUrl = new URL(rawValue);
      const tokenFromUrl = parsedUrl.pathname.split('/').filter(Boolean).pop();
      navigate(`/athlete/${tokenFromUrl || rawValue}`);
      return;
    } catch {
      navigate(`/athlete/${rawValue}`);
    }
  }

  const upcomingSchedule = useMemo(() => {
    return [...(portal?.schedule || [])]
      .filter((item) => item.status !== 'cancelled')
      .sort((a, b) => new Date(a.class_date || 0) - new Date(b.class_date || 0))
      .slice(0, 5);
  }, [portal]);

  const sortedWorkouts = useMemo(() => {
    return [...(portal?.workouts || [])].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  }, [portal]);

  const currentWorkout = sortedWorkouts[0] || null;
  const exercises = normalizeExercises(currentWorkout);
  const workoutDuration = estimateWorkoutDuration(exercises);
  const nextSession = upcomingSchedule[0] || null;

  const paymentList = useMemo(() => {
    return [...(portal?.payments || [])].sort((a, b) => new Date(a.due_date || 0) - new Date(b.due_date || 0));
  }, [portal]);

  const latestPayment = paymentList[0] || null;

  const progressAsc = useMemo(() => {
    return [...(portal?.progress || [])].sort((a, b) => new Date(a.record_date || 0) - new Date(b.record_date || 0));
  }, [portal]);

  const firstWeight = Number(progressAsc[0]?.weight || portal?.student?.weight || 0);
  const currentWeight = Number(progressAsc[progressAsc.length - 1]?.weight || portal?.student?.weight || 0);
  const weightDelta = Number.isFinite(currentWeight - firstWeight) ? currentWeight - firstWeight : 0;
  const progressValues = progressAsc.map((item) => Number(item.weight || 0)).filter((value) => value > 0).slice(-8);

  if (!routeToken) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.10),_transparent_30%),linear-gradient(180deg,_#f8fbff_0%,_#eef4ff_100%)] px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 rounded-[34px] border border-white/70 bg-white/90 p-6 shadow-[0_30px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:grid-cols-[0.95fr_1.05fr] lg:p-8">
            <div className="space-y-5">
              <Logo
                size={40}
                priority
                imageClassName="w-10"
                wordmarkClassName="text-[28px] font-black tracking-tight text-slate-900"
              />
              <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                <ShieldCheck size={13} />
                Portal do aluno
              </p>
              <div>
                <h1 className="text-4xl font-black tracking-tight text-slate-900">Acesse seu acompanhamento em um so lugar.</h1>
                <p className="mt-3 max-w-xl text-base leading-8 text-slate-500">
                  Entre com o link enviado pelo profissional para ver treinos, agenda, progresso e pagamentos em uma experiencia organizada.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <PortalShell>
                  <div className="p-4">
                    <Dumbbell size={18} className="text-blue-600" />
                    <p className="mt-4 text-sm font-semibold text-slate-800">Treinos atualizados</p>
                    <p className="mt-1 text-sm text-slate-500">Acompanhe as atividades liberadas para voce.</p>
                  </div>
                </PortalShell>
                <PortalShell>
                  <div className="p-4">
                    <CalendarDays size={18} className="text-emerald-600" />
                    <p className="mt-4 text-sm font-semibold text-slate-800">Agenda clara</p>
                    <p className="mt-1 text-sm text-slate-500">Veja sessoes futuras e horarios confirmados.</p>
                  </div>
                </PortalShell>
                <PortalShell>
                  <div className="p-4">
                    <LineChart size={18} className="text-amber-500" />
                    <p className="mt-4 text-sm font-semibold text-slate-800">Evolucao visivel</p>
                    <p className="mt-1 text-sm text-slate-500">Acompanhe registros e progresso com clareza.</p>
                  </div>
                </PortalShell>
              </div>
            </div>

            <PortalShell>
              <div className="p-6 lg:p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Entrar com link</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900">Cole aqui seu acesso</h2>
                <p className="mt-2 text-sm leading-7 text-slate-500">Se voce recebeu um link completo, basta abrir. Se recebeu apenas o token, cole abaixo.</p>

                <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                  <textarea
                    className="input min-h-32 resize-none"
                    placeholder="Cole aqui o token ou o trecho final do link"
                    value={manualToken}
                    onChange={(event) => setManualToken(event.target.value)}
                  />
                  <button type="submit" className="btn-primary inline-flex w-full items-center justify-center gap-2">
                    <LogIn size={15} />
                    Entrar no portal
                  </button>
                </form>

                {error ? (
                  <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
                ) : null}
              </div>
            </PortalShell>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="min-h-screen bg-[#f4f8ff] px-6 py-10 text-slate-500">Carregando portal do aluno...</div>;
  }

  if (!portal) {
    return (
      <div className="min-h-screen bg-[#f4f8ff] px-4 py-10">
        <div className="mx-auto max-w-xl rounded-[32px] border border-rose-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Nao foi possivel abrir o acesso.</h1>
          <p className="mt-2 text-sm text-slate-500">{error || 'Verifique o link enviado pelo seu profissional.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_28%),linear-gradient(180deg,_#f8fbff_0%,_#f4f8ff_100%)] px-4 py-5 lg:px-6">
      <div className="mx-auto max-w-[1500px] space-y-5">
        <main className="space-y-5">
          <PortalShell>
            <div className="p-5 lg:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                  <Logo
                    size={40}
                    priority
                    wordmark={false}
                    className="grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-[0_12px_24px_rgba(37,99,235,0.12)] ring-1 ring-blue-100"
                    imageClassName="w-10"
                  />
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">Portal do aluno</p>
                    <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900">Ola, {getFirstName(portal.student?.name)}!</h1>
                    <p className="mt-2 text-base text-slate-500">Foque hoje no seu melhor. Seu acompanhamento esta todo organizado aqui.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-start">
                  <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50">
                    <Bell size={18} />
                  </button>
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                    <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-slate-100 text-sm font-black text-slate-700">
                      {getStudentAvatar(portal.student) ? (
                        <img src={getStudentAvatar(portal.student)} alt={portal.student?.name || 'Aluno'} className="h-full w-full object-cover" />
                      ) : (
                        getInitials(portal.student?.name)
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{portal.student?.name || 'Aluno'}</p>
                      <p className="text-xs text-slate-500">{portal.student?.goal || 'Planejamento ativo'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-[28px] border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-blue-50 px-5 py-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                <div className="grid gap-5 xl:grid-cols-[1.2fr_0.9fr_220px] xl:items-center">
                  <div className="flex items-center gap-4">
                    <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-slate-100 text-2xl font-black text-slate-700 ring-1 ring-slate-200">
                      {getStudentAvatar(portal.student) ? (
                        <img src={getStudentAvatar(portal.student)} alt={portal.student?.name || 'Aluno'} className="h-full w-full object-cover" />
                      ) : (
                        getInitials(portal.student?.name)
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="inline-flex items-center gap-2 text-sm text-slate-500">
                        <CalendarDays size={15} className="text-blue-600" />
                        Proxima sessao
                      </p>
                      <p className="text-3xl font-black tracking-tight text-slate-900">
                        {nextSession ? formatDateTime(nextSession.class_date) : 'Sem sessao agendada'}
                      </p>
                      <p className="text-sm text-slate-500">{nextSession?.title || currentWorkout?.name || 'Seu planejamento aparece aqui assim que for liberado.'}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-2xl border border-white/90 bg-white/85 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                          <CheckCircle2 size={20} />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Plano ativo</p>
                          <p className="text-sm text-slate-500">{latestPayment?.description || 'Acompanhamento mensal'}</p>
                          <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(latestPayment?.status || 'paid')}`}>
                            {statusLabel(latestPayment?.status || 'paid')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-primary inline-flex h-14 items-center justify-center gap-2 text-base shadow-[0_14px_28px_rgba(37,99,235,0.22)]"
                    onClick={() => document.getElementById('treino-hoje')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  >
                    Ver meu treino
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </PortalShell>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Dumbbell}
              iconTone="bg-blue-50 text-blue-600"
              title="Treinos liberados"
              value={(portal.workouts || []).length}
              subtitle={currentWorkout ? currentWorkout.name : 'Sem treino ativo'}
              badge="+ esta semana"
              chart={<Sparkline values={(portal.workouts || []).map((_, index) => index + 1)} tone="blue" />}
            />
            <MetricCard
              icon={CalendarDays}
              iconTone="bg-emerald-50 text-emerald-600"
              title="Proxima sessao"
              value={nextSession ? formatDate(nextSession.class_date) : '--'}
              subtitle={nextSession?.title || 'Sem compromisso agendado'}
              badge={nextSession ? statusLabel(nextSession.status || 'confirmed') : 'Livre'}
              chart={<Sparkline values={upcomingSchedule.map((_, index) => 3 + index)} tone="green" />}
            />
            <MetricCard
              icon={CreditCard}
              iconTone="bg-violet-50 text-violet-600"
              title="Pagamento"
              value={formatCurrency(latestPayment?.amount || 0)}
              subtitle={latestPayment ? `Vencimento ${formatDate(latestPayment.due_date)}` : 'Sem cobranca ativa'}
              badge={statusLabel(latestPayment?.status || '')}
              chart={<Sparkline values={paymentList.map((payment) => Number(payment.amount || 0)).slice(0, 6)} tone="purple" />}
            />
            <MetricCard
              icon={LineChart}
              iconTone="bg-amber-50 text-amber-600"
              title="Evolucao geral"
              value={`${weightDelta > 0 ? '+' : ''}${weightDelta.toFixed(1)} kg`}
              subtitle={progressValues.length ? `Atual ${currentWeight.toFixed(1)} kg` : 'Sem registros recentes'}
              badge="Desde o inicio"
              chart={<Sparkline values={progressValues} tone="amber" />}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <SectionCard
              id="treino-hoje"
              title="Treino de hoje"
              subtitle={portal.student?.goal ? `Foco: ${portal.student.goal}` : 'Planejamento atual liberado pelo profissional'}
              action={<span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">{workoutDuration}</span>}
            >
              {currentWorkout ? (
                <div className="space-y-3">
                  {(exercises.length ? exercises : [{
                    id: currentWorkout.id,
                    name: currentWorkout.name || 'Treino liberado',
                    subtitle: currentWorkout.notes || 'Consulte seu profissional para os detalhes completos.',
                    duration: workoutDuration
                  }]).slice(0, 5).map((exercise, index) => (
                    <div key={exercise.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${
                          index % 4 === 0 ? 'bg-violet-50 text-violet-600'
                            : index % 4 === 1 ? 'bg-blue-50 text-blue-600'
                              : index % 4 === 2 ? 'bg-amber-50 text-amber-600'
                                : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          <Dumbbell size={17} />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-lg font-semibold tracking-tight text-slate-900">{exercise.name}</p>
                          <p className="truncate text-sm text-slate-500">{exercise.subtitle}</p>
                        </div>
                      </div>
                      <p className="shrink-0 text-sm font-medium text-slate-500">{exercise.duration}</p>
                    </div>
                  ))}

                  <button type="button" className="btn-secondary w-full">Ver treino completo</button>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-14 text-center text-sm text-slate-500">
                  Nenhum treino foi liberado ainda.
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Agenda"
              subtitle="Proximas aulas e sessoes"
              action={<button type="button" className="text-sm font-semibold text-blue-600">Ver calendario</button>}
            >
              {upcomingSchedule.length ? (
                <div className="space-y-3">
                  {upcomingSchedule.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 text-center">
                          <p className="text-3xl font-black leading-none tracking-tight text-blue-600">{formatDateLabel(item.class_date).slice(0, 2)}</p>
                          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{formatDateLabel(item.class_date).slice(3)}</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold tracking-tight text-slate-900">{item.title || 'Sessao agendada'}</p>
                          <p className="text-sm text-slate-500">{formatDateTime(item.class_date)}</p>
                        </div>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(item.status || '', 'schedule')}`}>
                        {statusLabel(item.status || '')}
                      </span>
                    </div>
                  ))}

                  <button type="button" className="btn-secondary w-full">Ver todas as sessoes</button>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-14 text-center text-sm text-slate-500">
                  Nenhuma sessao futura foi cadastrada ainda.
                </div>
              )}
            </SectionCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <SectionCard
              title="Evolucao fisica"
              subtitle="Acompanhe seu progresso"
              action={<button type="button" className="text-sm font-semibold text-blue-600">Ver todos</button>}
            >
              <div className="grid gap-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm text-slate-500">Peso inicial</p>
                    <p className="mt-1 text-2xl font-black tracking-tight text-slate-900">{firstWeight ? `${firstWeight.toFixed(1)} kg` : '--'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm text-slate-500">Peso atual</p>
                    <p className="mt-1 text-2xl font-black tracking-tight text-slate-900">{currentWeight ? `${currentWeight.toFixed(1)} kg` : '--'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-sm text-slate-500">Diferenca</p>
                    <p className={`mt-1 text-2xl font-black tracking-tight ${weightDelta <= 0 ? 'text-emerald-600' : 'text-blue-600'}`}>
                      {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} kg
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white px-4 py-5">
                  <Sparkline values={progressValues} tone="blue" />
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                    <span>{progressAsc[0]?.record_date ? formatDate(progressAsc[0].record_date) : '--'}</span>
                    <span>{progressAsc[progressAsc.length - 1]?.record_date ? formatDate(progressAsc[progressAsc.length - 1].record_date) : '--'}</span>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Pagamentos"
              subtitle="Status financeiro"
              action={<button type="button" className="text-sm font-semibold text-blue-600">Ver historico</button>}
            >
              {paymentList.length ? (
                <div className="space-y-3">
                  {paymentList.slice(0, 3).map((payment) => (
                    <div key={payment.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.03)]">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-2xl font-bold tracking-tight text-slate-900">{payment.description || 'Mensalidade'}</p>
                          <p className="mt-1 text-sm text-slate-500">Vencimento: {formatDate(payment.due_date)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-black tracking-tight text-slate-900">{formatCurrency(payment.amount)}</p>
                          <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(payment.status || '')}`}>
                            {statusLabel(payment.status || '')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button type="button" className="btn-primary inline-flex w-full items-center justify-center gap-2">
                    <CreditCard size={16} />
                    Ver cobrancas
                    <ArrowUpRight size={14} />
                  </button>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-14 text-center text-sm text-slate-500">
                  Nenhuma cobranca foi cadastrada neste momento.
                </div>
              )}
            </SectionCard>
          </div>

          <PortalShell>
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <MessageCircle size={20} />
                </span>
                <div>
                  <p className="text-lg font-bold tracking-tight text-slate-900">Precisa de ajuda?</p>
                  <p className="mt-1 text-sm text-slate-500">Fale com seu profissional para alinhar treinos, agenda ou pagamentos.</p>
                </div>
              </div>
              <button type="button" className="btn-secondary sm:min-w-52">Enviar mensagem</button>
            </div>
          </PortalShell>
        </main>
      </div>
    </div>
  );
}
