import {
  BarChart3,
  BellRing,
  Bot,
  ChevronRight,
  CreditCard,
  Crown,
  Mail,
  LayoutDashboard,
  Lock,
  MessageSquareText,
  ReceiptText,
  Sparkles,
  Target,
  TrendingUp,
  Users2
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../api/client';
import { UpgradeModal } from '../components/UpgradeModal';
import { useAuth } from '../context/AuthContext';
import { getUpgradeCopy, hasPlanFeature } from '../constants/plans';

function ResourceCard({ icon: Icon, title, description, status, meta, actionLabel, onAction }) {
  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-3">
        <span className="rounded-2xl bg-blue-50 p-3 text-blue-600">
          <Icon size={18} />
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{status}</span>
      </div>
      <h3 className="mt-4 text-xl font-bold tracking-tight text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{meta}</p>
      <button type="button" className="btn-secondary mt-5 w-full" onClick={onAction}>{actionLabel}</button>
    </article>
  );
}

function SmartList({ title, items, emptyLabel }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <div className="mt-3 space-y-2">
        {items.length ? items.slice(0, 4).map((item) => (
          <div key={`${title}-${item.id}-${item.reason}`} className="rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-sm font-semibold text-slate-800">{item.name}</p>
            <p className="text-xs text-slate-500">{item.reason}</p>
          </div>
        )) : <p className="text-sm text-slate-500">{emptyLabel}</p>}
      </div>
    </div>
  );
}

function LockedFeature({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-4 border-l border-slate-200 px-5 first:border-l-0 first:pl-0 last:pr-0 max-lg:border-l-0 max-lg:border-t max-lg:px-0 max-lg:pt-4 max-lg:first:border-t-0 max-lg:first:pt-0">
      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
        <Icon size={20} />
      </span>
      <div>
        <p className="text-lg font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function LockedReportsState({ onUpgrade, onOpenPlans }) {
  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_14px_35px_rgba(15,23,42,0.05)] sm:p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-[44px] font-black tracking-tight text-slate-900">Relatorios por plano</h1>
          <p className="mt-3 max-w-3xl text-[17px] text-slate-500">
            Acompanhe o desempenho do seu negocio com relatorios completos.
          </p>
        </div>

        <button type="button" className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          <Lock size={16} className="text-slate-500" />
          Saiba mais sobre relatorios
        </button>
      </div>

      <div className="mt-8 rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.08),_transparent_42%),linear-gradient(180deg,_#ffffff,_#f8fafc_52%,_#ffffff)] px-5 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-[980px] text-center">
          <div className="relative mx-auto flex h-40 w-40 items-center justify-center rounded-full bg-violet-50/80 text-violet-600 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.08)]">
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,_rgba(99,102,241,0.08),_transparent_62%)]" />
            <Lock size={56} strokeWidth={1.8} className="relative z-[1]" />
          </div>

          <h2 className="mt-8 text-[44px] font-black tracking-tight text-slate-900">
            Esse recurso nao esta disponivel no seu plano atual.
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-[17px] leading-8 text-slate-600">
            Relatorios completos ajudam voce a tomar decisoes melhores, identificar alunos em risco, aumentar a retencao e crescer seu negocio.
          </p>

          <div className="mt-10 rounded-[28px] border border-slate-200 bg-slate-50/80 p-6 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:p-7">
            <p className="text-[18px] font-bold tracking-tight text-slate-900">Com relatorios voce tera:</p>
            <div className="mt-6 grid gap-5 lg:grid-cols-4">
              <LockedFeature
                icon={TrendingUp}
                title="Visao completa"
                description="Acompanhe receita, alunos e indicadores em um so lugar."
              />
              <LockedFeature
                icon={Users2}
                title="Sinais de risco"
                description="Identifique alunos em risco de cancelamento."
              />
              <LockedFeature
                icon={BellRing}
                title="Alertas inteligentes"
                description="Receba alertas sobre alunos inadimplentes e sem treino."
              />
              <LockedFeature
                icon={Target}
                title="Mais retencao"
                description="Acao rapida para aumentar a retencao e resultados."
              />
            </div>
          </div>

          <div className="mt-10 border-t border-slate-200 pt-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div className="text-left">
                <p className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                  <Sparkles size={14} />
                  Disponivel no plano Pro
                </p>
                <h3 className="mt-4 text-[38px] font-black tracking-tight text-slate-900">
                  Upgrade seu plano e desbloqueie relatorios poderosos.
                </h3>
                <p className="mt-3 text-[17px] text-slate-500">
                  Tenha mais controle, previsibilidade e resultados.
                </p>
              </div>

              <button
                type="button"
                className="inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-7 py-4 text-lg font-semibold text-white shadow-[0_20px_40px_rgba(99,102,241,0.28)] transition hover:from-violet-500 hover:to-indigo-500"
                onClick={onUpgrade}
              >
                <Crown size={18} />
                Fazer upgrade agora
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="mt-8 flex justify-center">
              <button type="button" className="text-lg font-semibold text-violet-600 underline decoration-violet-200 underline-offset-4 transition hover:text-violet-500" onClick={onOpenPlans}>
                Ver planos e recursos
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value, detail }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-[0_10px_25px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <label.icon size={20} />
        </span>
        <div>
          <p className="text-sm text-slate-500">{label.title}</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{value}</p>
          {detail ? <p className="mt-1 text-sm text-slate-500">{detail}</p> : null}
        </div>
      </div>
    </div>
  );
}

