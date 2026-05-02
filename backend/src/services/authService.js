import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { DEFAULT_PLAN, normalizePlanId, parsePlanId } from '../constants/plans.js';
import { getUserPlanProfile } from './planService.js';
import { sendEmailVerification } from './emailVerificationService.js';
import { supabase, supabaseAuth } from './supabase.js';
import {
  TRIAL_DURATION_DAYS,
  TRIAL_IP_WINDOW_HOURS,
  normalizeEmailForTrial,
  normalizeFingerprint,
  resolveTrialAccessDecision
} from './trialProtection.js';
import { signToken } from '../utils/jwt.js';
import { isStrongPassword, isValidEmail } from '../utils/validation.js';
import { formatPersonName } from '../utils/personName.js';

const EMAIL_VERIFICATION_TTL_MS = 30 * 60 * 1000;
let emailVerificationColumnsAvailable = true;
let emailVerificationTableAvailable = true;

function mapAccountTypeToCoachType(accountType) {
  return accountType === 'academy' ? 'sports_school' : 'personal_trainer';
}

function mapCoachTypeToAccountType(coachType) {
  return coachType === 'sports_school' ? 'academy' : 'personal';
}

function inferNameFromEmail(email = '') {
  const prefix = String(email || '').split('@')[0] || 'Usuario';
  return prefix
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Usuario';
}

function buildEmailVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashEmailVerificationToken(token) {
  return crypto.createHash('sha256').update(String(token || ''), 'utf8').digest('hex');
}

function safelyMatchesTokenHash(token, tokenHash) {
  const receivedHash = hashEmailVerificationToken(token);
  const expected = Buffer.from(String(tokenHash || ''), 'hex');
  const received = Buffer.from(receivedHash, 'hex');
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

function buildEmailVerificationExpiry(baseDate = new Date()) {
  return new Date(baseDate.getTime() + EMAIL_VERIFICATION_TTL_MS).toISOString();
}

function isMissingColumnError(error, columnName) {
  const message = String(error?.message || '').toLowerCase();
  const normalizedColumn = String(columnName || '').toLowerCase();
  return (
    message.includes(`column "${normalizedColumn}"`) && message.includes('does not exist')
  ) || message.includes(`could not find the '${normalizedColumn}' column`);
}

function stripUnsupportedTrialColumns(payload = {}, error) {
  const next = { ...payload };
  if (isMissingColumnError(error, 'trial_started_at')) delete next.trial_started_at;
  if (isMissingColumnError(error, 'trial_ends_at')) delete next.trial_ends_at;
  if (isMissingColumnError(error, 'provider')) delete next.provider;
  if (isMissingColumnError(error, 'updated_at')) delete next.updated_at;
  if (isMissingColumnError(error, 'plan_status')) delete next.plan_status;
  if (isMissingColumnError(error, 'payment_method')) delete next.payment_method;
  if (isMissingColumnError(error, 'expires_at')) delete next.expires_at;
  if (isMissingColumnError(error, 'subscription_status')) delete next.subscription_status;
  if (isMissingColumnError(error, 'external_checkout_session_id')) delete next.external_checkout_session_id;
  if (isMissingColumnError(error, 'email_verified')) delete next.email_verified;
  if (isMissingColumnError(error, 'email_verification_token')) delete next.email_verification_token;
  if (isMissingColumnError(error, 'email_verification_expires_at')) delete next.email_verification_expires_at;
  return next;
}

function isEmailVerificationColumnError(error) {
  return ['email_verified', 'email_verification_token', 'email_verification_expires_at']
    .some((column) => isMissingColumnError(error, column));
}

function disableEmailVerificationColumnsIfMissing(error) {
  if (isEmailVerificationColumnError(error)) {
    emailVerificationColumnsAvailable = false;
    return true;
  }

  return false;
}

function isEmailVerificationTableError(error) {
  const message = String(error?.message || '').toLowerCase();
  return message.includes('email_verifications') && (
    message.includes('does not exist') ||
    message.includes('could not find') ||
    message.includes('schema cache')
  );
}

function disableEmailVerificationTableIfMissing(error) {
  if (isEmailVerificationTableError(error)) {
    emailVerificationTableAvailable = false;
    return true;
  }

  return false;
}

async function upsertSubscriptionAccess(payload) {
  let nextPayload = { ...payload };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await supabase
      .from('subscriptions')
      .upsert(nextPayload, { onConflict: 'user_id,provider' });

    if (!result.error) return;

    const strippedPayload = stripUnsupportedTrialColumns(nextPayload, result.error);
    const changed = Object.keys(strippedPayload).length !== Object.keys(nextPayload).length;

    if (!changed) throw result.error;
    nextPayload = strippedPayload;
  }
}

async function updateAccessProfile(table, userId, payload) {
  let nextPayload = { ...payload };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await supabase.from(table).update(nextPayload).eq('id', userId);

    if (!result.error) return;

    const strippedPayload = stripUnsupportedTrialColumns(nextPayload, result.error);
    const changed = Object.keys(strippedPayload).length !== Object.keys(nextPayload).length;

    if (!changed) throw result.error;
    nextPayload = strippedPayload;
  }
}

