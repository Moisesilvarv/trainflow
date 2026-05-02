import { useState } from 'react';
import {
  BadgeCheck,
  Check,
  CreditCard,
  Crown,
  MessageCircleMore,
  Rocket,
  ShieldCheck,
  TrendingUp,
  XCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PLAN_ORDER, formatPlanCurrency, normalizePlanId } from '../constants/plans';

function getPlanVisuals(planId) {
  if (planId === 'basic') {
    return {
      icon: Rocket,
      badge: 'Para comecar',
      iconWrap: 'bg-gradient-to-br from-violet-50 to-indigo-100 text-indigo-600',
      button: 'btn-secondary w-full border border-blue-500 text-blue-600 hover:bg-blue-50',
      container: 'border-slate-200'
    };
  }

  if (planId === 'pro') {
    return {
      icon: TrendingUp,
      badge: 'Mais estrategico',
      iconWrap: 'bg-gradient-to-br from-sky-50 to-blue-100 text-blue-600',
      button: 'btn-secondary w-full border border-blue-500 text-blue-600 hover:bg-blue-50',
      container: 'border-slate-200'
    };
  }

  return {
    icon: Crown,
    badge: 'Mais escolhido',
    iconWrap: 'bg-gradient-to-br from-slate-800 via-blue-800 to-blue-600 text-white',
    button: 'btn-primary w-full shadow-[0_18px_34px_rgba(37,99,235,0.22)]',
    container: 'border-blue-500 shadow-[0_24px_60px_rgba(37,99,235,0.10)]'
  };
}

function PaymentMethodCard({ option, selected, onClick }) {
  const Icon = option.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[28px] border bg-white px-6 py-5 text-left transition ${
        selected
          ? 'border-blue-500 shadow-[0_18px_40px_rgba(37,99,235,0.10)]'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-5">
          <span className={`inline-flex h-16 w-16 items-center justify-center rounded-[20px] ${
            selected
              ? 'bg-gradient-to-br from-blue-700 to-blue-500 text-white shadow-[0_12px_24px_rgba(37,99,235,0.24)]'
              : 'bg-gradient-to-br from-slate-50 to-slate-100 text-slate-500'
          }`}>
            <Icon size={26} />
          </span>
          <div>
            <p className="text-lg font-black tracking-tight text-slate-900">{option.title}</p>
            <p className="mt-1 max-w-md text-sm leading-7 text-slate-500">{option.description}</p>
          </div>
        </div>

        {selected ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-blue-500 bg-white px-4 py-2 text-xs font-semibold text-blue-600">
            <Check size={14} />
            Selecionado
          </span>
        ) : null}
      </div>
    </button>
  );
}

