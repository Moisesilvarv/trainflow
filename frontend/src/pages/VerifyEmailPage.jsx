import { CheckCircle2, LoaderCircle, MailWarning } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const { isAuthenticated, logout, resendVerificationEmail, verifyEmail } = useAuth();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Validando seu link de verificacao...');
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const token = useMemo(() => String(searchParams.get('token') || '').trim(), [searchParams]);

  useEffect(() => {
    let active = true;

    async function runVerification() {
      if (!token) {
        setStatus('error');
        setMessage('Token de verificacao ausente ou invalido.');
        return;
      }

      try {
        const response = await verifyEmail(token);
        if (!active) return;
        setStatus('success');
        setMessage(response.message || 'Email confirmado com sucesso.');

        window.setTimeout(() => {
          navigate(isAuthenticated ? '/dashboard' : '/login', { replace: true });
        }, 1800);
      } catch (err) {
        if (!active) return;
        setStatus('error');
        setMessage('Solicite um novo email de confirmacao para continuar.');
      }
    }

    runVerification();
    return () => {
      active = false;
    };
  }, [token, verifyEmail, navigate, isAuthenticated]);

  async function handleResend() {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }

    try {
      setResending(true);
      setResendMessage('');
      const response = await resendVerificationEmail();
      setResendMessage(response.message || 'Email de confirmacao reenviado.');
    } catch (err) {
      setResendMessage(err.response?.data?.message || 'Nao foi possivel reenviar o email agora.');
    } finally {
      setResending(false);
    }
  }

  async function handleGoToLogin() {
    if (isAuthenticated) {
      await logout().catch(() => {});
    }
    navigate('/login', { replace: true });
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <div className="card w-full max-w-xl p-8">
        {status === 'loading' ? (
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <LoaderCircle size={24} className="animate-spin" />
          </div>
        ) : null}

        {status === 'success' ? (
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
        ) : null}

        {status === 'error' ? (
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <MailWarning size={24} />
          </div>
        ) : null}

        <h1 className="mt-5 text-3xl font-black tracking-tight text-slate-950">
          {status === 'loading' ? 'Confirmando seu email' : status === 'success' ? 'Email confirmado' : 'Link invalido ou expirado'}
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">{message}</p>
        {resendMessage ? (
          <p className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            {resendMessage}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {status === 'success' ? (
            <Link to={isAuthenticated ? '/dashboard' : '/login'} className="btn-primary inline-flex items-center justify-center px-5 py-3">
              Continuar
            </Link>
          ) : null}

          {status === 'error' ? (
            <>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="btn-primary inline-flex items-center justify-center px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resending ? 'Reenviando...' : 'Reenviar email'}
              </button>
              <button
                type="button"
                onClick={handleGoToLogin}
                className="btn-primary inline-flex items-center justify-center px-5 py-3"
              >
                Ir para login
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default VerifyEmailPage;