async function upsertProfileRecord(table, payload, options = {}) {
  let nextPayload = { ...payload };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await supabase.from(table).upsert(nextPayload, options);
    if (!result.error) return;

    const strippedPayload = stripUnsupportedTrialColumns(nextPayload, result.error);
    const changed = Object.keys(strippedPayload).length !== Object.keys(nextPayload).length;

    if (!changed) throw result.error;
    nextPayload = strippedPayload;
  }
}

async function ensureDashboardStats(userId) {
  const { error: statsError } = await supabase.from('dashboard_stats').upsert({
    user_id: userId,
    active_students: 0,
    workouts_created: 0,
    monthly_revenue: 0,
    scheduled_classes: 0,
    updated_at: new Date().toISOString()
  });

  if (statsError) throw statsError;
}

async function loadProfilePair({ userId, email }) {
  const normalizedEmail = email ? String(email).trim().toLowerCase() : '';
  const [userByIdRes, coachByIdRes, userByEmailRes, coachByEmailRes] = await Promise.all([
    userId ? supabase.from('users').select('*').eq('id', userId).maybeSingle() : Promise.resolve({ data: null }),
    userId ? supabase.from('coaches').select('*').eq('id', userId).maybeSingle() : Promise.resolve({ data: null }),
    normalizedEmail ? supabase.from('users').select('*').eq('email', normalizedEmail).maybeSingle() : Promise.resolve({ data: null }),
    normalizedEmail ? supabase.from('coaches').select('*').eq('email', normalizedEmail).maybeSingle() : Promise.resolve({ data: null })
  ]);

  return {
    userProfile: userByIdRes.data || userByEmailRes.data || null,
    coachProfile: coachByIdRes.data || coachByEmailRes.data || null
  };
}

function buildUserProfilePayload({
  userId,
  authUser,
  userProfile,
  coachProfile,
  name,
  email,
  accountType
}) {
  const now = new Date().toISOString();
  const resolvedAccountType = accountType
    || userProfile?.account_type
    || mapCoachTypeToAccountType(coachProfile?.coach_type)
    || (authUser?.user_metadata?.accountType === 'academy' ? 'academy' : 'personal');

  return {
    id: userId,
    name: formatPersonName(name || userProfile?.name || coachProfile?.name || authUser?.user_metadata?.name || inferNameFromEmail(email)),
    email,
    account_type: resolvedAccountType,
    plan: normalizePlanId(userProfile?.plan || coachProfile?.plan || DEFAULT_PLAN),
    plan_status: userProfile?.plan_status || coachProfile?.plan_status || 'active',
    avatar_url: userProfile?.avatar_url || null,
    email_verified: Boolean(userProfile?.email_verified || coachProfile?.email_verified),
    email_verification_token: userProfile?.email_verification_token || coachProfile?.email_verification_token || null,
    email_verification_expires_at: userProfile?.email_verification_expires_at || coachProfile?.email_verification_expires_at || null,
    created_at: userProfile?.created_at || coachProfile?.created_at || now,
    trial_started_at: userProfile?.trial_started_at || coachProfile?.trial_started_at || null,
    trial_ends_at: userProfile?.trial_ends_at || coachProfile?.trial_ends_at || null,
    provider: userProfile?.provider || coachProfile?.provider || null,
    updated_at: now
  };
}

function buildCoachProfilePayload({
  userId,
  authUser,
  userProfile,
  coachProfile,
  name,
  email,
  coachType,
  accountType
}) {
  const now = new Date().toISOString();
  const resolvedAccountType = accountType
    || userProfile?.account_type
    || (authUser?.user_metadata?.accountType === 'academy' ? 'academy' : 'personal');
  const resolvedCoachType = coachType
    || coachProfile?.coach_type
    || userProfile?.coach_type
    || mapAccountTypeToCoachType(resolvedAccountType);

  return {
    id: userId,
    name: formatPersonName(name || coachProfile?.name || userProfile?.name || authUser?.user_metadata?.name || inferNameFromEmail(email)),
    email,
    coach_type: resolvedCoachType,
    role: coachProfile?.role || 'coach',
    email_verified: Boolean(coachProfile?.email_verified || userProfile?.email_verified),
    email_verification_token: coachProfile?.email_verification_token || userProfile?.email_verification_token || null,
    email_verification_expires_at: coachProfile?.email_verification_expires_at || userProfile?.email_verification_expires_at || null,
    plan: normalizePlanId(coachProfile?.plan || userProfile?.plan || DEFAULT_PLAN),
    plan_status: coachProfile?.plan_status || userProfile?.plan_status || 'active',
    created_at: coachProfile?.created_at || userProfile?.created_at || now,
    trial_started_at: coachProfile?.trial_started_at || userProfile?.trial_started_at || null,
    trial_ends_at: coachProfile?.trial_ends_at || userProfile?.trial_ends_at || null,
    provider: coachProfile?.provider || userProfile?.provider || null,
    updated_at: now
  };
}

