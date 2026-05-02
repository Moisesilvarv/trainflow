export const TRIAL_DURATION_DAYS = 7;
export const MAX_TRIALS_PER_IP_WINDOW = 3;
export const TRIAL_IP_WINDOW_HOURS = 24;

export function normalizeEmailForTrial(email) {
  return String(email || '').trim().toLowerCase();
}

export function normalizeFingerprint(fingerprint) {
  const normalized = String(fingerprint || '').trim();
  return normalized ? normalized.slice(0, 255) : null;
}

export function resolveTrialAccessDecision({
  trialRequested = false,
  existingEmailClaim = false,
  existingFingerprintClaim = false,
  recentIpClaimCount = 0
} = {}) {
  if (!trialRequested) {
    return {
      trialRequested: false,
      grantTrial: false,
      blockedReason: null,
      planId: null,
      profileStatus: null,
      subscriptionStatus: null
    };
  }

  if (existingEmailClaim) {
    return {
      trialRequested: true,
      grantTrial: false,
      blockedReason: 'email_already_claimed',
      planId: 'pro',
      profileStatus: 'expired',
      subscriptionStatus: 'expired'
    };
  }

  if (existingFingerprintClaim) {
    return {
      trialRequested: true,
      grantTrial: false,
      blockedReason: 'fingerprint_already_claimed',
      planId: 'pro',
      profileStatus: 'expired',
      subscriptionStatus: 'expired'
    };
  }

  if (recentIpClaimCount >= MAX_TRIALS_PER_IP_WINDOW) {
    return {
      trialRequested: true,
      grantTrial: false,
      blockedReason: 'ip_rate_limited',
      planId: 'pro',
      profileStatus: 'expired',
      subscriptionStatus: 'expired'
    };
  }

  return {
    trialRequested: true,
    grantTrial: true,
    blockedReason: null,
    planId: 'pro',
    profileStatus: 'trialing',
    subscriptionStatus: 'trialing'
  };
}
