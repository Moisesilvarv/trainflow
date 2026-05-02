import { ArrowLeft, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '../Logo';

function Section({ title, children }) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.05)] md:p-8">
      <h2 className="text-2xl font-black tracking-tight text-slate-900">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600">{children}</div>
    </section>
  );
}

export function PublicInfoLayout({
  eyebrow,
  title,
  description,
  updatedAt,
  children
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10">
          <Logo
            to="/"
            size={32}
            priority
            className="gap-2.5"
            wordmarkClassName="text-xl font-black tracking-tight text-slate-900"
          />

          <div className="flex items-center gap-3">
            <Link to="/" className="btn-secondary inline-flex items-center gap-2">
              <ArrowLeft size={16} />
              Voltar ao site
            </Link>
            <Link to="/register" className="btn-primary">
              Criar conta
            </Link>
          </div>
        </div>
      </header>

      <main className="px-6 py-12 lg:px-10 lg:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-[2.5rem] border border-slate-200 bg-gradient-to-br from-white via-blue-50/40 to-cyan-50/70 p-8 shadow-[0_24px_64px_rgba(15,23,42,0.08)] md:p-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
              <Sparkles size={15} />
              {eyebrow}
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600 md:text-lg">
              {description}
            </p>

            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-500">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">
                <ShieldCheck size={15} className="text-blue-600" />
                Atualizado em {updatedAt}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 shadow-sm">
                <Mail size={15} className="text-blue-600" />
                Conteudo inicial sujeito a revisao juridica futura
              </span>
            </div>
          </div>

          <div className="mt-8 space-y-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

PublicInfoLayout.Section = Section;
