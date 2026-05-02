import { ArrowRight, Mail } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getFieldClass, isValidEmail } from '../utils/authValidation';

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [recoveryUrl, setRecoveryUrl] = useState('');
  const [error, setError] = useState('');

  const emailValid = isValidEmail(email);

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched(true);
    if (!emailValid) return;

    try {
      setLoading(true);
      setError('');
      setRecoveryUrl('');
      const response = await requestPasswordReset(email);
      setSuccess(response.message || 'Link de recuperacao enviado.');
      setRecoveryUrl(response.recoveryUrl || '');
    } catch (err) {
      setError(err.response?.data?.message || 'Nao foi possivel enviar o link.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-md p-7">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Mail size={18} />
        </div>

        <h1 className="mt-4 text-2xl font-black tracking-tight">Recuperar senha</h1>
        <p className="mt-2 text-sm text-slate-500">Informe seu email para receber o link de recuperacao.</p>

        {success ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
        {error ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p> : null}
        {recoveryUrl ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <p className="font-semibold">Link de recuperacao (modo desenvolvimento):</p>
            <a className="break-all text-amber-700 underline" href={recoveryUrl}>
              {recoveryUrl}
            </a>
          </div>
        ) : null}

        <input
          className={`input mt-4 ${getFieldClass({ hasError: touched && !emailValid, isValid: touched && emailValid })}`}
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched(true)}
          required
        />

        <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50" type="submit" disabled={loading || !emailValid}>
          {loading ? 'Enviando...' : 'Enviar link de recuperacao'}
          <ArrowRight size={15} />
        </button>

        <p className="mt-4 text-center text-sm text-slate-600">
          Lembrou sua senha? <Link className="font-semibold text-blue-600" to="/login">Voltar ao login</Link>
        </p>
      </form>
    </div>
  );
}
