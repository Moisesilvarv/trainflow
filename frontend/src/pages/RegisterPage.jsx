import { motion } from 'framer-motion';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  Crown,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Star,
  User,
  UserRound,
  Users,
  Zap
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PasswordField } from '../components/auth/PasswordField';
import { Logo } from '../components/Logo';
import { PLAN_ORDER, formatPlanCurrency, normalizePlanId } from '../constants/plans';
import { getFieldClass, isStrongPassword, isValidEmail } from '../utils/authValidation';

const TRIAL_PLAN_ID = 'pro';

async function buildBrowserFingerprint() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return '';

  const screenInfo = window.screen
    ? `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`
    : 'unknown';
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown';
  const rawFingerprint = [
    navigator.userAgent || '',
    navigator.language || '',
    navigator.platform || '',
    navigator.hardwareConcurrency || '',
    timezone,
    screenInfo
  ].join('|');

  if (!window.crypto?.subtle || !window.TextEncoder) {
    return rawFingerprint.slice(0, 255);
  }

  const bytes = new TextEncoder().encode(rawFingerprint);
  const digest = await window.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

function HeroFeature({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#3b82f6_0%,#4f46e5_100%)] text-white shadow-[0_12px_22px_rgba(59,130,246,0.22)]">
        <Icon size={18} />
      </span>
      <div>
        <h3 className="text-sm font-bold tracking-tight text-white">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-300">{description}</p>
      </div>
    </div>
  );
}

function TestimonialCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/6 p-4 shadow-[0_18px_38px_rgba(15,23,42,0.16)] backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#fde68a_0%,#f97316_100%)] text-sm font-black text-slate-900">
          CM
        </div>
        <div>
          <div className="flex items-center gap-1 text-amber-300">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} size={12} className="fill-current" />
            ))}
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-100">
            "O TrainFlow mudou a forma como eu trabalho. Ganhei tempo e meus alunos tiveram muito mais resultado."
          </p>
          <p className="mt-3 text-xs font-semibold text-blue-300">Carlos Mendes</p>
          <p className="text-[11px] text-slate-400">Personal Trainer</p>
        </div>
      </div>
    </div>
  );
}

function SocialProof() {
  const avatars = [
    { label: 'RC', color: 'from-amber-300 to-orange-500' },
    { label: 'LS', color: 'from-fuchsia-300 to-pink-500' },
    { label: 'AM', color: 'from-cyan-300 to-blue-500' },
    { label: 'JP', color: 'from-emerald-300 to-teal-500' },
    { label: 'FN', color: 'from-slate-200 to-slate-400' }
  ];

  return (
    <div className="border-t border-white/10 pt-5">
      <p className="mx-auto max-w-sm text-center text-xs leading-5 text-slate-200">
        Mais de 2.500 profissionais ja transformaram seus negocios com o TrainFlow.
      </p>
      <div className="mt-3 flex items-center justify-center">
        {avatars.map((avatar, index) => (
          <div
            key={avatar.label}
            className={`-ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#06152d] bg-gradient-to-br ${avatar.color} text-[10px] font-black text-slate-950 first:ml-0`}
            style={{ zIndex: avatars.length - index }}
          >
            {avatar.label}
          </div>
        ))}
        <div className="-ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#06152d] bg-[linear-gradient(135deg,#2563eb_0%,#4f46e5_100%)] text-[10px] font-black text-white">
          2.5k+
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-slate-300">Junte-se a eles hoje mesmo.</p>
    </div>
  );
}

