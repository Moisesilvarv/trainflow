import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, BarChart3, Lock, Mail, ShieldCheck, Sparkles, Star, Zap } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getFieldClass, isValidEmail } from '../utils/authValidation';
import { PasswordField } from '../components/auth/PasswordField';
import { Logo } from '../components/Logo';

function BannerFeature({ icon: Icon, title, description }) {
  return (
    <div className="flex items-center gap-5 rounded-2xl border border-white/10 bg-white/10 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
      <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white">
        <Icon size={28} />
      </span>
      <div>
        <h3 className="text-base font-bold text-white">{title}</h3>
        <p className="mt-1 max-w-[21rem] text-sm leading-6 text-blue-50">{description}</p>
      </div>
    </div>
  );
}

function LoginIconInput({ icon: Icon, className = '', ...props }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-5 top-1/2 z-10 -translate-y-1/2 text-slate-400">
        <Icon size={20} />
      </span>
      <input
        {...props}
        className={`input h-14 rounded-xl border-slate-300 !pl-14 !pr-4 text-base shadow-[0_8px_24px_rgba(15,23,42,0.03)] ${className}`}
      />
    </div>
  );
}

function LoginPasswordInput({ value, onChange, onBlur, placeholder, className = '', required = false }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-5 top-1/2 z-10 -translate-y-1/2 text-slate-400">
        <Lock size={20} />
      </span>
      <PasswordField
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        className={`h-14 rounded-xl border-slate-300 !pl-14 !pr-12 text-base shadow-[0_8px_24px_rgba(15,23,42,0.03)] ${className}`}
      />
    </div>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [touched, setTouched] = useState({ email: false, password: false });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validation = useMemo(
    () => ({
      email: isValidEmail(form.email),
      password: form.password.length > 0
    }),
    [form.email, form.password]
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched({ email: true, password: true });

    if (!validation.email || !validation.password) return;

    try {
      setLoading(true);
      setError('');
      await login(form.email, form.password);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Nao foi possivel entrar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.10)] lg:grid-cols-[0.92fr_1.08fr]">
        <section className="relative hidden overflow-hidden bg-[radial-gradient(circle_at_88%_55%,rgba(37,99,235,0.95)_0%,rgba(37,99,235,0.68)_24%,transparent_56%),linear-gradient(135deg,#06152a_0%,#081b3d_48%,#2563eb_100%)] px-14 py-12 text-white lg:flex lg:flex-col">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.28)_0%,transparent_62%)]" />
          <div className="relative z-10">
            <Logo
              to="/"
              size={58}
              priority
              className="gap-5"
              wordmarkClassName="text-2xl font-black tracking-tight text-white"
            />

            <h1 className="mt-20 max-w-lg text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
              Seu painel profissional <span className="text-blue-400">comeca aqui.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-8 text-blue-50">
              Entre para gerenciar alunos, treinos, pagamentos e agenda em um unico sistema.
            </p>
          </div>

          <div className="relative z-10 mt-10 space-y-3">
            <BannerFeature
              icon={ShieldCheck}
              title="Autenticacao segura"
              description="Seus dados estao protegidos com as mais altas tecnologias."
            />
            <BannerFeature
              icon={Zap}
              title="Tudo em um so lugar"
              description="Alunos, treinos, pagamentos e agenda integrados."
            />
            <BannerFeature
              icon={BarChart3}
              title="Feito para personal trainers"
              description="Ferramentas profissionais para escalar seu negocio."
            />
          </div>

          <div className="relative z-10 mt-8 rounded-2xl border border-white/10 bg-white/10 p-6 backdrop-blur-sm">
            <div className="flex items-start gap-5">
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-600 text-base font-black text-white">
                CM
              </span>
              <div>
                <div className="flex items-center gap-1 text-amber-300">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} size={16} className="fill-current" />
                  ))}
                </div>
                <p className="mt-3 max-w-sm text-sm leading-7 text-white">
                  "O TrainFlow mudou a forma como eu trabalho. Ganhei tempo e meus alunos tiveram muito mais resultado."
                </p>
                <p className="mt-4 text-sm font-bold text-white">Carlos Mendes</p>
                <p className="text-xs text-blue-100">Personal Trainer</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-auto border-t border-white/10 pt-6">
            <p className="max-w-sm text-sm leading-6 text-blue-100">
              Mais de 2.500 profissionais ja transformaram seus negocios com o TrainFlow.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 md:p-10">
          <motion.form initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit} className="w-full max-w-md">
            <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900">
              <ArrowLeft size={14} />
              Voltar para a landing page
            </Link>

            <div className="mt-5">
              <Logo
                to="/"
                size={64}
                priority
                className="gap-3"
                wordmarkClassName="text-2xl font-black tracking-tight text-slate-900"
              />
            </div>

            <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">
              <Sparkles size={13} />
              Acesso
            </p>
            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900">Entrar na plataforma</h2>
            <p className="mt-2 text-sm text-slate-500">Use seu email e senha para acessar seu painel.</p>

            {error ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p> : null}

            <div className="mt-6 space-y-3">
              <LoginIconInput
                icon={Mail}
                className={getFieldClass({ hasError: touched.email && !validation.email, isValid: touched.email && validation.email })}
                placeholder="Email"
                type="email"
                value={form.email}
                onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />

              <LoginPasswordInput
                value={form.password}
                onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Senha"
                required
                className={getFieldClass({ hasError: touched.password && !validation.password, isValid: touched.password && validation.password })}
              />
            </div>

            <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60" type="submit" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
              <ArrowRight size={15} />
            </button>

            <div className="mt-4 flex items-center justify-between text-sm">
              <Link to="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">Esqueci minha senha</Link>
              <Link to="/register" className="font-medium text-slate-600 hover:text-slate-900">Criar conta</Link>
            </div>
          </motion.form>
        </section>
      </div>
    </div>
  );
}