async function ensureProfilePair({ userId, email, authUser = null, name = '', accountType = '', coachType = '' }) {
  const normalizedEmail = String(email || authUser?.email || '').trim().toLowerCase();
  if (!userId || !normalizedEmail) return null;

  const { userProfile, coachProfile } = await loadProfilePair({ userId, email: normalizedEmail });
  if (!userProfile?.id && !coachProfile?.id && !authUser?.id) return null;

  const nextUserPayload = buildUserProfilePayload({
    userId,
    authUser,
    userProfile,
    coachProfile,
    name,
    email: normalizedEmail,
    accountType
  });

  const nextCoachPayload = buildCoachProfilePayload({
    userId,
    authUser,
    userProfile,
    coachProfile,
    name,
    email: normalizedEmail,
    coachType,
    accountType: nextUserPayload.account_type
  });

  await upsertProfileRecord('users', nextUserPayload, { onConflict: 'id' });
  await upsertProfileRecord('coaches', nextCoachPayload, { onConflict: 'id' });
  await ensureDashboardStats(userId);

  return {
    userProfile: nextUserPayload,
    coachProfile: nextCoachPayload
  };
}

async function findAuthUserByEmail(email) {
  const targetEmail = String(email || '').trim().toLowerCase();
  if (!targetEmail) return null;

  let page = 1;
  const perPage = 200;

  for (; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users || [];
    const match = users.find((user) => String(user?.email || '').trim().toLowerCase() === targetEmail);
    if (match) return match;
    if (users.length < perPage) break;
  }

  return null;
}

async function deleteAuthUserIfExists(userId) {
  if (!userId) return;
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) throw error;
}

async function hasAppProfileForEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const [{ data: userProfile }, { data: coachProfile }] = await Promise.all([
    supabase.from('users').select('id').eq('email', normalizedEmail).maybeSingle(),
    supabase.from('coaches').select('id').eq('email', normalizedEmail).maybeSingle()
  ]);

  return Boolean(userProfile?.id || coachProfile?.id);
}

async function getAppProfilesByEmail(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const [{ data: userProfile }, { data: coachProfile }] = await Promise.all([
    supabase.from('users').select('id, email').eq('email', normalizedEmail).maybeSingle(),
    supabase.from('coaches').select('id, email').eq('email', normalizedEmail).maybeSingle()
  ]);

  return {
    userProfile: userProfile || null,
    coachProfile: coachProfile || null
  };
}

