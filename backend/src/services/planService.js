import {
  BASIC_FREE_PLAN_ID,
  PLAN_STATUS_IDS,
  TRIAL_PLAN_ID,
  getAiMonthlyLimitByPlan,
  getPremiumFeaturesEnabled,
  getStudentLimitByPlan,
  hasPlanFeature,
  normalizePlanId,
  normalizePlanStatus
} from '../constants/plans.js';
import { getAiUsageMessageCount } from './aiPersistenceService.js';
import { supabase } from './supabase.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function currentMonthKey(baseDate = new Date()) {
  const year = baseDate.getFullYear();
  const month = String(baseDate.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function toDateOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoOrNull(value) {
  const date = toDateOrNull(value);
  return date ? date.toISOString() : null;
}

function normalizeKnownStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'free') return 'free';
  return PLAN_STATUS_IDS.includes(normalized) ? normalized : null;
}

function normalizeProvider(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || null;
}

function normalizePaymentMethod(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || null;
}

function pickSubscriptionRecord(subscriptions = []) {
  if (!Array.isArray(subscriptions) || !subscriptions.length) return null;

  const activePaid = subscriptions.find((item) => item.provider === 'stripe' && item.status === 'active');
  if (activePaid) return activePaid;

  const validTrial = subscriptions.find((item) => item.status === 'trialing' && item.trial_ends_at);
  if (validTrial) return validTrial;

  const limitedFree = subscriptions.find((item) => item.plan === BASIC_FREE_PLAN_ID && ['free', 'limited', 'active'].includes(String(item.status || '').toLowerCase()));
  if (limitedFree) return limitedFree;

  const paidButProblematic = subscriptions.find((item) => item.provider === 'stripe');
  if (paidButProblematic) return paidButProblematic;

  return subscriptions[0];
}

export function resolvePlanAccessState({ userProfile, coachProfile, subscription, now = new Date() } = {}) {
  const baseProfile = userProfile || coachProfile || {};
  const source = subscription || baseProfile;

  const rawPlan = String(source?.plan || baseProfile?.plan || '').trim().toLowerCase();
  const rawStatus = normalizeKnownStatus(source?.subscription_status || source?.status || source?.plan_status || baseProfile?.plan_status);
  const trialStartedAt = toIsoOrNull(source?.trial_started_at || baseProfile?.trial_started_at);
  const trialEndsAt = toIsoOrNull(source?.trial_ends_at || baseProfile?.trial_ends_at);
  const provider = normalizeProvider(source?.provider || baseProfile?.provider);
  const paymentMethod = normalizePaymentMethod(source?.payment_method);
  const currentPeriodEnd = toIsoOrNull(source?.current_period_end);
  const expiresAt = toIsoOrNull(source?.expires_at || source?.current_period_end);

  const trialEndDate = toDateOrNull(trialEndsAt);
  const paidExpirationDate = toDateOrNull(expiresAt);
  const isLegacyFreeRecord = Boolean(subscription) && rawPlan === BASIC_FREE_PLAN_ID && ['free', 'limited', 'active'].includes(rawStatus);
  const isPendingEmailRecord = rawStatus === 'pending_email';
  const isLegacyTrialRecord = Boolean(subscription) && provider === 'system' && rawStatus === 'trialing' && trialEndDate;
  const isStripeTrialRecord = Boolean(subscription) && provider === 'stripe' && rawStatus === 'trialing' && rawPlan && rawPlan !== TRIAL_PLAN_ID;
  const isTrialRecord = isLegacyTrialRecord || isStripeTrialRecord;
  const hasValidTrial = isTrialRecord && rawStatus === 'trialing' && trialEndDate && trialEndDate.getTime() > now.getTime();
  const trialExpired = isTrialRecord && rawStatus === 'trialing' && trialEndDate && trialEndDate.getTime() <= now.getTime();
  const isPixAccessRecord = paymentMethod === 'pix';
  const hasActivePixAccess = Boolean(subscription)
    && rawStatus === 'active'
    && rawPlan
    && rawPlan !== TRIAL_PLAN_ID
    && isPixAccessRecord
    && paidExpirationDate
    && paidExpirationDate.getTime() > now.getTime();
  const pixAccessExpired = Boolean(subscription)
    && rawStatus === 'active'
    && rawPlan
    && rawPlan !== TRIAL_PLAN_ID
    && isPixAccessRecord
    && paidExpirationDate
    && paidExpirationDate.getTime() <= now.getTime();
  const hasActivePaidSubscription = Boolean(subscription)
    && rawStatus === 'active'
    && rawPlan
    && rawPlan !== TRIAL_PLAN_ID
    && (!isPixAccessRecord || hasActivePixAccess);
  const hasPaidSubscriptionRecord = Boolean(subscription) && rawPlan && rawPlan !== TRIAL_PLAN_ID;
  const hasProfileAccessStatus = ['active', 'trialing'].includes(rawStatus);
  const hasProfileAccessPlan = ['basic', 'pro', 'premium', BASIC_FREE_PLAN_ID].includes(normalizePlanId(baseProfile?.plan || rawPlan));

  let effectivePlan;
  let effectiveStatus;
  let appAccess;
  let accessReason;

  if (isPendingEmailRecord) {
    effectivePlan = normalizePlanId(rawPlan || 'pro');
    effectiveStatus = 'pending_email';
    appAccess = false;
    accessReason = 'email_pending';
  } else if (hasActivePaidSubscription) {
    effectivePlan = normalizePlanId(rawPlan);
    effectiveStatus = 'active';
    appAccess = true;
    accessReason = isPixAccessRecord ? 'pix_active' : 'active_subscription';
  } else if (isLegacyFreeRecord) {
    effectivePlan = BASIC_FREE_PLAN_ID;
    effectiveStatus = 'active';
    appAccess = true;
    accessReason = 'basic_free';
  } else if (hasValidTrial) {
    effectivePlan = normalizePlanId(rawPlan || 'pro');
    effectiveStatus = 'trialing';
    appAccess = true;
    accessReason = 'trial_active';
  } else if (trialExpired || pixAccessExpired) {
    effectivePlan = normalizePlanId(rawPlan || 'pro');
    if (pixAccessExpired) {
      effectivePlan = normalizePlanId(rawPlan);
    }
    effectiveStatus = 'expired';
    appAccess = false;
    accessReason = pixAccessExpired ? 'pix_expired' : 'trial_expired';
  } else if (hasPaidSubscriptionRecord) {
    effectivePlan = normalizePlanId(rawPlan);
    effectiveStatus = normalizePlanStatus(rawStatus || 'inactive');
    appAccess = ['active', 'trialing'].includes(effectiveStatus);
    if (appAccess) {
      accessReason = effectiveStatus === 'trialing' ? 'trial_active' : 'active_subscription';
    } else if (effectiveStatus === 'past_due') {
      accessReason = 'payment_issue';
    } else if (effectiveStatus === 'incomplete') {
      accessReason = 'subscription_incomplete';
    } else {
      accessReason = 'inactive';
    }
  } else {
    effectivePlan = normalizePlanId(baseProfile?.plan || rawPlan);
    effectiveStatus = normalizePlanStatus(baseProfile?.plan_status || rawStatus || 'inactive');
    appAccess = hasProfileAccessStatus && hasProfileAccessPlan;
    if (appAccess) {
      accessReason = effectiveStatus === 'trialing' ? 'trial_active' : 'active_profile';
    } else if (effectiveStatus === 'past_due') {
      accessReason = 'payment_issue';
    } else if (effectiveStatus === 'incomplete') {
      accessReason = 'subscription_incomplete';
    } else if (baseProfile?.provider && normalizeProvider(baseProfile.provider) !== 'system') {
      accessReason = 'missing_subscription';
    } else {
      accessReason = 'inactive';
    }
  }

  const trialDaysRemaining = hasValidTrial && trialEndDate
    ? Math.max(1, Math.ceil((trialEndDate.getTime() - now.getTime()) / MS_PER_DAY))
    : 0;

  return {
    plan: effectivePlan,
    billingPlan: rawPlan || effectivePlan,
    planStatus: effectiveStatus,
    provider,
    appAccess,
    accessReason,
    paymentMethod,
    trialStartedAt,
    trialEndsAt,
    trialDaysRemaining,
    currentPeriodEnd,
    expiresAt
  };
}

