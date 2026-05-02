import { ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

export function BillingSuccessPage() {
  const [searchParams] = useSearchParams();
  const paymentMethod = String(searchParams.get('method') || 'card').toLowerCase();
  const isPix = paymentMethod === 'pix';

  return (
    <div className="min-h-[calc(100vh-140px)] bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <section className="overflow-hidden rounded-[34px] border border-slate-200 bg-gradient-to-br from-white via-white to-emerald-50 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-10">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={32} />
          </div>

          <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-900">
            {isPix ? 'Checkout Pix iniciado com sucesso.' : 'Assinatura confirmada com sucesso.'}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
            {isPix
              ? 'Assim que o Pix for confirmado pela Stripe, o plano sera liberado por 30 dias e o vencimento aparecera na sua conta.'
              : 'O checkout foi concluido e a Stripe ja pode ativar os recursos do seu plano assim que o webhook confirmar o pagamento.'}
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-[28px] border border-emerald-200 bg-white/90 p-5">
              <p className="text-sm font-semibold text-slate-900">Proximo passo</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Volte para configuracoes para revisar status da assinatura, recursos liberados e dados de cobranca.
              </p>
            </div>
            <div className="rounded-[28px] border border-slate-200 bg-white/90 p-5">
              <div className="flex items-center gap-3 text-slate-900">
                <ShieldCheck size={18} className="text-blue-600" />
                <p className="text-sm font-semibold">Pagamento protegido</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Seus dados sensiveis continuam no ambiente da Stripe. Nenhuma secret key vai para o frontend.
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/settings?tab=plano" className="btn-primary inline-flex items-center gap-2">
              Ver assinatura
              <ArrowRight size={16} />
            </Link>
            <Link to="/dashboard" className="btn-secondary">
              Ir para dashboard
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
