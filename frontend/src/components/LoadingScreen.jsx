import { Logo } from './Logo';

export function LoadingScreen({
  label = 'Carregando...',
  tone = 'default'
}) {
  const isHero = tone === 'hero';

  return (
    <div className={`grid min-h-screen place-items-center px-4 ${isHero ? 'bg-white' : 'bg-slate-50'}`}>
      <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white/95 p-8 text-center shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="mb-6 flex justify-center">
          <Logo
            size={64}
            priority
            className="gap-3"
            wordmarkClassName="text-2xl font-black tracking-tight text-slate-900"
          />
        </div>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-blue-50 text-blue-600">
          <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-blue-600 border-t-transparent" />
        </div>
        <p className="mt-5 text-lg font-bold tracking-tight text-slate-900">{label}</p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Estamos preparando sua experiencia no TrainFlow.
        </p>
      </div>
    </div>
  );
}
