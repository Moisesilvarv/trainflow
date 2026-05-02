import { ArrowRight, Check, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabaseClient } from '../api/supabaseClient';
import { PasswordField } from '../components/auth/PasswordField';
import { getFieldClass, getPasswordChecks, isStrongPassword, passwordRules } from '../utils/authValidation';

function parseHashParams() {
  const hash = window.location.hash.replace(/^#/, '');
  const params = new URLSearchParams(hash);
  return {
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
    type: params.get('type'),
    token_hash: params.get('token_hash'),
    code: params.get('code')
  };
}

function parseSearchParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    type: params.get('type'),
    token_hash: params.get('token_hash'),
    code: params.get('code')
  };
}

export function ResetPasswordPage() {
  const [form, setForm] = useState({ newPassword: '', confirmNewPassword: '' });
  const [touched, setTouched] = useState({ newPassword: false, confirmNewPassword: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const checks = useMemo(() => getPasswordChecks(form.newPassword), [form.newPassword]);
  const passwordsMatch = form.newPassword.length > 0 && form.newPassword === form.confirmNewPassword;
  const isValid = isStrongPassword(form.newPassword) && passwordsMatch;

  async function ensureRecoverySession() {
    const { data: existingSession } = await supabaseClient.auth.getSession();
    if (existingSession?.session) return;

    const hash = parseHashParams();
    const search = parseSearchParams();

    if (hash.access_token && hash.refresh_token && hash.type === 'recovery') {
      const { error: sessionError } = await supabaseClient.auth.setSession({
        access_token: hash.access_token,
        refresh_token: hash.refresh_token
      });
      if (sessionError) throw sessionError;
      return;
    }

    if (search.code || hash.code) {
      const code = search.code || hash.code;
      const { error: exchangeError } = await supabaseClient.auth.exchangeCodeForSession(code);
      if (exchangeError) throw exchangeError;
      return;
    }

    if ((search.token_hash || hash.token_hash) && (search.type || hash.type) === 'recovery') {
      const tokenHash = search.token_hash || hash.token_hash;
      const { error: verifyError } = await supabaseClient.auth.verifyOtp({
        type: 'recovery',
        token_hash: tokenHash
      });
      if (verifyError) throw verifyError;
      return;
    }

    throw new Error('Link invalido ou expirado. Solicite uma nova recuperacao.');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched({ newPassword: true, confirmNewPassword: true });
    if (!isValid) return;

    try {
      setLoading(true);
      setError('');
      await ensureRecoverySession();

      const { error: updateError } = await supabaseClient.auth.updateUser({ password: form.newPassword });
      if (updateError) throw updateError;

      setSuccess('Senha redefinida com sucesso. Agora voce ja pode entrar.');
    } catch (err) {
      setError(err.message || 'Nao foi possivel redefinir a senha.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-md p-7">
        <h1 className="text-2xl font-black tracking-tight">Definir nova senha</h1>
        <p className="mt-2 text-sm text-slate-500">Crie uma senha forte para concluir sua recuperacao.</p>

        {success ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}
        {error ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p> : null}

        <div className="mt-4 space-y-3">
          <PasswordField
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            onBlur={() => setTouched((prev) => ({ ...prev, newPassword: true }))}
            placeholder="Nova senha"
            className={getFieldClass({ hasError: touched.newPassword && !isStrongPassword(form.newPassword), isValid: touched.newPassword && isStrongPassword(form.newPassword) })}
          />

          <PasswordField
            value={form.confirmNewPassword}
            onChange={(e) => setForm({ ...form, confirmNewPassword: e.target.value })}
            onBlur={() => setTouched((prev) => ({ ...prev, confirmNewPassword: true }))}
            placeholder="Confirmar nova senha"
            className={getFieldClass({ hasError: touched.confirmNewPassword && !passwordsMatch, isValid: touched.confirmNewPassword && passwordsMatch })}
          />
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <ul className="space-y-1.5 text-sm text-slate-600">
            {passwordRules.map((rule) => (
              <li key={rule.key} className="flex items-center gap-2">
                {checks[rule.key] ? <Check size={14} className="text-emerald-600" /> : <X size={14} className="text-slate-400" />}
                {rule.label}
              </li>
            ))}
          </ul>
        </div>

        <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50" type="submit" disabled={loading || !isValid}>
          {loading ? 'Salvando...' : 'Redefinir senha'}
          <ArrowRight size={15} />
        </button>

        <p className="mt-4 text-center text-sm text-slate-600">
          <Link className="font-semibold text-blue-600" to="/login">Voltar ao login</Link>
        </p>
      </form>
    </div>
  );
}
