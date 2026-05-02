import { NavLink, useLocation } from 'react-router-dom';
import { BarChart3, CalendarDays, CreditCard, Crown, Dumbbell, Home, Settings, Sparkles, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getPlanById } from '../../constants/plans';
import { formatPersonName } from '../../utils/personName';
import { Logo } from '../Logo';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: Home },
  { to: '/students', label: 'Alunos', icon: Users },
  { to: '/workouts', label: 'Treinos', icon: Dumbbell },
  { to: '/finance', label: 'Financeiro', icon: CreditCard },
  { to: '/schedule', label: 'Agenda', icon: CalendarDays },
  { to: '/reports', label: 'Relatorios', icon: BarChart3 },
  { to: '/settings', label: 'Configuracoes', icon: Settings }
];

const settingsLinks = [
  { tab: 'perfil', label: 'Perfil profissional' },
  { tab: 'seguranca', label: 'Seguranca' },
  { tab: 'plano', label: 'Plano e assinatura' },
  { tab: 'financeiro', label: 'Financeiro' },
  { tab: 'integracoes', label: 'Integracoes' },
  { tab: 'notificacoes', label: 'Notificacoes' },
  { tab: 'preferencias', label: 'Preferencias' },
  { tab: 'exportacao', label: 'Exportacao' }
];

function getInitials(name = '') {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (!parts.length) return 'PF';
  return parts.map((part) => part[0]).join('').toUpperCase();
}

function getPlanLabel(user, currentPlan) {
  if (user?.planStatus === 'trialing') {
    const days = Number(user?.trialDaysRemaining || 0);
    const suffix = days > 0 ? ` - ${days} ${days === 1 ? 'dia' : 'dias'} restantes` : '';
    return `Teste gratis Pro${suffix}`;
  }

  if (user?.planStatus === 'expired') {
    return 'Trial expirado';
  }

  return `Plano ${currentPlan.name}`;
}

export function Sidebar({ mobile = false, onNavigate }) {
  const { user } = useAuth();
  const location = useLocation();
  const settingsActive = location.pathname.startsWith('/settings');
  const activeTab = new URLSearchParams(location.search).get('tab') || 'perfil';
  const currentPlan = getPlanById(user?.plan);
  const planLabel = getPlanLabel(user, currentPlan);
  const isExpiredTrial = user?.planStatus === 'expired';

  return (
    <aside
      className={`${mobile ? 'flex h-full w-full overflow-y-auto rounded-r-3xl p-4' : 'hidden w-72 p-6 lg:flex'} flex-col border-r border-slate-200 bg-[radial-gradient(circle_at_top,#f8fbff_0%,#ffffff_42%)]`}
    >
      <div className={`mb-5 rounded-2xl border p-4 shadow-[0_12px_28px_rgba(15,23,42,0.07)] lg:mb-8 lg:rounded-[28px] lg:shadow-[0_16px_36px_rgba(15,23,42,0.08)] ${
        isExpiredTrial
          ? 'border-amber-200/80 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_34%),linear-gradient(145deg,#ffffff_0%,#fff8ea_68%,#fffdf7_100%)]'
          : 'border-slate-200 bg-gradient-to-br from-white to-slate-50'
      }`}>
        <div className="flex items-center justify-between gap-2">
          <Logo
            to="/dashboard"
            size={40}
            priority
            className="gap-2.5"
            wordmarkClassName="text-lg font-black tracking-tight text-blue-700"
          />
          <Sparkles size={14} className="text-blue-500" />
        </div>
        <h1 className="mt-2 text-base font-bold text-slate-900">{user?.name || 'Gestao profissional'}</h1>
        <p className="mt-1 text-xs leading-5 text-slate-500">Plataforma para profissionais de treino e acompanhamento</p>
        <div className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${
          isExpiredTrial ? 'bg-amber-100 text-amber-800' : 'bg-blue-50 text-blue-700'
        }`}>
          {isExpiredTrial ? <Crown size={13} /> : null}
          {planLabel}
        </div>
        {isExpiredTrial ? (
          <div className="mt-4 rounded-2xl border border-amber-200/80 bg-white/80 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700">Upgrade recomendado</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">Reative criacao, IA e envio de treinos.</p>
          </div>
        ) : null}
      </div>

      <nav className="space-y-1.5 lg:space-y-2">
        {links.map((item) => (
          <div key={item.to}>
            <NavLink
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition lg:py-3 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-[0_10px_20px_rgba(37,99,235,0.25)]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <item.icon size={17} />
              {item.label}
            </NavLink>

            {item.to === '/settings' && settingsActive ? (
              <div className="ml-4 mt-2 space-y-1 border-l border-slate-200 pl-3">
                {settingsLinks.map((setting) => (
                  <NavLink
                    key={setting.tab}
                    to={`/settings?tab=${setting.tab}`}
                    onClick={onNavigate}
                    className={`block rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      activeTab === setting.tab
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                    }`}
                  >
                    {setting.label}
                  </NavLink>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </nav>

      <div className="mt-auto pt-5 lg:pt-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 overflow-hidden rounded-2xl bg-slate-200 ring-1 ring-slate-200">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={formatPersonName(user?.name || 'Professor')} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center text-sm font-black text-slate-700">
                  {getInitials(user?.name)}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{formatPersonName(user?.name || 'Professor')}</p>
              <p className="truncate text-xs text-slate-500">{planLabel}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