function PremiumHero() {
  return (
    <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-gradient-to-r from-white via-blue-50/70 to-slate-50 p-6 shadow-[0_14px_35px_rgba(15,23,42,0.05)] sm:p-7">
      <div className="flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
        <div className="max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
            <Sparkles size={13} />
            Premium
          </p>
          <h1 className="mt-5 text-5xl font-black tracking-tight text-slate-900">
            O centro de automacao do seu negocio.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-500">
            O Premium foi criado para mostrar valor real: experiencia do aluno, cobranca recorrente, IA, automacoes e inteligencia de carteira em um fluxo mais limpo.
          </p>
        </div>

        <div className="relative mx-auto h-40 w-full max-w-md">
          <div className="absolute right-2 top-0 h-20 w-32 rounded-[28px] bg-white/90 shadow-[0_20px_45px_rgba(59,130,246,0.16)]" />
          <div className="absolute right-0 top-4 h-24 w-36 rounded-[28px] bg-white/95 shadow-[0_20px_45px_rgba(15,23,42,0.08)]" />
          <div className="absolute left-24 top-6 flex h-28 w-32 items-center justify-center rounded-[28px] bg-white/95 shadow-[0_20px_45px_rgba(59,130,246,0.18)]">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-600">
              <Bot size={30} />
            </div>
          </div>
          <div className="absolute left-8 top-16 h-px w-20 border-t-2 border-dashed border-blue-200" />
          <div className="absolute left-56 top-16 h-px w-20 border-t-2 border-dashed border-blue-200" />
          <div className="absolute left-1 top-[88px] inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-[0_16px_35px_rgba(15,23,42,0.12)]">
            <Mail size={18} />
          </div>
          <div className="absolute right-4 top-[96px] inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-[0_16px_35px_rgba(15,23,42,0.12)]">
            <MessageSquareText size={18} />
          </div>
          <div className="absolute right-24 top-2 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-blue-500 shadow-[0_16px_35px_rgba(15,23,42,0.1)]">
            <LayoutDashboard size={16} />
          </div>
        </div>
      </div>
    </section>
  );
}