async function findTrialClaimByEmail(emailNormalized) {
  if (!emailNormalized) return null;

  const { data, error } = await supabase
    .from('trial_claims')
    .select('id, email_normalized, user_id, trial_started_at, trial_ends_at, created_at')
    .eq('email_normalized', emailNormalized)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function findTrialClaimByFingerprint(fingerprint) {
  if (!fingerprint) return null;

  const { data, error } = await supabase
    .from('trial_claims')
    .select('id, fingerprint, user_id, trial_started_at, trial_ends_at, created_at')
    .eq('fingerprint', fingerprint)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function countRecentTrialClaimsByIp(ipAddress) {
  const normalizedIp = String(ipAddress || '').trim();
  if (!normalizedIp) return 0;

  const windowStart = new Date(Date.now() - (TRIAL_IP_WINDOW_HOURS * 60 * 60 * 1000)).toISOString();
  const { count, error } = await supabase
    .from('trial_claims')
    .select('id', { count: 'exact', head: true })
    .eq('ip_address', normalizedIp)
    .gte('created_at', windowStart);

  if (error) throw error;
  return Number(count || 0);
}

async function createTrialClaim({
  userId,
  emailNormalized,
  ipAddress,
  userAgent,
  fingerprint,
  trialStartedAt,
  trialEndsAt
}) {
  const { error } = await supabase.from('trial_claims').insert({
    user_id: userId,
    email_normalized: emailNormalized,
    ip_address: String(ipAddress || '').trim() || null,
    user_agent: String(userAgent || '').trim() || null,
    fingerprint: normalizeFingerprint(fingerprint),
    trial_started_at: trialStartedAt,
    trial_ends_at: trialEndsAt
  });

  if (error) throw error;
}

async function deleteAppProfilesByIds({ userId, coachId }) {
  if (userId) {
    await supabase.from('dashboard_stats').delete().eq('user_id', userId);
    await supabase.from('users').delete().eq('id', userId);
  }

  if (coachId) {
    await supabase.from('coaches').delete().eq('id', coachId);
    await supabase.from('subscriptions').delete().eq('user_id', coachId);
    await supabase.from('billing_customers').delete().eq('user_id', coachId);
    await supabase.from('billing_checkout_sessions').delete().eq('user_id', coachId);
  }
}

async function updateEmailVerificationState(userId, payload) {
  if (!emailVerificationColumnsAvailable) return;

  await Promise.all([
    updateAccessProfile('users', userId, payload),
    updateAccessProfile('coaches', userId, payload)
  ]);
}

async function generateAndStoreEmailVerification(userId) {
  if (!emailVerificationColumnsAvailable || !emailVerificationTableAvailable) {
    return { token: null, expiresAt: null, skipped: true };
  }

  const token = buildEmailVerificationToken();
  const tokenHash = hashEmailVerificationToken(token);
  const expiresAt = buildEmailVerificationExpiry();

  try {
    await supabase
      .from('email_verifications')
      .update({
        confirmed_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .is('confirmed_at', null);

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) throw profileError;

    const { error: insertError } = await supabase.from('email_verifications').insert({
      user_id: userId,
      email: profile?.email || '',
      token_hash: tokenHash,
      expires_at: expiresAt
    });

    if (insertError) throw insertError;

    await updateEmailVerificationState(userId, {
      email_verified: false,
      email_verification_token: null,
      email_verification_expires_at: expiresAt,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    if (disableEmailVerificationTableIfMissing(error)) {
      return { token: null, expiresAt: null, skipped: true };
    }
    if (disableEmailVerificationColumnsIfMissing(error)) {
      return { token: null, expiresAt: null, skipped: true };
    }
    throw error;
  }

  return { token, expiresAt };
}

function buildEmailVerificationUrl(token) {
  return `${env.frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;
}

async function sendEmailVerificationForUser({ email, token }) {
  if (!token) return { emailSent: false };

  try {
    await sendEmailVerification({
      to: email,
      verificationUrl: buildEmailVerificationUrl(token)
    });
    return { emailSent: true };
  } catch (error) {
    console.error('Falha ao enviar email de verificacao:', error);
    return {
      emailSent: false,
      message: 'Conta criada, mas nao foi possivel enviar o email de verificacao agora. Tente reenviar em alguns minutos.'
    };
  }
}

async function findVerificationByToken(token) {
  if (!emailVerificationTableAvailable) return null;

  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) return null;
  const tokenHash = hashEmailVerificationToken(normalizedToken);

  const { data, error } = await supabase
    .from('email_verifications')
    .select('id, user_id, email, token_hash, expires_at, confirmed_at, created_at')
    .eq('token_hash', tokenHash)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (disableEmailVerificationTableIfMissing(error)) return null;
    throw error;
  }

  if (!data?.id || !safelyMatchesTokenHash(normalizedToken, data.token_hash)) return null;
  return data;
}

async function findLegacyUserByVerificationToken(token) {
  if (!emailVerificationColumnsAvailable) return null;

  const normalizedToken = String(token || '').trim();
  if (!normalizedToken) return null;

  const { data, error } = await supabase
    .from('users')
    .select('id, email, email_verified, email_verification_token, email_verification_expires_at')
    .eq('email_verification_token', normalizedToken)
    .maybeSingle();

  if (error) {
    if (disableEmailVerificationColumnsIfMissing(error)) return null;
    throw error;
  }

  return data || null;
}

function hasProfileLinkedToAuthUser(existingAppProfiles, authUserId) {
  if (!authUserId) return false;
  return [existingAppProfiles?.userProfile?.id, existingAppProfiles?.coachProfile?.id].some((id) => id === authUserId);
}

async function createAuthUserOrRecycleOrphan({ email, password, safeName, coachType, accountType }) {
  const payload = {
    email,
    password,
    email_confirm: true,
    user_metadata: { name: safeName, coachType, accountType }
  };

  let result = await supabase.auth.admin.createUser(payload);

  if (!result.error || !String(result.error?.message || '').toLowerCase().includes('already')) {
    return result;
  }

  const existingAuthUser = await findAuthUserByEmail(email);
  const hasProfiles = await hasAppProfileForEmail(email);

  if (existingAuthUser?.id && !hasProfiles) {
    await deleteAuthUserIfExists(existingAuthUser.id);
    result = await supabase.auth.admin.createUser(payload);
  }

  return result;
}

async function _ensureProfilesFromAuthUser(authUser) {
  if (!authUser?.id || !authUser?.email) return null;

  const accountType = authUser.user_metadata?.accountType === 'academy' ? 'academy' : 'personal';
  const coachType = authUser.user_metadata?.coachType || mapAccountTypeToCoachType(accountType);
  const name = formatPersonName(authUser.user_metadata?.name || inferNameFromEmail(authUser.email));

  await ensureProfilePair({
    userId: authUser.id,
    email: String(authUser.email).trim().toLowerCase(),
    authUser,
    name,
    accountType,
    coachType
  });

  return {
    id: authUser.id,
    name,
    email: String(authUser.email).trim().toLowerCase(),
    accountType,
    coachType
  };
}

async function createInitialProfileData({ userId, name, email, accountType, coachType, planId, planStatus = 'inactive', provider = 'stripe' }) {
  const createdAt = new Date().toISOString();

  const userPayload = {
    id: userId,
    name,
    email,
    account_type: accountType,
    created_at: createdAt,
    email_verified: false,
    email_verification_token: null,
    email_verification_expires_at: null,
    plan: planId,
    plan_status: planStatus,
    provider,
    avatar_url: null
  };

  const coachPayload = {
    id: userId,
    name,
    email,
    coach_type: coachType,
    email_verified: false,
    email_verification_token: null,
    email_verification_expires_at: null,
    plan: planId,
    plan_status: planStatus,
    provider,
    role: 'coach',
    created_at: createdAt
  };

  await upsertProfileRecord('users', userPayload, { onConflict: 'id' });
  await upsertProfileRecord('coaches', coachPayload, { onConflict: 'id' });

  await ensureDashboardStats(userId);
}

async function createPendingTrialAccess({ userId, trialPlanId = 'pro' }) {
  const now = new Date().toISOString();

  const subscriptionPayload = {
    user_id: userId,
    plan: trialPlanId,
    status: 'pending_email',
    subscription_status: 'pending_email',
    provider: 'system',
    trial_started_at: null,
    trial_ends_at: null,
    expires_at: null,
    created_at: now,
    updated_at: now,
    started_at: now
  };

  const accessPayload = {
    plan: trialPlanId,
    plan_status: 'pending_email',
    trial_started_at: null,
    trial_ends_at: null,
    provider: 'system',
    updated_at: now
  };

  await upsertSubscriptionAccess(subscriptionPayload);
  await updateAccessProfile('users', userId, accessPayload);
  await updateAccessProfile('coaches', userId, accessPayload);
}

async function activateTrialAccess({ userId, trialPlanId = 'pro' }) {
  const now = new Date();
  const trialStartedAt = now.toISOString();
  const trialEndsAt = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const subscriptionPayload = {
    user_id: userId,
    plan: trialPlanId,
    status: 'trialing',
    subscription_status: 'trialing',
    provider: 'system',
    trial_started_at: trialStartedAt,
    trial_ends_at: trialEndsAt,
    expires_at: trialEndsAt,
    created_at: trialStartedAt,
    updated_at: trialStartedAt,
    started_at: trialStartedAt
  };

  const accessPayload = {
    plan: trialPlanId,
    plan_status: 'trialing',
    trial_started_at: trialStartedAt,
    trial_ends_at: trialEndsAt,
    provider: 'system',
    updated_at: trialStartedAt
  };

  await upsertSubscriptionAccess(subscriptionPayload);
  await updateAccessProfile('users', userId, accessPayload);
  await updateAccessProfile('coaches', userId, accessPayload);

  return {
    trialStartedAt,
    trialEndsAt
  };
}

function shouldActivateTrialAfterEmailConfirmation(planProfile) {
  if (!planProfile) return false;
  const plan = normalizePlanId(planProfile.billingPlan || planProfile.plan);
  const status = String(planProfile.planStatus || '').trim().toLowerCase();
  return plan === 'pro'
    && ['pending_email', 'expired', 'inactive'].includes(status)
    && !planProfile.trialStartedAt
    && !planProfile.trialEndsAt;
}

async function activateTrialAfterEmailConfirmation({ userId, email }) {
  const planProfile = await getUserPlanProfile(userId);
  let trialStartedAt = planProfile.trialStartedAt;
  let trialEndsAt = planProfile.trialEndsAt;

  if (!shouldActivateTrialAfterEmailConfirmation(planProfile)) {
    return {
      activated: false,
      trialStartedAt,
      trialEndsAt
    };
  }

  const activated = await activateTrialAccess({
    userId,
    trialPlanId: 'pro'
  });
  trialStartedAt = activated.trialStartedAt;
  trialEndsAt = activated.trialEndsAt;

  await createTrialClaim({
    userId,
    emailNormalized: normalizeEmailForTrial(email),
    ipAddress: '',
    userAgent: '',
    fingerprint: '',
    trialStartedAt,
    trialEndsAt
  }).catch((error) => {
    console.error('Falha ao registrar trial claim apos verificacao:', error);
  });

  return {
    activated: true,
    trialStartedAt,
    trialEndsAt
  };
}

function buildUserResponse({ userId, name, email, role, coachType, accountType, planProfile }) {
  return {
    id: userId,
    name,
    email,
    role,
    coachType,
    accountType,
    emailVerified: emailVerificationColumnsAvailable ? Boolean(planProfile.profile?.email_verified) : true,
    plan: planProfile.plan,
    billingPlan: planProfile.billingPlan,
    planStatus: planProfile.planStatus,
    provider: planProfile.provider,
    appAccess: planProfile.appAccess,
    accessReason: planProfile.accessReason,
    paymentMethod: planProfile.paymentMethod,
    trialStartedAt: planProfile.trialStartedAt,
    trialEndsAt: planProfile.trialEndsAt,
    trialDaysRemaining: planProfile.trialDaysRemaining,
    currentPeriodEnd: planProfile.currentPeriodEnd,
    expiresAt: planProfile.expiresAt,
    aiUsageThisMonth: planProfile.aiUsageThisMonth,
    studentLimit: planProfile.studentLimit,
    premiumFeaturesEnabled: planProfile.premiumFeaturesEnabled
  };
}

export async function registerUser(
  { name, email, password, confirmPassword, accountType, plan, trialRequested = false, fingerprint },
  { ipAddress = '', userAgent = '' } = {}
) {
  const normalizedEmail = normalizeEmailForTrial(email);
  const normalizedFingerprint = normalizeFingerprint(fingerprint);
  const safeName = formatPersonName(name || '');
  const normalizedAccountType = accountType === 'academy' ? 'academy' : 'personal';
  const parsedPlan = parsePlanId(plan);
  const hasExplicitPlan = typeof plan === 'string' && plan.trim().length > 0;
  const requestedPlan = parsedPlan || DEFAULT_PLAN;

  if (!safeName || !normalizedEmail || !password || !confirmPassword) {
    throw Object.assign(new Error('Preencha todos os campos obrigatorios.'), { status: 400 });
  }

  if (!isValidEmail(normalizedEmail)) {
    throw Object.assign(new Error('Informe um email valido.'), { status: 400 });
  }

  if (password !== confirmPassword) {
    throw Object.assign(new Error('As senhas nao coincidem.'), { status: 400 });
  }

  if (!isStrongPassword(password)) {
    throw Object.assign(new Error('A senha nao atende aos requisitos de seguranca.'), { status: 400 });
  }

  if (hasExplicitPlan && !parsedPlan) {
    throw Object.assign(new Error('Plano invalido informado no cadastro.'), { status: 400 });
  }

  const [existingEmailClaim, existingFingerprintClaim, recentIpClaimCount] = await Promise.all([
    trialRequested ? findTrialClaimByEmail(normalizedEmail) : Promise.resolve(null),
    trialRequested ? findTrialClaimByFingerprint(normalizedFingerprint) : Promise.resolve(null),
    trialRequested ? countRecentTrialClaimsByIp(ipAddress) : Promise.resolve(0)
  ]);

  const trialDecision = resolveTrialAccessDecision({
    trialRequested,
    existingEmailClaim: Boolean(existingEmailClaim),
    existingFingerprintClaim: Boolean(existingFingerprintClaim),
    recentIpClaimCount
  });

  const selectedPlan = trialRequested ? 'pro' : requestedPlan;
  const selectedPlanStatus = trialRequested ? 'pending_email' : 'inactive';

  const existingAppProfiles = await getAppProfilesByEmail(normalizedEmail);
  const hasExistingAppProfile = Boolean(existingAppProfiles.userProfile?.id || existingAppProfiles.coachProfile?.id);
  if (hasExistingAppProfile) {
    const authUser = await findAuthUserByEmail(normalizedEmail);
    if (!authUser?.id) {
      await deleteAppProfilesByIds({
        userId: existingAppProfiles.userProfile?.id || existingAppProfiles.coachProfile?.id || null,
        coachId: existingAppProfiles.coachProfile?.id || existingAppProfiles.userProfile?.id || null
      });
    } else if (!hasProfileLinkedToAuthUser(existingAppProfiles, authUser.id)) {
      await deleteAppProfilesByIds({
        userId: existingAppProfiles.userProfile?.id || null,
        coachId: existingAppProfiles.coachProfile?.id || null
      });
      await deleteAuthUserIfExists(authUser.id);
    } else {
      await ensureProfilePair({
        userId: authUser.id,
        email: normalizedEmail,
        authUser
      });
      throw Object.assign(new Error('Este email ja esta cadastrado.'), { status: 409 });
    }
  }

  const hasProfileAfterCleanup = await hasAppProfileForEmail(normalizedEmail);
  if (hasProfileAfterCleanup) {
    throw Object.assign(new Error('Este email ja esta cadastrado.'), { status: 409 });
  }

  const orphanAuthUser = await findAuthUserByEmail(normalizedEmail);
  if (orphanAuthUser?.id) {
    await deleteAuthUserIfExists(orphanAuthUser.id);
  }

  const coachType = mapAccountTypeToCoachType(normalizedAccountType);

  const { data: createdAuth, error: createAuthError } = await createAuthUserOrRecycleOrphan({
    email: normalizedEmail,
    password,
    safeName,
    coachType,
    accountType: normalizedAccountType
  });

  if (createAuthError) {
    throw Object.assign(new Error(createAuthError.message || 'Nao foi possivel criar sua conta.'), { status: 400 });
  }

  const userId = createdAuth.user.id;
  let emailDelivery;

  try {
    await createInitialProfileData({
      userId,
      name: safeName,
      email: normalizedEmail,
      accountType: normalizedAccountType,
      coachType,
      planId: selectedPlan,
      planStatus: selectedPlanStatus,
      provider: trialRequested ? 'system' : 'stripe'
    });

    if (trialRequested) {
      await createPendingTrialAccess({
        userId,
        trialPlanId: 'pro'
      });
    }

    const verification = await generateAndStoreEmailVerification(userId);
    emailDelivery = await sendEmailVerificationForUser({
      email: normalizedEmail,
      token: verification.token
    });
  } catch (error) {
    await supabase.auth.admin.deleteUser(userId);
    throw error;
  }

  const token = signToken({
    id: userId,
    email: normalizedEmail,
    role: 'coach',
    coachType,
    accountType: normalizedAccountType
  });
  const { data: sessionData } = await supabaseAuth.auth.signInWithPassword({
    email: normalizedEmail,
    password
  });
  const accessToken = sessionData?.session?.access_token || token;
  const refreshToken = sessionData?.session?.refresh_token || '';
  const planProfile = await getUserPlanProfile(userId);

  return {
    ...(emailDelivery?.message ? { message: emailDelivery.message } : {}),
    token: accessToken,
    accessToken,
    refreshToken,
    nextAction: trialRequested ? 'dashboard' : 'plan_checkout',
    emailVerificationRequired: emailVerificationColumnsAvailable,
    trialGranted: Boolean(trialRequested && trialDecision.grantTrial),
    trialBlockedReason: trialRequested ? trialDecision.blockedReason : null,
    user: buildUserResponse({
      userId,
      name: safeName,
      email: normalizedEmail,
      role: 'coach',
      coachType,
      accountType: normalizedAccountType,
      planProfile
    })
  };
}

export async function loginUser({ email, password }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail || !password) {
    throw Object.assign(new Error('Email e senha sao obrigatorios.'), { status: 400 });
  }

  if (!isValidEmail(normalizedEmail)) {
    throw Object.assign(new Error('Informe um email valido.'), { status: 400 });
  }

  const { data: authData, error: loginError } = await supabaseAuth.auth.signInWithPassword({
    email: normalizedEmail,
    password
  });

  if (loginError || !authData?.user) {
    throw Object.assign(new Error('Email ou senha incorretos.'), { status: 401 });
  }

  const userId = authData.user.id;
  await ensureProfilePair({
    userId,
    email: normalizedEmail,
    authUser: authData.user
  });

  const { userProfile: profile, coachProfile } = await loadProfilePair({ userId, email: normalizedEmail });

  if (!profile?.id) {
    throw Object.assign(new Error('Nao foi possivel carregar o perfil.'), { status: 500 });
  }

  const role = coachProfile?.role || 'coach';
  const coachType = coachProfile?.coach_type || mapAccountTypeToCoachType(profile.account_type || 'personal');

  const token = signToken({
    id: userId,
    email: profile.email,
    role,
    coachType,
    accountType: profile.account_type || mapCoachTypeToAccountType(coachType)
  });
  const accessToken = authData.session?.access_token || token;
  const refreshToken = authData.session?.refresh_token || '';
  let planProfile = await getUserPlanProfile(userId);
  if (profile.email_verified && shouldActivateTrialAfterEmailConfirmation(planProfile)) {
    await activateTrialAfterEmailConfirmation({
      userId,
      email: profile.email
    });
    planProfile = await getUserPlanProfile(userId);
  }

  return {
    token: accessToken,
    accessToken,
    refreshToken,
    emailVerificationRequired: emailVerificationColumnsAvailable && !profile.email_verified,
    user: buildUserResponse({
      userId: profile.id,
      name: profile.name,
      email: profile.email,
      role,
      coachType,
      accountType: profile.account_type || mapCoachTypeToAccountType(coachType),
      planProfile
    })
  };
}

export async function getCurrentUser(userId) {
  const authUser = await supabase.auth.admin.getUserById(userId);
  await ensureProfilePair({
    userId,
    email: authUser?.data?.user?.email || '',
    authUser: authUser?.data?.user || null
  });

  const { userProfile: profile, coachProfile } = await loadProfilePair({
    userId,
    email: authUser?.data?.user?.email || ''
  });

  if (!profile?.id) {
    throw Object.assign(new Error('Nao foi possivel carregar os dados do usuario.'), { status: 500 });
  }
  let planProfile = await getUserPlanProfile(userId);
  if (profile.email_verified && shouldActivateTrialAfterEmailConfirmation(planProfile)) {
    await activateTrialAfterEmailConfirmation({
      userId,
      email: profile.email
    });
    planProfile = await getUserPlanProfile(userId);
  }

  return {
    ...profile,
    emailVerified: emailVerificationColumnsAvailable ? Boolean(profile.email_verified) : true,
    plan: planProfile.plan,
    billingPlan: planProfile.billingPlan,
    planStatus: planProfile.planStatus,
    provider: planProfile.provider,
    appAccess: planProfile.appAccess,
    accessReason: planProfile.accessReason,
    paymentMethod: planProfile.paymentMethod,
    trialStartedAt: planProfile.trialStartedAt,
    trialEndsAt: planProfile.trialEndsAt,
    trialDaysRemaining: planProfile.trialDaysRemaining,
    currentPeriodEnd: planProfile.currentPeriodEnd,
    expiresAt: planProfile.expiresAt,
    aiUsageThisMonth: planProfile.aiUsageThisMonth,
    studentLimit: planProfile.studentLimit,
    premiumFeaturesEnabled: planProfile.premiumFeaturesEnabled,
    role: coachProfile?.role || 'coach',
    coachType: coachProfile?.coach_type || mapAccountTypeToCoachType(profile.account_type || 'personal')
  };
}


export async function updateAuthenticatedUserPlan({ userId, plan }) {
  void userId;
  void plan;
  throw Object.assign(new Error('Alteracao direta de plano desativada. Use o fluxo de checkout.'), {
    status: 403
  });
}
export async function sendPasswordRecovery(email, requestOrigin) {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    throw Object.assign(new Error('Informe um email valido.'), { status: 400 });
  }

  const requestOriginUrl = String(requestOrigin || '').trim().replace(/\/+$/, '');
  const requestOriginAllowed = requestOriginUrl && env.appUrls.includes(requestOriginUrl);
  const localOriginAllowed =
    env.nodeEnv !== 'production' &&
    /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/i.test(requestOriginUrl);
  const redirectBase = requestOriginAllowed || localOriginAllowed ? requestOriginUrl : env.appUrl;

  const redirectTo = `${redirectBase}${env.passwordResetPath}`;

  const { error } = await supabaseAuth.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo
  });

  if (!error) {
    return { message: 'Se o email existir, o link de recuperacao sera enviado.' };
  }

  // Fallback util em desenvolvimento quando o provedor de email atrasa/bloqueia entrega.
  if (env.nodeEnv !== 'production') {
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: normalizedEmail,
      options: { redirectTo }
    });

    if (!linkError && linkData?.properties?.action_link) {
      return { message: 'Use o link de recuperacao abaixo para continuar.', recoveryUrl: linkData.properties.action_link };
    }
  }

  if (env.nodeEnv === 'production') {
    return { message: 'Se o email existir, o link de recuperacao sera enviado.' };
  }

  throw Object.assign(new Error(error.message || 'Nao foi possivel enviar o link de recuperacao.'), { status: 400 });
}

export async function verifyEmailAddress(token) {
  if (!emailVerificationColumnsAvailable || !emailVerificationTableAvailable) {
    throw Object.assign(new Error('Verificacao de email indisponivel ate aplicar a migration no banco.'), { status: 503 });
  }

  const verificationToken = String(token || '').trim();
  if (!verificationToken) {
    throw Object.assign(new Error('Token de verificacao ausente.'), { status: 400 });
  }

  const verification = await findVerificationByToken(verificationToken);
  const legacyUser = verification?.id ? null : await findLegacyUserByVerificationToken(verificationToken);
  if (!verification?.id && !legacyUser?.id) {
    throw Object.assign(new Error('Token de verificacao invalido.'), { status: 400 });
  }

  if (verification?.confirmed_at) {
    await activateTrialAfterEmailConfirmation({
      userId: verification.user_id,
      email: verification.email
    });

    return {
      message: 'Email ja confirmado com sucesso.',
      redirectTo: '/dashboard'
    };
  }

  const userId = verification?.user_id || legacyUser.id;
  const verificationEmail = verification?.email || legacyUser.email;
  const expirationDate = verification?.expires_at || legacyUser?.email_verification_expires_at
    ? new Date(verification?.expires_at || legacyUser?.email_verification_expires_at)
    : null;
  if (!expirationDate || Number.isNaN(expirationDate.getTime()) || expirationDate.getTime() <= Date.now()) {
    throw Object.assign(new Error('Token de verificacao expirado. Solicite um novo email.'), { status: 400 });
  }

  await updateEmailVerificationState(userId, {
    email_verified: true,
    email_verification_token: null,
    email_verification_expires_at: null,
    updated_at: new Date().toISOString()
  });

  const { data: profile } = await supabase
    .from('users')
    .select('email')
    .eq('id', userId)
    .maybeSingle();

  const trialActivation = await activateTrialAfterEmailConfirmation({
      userId,
      email: profile?.email || verificationEmail
  });

  if (verification?.id) {
    await supabase
      .from('email_verifications')
      .update({ confirmed_at: new Date().toISOString() })
      .eq('id', verification.id);
  }

  return {
    message: 'Email confirmado com sucesso.',
    redirectTo: '/dashboard',
    trialStartedAt: trialActivation.trialStartedAt,
    trialEndsAt: trialActivation.trialEndsAt
  };
}

export async function resendVerificationEmail(userId) {
  if (!emailVerificationColumnsAvailable) {
    return { message: 'Verificacao de email indisponivel neste ambiente ate aplicar a migration no banco.' };
  }

  const { data: profile, error } = await supabase
    .from('users')
    .select('id, email, email_verified')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    if (disableEmailVerificationColumnsIfMissing(error)) {
      return { message: 'Verificacao de email indisponivel neste ambiente ate aplicar a migration no banco.' };
    }
    throw error;
  }
  if (!profile?.id) {
    throw Object.assign(new Error('Usuario nao encontrado.'), { status: 404 });
  }

  if (profile.email_verified) {
    return { message: 'Seu email ja esta confirmado.' };
  }

  const verification = await generateAndStoreEmailVerification(userId);
  const emailDelivery = await sendEmailVerificationForUser({
    email: profile.email,
    token: verification.token
  });

  if (!emailDelivery.emailSent) {
    return {
      message: 'Nao foi possivel reenviar o email de verificacao agora. Tente novamente em alguns minutos.'
    };
  }

  return { message: 'Email de verificacao reenviado com sucesso.' };
}

export async function getEmailVerificationStatus(userId) {
  if (!emailVerificationColumnsAvailable) return true;

  const { data, error } = await supabase
    .from('users')
    .select('email_verified')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    if (disableEmailVerificationColumnsIfMissing(error)) return true;
    throw error;
  }
  return Boolean(data?.email_verified);
}

export async function changeAuthenticatedUserPassword({ userId, email, currentPassword, newPassword, confirmNewPassword }) {
  if (!currentPassword || !newPassword || !confirmNewPassword) {
    throw Object.assign(new Error('Preencha todos os campos de senha.'), { status: 400 });
  }

  if (newPassword !== confirmNewPassword) {
    throw Object.assign(new Error('A confirmacao de senha nao confere.'), { status: 400 });
  }

  if (!isStrongPassword(newPassword)) {
    throw Object.assign(new Error('A nova senha nao atende aos requisitos de seguranca.'), { status: 400 });
  }

  const { error: authError } = await supabaseAuth.auth.signInWithPassword({
    email,
    password: currentPassword
  });

  if (authError) {
    throw Object.assign(new Error('Senha atual incorreta.'), { status: 401 });
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
    password: newPassword
  });

  if (updateError) {
    throw Object.assign(new Error(updateError.message || 'Nao foi possivel atualizar a senha.'), { status: 400 });
  }
}

