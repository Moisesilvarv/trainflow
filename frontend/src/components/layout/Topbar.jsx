import { Crown, LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getPlanById } from '../../constants/plans';
import { formatPersonName } from '../../utils/personName';
import { Logo } from '../Logo';

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

export function Topbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const currentPlan = getPlanById(user?.plan);
  const planLabel = getPlanLabel(user, currentPlan);
  const isExpiredTrial = user?.planStatus === 'expired';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/88 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 px-4 py-4 lg:px-8">
        <div className="flex items-center gap-3 min-w-0">
          <button className="rounded-xl border border-slate-300 p-2 text-slate-700 lg:hidden" onClick={onMenuClick}>
            <Menu size={18} />
          </button>
          <Logo
            to="/dashboard"
            size={32}
            className="gap-2.5 lg:hidden"
            wordmarkClassName="text-lg font-black tracking-tight text-slate-900"
          />
          <div className="hidden lg:block">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
              {isExpiredTrial ? 'Trial expirado' : 'Workspace'}
            </p>
            <p className="mt-1 text-lg font-black tracking-tight text-slate-900">
              {isExpiredTrial ? 'Modo de consulta' : 'TrainFlow Console'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`hidden rounded-2xl border px-4 py-2.5 text-right shadow-[0_10px_24px_rgba(15,23,42,0.05)] sm:block ${
            isExpiredTrial
              ? 'border-amber-200 bg-gradient-to-r from-amber-50 via-white to-orange-50'
              : 'border-slate-200 bg-white'
          }`}>
            <div className="flex items-center justify-end gap-2">
              {isExpiredTrial ? <Crown size={14} className="text-amber-500" /> : null}
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{planLabel}</p>
            </div>
            <p className="mt-1 font-semibold text-slate-900">{formatPersonName(user?.name || 'Treinador')}</p>
          </div>

          <button className="btn-secondary inline-flex items-center gap-2" onClick={logout}>
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