function ChartCard({ monthlyData }) {
  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">Relatorios por plano</p>
          <p className="mt-1 text-sm text-slate-500">O Pro ja acompanha o essencial. O Premium expande para sinais de risco e retencao.</p>
        </div>
        <BarChart3 size={18} className="text-blue-600" />
      </div>

      <div className="mt-5 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={monthlyData} margin={{ top: 8, right: 6, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} />
            <Tooltip />
            <Line dataKey="revenue" stroke="#2563eb" strokeWidth={2.4} dot={{ r: 2.5, strokeWidth: 0, fill: '#2563eb' }} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

function ExecutivePanel({ smartMetrics, teaserCopy, canSmartDashboard, onCompare }) {
  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">Posicionamento do Premium</p>
          <p className="mt-1 text-sm text-slate-500">Mostre claramente porque ele automatiza o negocio do personal.</p>
        </div>
        <button type="button" className="rounded-2xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50" onClick={onCompare}>
          Ver comparativo
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <MetricCard
          label={{ title: 'Receita mensal', icon: ReceiptText }}
          value={`R$ ${Number(smartMetrics.monthlyRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
        />
        <MetricCard
          label={{ title: 'Carteira ativa', icon: Users2 }}
          value={smartMetrics.activeStudents}
          detail={`de ${smartMetrics.totalStudents} aluno(s)`}
        />
        <MetricCard
          label={{ title: 'Pagamentos pendentes', icon: CreditCard }}
          value={`R$ ${Number(smartMetrics.pendingPayments || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
        />
        <MetricCard
          label={{ title: 'Saude da carteira', icon: Target }}
          value={`${smartMetrics.growthRate}%`}
          detail="alunos ativos na base"
        />
      </div>

      {!canSmartDashboard ? (
        <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50/80 p-4">
          <p className="text-sm font-semibold text-violet-800">{teaserCopy.title}</p>
          <p className="mt-1 text-sm text-violet-700">{teaserCopy.description}</p>
        </div>
      ) : null}
    </article>
  );
}

export function ReportsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [premiumResources, setPremiumResources] = useState([]);
  const [smartDashboard, setSmartDashboard] = useState(null);
  const [upgradeFeature, setUpgradeFeature] = useState('');

  const canSimpleReports = hasPlanFeature(user?.plan, 'simple_reports');
  const canStudentPortal = hasPlanFeature(user?.plan, 'student_portal');
  const canRecurringBilling = hasPlanFeature(user?.plan, 'recurring_billing');
  const canWhatsapp = hasPlanFeature(user?.plan, 'whatsapp_automation');
  const canAiUnlimited = hasPlanFeature(user?.plan, 'ai_unlimited');
  const canSmartDashboard = hasPlanFeature(user?.plan, 'smart_dashboard');
  const canAdvancedAutomations = hasPlanFeature(user?.plan, 'advanced_automations');

  useEffect(() => {
    async function load() {
      const tasks = [
        api.get('/premium/resources').then((res) => setPremiumResources(res.data?.resources || [])).catch(() => setPremiumResources([]))
      ];

      if (canSimpleReports) {
        tasks.push(api.get('/reports/advanced').then((res) => setReport(res.data)).catch(() => setReport(null)));
      }

      if (canSmartDashboard) {
        tasks.push(api.get('/premium/dashboard').then((res) => setSmartDashboard(res.data)).catch(() => setSmartDashboard(null)));
      }

      await Promise.all(tasks);
    }

    load();
  }, [canSimpleReports, canSmartDashboard]);

  const monthlyData = useMemo(() => report?.monthly || [], [report]);
  const smartMetrics = smartDashboard?.metrics || {
    monthlyRevenue: 0,
    pendingPayments: 0,
    activeStudents: 0,
    totalStudents: 0,
    growthRate: 0
  };
  const smartAlerts = smartDashboard?.alerts || {
    overdueStudents: [],
    studentsWithoutRecentWorkout: [],
    studentsWithoutRecentSchedule: [],
    cancellationRisk: []
  };

  const resourceIcons = {
    student_portal: Users2,
    recurring_billing: CreditCard,
    whatsapp_automation: MessageSquareText,
    ai_unlimited: Bot,
    smart_dashboard: LayoutDashboard,
    advanced_automations: Sparkles
  };

  function openUpgrade(featureKey) {
    setUpgradeFeature(featureKey);
  }

  function handleResourceAction(featureKey) {
    if (featureKey === 'student_portal') {
      if (!canStudentPortal) return openUpgrade(featureKey);
      navigate('/students');
      return;
    }

    if (featureKey === 'recurring_billing') {
      if (!canRecurringBilling) return openUpgrade(featureKey);
      navigate('/settings?tab=financeiro');
      return;
    }

    if (featureKey === 'whatsapp_automation') {
      if (!canWhatsapp) return openUpgrade(featureKey);
      navigate('/settings?tab=integracoes');
      return;
    }

    if (featureKey === 'ai_unlimited') {
      if (!canAiUnlimited) return openUpgrade(featureKey);
      navigate('/students');
      return;
    }

    if (featureKey === 'smart_dashboard') {
      if (!canSmartDashboard) return openUpgrade(featureKey);
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      return;
    }

    if (!canAdvancedAutomations) return openUpgrade('advanced_automations');
    navigate('/settings?tab=integracoes');
  }

  const teaserCopy = getUpgradeCopy('smart_dashboard');

  if (!canSimpleReports) {
    return (
      <>
        <LockedReportsState
          onUpgrade={() => openUpgrade('simple_reports')}
          onOpenPlans={() => navigate('/plans')}
        />
        <UpgradeModal featureKey={upgradeFeature} open={Boolean(upgradeFeature)} onClose={() => setUpgradeFeature('')} />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <PremiumHero />

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <ChartCard monthlyData={monthlyData} />
        <ExecutivePanel
          smartMetrics={smartMetrics}
          teaserCopy={teaserCopy}
          canSmartDashboard={canSmartDashboard}
          onCompare={() => navigate('/plans')}
        />
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Recursos complementares</h2>
          <p className="text-sm text-slate-500">Automacoes e modulos que ampliam o impacto dos relatorios na operacao.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {premiumResources.map((resource) => {
            const Icon = resourceIcons[resource.key] || Sparkles;
            const actionLabel = resource.key === 'smart_dashboard' ? 'Acessar' : resource.configured ? 'Configurar' : 'Configurar agora';

            return (
              <ResourceCard
                key={resource.key}
                icon={Icon}
                title={resource.title}
                description={resource.description}
                status={resource.status}
                meta={resource.meta}
                actionLabel={actionLabel}
                onAction={() => handleResourceAction(resource.key)}
              />
            );
          })}
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900">Dashboard inteligente de relatorios</h2>
            <p className="mt-1 text-sm text-slate-500">Alertas que ajudam voce a agir antes de perder receita ou engajamento.</p>
          </div>
          {!canSmartDashboard ? (
            <button type="button" className="btn-primary" onClick={() => openUpgrade('smart_dashboard')}>
              Fazer upgrade
            </button>
          ) : null}
        </div>

        {canSmartDashboard && smartDashboard ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <SmartList title="Alunos inadimplentes" items={smartAlerts.overdueStudents} emptyLabel="Nenhum aluno inadimplente no momento." />
            <SmartList title="Sem treino recente" items={smartAlerts.studentsWithoutRecentWorkout} emptyLabel="Todos os alunos receberam treino recente." />
            <SmartList title="Sem agendamento recente" items={smartAlerts.studentsWithoutRecentSchedule} emptyLabel="Agenda da carteira esta em dia." />
            <SmartList title="Risco de cancelamento" items={smartAlerts.cancellationRisk} emptyLabel="Sem sinais criticos de cancelamento." />
          </div>
        ) : (
          <div className="mt-5 rounded-3xl border border-violet-100 bg-gradient-to-r from-white via-violet-50 to-indigo-50 p-5">
            <p className="text-sm font-semibold text-violet-800">{teaserCopy.title}</p>
            <p className="mt-2 text-sm text-violet-700">{teaserCopy.description}</p>
          </div>
        )}
      </section>

      <UpgradeModal featureKey={upgradeFeature} open={Boolean(upgradeFeature)} onClose={() => setUpgradeFeature('')} />
    </div>
  );
}