function ModeCard({ active, icon: Icon, title, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-2xl border p-4 text-left transition ${
        active
          ? 'border-blue-400 bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] shadow-[0_16px_38px_rgba(37,99,235,0.12)]'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <span className={`absolute left-3 top-3 inline-flex h-5 w-5 items-center justify-center rounded-full border-2 ${active ? 'border-blue-500' : 'border-slate-300'}`}>
        <span className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-blue-500' : 'bg-transparent'}`} />
      </span>

      <div className="pl-8">
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${active ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
          <Icon size={16} />
        </span>
        <h3 className="mt-3 text-sm font-bold tracking-tight text-slate-950">{title}</h3>
        <p className="mt-1.5 text-xs leading-5 text-slate-500">{description}</p>
      </div>
    </button>
  );
}

function InputLabel({ children }) {
  return <label className="mb-1.5 block text-sm font-bold text-slate-800">{children}</label>;
}

function IconInput({ icon: Icon, className = '', ...props }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400">
        <Icon size={17} />
      </span>
      <input {...props} className={`input h-12 rounded-xl border-slate-200 !pl-12 !pr-4 text-sm shadow-[0_6px_18px_rgba(15,23,42,0.03)] ${className}`} />
    </div>
  );
}

function PasswordInput({ value, onChange, onBlur, placeholder, className = '' }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400">
        <Lock size={17} />
      </span>
      <PasswordField
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        className={`h-12 rounded-xl border-slate-200 !pl-12 !pr-12 text-sm shadow-[0_6px_18px_rgba(15,23,42,0.03)] ${className}`}
      />
    </div>
  );
}