function BenefitList({ items, columns = 1 }) {
  return (
    <div className={columns > 1 ? 'grid gap-x-8 gap-y-3 md:grid-cols-2' : 'space-y-3'}>
      {items.map((item) => (
        <div key={item} className="flex items-start gap-3 text-sm text-slate-700">
          <Check size={16} className="mt-0.5 shrink-0 text-emerald-500" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

function PlanCard({
  plan,
  isCurrent,
  isUpdating,
  featured,
  onSelect
}) {
  const visuals = getPlanVisuals(plan.id);
  const Icon = visuals.icon;

  return (
    <article className={`relative overflow-hidden rounded-[32px] border bg-white px-5 py-5 ${visuals.container}`}>
      {featured ? (
        <div className="absolute left-1/2 top-0 -translate-x-1/2">
          <div className="rounded-b-[18px] bg-gradient-to-r from-blue-700 to-blue-500 px-6 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-[0_12px_20px_rgba(37,99,235,0.18)]">
            Mais escolhido
          </div>
        </div>
      ) : null}

      <div className={`flex items-start justify-between gap-3 ${featured ? 'pt-10' : ''}`}>
        <div>
          {!featured ? (
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              plan.id === 'basic'
                ? 'bg-violet-50 text-violet-700'
                : 'bg-slate-100 text-slate-600'
            }`}>
              {visuals.badge}
            </span>
          ) : null}
        </div>

        {isCurrent ? (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Plano atual
          </span>
        ) : null}
      </div>

      <div className="mt-5 flex items-start gap-4">
        <span className={`inline-flex h-16 w-16 items-center justify-center rounded-[20px] ${visuals.iconWrap}`}>
          <Icon size={26} />
        </span>
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900">{plan.publicName || plan.name}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">{plan.headline}</p>
        </div>
      </div>

      <div className="mt-6 flex items-end gap-2">
        <p className="text-5xl font-black tracking-tight text-slate-900">{formatPlanCurrency(plan.price)}</p>
        <p className="pb-1 text-sm font-semibold text-slate-500">/mes</p>
      </div>

      <p className="mt-4 text-base leading-8 text-slate-500">{plan.description}</p>

      <div className="mt-6 border-t border-slate-200 pt-6">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">O que voce ganha</p>
        <div className="mt-5">
          <BenefitList items={plan.benefits} columns={featured ? 2 : 1} />
        </div>
      </div>

      {featured ? (
        <div className="mt-5 rounded-[18px] bg-gradient-to-r from-slate-50 via-blue-50 to-slate-50 px-5 py-4 text-sm font-semibold leading-7 text-blue-700">
          <div className="flex items-center gap-3">
            <ShieldCheck size={18} className="shrink-0 text-blue-600" />
            <span>Automatize processos, reduza faltas e aumente seus resultados com tecnologia de ponta.</span>
          </div>
        </div>
      ) : null}

      <div className="mt-6">
        <button
          type="button"
          className={visuals.button}
          onClick={onSelect}
          disabled={Boolean(isCurrent) || isUpdating}
        >
          {isCurrent
            ? 'Plano atual'
            : isUpdating
              ? 'Abrindo checkout...'
              : featured
                ? 'Comecar agora'
                : 'Selecionar plano'}
        </button>
      </div>
    </article>
  );
}

export function PlansPage() {
  const { user, startCheckout } = useAuth();
  const currentPlanId = normalizePlanId(user?.plan);
  const [submittingPlan, setSubmittingPlan] = useState('');
  const [checkoutError, setCheckoutError] = useState('');

  async function handleChangePlan(planId) {
    if (!user) return;

    try {
      setCheckoutError('');
      setSubmittingPlan(planId);
      const result = await startCheckout({ plan: planId, paymentMethod: 'card' });
      if (result?.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (error) {
      setCheckoutError(error?.response?.data?.message || 'Nao foi possivel iniciar o checkout agora.');
    } finally {
      setSubmittingPlan('');
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.08),_transparent_28%),linear-gradient(180deg,_#f8fbff_0%,_#ffffff_36%,_#f8fbff_100%)] px-4 py-10 text-slate-900 lg:px-6">
      <div className="mx-auto max-w-[1320px]">
        <section className="mx-auto max-w-5xl text-center lg:text-left">
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-700 shadow-[0_10px_28px_rgba(15,23,42,0.06)] ring-1 ring-blue-100">
            <BadgeCheck size={14} />
            Planos e assinatura
          </p>

          <h1 className="mt-6 max-w-5xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-[60px] lg:leading-[1.02]">
            Planos feitos para personal trainers que querem crescer.
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-500 lg:text-[17px]">
            Comece gratis por 7 dias e descubra como o TrainFlow pode transformar sua operacao,
            automatizar cobrancas e te dar mais tempo para o que realmente importa: seus alunos.
          </p>
        </section>

        <div className="mx-auto mt-8 max-w-2xl">
          <div className="flex items-center justify-center gap-3 rounded-full border border-slate-200 bg-white/90 px-5 py-4 text-center text-sm font-semibold text-blue-700 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
            <BadgeCheck size={18} className="shrink-0" />
            <span>Teste gratis por 7 dias - sem compromisso. Cancele quando quiser.</span>
          </div>
        </div>

        <div className="mx-auto mt-6 max-w-[1150px]">
          <PaymentMethodCard
            option={{
              id: 'card',
              title: 'Cartao recorrente',
              description: 'Cobranca automatica mensal via Stripe Checkout com assinatura recorrente.',
              icon: CreditCard
            }}
            selected
            onClick={() => {}}
          />
        </div>

        <div className="mx-auto mt-6 grid max-w-[1150px] gap-4 xl:grid-cols-[0.95fr_0.95fr_1.4fr]">
          {PLAN_ORDER.map((plan) => {
            const isCurrent = currentPlanId === plan.id;
            const featured = plan.id === 'premium';

            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrent={isCurrent}
                isUpdating={submittingPlan === plan.id}
                featured={featured}
                onSelect={() => handleChangePlan(plan.id)}
              />
            );
          })}
        </div>

        <div className="mx-auto mt-7 grid max-w-[980px] gap-4 rounded-[30px] bg-white/60 px-4 py-2 sm:grid-cols-3 sm:px-8">
          {[
            {
              title: 'Ambiente seguro',
              description: 'Seus dados protegidos',
              icon: ShieldCheck
            },
            {
              title: 'Cancele quando quiser',
              description: 'Sem burocracia',
              icon: XCircle
            },
            {
              title: 'Suporte humanizado',
              description: 'Ajudamos voce a crescer',
              icon: MessageCircleMore
            }
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className={`flex items-center gap-4 rounded-[22px] px-3 py-4 ${
                  index > 0 ? 'sm:border-l sm:border-slate-200 sm:pl-8' : ''
                }`}
              >
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-slate-100 text-blue-600">
                  <Icon size={22} />
                </span>
                <div>
                  <p className="text-base font-bold text-slate-900">{item.title}</p>
                  <p className="text-sm text-slate-500">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>

        {checkoutError ? (
          <div className="mx-auto mt-6 max-w-[1150px] rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {checkoutError}
          </div>
        ) : null}

        {!user ? (
          <div className="mx-auto mt-8 max-w-[1150px] text-center text-sm text-slate-500">
            <Link to="/register?plan=premium" className="font-semibold text-blue-600 hover:text-blue-500">
              Criar conta para testar o fluxo completo
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default PlansPage;
