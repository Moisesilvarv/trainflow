import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { setApiToken } from '../api/client';
import { supabaseClient } from '../api/supabaseClient';
import { normalizePlanId } from '../constants/plans';
import { formatPersonName } from '../utils/personName';

const AuthContext = createContext(null);

function normalizeUser(user) {
  if (!user) return null;

  const trialDaysRemaining = Number(user.trialDaysRemaining ?? user.trial_days_remaining ?? 0);

  return {
    id: user.id,
    name: formatPersonName(user.name),
    email: user.email,
    avatarUrl: user.avatarUrl || user.avatar_url || '',
    role: user.role || 'coach',
    coachType: user.coachType || user.coach_type || 'personal_trainer',
    accountType: user.accountType || user.account_type || 'personal',
    emailVerified: user.emailVerified ?? user.email_verified ?? false,
    plan: normalizePlanId(user.plan),
    billingPlan: user.billingPlan || user.billing_plan || user.plan,
    planStatus: user.planStatus || user.plan_status || 'active',
    provider: user.provider || null,
    appAccess: user.appAccess ?? user.app_access ?? true,
    accessReason: user.accessReason || user.access_reason || '',
    paymentMethod: user.paymentMethod || user.payment_method || null,
    trialStartedAt: user.trialStartedAt || user.trial_started_at || null,
    trialEndsAt: user.trialEndsAt || user.trial_ends_at || null,
    currentPeriodEnd: user.currentPeriodEnd || user.current_period_end || null,
    expiresAt: user.expiresAt || user.expires_at || null,
    trialDaysRemaining,
    aiUsageThisMonth: Number(user.aiUsageThisMonth || user.ai_usage_this_month || 0),
    studentLimit: user.studentLimit ?? user.student_limit ?? null,
    premiumFeaturesEnabled: Array.isArray(user.premiumFeaturesEnabled) ? user.premiumFeaturesEnabled : []
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearInvalidSession = useCallback(async () => {
    setApiToken('');
    setUser(null);
    await supabaseClient.auth.signOut().catch(() => {});
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    setUser(normalizeUser(data));
    return data;
  }, []);

  useEffect(() => {
    refreshUser()
      .catch(async () => {
        await clearInvalidSession();
      })
      .finally(() => setLoading(false));
  }, [clearInvalidSession, refreshUser]);

  const persistSessionFromAuthResponse = useCallback(async (data) => {
    const accessToken = data?.accessToken || data?.token || '';
    const refreshToken = data?.refreshToken || '';

    if (accessToken && refreshToken) {
      await supabaseClient.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
    }

    setApiToken(accessToken);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    await persistSessionFromAuthResponse(data);
    setUser(normalizeUser(data.user));
  }, [persistSessionFromAuthResponse]);

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    await persistSessionFromAuthResponse(data);
    setUser(normalizeUser(data.user));
    return data;
  }, [persistSessionFromAuthResponse]);

  async function startCheckout(planOrPayload) {
    const payload = typeof planOrPayload === 'string'
      ? { plan: planOrPayload }
      : planOrPayload;
    const { data } = await api.post('/billing/checkout', payload);
    return data;
  }

  async function requestPasswordReset(email) {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  }

  const verifyEmail = useCallback(async (token) => {
    const { data } = await api.get('/auth/verify-email', {
      params: { token }
    });
    await refreshUser().catch(() => {});
    return data;
  }, [refreshUser]);

  async function resendVerificationEmail() {
    const { data } = await api.post('/auth/resend-verification');
    return data;
  }

  async function changePassword(payload) {
    const { data } = await api.post('/auth/change-password', payload);
    return data;
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // Mantem o cleanup local mesmo se a API ja estiver sem sessao.
    }
    setApiToken('');
    setUser(null);
    await supabaseClient.auth.signOut().catch(() => {});
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      startCheckout,
      logout,
      refreshUser,
      requestPasswordReset,
      resendVerificationEmail,
      verifyEmail,
      changePassword,
      isAuthenticated: Boolean(user)
    }),
    [user, loading, login, register, refreshUser, verifyEmail]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return context;
}