export async function getUserPlanProfile(userId) {
  const [{ data: userProfile }, { data: coachProfile }, { data: subscriptions }] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).maybeSingle(),
    supabase.from('coaches').select('*').eq('id', userId).maybeSingle(),
    supabase.from('subscriptions').select('*').eq('user_id', userId).order('updated_at', { ascending: false })
  ]);

  const subscription = pickSubscriptionRecord(subscriptions || []);
  const access = resolvePlanAccessState({ userProfile, coachProfile, subscription });

  const aiUsageThisMonth = await getAiUsageMessageCount(userId, currentMonthKey());
  const studentLimit = getStudentLimitByPlan(access.plan);
  const aiMonthlyLimit = getAiMonthlyLimitByPlan(access.plan);

  return {
    plan: access.plan,
    billingPlan: access.billingPlan,
    planStatus: access.planStatus,
    provider: access.provider,
    appAccess: access.appAccess,
    accessReason: access.accessReason,
    paymentMethod: access.paymentMethod,
    trialStartedAt: access.trialStartedAt,
    trialEndsAt: access.trialEndsAt,
    trialDaysRemaining: access.trialDaysRemaining,
    currentPeriodEnd: access.currentPeriodEnd,
    expiresAt: access.expiresAt,
    aiUsageThisMonth,
    studentLimit,
    aiMonthlyLimit,
    premiumFeaturesEnabled: getPremiumFeaturesEnabled(access.plan),
    profile: userProfile || coachProfile || null,
    subscription: subscription || null
  };
}

export function canUseAi(planProfile) {
  return Boolean(planProfile?.appAccess) && hasPlanFeature(planProfile?.plan, 'ai_assistant');
}

export function hasUnlimitedAi(planProfile) {
  return Boolean(planProfile?.appAccess) && hasPlanFeature(planProfile?.plan, 'ai_unlimited');
}

export function getRemainingAiMessages(planProfile) {
  if (!canUseAi(planProfile)) return 0;
  if (hasUnlimitedAi(planProfile)) return null;
  return Math.max((planProfile?.aiMonthlyLimit || 0) - (planProfile?.aiUsageThisMonth || 0), 0);
}
