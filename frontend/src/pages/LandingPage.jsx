import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Play,
  Sparkles,
  Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PLAN_ORDER, formatPlanCurrency } from '../constants/plans';
import { Logo } from '../components/Logo';

const featureCards = [
  {
    icon: Users,
    title: 'Gestao de alunos',
    description: 'Cadastre e acompanhe todos seus alunos facilmente'
  },
  {
    icon: CalendarDays,
    title: 'Agenda inteligente',
    description: 'Organize horarios e sessoes sem conflitos'
  },
  {
    icon: CreditCard,
    title: 'Controle financeiro',
    description: 'Acompanhe pagamentos e faturamento'
  },
  {
    icon: Bot,
    title: 'IA para treinos',
    description: 'Gere treinos personalizados rapidamente'
  }
];

const socialProof = [
  { value: '+500', label: 'treinos criados' },
  { value: '+100', label: 'personal trainers' },
  { value: '95%', label: 'de satisfacao' }
];

const heroStudents = [
  { name: 'Camila Rocha', tag: 'Ativa', tone: 'bg-emerald-50 text-emerald-700' },
  { name: 'Rafael Lima', tag: 'Sessao hoje', tone: 'bg-blue-50 text-blue-700' },
  { name: 'Mariana Costa', tag: 'Em dia', tone: 'bg-violet-50 text-violet-700' }
];

const weeklyAgenda = [
  { day: 'Seg', time: '07:00', label: 'Consultoria online' },
  { day: 'Ter', time: '10:30', label: 'Treino funcional' },
  { day: 'Qua', time: '18:00', label: 'Avaliar progresso' }
];

const heroBenefits = [
  'Organize alunos, agenda e financeiro em poucos cliques',
  'Entregue treinos com mais velocidade e padrao profissional',
  'Ganhe uma operacao mais previsivel e com mais valor percebido'
];

