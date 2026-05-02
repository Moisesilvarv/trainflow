import { useEffect, useState } from 'react';
import { ArrowRight, Crown, Lock, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '../../context/AuthContext';
import { UpgradeModal } from '../UpgradeModal';

function ExpiredTrialBanner({ onUpgrade }) {
  return (
    <div className="z-20 border-b border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,248,235,0.95),rgba(255,255,255,0.9))] px-3 py-3 backdrop-blur-xl lg:sticky lg:top-[73px] lg:px-8 lg:py-4">
      <div className="overflow-hidden rounded-2xl border border-amber-200/80 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.24),transparent_30%),linear-gradient(135deg,#fffdf7_0%,#fff7e6_45%,#ffffff_100%)] shadow-[0_16px_38px_rgba(146,64,14,0.10)] lg:rounded-[28px] lg:shadow-[0_24px_60px_rgba(146,64,14,0.10)]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 lg:gap-4 lg:px-7 lg:py-5">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700 lg:px-3 lg:text-[11px] lg:tracking-[0.24em]">
              <Crown size={13} />
              Trial expirado
            </p>
            <h2 className="mt-2 text-base font-black tracking-tight text-slate-900 lg:mt-3 lg:text-2xl">
              Seu acesso principal foi pausado, mas sua operacao continua visivel.
            </h2>
            <p className="mt-1.5 text-xs leading-5 text-slate-600 lg:mt-2 lg:text-[15px] lg:leading-6">
              Consulte dashboard, alunos e treinos existentes. Para voltar a criar, enviar e automatizar, reative agora com upgrade.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="hidden rounded-2xl border border-white/80 bg-white/70 px-4 py-3 text-sm text-slate-600 shadow-[0_12px_30px_rgba(15,23,42,0.06)] lg:block">
              <p className="font-semibold text-slate-900">Leitura liberada</p>
              <p className="mt-1 inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                <Lock size={12} />
                Escrita bloqueada
              </p>
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#2563eb_0%,#1d4ed8_55%,#0f172a_100%)] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_14px_30px_rgba(37,99,235,0.26)] transition hover:translate-y-[-1px] hover:shadow-[0_22px_48px_rgba(37,99,235,0.35)] lg:rounded-2xl lg:px-5 lg:py-3.5 lg:text-sm lg:shadow-[0_18px_40px_rgba(37,99,235,0.30)]"
              onClick={onUpgrade}
            >
              Fazer upgrade
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    function handleSubscriptionRequired(event) {
      setUpgradeFeature(event?.detail?.featureKey || 'subscription_required');
    }

    window.addEventListener('trainflow:subscription-required', handleSubscriptionRequired);
    return () => window.removeEventListener('trainflow:subscription-required', handleSubscriptionRequired);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:flex">
      <Sidebar />

      {showMobileMenu ? (
        <div className="fixed inset-0 z-40 bg-slate-900/35 backdrop-blur-sm lg:hidden" onClick={() => setShowMobileMenu(false)}>
          <div className="h-full w-[min(86vw,20rem)]" onClick={(event) => event.stopPropagation()}>
            <Sidebar mobile onNavigate={() => setShowMobileMenu(false)} />
          </div>
          <button
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/50 bg-white/90 text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.16)]"
            onClick={() => setShowMobileMenu(false)}
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>
      ) : null}

      <main className="flex-1">
        <Topbar onMenuClick={() => setShowMobileMenu(true)} />
        {user?.planStatus === 'expired' ? (
          <ExpiredTrialBanner onUpgrade={() => setUpgradeFeature('subscription_required')} />
        ) : null}
        <div className="p-4 lg:p-8">{children}</div>
      </main>

      <UpgradeModal featureKey={upgradeFeature} open={Boolean(upgradeFeature)} onClose={() => setUpgradeFeature('')} />
    </div>
  );
}