function AccountTypeButton({ active, icon: Icon, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-xs font-semibold transition ${
        active
          ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-[0_12px_28px_rgba(37,99,235,0.08)]'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      <Icon size={15} />
      {children}
    </button>
  );
}

function TrialBenefitCard() {
  const benefits = [
    'Acesso completo a todos os recursos',
    'Biblioteca de treinos e exercicios',
    'Relatorios e analises avancadas',
    'Suporte prioritario'
  ];

  return (
    <div className="rounded-2xl border border-emerald-200 bg-[linear-gradient(135deg,#f0fdf4_0%,#ecfeff_100%)] p-4 shadow-[0_12px_28px_rgba(16,185,129,0.08)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-emerald-700">
            <Check size={16} />
            <p className="text-sm font-bold">Voce ganha 7 dias gratis no plano Pro</p>
          </div>
          <ul className="mt-3 space-y-2">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-center gap-2 text-xs text-slate-700">
                <Check size={13} className="text-emerald-600" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        <div className="hidden min-w-[86px] rounded-2xl border border-emerald-200 bg-white/80 p-3 text-center shadow-[0_10px_22px_rgba(15,23,42,0.04)] sm:block">
          <CalendarDays size={20} className="mx-auto text-emerald-600" />
          <p className="mt-1 text-3xl font-black tracking-tight text-emerald-700">7</p>
          <p className="text-xs font-semibold text-slate-600">dias gratis</p>
        </div>
      </div>
    </div>
  );
}

function PlanSelectionSection({ planId, onSelectPlan }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-900">Escolha um plano agora</p>
          <p className="mt-1 text-xs text-slate-500">Voce segue para o checkout logo apos criar a conta.</p>
        </div>
        <Link to="/plans" className="text-sm font-semibold text-blue-600 hover:text-blue-500">
          Comparar planos
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {PLAN_ORDER.map((plan) => (
          <button
            key={plan.id}
            type="button"
            onClick={() => onSelectPlan(plan.id)}
            className={`rounded-[20px] border px-4 py-4 text-left transition ${
              planId === plan.id
                ? 'border-blue-500 bg-white shadow-[0_16px_30px_rgba(37,99,235,0.1)]'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <p className="text-sm font-bold text-slate-900">{plan.publicName || plan.name}</p>
            <p className="mt-2 text-xl font-black tracking-tight text-slate-950">{formatPlanCurrency(plan.price)}</p>
            <p className="mt-1 text-xs text-slate-500">{plan.cap}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function ProtectionBadge() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-[0_8px_24px_rgba(16,185,129,0.08)]">
      <ShieldCheck size={14} />
      Seus dados estao protegidos
    </div>
  );
}

export function RegisterPage() {
  const { register, startCheckout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPlan = normalizePlanId(searchParams.get('plan') || 'pro');
  const [mode, setMode] = useState(searchParams.get('plan') ? 'plan' : 'trial');
  const [form, setForm] = useState(() => ({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    accountType: 'personal',
    plan: initialPlan
  }));
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedPlan = useMemo(() => PLAN_ORDER.find((plan) => plan.id === form.plan) || PLAN_ORDER[1] || PLAN_ORDER[0], [form.plan]);
  const passwordsMatch = form.password.length > 0 && form.password === form.confirmPassword;

  const validation = useMemo(
    () => ({
      name: form.name.trim().length >= 3,
      email: isValidEmail(form.email),
      password: isStrongPassword(form.password),
      confirmPassword: passwordsMatch
    }),
    [form.name, form.email, form.password, passwordsMatch]
  );

  const isFormValid = Object.values(validation).every(Boolean);
  const isTrialMode = mode === 'trial';

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, confirmPassword: true });

    if (!isFormValid) return;

    const targetPlan = isTrialMode ? TRIAL_PLAN_ID : form.plan;

    try {
      setLoading(true);
      setError('');
      const fingerprint = await buildBrowserFingerprint();

      await register({
        ...form,
        plan: targetPlan,
        trialRequested: isTrialMode,
        fingerprint
      });

      if (isTrialMode) {
        navigate('/dashboard', { replace: true });
        return;
      }

      const checkout = await startCheckout({
        plan: targetPlan,
        paymentMethod: 'card'
      });

      if (checkout?.checkoutUrl) {
        window.location.href = checkout.checkoutUrl;
        return;
      }

      navigate(`/plans?plan=${targetPlan}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Nao foi possivel criar conta.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f5f8ff_0%,#eef4ff_100%)] p-2 md:p-4">
      <div className="mx-auto grid min-h-[calc(100vh-1rem)] max-w-[1180px] overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.12)] lg:grid-cols-[0.82fr_1.18fr]">
        <section className="relative hidden overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.24),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(79,70,229,0.22),_transparent_30%),linear-gradient(180deg,#07162d_0%,#061226_100%)] p-7 text-white lg:flex lg:flex-col">
          <div className="pointer-events-none absolute inset-0 opacity-60">
            <div className="absolute -bottom-20 right-[-10%] h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(79,70,229,0.34)_0%,_transparent_66%)]" />
            <div className="absolute bottom-10 right-0 h-40 w-72 rotate-[-12deg] rounded-full border border-white/10" />
          </div>

          <div className="relative z-10 flex h-full flex-col">
            <Logo
              to="/"
              size={44}
              priority
              className="gap-3"
              wordmarkClassName="text-2xl font-black tracking-tight text-white"
            />

            <div className="mt-10">
              <h1 className="max-w-md text-[38px] font-black leading-[1.04] tracking-tight text-white">
                O jeito mais facil de gerenciar seus alunos e <span className="text-blue-400">treinos.</span>
              </h1>
              <p className="mt-5 max-w-md text-base leading-6 text-slate-300">
                Automatize, organize e escale seu negocio com a plataforma completa para personal trainers e equipes.
              </p>
            </div>

            <div className="mt-8 space-y-3">
              <HeroFeature
                icon={Zap}
                title="Mais tempo, menos trabalho"
                description="Automatize treinos, avaliacoes e mensagens e foque no que realmente importa."
              />
              <HeroFeature
                icon={Users}
                title="Alunos mais engajados"
                description="Experiencia profissional que aumenta a adesao e os resultados."
              />
              <HeroFeature
                icon={Sparkles}
                title="Cresca com dados"
                description="Relatorios inteligentes para tomar decisoes e escalar seu negocio."
              />
            </div>

            <div className="mt-7">
              <TestimonialCard />
            </div>

            <div className="mt-auto pt-6">
              <SocialProof />
            </div>
          </div>
        </section>

        <section className="relative overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_22%),linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] px-5 py-5 sm:px-7 lg:px-10 lg:py-6">
          <div className="mx-auto max-w-[560px]">
            <div className="flex justify-center lg:justify-end">
              <ProtectionBadge />
            </div>

            <motion.form
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleSubmit}
              className="mt-5"
            >
              <div className="text-center">
                <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Criar sua conta</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Comece agora e tenha <span className="font-bold text-blue-600">7 dias gratis</span>
                </p>
              </div>

              {error ? (
                <p className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </p>
              ) : null}

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <ModeCard
                  active={isTrialMode}
                  icon={Sparkles}
                  title="Teste gratis por 7 dias"
                  description="Acesso completo ao plano Pro. Sem cartao, sem compromisso."
                  onClick={() => setMode('trial')}
                />
                <ModeCard
                  active={!isTrialMode}
                  icon={Crown}
                  title="Escolher plano agora"
                  description="Ja sabe qual plano e ideal? Escolha e comece agora mesmo."
                  onClick={() => setMode('plan')}
                />
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <InputLabel>Nome completo</InputLabel>
                  <IconInput
                    icon={User}
                    placeholder="Digite seu nome completo"
                    value={form.name}
                    onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={getFieldClass({ hasError: touched.name && !validation.name, isValid: touched.name && validation.name })}
                    required
                  />
                </div>

                <div>
                  <InputLabel>E-mail</InputLabel>
                  <IconInput
                    icon={Mail}
                    type="email"
                    placeholder="seu@email.com"
                    value={form.email}
                    onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className={getFieldClass({ hasError: touched.email && !validation.email, isValid: touched.email && validation.email })}
                    required
                  />
                </div>

                <div>
                  <InputLabel>Senha</InputLabel>
                  <PasswordInput
                    value={form.password}
                    onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Crie uma senha segura"
                    className={getFieldClass({ hasError: touched.password && !validation.password, isValid: touched.password && validation.password })}
                  />
                </div>

                <div>
                  <InputLabel>Confirmar senha</InputLabel>
                  <PasswordInput
                    value={form.confirmPassword}
                    onBlur={() => setTouched((prev) => ({ ...prev, confirmPassword: true }))}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    placeholder="Confirme sua senha"
                    className={getFieldClass({ hasError: touched.confirmPassword && !validation.confirmPassword, isValid: touched.confirmPassword && validation.confirmPassword })}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <AccountTypeButton
                    active={form.accountType === 'personal'}
                    icon={UserRound}
                    onClick={() => setForm({ ...form, accountType: 'personal' })}
                  >
                    Profissional autonomo
                  </AccountTypeButton>
                  <AccountTypeButton
                    active={form.accountType === 'academy'}
                    icon={Building2}
                    onClick={() => setForm({ ...form, accountType: 'academy' })}
                  >
                    Equipe ou estudio
                  </AccountTypeButton>
                </div>

                {isTrialMode ? (
                  <TrialBenefitCard />
                ) : (
                  <PlanSelectionSection
                    planId={form.plan}
                    onSelectPlan={(planId) => setForm((current) => ({ ...current, plan: planId }))}
                  />
                )}
              </div>

              <button
                className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(90deg,#2563eb_0%,#4f46e5_100%)] px-5 text-sm font-bold text-white shadow-[0_18px_36px_rgba(59,130,246,0.22)] transition hover:scale-[1.01] hover:shadow-[0_22px_44px_rgba(79,70,229,0.26)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
                type="submit"
                disabled={loading || !isFormValid}
              >
                {loading
                  ? 'Criando conta...'
                  : isTrialMode
                    ? 'Criar conta e comecar gratis'
                    : `Criar conta e seguir para ${selectedPlan.publicName || selectedPlan.name}`}
                <ArrowRight size={17} />
              </button>

              <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                Ao criar sua conta, voce concorda com nossos{' '}
                <Link to="/terms" className="font-semibold text-blue-600 hover:text-blue-500">
                  Termos de Uso
                </Link>{' '}
                e{' '}
                <Link to="/privacy" className="font-semibold text-blue-600 hover:text-blue-500">
                  Politica de Privacidade
                </Link>.
              </p>

              <p className="mt-4 text-center text-sm text-slate-600">
                Ja tem uma conta?{' '}
                <Link to="/login" className="font-bold text-blue-600 hover:text-blue-500">
                  Fazer login
                </Link>
              </p>
            </motion.form>
          </div>
        </section>
      </div>
    </div>
  );
}

export default RegisterPage;
