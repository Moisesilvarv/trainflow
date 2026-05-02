import { CreditCard, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function TrialExpiredPage() {
  const { user } = useAuth();

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-2xl rounded-[28px] border border-amber-200 bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
          <Lock size={24} />
        </div>

        <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950">
          Seu trial terminou
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          O teste gratis da conta {user?.email ? <strong>{user.email}</strong> : null} expirou. Escolha um plano para reativar os recursos Pro e continuar usando o TrainFlow.
        </p>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Link to="/plans" className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-3">
            <CreditCard size={18} />
            Ver planos
          </Link>
        </div>
      </div>
    </div>
  );
}

export default TrialExpiredPage;
