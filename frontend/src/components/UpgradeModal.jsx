import { ArrowRight, Crown, ShieldCheck, Sparkles, Star, TrendingUp, X, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatPlanCurrency, getUpgradeCopy, getUpgradePlanForFeature } from '../constants/plans';

const BENEFIT_ICONS = [Zap, TrendingUp, ShieldCheck];

export function UpgradeModal({ featureKey, open, onClose }) {
  const navigate = useNavigate();
  const { user, startCheckout } = useAuth();

  if (!open || !featureKey) return null;

  const plan = getUpgradePlanForFeature(featureKey);
  const copy = getUpgradeCopy(featureKey);
  const planBenefits = Array.isArray(plan.benefits) ? plan.benefits.slice(0, 3) : [];
  const isSubscriptionExpired = featureKey === 'subscription_required';

  async function handleUpgrade() {
    const planId = plan.id;
    onClose?.();

    if (!user) {
      navigate(`/register?plan=${planId}`);
      return;
    }

    const result = await startCheckout(planId);
    if (result?.checkoutUrl) {
      window.location.href = result.checkoutUrl;
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_24%),rgba(15,23,42,0.52)] p-2 backdrop-blur-md sm:p-4" onClick={onClose}>
      <div
        className="my-auto max-h-[calc(100dvh-1rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/70 bg-[linear-gradient(135deg,_rgba(255,255,255,0.97),_rgba(247,249,255,0.95))] shadow-[0_20px_54px_rgba(15,23,42,0.24)] sm:max-h-none sm:overflow-hidden sm:rounded-[28px] sm:shadow-[0_28px_80px_rgba(15,23,42,0.28)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-4 py-4 sm:px-7 sm:py-6">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-violet-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-violet-600 sm:px-3 sm:py-1.5 sm:text-xs sm:tracking-[0.16em]">
                <Crown size={12} className="sm:size-[14px]" />
                Upgrade
              </p>
            </div>

            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-500 shadow-[0_10px_22px_rgba(148,163,184,0.14)] transition hover:text-slate-700 sm:h-11 sm:w-11 sm:rounded-2xl"
              onClick={onClose}
              aria-label="Fechar modal de upgrade"
            >
              <X size={18} className="sm:size-[22px]" />
            </button>
          </div>

          <div className="mt-3 sm:mt-5">
            <h3 className="max-w-xl text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
              {isSubscriptionExpired ? (
                <>
                  Seu <span className="bg-[linear-gradient(135deg,_#5d6bff,_#7c5cff)] bg-clip-text text-transparent">teste gratis</span> expirou.
                </>
              ) : (
                copy.title
              )}
            </h3>
            <p className="mt-2 max-w-xl text-xs leading-5 text-slate-500 sm:mt-3 sm:text-base sm:leading-6">
              {copy.description}
            </p>
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-indigo-500/60 bg-[linear-gradient(135deg,_#050d27,_#0d1d4f_52%,_#07102b)] p-4 text-white shadow-[0_16px_34px_rgba(67,97,238,0.20)] sm:mt-6 sm:rounded-[24px] sm:p-6 sm:shadow-[0_20px_44px_rgba(67,97,238,0.24)]">
            <div className="relative">
              <div className="absolute inset-y-0 right-[8%] hidden w-[42%] bg-[linear-gradient(135deg,_transparent,_rgba(61,103,255,0.1),_transparent)] sm:block" />
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(120deg, transparent 0%, transparent 42%, rgba(88,124,255,0.2) 42%, rgba(88,124,255,0.2) 43%, transparent 43%), linear-gradient(120deg, transparent 0%, transparent 47%, rgba(88,124,255,0.12) 47%, rgba(88,124,255,0.12) 48%, transparent 48%)', backgroundSize: '100% 100%, 100% 100%' }} />

              <div className="relative grid gap-4 sm:grid-cols-[minmax(0,1fr)_210px] sm:items-end sm:gap-5">
                <div>
                  <p className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,_rgba(104,73,255,0.7),_rgba(66,90,255,0.7))] px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-white/95 sm:px-3 sm:py-1.5 sm:text-[0.68rem] sm:tracking-[0.16em]">
                    <Star size={11} className="sm:size-[13px]" />
                    Plano recomendado
                  </p>

                  <h4 className="mt-3 text-2xl font-black tracking-tight sm:mt-4 sm:text-3xl">{plan.publicName || plan.name}</h4>
                  <p className="mt-2 max-w-md text-sm leading-6 text-white/88 sm:text-base sm:leading-7">{plan.description || plan.headline}</p>

                  <div className="mt-4 grid gap-2 sm:mt-5 sm:grid-cols-3 sm:gap-3">
                    {planBenefits.map((benefit, index) => {
                      const Icon = BENEFIT_ICONS[index] || Sparkles;

                      return (
                        <div key={benefit} className="flex items-center gap-2 border-white/14 sm:items-start sm:border-r sm:pr-3 last:border-r-0 last:pr-0">
                          <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/95 text-violet-500 shadow-[0_10px_18px_rgba(15,23,42,0.18)] sm:h-9 sm:w-9 sm:rounded-xl">
                            <Icon size={16} className="sm:size-[18px]" />
                          </div>
                          <p className="text-xs font-semibold leading-5 text-white/90 sm:text-sm">{benefit}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="relative">
                  <div className="rounded-[22px] border border-white/10 bg-white/4 p-4 backdrop-blur-sm sm:border-0 sm:bg-transparent sm:p-0">
                    <div className="flex justify-start sm:justify-end">
                      <span className="inline-flex rounded-full bg-emerald-400/18 px-3 py-1.5 text-xs font-bold text-emerald-300">
                        Melhor custo-beneficio
                      </span>
                    </div>

                    <div className="mt-3 border-t border-white/10 pt-3 text-left sm:mt-4 sm:pt-4 sm:text-right">
                      <p className="text-3xl font-black tracking-tight sm:text-4xl">{formatPlanCurrency(plan.price)}</p>
                      <p className="mt-1 text-sm text-white/78 sm:text-base">por mes</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-slate-500 sm:mt-5 sm:text-sm">
            <ShieldCheck size={16} className="shrink-0 text-violet-500 sm:size-[18px]" />
            <p>
              <strong className="font-semibold text-slate-700">Sem compromisso.</strong> Cancele quando quiser, sem burocracia.
            </p>
          </div>

          <div className="mt-4 grid gap-2 sm:mt-5 sm:grid-cols-2 sm:gap-3">
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_12px_26px_rgba(148,163,184,0.1)] transition hover:border-slate-300 hover:bg-slate-50 sm:min-h-12 sm:rounded-2xl sm:py-3 sm:text-base"
              onClick={onClose}
            >
              Agora nao
            </button>
            <button
              type="button"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,_#713bff,_#2f65ff)] px-4 py-2 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(67,97,238,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(67,97,238,0.3)] sm:min-h-12 sm:rounded-2xl sm:py-3 sm:text-base"
              onClick={handleUpgrade}
            >
              <Crown size={16} className="sm:size-[18px]" />
              Fazer upgrade agora
              <ArrowRight size={16} className="sm:size-[18px]" />
            </button>
          </div>
        </div>

        <div className="hidden border-t border-slate-200/70 bg-[linear-gradient(180deg,_rgba(249,250,255,0.92),_rgba(245,247,255,0.95))] px-5 py-4 sm:block sm:px-7">
          <div className="flex items-center justify-center gap-2 text-center text-sm text-slate-500">
            <ShieldCheck size={18} className="shrink-0 text-indigo-500" />
            <p>Seus dados estao seguros. Voce pode escolher o plano ideal para voce.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