function LandingPlanCard({ plan, index }) {
  const featured = plan.id === 'pro';
  const badge = featured ? 'Mais popular' : plan.badge;

  return (
    <motion.article
      key={plan.id}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      className={`relative rounded-[2rem] bg-white p-7 shadow-[0_18px_40px_rgba(15,23,42,0.07)] transition hover:-translate-y-1 hover:shadow-[0_24px_48px_rgba(15,23,42,0.1)] ${
        featured ? 'border-2 border-blue-500' : 'border border-slate-200'
      }`}
    >
      {featured ? (
        <div className="absolute inset-x-8 -top-3 flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.28)]">
            <Sparkles size={13} />
            {badge}
          </span>
        </div>
      ) : badge ? (
        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {badge}
        </span>
      ) : null}

      <div className={featured ? 'pt-5' : ''}>
        <h3 className="text-2xl font-black tracking-tight text-slate-900">{plan.publicName || plan.name}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">{plan.description}</p>
        <p className="mt-5 text-4xl font-black tracking-tight text-blue-600">
          {formatPlanCurrency(plan.price)}
          <span className="ml-1 text-base font-semibold text-slate-500">/mes</span>
        </p>

        <ul className="mt-6 space-y-3">
          {plan.benefits.slice(0, 5).map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm text-slate-600">
              <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <CheckCircle2 size={13} />
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <Link
          to={`/register?plan=${plan.id}`}
          className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition ${
            featured
              ? 'bg-blue-600 text-white shadow-[0_14px_28px_rgba(37,99,235,0.24)] hover:bg-blue-500'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          Assinar plano
          <ChevronRight size={16} />
        </Link>
      </div>
    </motion.article>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10">
          <a href="#top" className="inline-flex items-center">
            <Logo
              size={32}
              priority
              className="gap-2.5"
              wordmarkClassName="text-xl font-black tracking-tight text-slate-900"
            />
          </a>

          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-secondary">Entrar</Link>
            <Link to="/register" className="btn-primary">Criar conta</Link>
          </div>
        </div>
      </header>

      <main id="top" className="overflow-hidden pt-24">
        <section className="relative px-6 py-14 lg:px-10 lg:py-24">
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[540px] bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_42%),radial-gradient(circle_at_top_right,_rgba(34,211,238,0.12),_transparent_36%)]" />

          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.04fr_0.96fr]">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                <Sparkles size={15} />
                Plataforma completa para personal trainers
              </div>

              <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight tracking-tight text-slate-900 md:text-6xl">
                Gerencie alunos, treinos, agenda e pagamentos em um so lugar.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
                Automatize sua rotina como personal trainer com uma plataforma completa para organizar alunos, montar treinos, controlar agenda e acompanhar seus ganhos.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-7 py-4 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(37,99,235,0.28)] transition hover:-translate-y-0.5 hover:bg-blue-500"
                >
                  Teste gratis por 7 dias
                  <ArrowRight size={16} />
                </Link>
                <a
                  href="#beneficios"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-7 py-4 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50"
                >
                  <Play size={15} />
                  Ver demonstracao
                </a>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {socialProof.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
                    <p className="text-2xl font-black tracking-tight text-slate-900">{item.value}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.label}</p>
                  </div>
                ))}
              </div>

              <ul className="mt-8 space-y-3">
                {heroBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3 text-sm text-slate-600">
                    <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <CheckCircle2 size={13} />
                    </span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08, duration: 0.5 }}
              className="relative"
            >
              <div className="absolute -right-10 top-12 h-44 w-44 rounded-full bg-cyan-100/60 blur-3xl" />
              <div className="absolute -left-6 bottom-10 h-40 w-40 rounded-full bg-blue-100/70 blur-3xl" />

              <div className="relative rounded-[2.2rem] border border-slate-200 bg-white/95 p-4 shadow-[0_30px_70px_rgba(15,23,42,0.12)] backdrop-blur">
                <div className="rounded-[1.8rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm">
                      Dashboard premium
                    </span>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                    <div className="space-y-4">
                      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Alunos</p>
                            <p className="mt-1 text-lg font-bold text-slate-900">Lista ativa</p>
                          </div>
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">128 ativos</span>
                        </div>

                        <div className="mt-4 space-y-3">
                          {heroStudents.map((student) => (
                            <div key={student.name} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
                              <div className="flex items-center gap-3">
                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-sm font-bold text-blue-700">
                                  {student.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
                                </span>
                                <div>
                                  <p className="text-sm font-semibold text-slate-800">{student.name}</p>
                                  <p className="text-xs text-slate-500">Acompanhamento em andamento</p>
                                </div>
                              </div>
                              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${student.tone}`}>
                                {student.tag}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Treinos criados</p>
                            <p className="mt-1 text-lg font-bold text-slate-900">Biblioteca organizada</p>
                          </div>
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">+24 este mes</span>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-xs text-slate-500">Forca</p>
                            <p className="mt-1 text-xl font-black text-slate-900">18</p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-xs text-slate-500">Cardio</p>
                            <p className="mt-1 text-xl font-black text-slate-900">11</p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-xs text-slate-500">Funcional</p>
                            <p className="mt-1 text-xl font-black text-slate-900">09</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Agenda semanal</p>
                            <p className="mt-1 text-lg font-bold text-slate-900">Semana organizada</p>
                          </div>
                          <CalendarDays size={18} className="text-blue-600" />
                        </div>

                        <div className="mt-4 space-y-3">
                          {weeklyAgenda.map((item) => (
                            <div key={`${item.day}-${item.time}`} className="grid grid-cols-[52px_1fr] gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
                              <div className="rounded-2xl bg-white px-2 py-2 text-center shadow-sm">
                                <p className="text-[11px] font-semibold uppercase text-slate-400">{item.day}</p>
                                <p className="mt-1 text-sm font-bold text-slate-900">{item.time}</p>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                                  <p className="text-xs text-slate-500">Sem conflito de horario</p>
                                </div>
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Financeiro</p>
                            <p className="mt-1 text-lg font-bold text-slate-900">Visao do faturamento</p>
                          </div>
                          <BarChart3 size={18} className="text-blue-600" />
                        </div>

                        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                          <div className="flex items-end gap-2">
                            <div className="h-16 w-8 rounded-t-2xl bg-blue-200" />
                            <div className="h-24 w-8 rounded-t-2xl bg-blue-400" />
                            <div className="h-20 w-8 rounded-t-2xl bg-cyan-400" />
                            <div className="h-28 w-8 rounded-t-2xl bg-blue-600" />
                            <div className="h-32 w-8 rounded-t-2xl bg-cyan-500" />
                          </div>
                          <div className="mt-4 flex items-center justify-between">
                            <div>
                              <p className="text-xs text-slate-500">Receita do mes</p>
                              <p className="mt-1 text-2xl font-black tracking-tight text-slate-900">R$ 8.420</p>
                            </div>
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                              +18,4%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="beneficios" className="border-t border-slate-200 bg-white px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
              Tudo o que voce precisa para gerir seu atendimento
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Uma experiencia clean, moderna e profissional para centralizar rotina, treinos e financeiro em um unico sistema.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-7xl gap-5 md:grid-cols-2 xl:grid-cols-4">
            {featureCards.map((item, index) => (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ delay: index * 0.06 }}
                className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_14px_30px_rgba(15,23,42,0.05)] transition hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(15,23,42,0.08)]"
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <item.icon size={21} />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{item.description}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="border-t border-slate-200 bg-slate-50 px-6 py-16 lg:px-10">
          <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
            {socialProof.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-[2rem] border border-slate-200 bg-white px-6 py-8 text-center shadow-[0_12px_28px_rgba(15,23,42,0.05)]"
              >
                <p className="text-4xl font-black tracking-tight text-slate-900">{item.value}</p>
                <p className="mt-2 text-sm font-medium text-slate-500">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="planos" className="border-t border-slate-200 bg-white px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
                Planos pensados para cada etapa da sua operacao
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Mantenha a integracao com Stripe e escolha o plano ideal para organizar atendimento, vender melhor e crescer com previsibilidade.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {PLAN_ORDER.map((plan, index) => (
                <LandingPlanCard key={plan.id} plan={plan} index={index} />
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-6xl rounded-[2.2rem] bg-gradient-to-r from-blue-600 to-cyan-500 p-10 text-center text-white shadow-[0_24px_50px_rgba(37,99,235,0.32)] md:p-14">
            <h3 className="text-3xl font-black tracking-tight md:text-4xl">
              Comece agora e transforme sua rotina em uma operacao profissional
            </h3>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-blue-50 md:text-base">
              Centralize alunos, treinos, agenda e pagamentos em uma plataforma que aumenta produtividade e passa mais valor para seus alunos.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-semibold text-blue-700 transition hover:-translate-y-0.5"
              >
                Teste gratis por 7 dias
                <ArrowRight size={16} />
              </Link>
              <a
                href="#top"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Ver demonstracao
                <Play size={15} />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-950 px-6 py-10 text-slate-300 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <Logo
              to="/"
              size={32}
              className="gap-2.5"
              wordmarkClassName="text-xl font-black tracking-tight text-white"
            />
            <p className="mt-4 text-sm leading-7 text-slate-400">
              Plataforma SaaS para personal trainers organizarem alunos, treinos, agenda, cobrancas e atendimento com mais valor percebido.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm font-medium">
            <Link to="/terms" className="transition hover:text-white">Termos de uso</Link>
            <Link to="/privacy" className="transition hover:text-white">Privacidade</Link>
            <Link to="/contact" className="transition hover:text-white">Contato</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
