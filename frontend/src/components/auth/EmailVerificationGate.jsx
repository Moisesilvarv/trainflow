import { CheckCircle2, LogOut, Mail, MailCheck, RefreshCcw, ShieldCheck, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

const RESEND_COOLDOWN_SECONDS = 120;

function EnvelopeIllustration() {
  return (
    <div className="relative mx-auto hidden h-[420px] w-full max-w-[380px] items-center justify-center lg:flex">
      <div className="absolute left-14 top-20 h-3 w-3 rounded-full bg-violet-400/80" />
      <div className="absolute right-16 top-4 h-4 w-4 rotate-45 rounded-[4px] bg-indigo-300/70" />
      <div className="absolute bottom-14 left-8 h-4 w-4 rounded-full border-2 border-violet-200" />
      <div className="absolute right-5 top-28 h-44 w-44 rounded-full bg-[radial-gradient(circle,_rgba(112,122,255,0.18),_transparent_70%)] blur-2xl" />
      <div className="absolute bottom-8 left-2 h-40 w-40 rounded-full bg-[radial-gradient(circle,_rgba(167,139,250,0.18),_transparent_70%)] blur-2xl" />

      <div className="absolute right-2 top-4 text-violet-300">
        <svg width="126" height="178" viewBox="0 0 126 178" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-90">
          <path d="M10 4C54 14 100 68 74 112C48 156 112 170 122 174" stroke="currentColor" strokeWidth="2.5" strokeDasharray="8 8" strokeLinecap="round" />
        </svg>
      </div>

      <div className="absolute -top-2 right-0 text-indigo-300">
        <svg width="90" height="72" viewBox="0 0 90 72" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 34L80 8L54 64L44 42L8 34Z" fill="url(#planeGradient)" />
          <defs>
            <linearGradient id="planeGradient" x1="8" y1="8" x2="80" y2="64" gradientUnits="userSpaceOnUse">
              <stop stopColor="#E8D9FF" />
              <stop offset="1" stopColor="#7B6CFF" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="absolute left-2 top-24 text-violet-400">
        <Sparkles size={20} />
      </div>
      <div className="absolute right-14 bottom-24 text-violet-400">
        <Sparkles size={18} />
      </div>

      <div className="relative h-[250px] w-[250px] rounded-[38px] border border-indigo-100 bg-[linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(243,245,255,0.92))] shadow-[0_26px_70px_rgba(104,104,237,0.16)]">
        <div className="absolute inset-x-[30px] top-[34px] h-[84px] rounded-[30px_30px_14px_14px] bg-[linear-gradient(180deg,_rgba(238,232,255,0.95),_rgba(214,221,255,0.9))]" />
        <div className="absolute left-[30px] right-[30px] top-[86px] h-[134px] overflow-hidden rounded-[0_0_30px_30px] bg-[linear-gradient(180deg,_rgba(236,239,255,0.95),_rgba(181,194,255,0.95))]">
          <div className="absolute inset-x-0 top-0 h-full bg-[linear-gradient(135deg,_rgba(255,255,255,0.7),_rgba(255,255,255,0.08))]" />
          <div className="absolute left-0 top-0 h-full w-1/2 origin-top-right skew-y-[30deg] bg-[linear-gradient(180deg,_rgba(255,255,255,0.55),_rgba(203,211,255,0.2))]" />
          <div className="absolute right-0 top-0 h-full w-1/2 origin-top-left -skew-y-[30deg] bg-[linear-gradient(180deg,_rgba(255,255,255,0.5),_rgba(173,188,255,0.18))]" />
        </div>
        <div className="absolute inset-x-[30px] top-[92px] h-[116px] rotate-180 overflow-hidden rounded-[30px_30px_0_0]">
          <div className="h-full w-full bg-[linear-gradient(180deg,_rgba(255,255,255,0.82),_rgba(203,212,255,0.65))] [clip-path:polygon(0_0,50%_72%,100%_0,100%_100%,0_100%)]" />
        </div>
        <div className="absolute left-1/2 top-[74px] flex h-20 w-20 -translate-x-1/2 items-center justify-center rounded-full bg-[linear-gradient(135deg,_#9f7cff,_#637dff)] text-white shadow-[0_18px_36px_rgba(104,104,237,0.32)]">
          <Mail size={32} />
        </div>
      </div>
    </div>
  );
}

export function EmailVerificationGate() {
  const { user, logout, refreshUser, resendVerificationEmail } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  useEffect(() => {
    if (cooldownRemaining <= 0) return undefined;

    const timer = window.setInterval(() => {
      setCooldownRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownRemaining]);

  function startCooldown(seconds = RESEND_COOLDOWN_SECONDS) {
    setCooldownRemaining(seconds);
  }

  async function handleResend() {
    if (cooldownRemaining > 0) return;

    try {
      setLoading(true);
      setError('');
      const response = await resendVerificationEmail();
      setMessage(response.message || 'Email de verificacao reenviado com sucesso.');
      startCooldown();
    } catch (err) {
      if (err.response?.status === 429) {
        startCooldown();
      }
      setError(err.response?.data?.message || 'Nao foi possivel reenviar o email agora.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRefreshStatus() {
    try {
      setRefreshing(true);
      setError('');
      await refreshUser();
    } catch (err) {
      setError(err.response?.data?.message || 'Ainda nao foi possivel validar a confirmacao do seu email.');
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(96,120,255,0.18),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(167,139,250,0.16),_transparent_26%),linear-gradient(180deg,_#f6f8ff_0%,_#fcfdff_45%,_#f4f6ff_100%)] px-4 py-6 md:px-6 md:py-10">
      <div className="mx-auto max-w-6xl rounded-[36px] border border-white/80 bg-[linear-gradient(135deg,_rgba(255,255,255,0.96),_rgba(248,250,255,0.94))] shadow-[0_30px_90px_rgba(88,92,214,0.14)] backdrop-blur">
        <div className="grid gap-12 px-6 py-8 md:px-10 md:py-12 lg:grid-cols-[minmax(0,1.1fr)_420px] lg:items-center lg:gap-8">
          <div className="relative">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-[28px] border border-violet-200/80 bg-[linear-gradient(180deg,_rgba(239,242,255,0.95),_rgba(231,236,255,0.88))] text-indigo-500 shadow-[0_12px_40px_rgba(99,102,241,0.16)]">
              <MailCheck size={38} strokeWidth={2.1} />
              <span className="absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,_#7c5cff,_#5a7bff)] text-white shadow-[0_10px_24px_rgba(99,102,241,0.32)]">
                <CheckCircle2 size={18} />
              </span>
            </div>

            <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-violet-200/80 bg-violet-50 px-4 py-2 text-sm font-bold uppercase tracking-[0.18em] text-violet-600">
              <Sparkles size={14} />
              Confirmacao pendente
            </div>

            <h1 className="mt-7 max-w-3xl text-4xl font-black leading-[1.05] tracking-tight text-slate-950 md:text-6xl">
              <span className="sr-only">Confirme seu email para continuar</span>
              Confirme seu <span className="bg-[linear-gradient(135deg,_#5d6bff,_#7c5cff)] bg-clip-text text-transparent">email</span> para continuar
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-9 text-slate-500">
              Enviamos um link de verificacao para <strong className="font-bold text-blue-600">{user?.email}</strong>.
              Assim que voce confirmar, o acesso completo ao TrainFlow sera liberado.
            </p>

            <div className="mt-8 rounded-[26px] border border-slate-200/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(246,248,255,0.94))] p-5 shadow-[0_18px_40px_rgba(148,163,184,0.12)]">
              <div className="flex items-start gap-4">
                <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-950">Nao encontrou o email?</p>
                  <p className="mt-2 text-base leading-7 text-slate-500">
                    Verifique sua caixa de spam ou lixo eletronico. Se precisar, envie um novo link de confirmacao abaixo.
                  </p>
                </div>
              </div>
            </div>

            {message ? (
              <p className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {message}
              </p>
            ) : null}

            {error ? (
              <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </p>
            ) : null}

            <div className="mt-8 grid gap-3 xl:grid-cols-3">
              <button
                type="button"
                onClick={handleResend}
                disabled={loading || cooldownRemaining > 0}
                className="inline-flex min-h-18 items-center justify-center gap-3 rounded-[20px] bg-[linear-gradient(135deg,_#5f63ff,_#386dff)] px-6 py-4 text-lg font-semibold text-white shadow-[0_18px_40px_rgba(67,97,238,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_46px_rgba(67,97,238,0.34)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCcw size={20} />
                {loading
                  ? 'Reenviando...'
                  : cooldownRemaining > 0
                    ? `Reenviar em ${cooldownRemaining}s`
                    : 'Reenviar email'}
              </button>

              <button
                type="button"
                onClick={handleRefreshStatus}
                disabled={refreshing}
                className="inline-flex min-h-18 items-center justify-center gap-3 rounded-[20px] border border-indigo-200 bg-white px-6 py-4 text-lg font-semibold text-slate-700 shadow-[0_12px_26px_rgba(148,163,184,0.12)] transition hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle2 size={20} />
                {refreshing ? 'Atualizando...' : 'Ja confirmei meu email'}
              </button>

              <button
                type="button"
                onClick={logout}
                className="inline-flex min-h-18 items-center justify-center gap-3 rounded-[20px] border border-slate-200 bg-white px-6 py-4 text-lg font-semibold text-slate-700 shadow-[0_12px_26px_rgba(148,163,184,0.08)] transition hover:border-slate-300 hover:bg-slate-50"
              >
                <LogOut size={20} />
                Sair da conta
              </button>
            </div>
          </div>

          <EnvelopeIllustration />
        </div>

        <div className="border-t border-slate-200/70 bg-[linear-gradient(180deg,_rgba(249,250,255,0.92),_rgba(245,247,255,0.95))] px-6 py-6 md:px-10">
          <div className="flex items-center justify-center gap-3 text-center text-lg text-slate-500">
            <ShieldCheck size={22} className="text-indigo-500" />
            <p>Seus dados estao seguros. Utilizamos criptografia para proteger suas informacoes.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
