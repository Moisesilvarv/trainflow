import { ArrowLeft, CircleSlash, RefreshCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

export function BillingCancelPage() {
  return (
    <div className="min-h-[calc(100vh-140px)] bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-gradient-to-br from-white via-white to-slate-100 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-10">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-500">
            <CircleSlash size={30} />
          </div>

          <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-900">
            Checkout cancelado.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
            Nenhuma alteracao de plano foi aplicada. Quando quiser, voce pode iniciar uma nova tentativa de assinatura com seguranca.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[28px] border border-slate-200 bg-white/90 p-5">
              <div className="flex items-center gap-3 text-slate-900">
                <RefreshCcw size={18} className="text-blue-600" />
                <p className="text-sm font-semibold">Nova tentativa</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                O botao de plano inicia um checkout novo. Nao existe mais troca direta de plano sem pagamento confirmado.
              </p>
            </div>
            <div className="rounded-[28px] border border-slate-200 bg-white/90 p-5">
              <p className="text-sm font-semibold text-slate-900">Seu plano atual continua igual</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Isso evita upgrades parciais e garante consistencia entre Stripe, banco e liberacao de recursos.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/plans" className="btn-primary">
              Tentar novamente
            </Link>
            <Link to="/settings?tab=plano" className="btn-secondary inline-flex items-center gap-2">
              <ArrowLeft size={16} />
              Voltar para assinatura
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
