export const DEFAULT_PLAN = 'basic';
export const TRIAL_PLAN_ID = 'trial';
export const BASIC_FREE_PLAN_ID = 'basic_free';

export const PLAN_IDS = ['basic', 'pro', 'premium'];
export const PLAN_ACCESS_IDS = [TRIAL_PLAN_ID, BASIC_FREE_PLAN_ID, ...PLAN_IDS];
export const PLAN_STATUS_IDS = ['active', 'inactive', 'limited', 'pending_email', 'trialing', 'canceled', 'past_due', 'incomplete', 'expired'];

const LEGACY_PLAN_MAP = {
  free: 'basic',
  basic: 'basic',
  medium: 'pro',
  professional: 'pro',
  pro: 'pro',
  advanced: 'premium',
  premium: 'premium'
};

const FEATURE_ALIASES = {
  workout_pdf_export: 'pdf_export',
  pdf_export_advanced: 'pdf_export',
  ai_workout_suggestions: 'ai_assistant',
  student_area_custom: 'student_portal',
  payment_gateway_integrations: 'payment_integrations',
  finance_advanced_dashboard: 'smart_dashboard',
  monthly_reports: 'simple_reports',
  evolution_history: 'advanced_progress',
  payment_due_reminders: 'payment_reminders',
  payments_basic: 'financial_simple',
  workout_builder: 'manual_workouts',
  basic_schedule: 'basic_schedule',
  student_management: 'student_management'
};

export const PLAN_CATALOG = {
  trial: {
    id: 'trial',
    name: 'Teste gratis',
    price: 0,
    description: 'Acesso temporario para avaliar a plataforma durante 7 dias.',
    studentLimit: null,
    aiMonthlyLimit: null,
    features: {
      students_limit: null,
      student_management: true,
      manual_workouts: true,
      basic_schedule: true,
      financial_simple: true,
      profile_basic: true,
      financial_complete: true,
      simple_reports: true,
      workout_library: true,
      ai_assistant: true,
      ai_unlimited: true,
      student_portal: true,
      recurring_billing: true,
      payment_integrations: true,
      payment_reminders: true,
      whatsapp_automation: true,
      advanced_reports: true,
      advanced_progress: true,
      digital_contracts: true,
      smart_dashboard: true,
      pdf_export: true,
      advanced_automations: true
    }
  },
  basic_free: {
    id: 'basic_free',
    name: 'Basico Free',
    price: 0,
    description: 'Acesso gratuito limitado apos o fim do teste.',
    studentLimit: 20,
    aiMonthlyLimit: 0,
    features: {
      students_limit: 20,
      student_management: true,
      manual_workouts: true,
      basic_schedule: true,
      financial_simple: false,
      profile_basic: false,
      financial_complete: false,
      simple_reports: false,
      workout_library: false,
      ai_assistant: false,
      ai_unlimited: false,
      student_portal: false,
      recurring_billing: false,
      payment_integrations: false,
      payment_reminders: false,
      whatsapp_automation: false,
      advanced_reports: false,
      advanced_progress: false,
      digital_contracts: false,
      smart_dashboard: false,
      pdf_export: false,
      advanced_automations: false
    }
  },
  basic: {
    id: 'basic',
    name: 'Basico',
    price: 19.9,
    description: 'Para personal iniciante que quer comecar a organizar o negocio.',
    studentLimit: 20,
    aiMonthlyLimit: 0,
    features: {
      students_limit: 20,
      student_management: true,
      manual_workouts: true,
      basic_schedule: true,
      financial_simple: true,
      profile_basic: true,
      financial_complete: false,
      simple_reports: false,
      workout_library: false,
      ai_assistant: false,
      ai_unlimited: false,
      student_portal: false,
      recurring_billing: false,
      payment_integrations: false,
      payment_reminders: false,
      whatsapp_automation: false,
      advanced_reports: false,
      advanced_progress: false,
      digital_contracts: false,
      smart_dashboard: false,
      pdf_export: false,
      advanced_automations: false
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 39.9,
    description: 'Para personal em crescimento que quer ganhar produtividade e profissionalizar a operacao.',
    studentLimit: 80,
    aiMonthlyLimit: 30,
    features: {
      students_limit: 80,
      student_management: true,
      manual_workouts: true,
      basic_schedule: true,
      financial_simple: true,
      profile_basic: true,
      financial_complete: true,
      simple_reports: true,
      workout_library: true,
      ai_assistant: true,
      ai_unlimited: false,
      student_portal: false,
      recurring_billing: false,
      payment_integrations: false,
      payment_reminders: false,
      whatsapp_automation: false,
      advanced_reports: false,
      advanced_progress: true,
      digital_contracts: true,
      smart_dashboard: false,
      pdf_export: true,
      advanced_automations: false
    }
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 79.9,
    description: 'Para personal profissional que quer automatizar cobrancas, atendimento e retencao.',
    studentLimit: null,
    aiMonthlyLimit: null,
    features: {
      students_limit: null,
      student_management: true,
      manual_workouts: true,
      basic_schedule: true,
      financial_simple: true,
      profile_basic: true,
      financial_complete: true,
      simple_reports: true,
      workout_library: true,
      ai_assistant: true,
      ai_unlimited: true,
      student_portal: true,
      recurring_billing: true,
      payment_integrations: true,
      payment_reminders: true,
      whatsapp_automation: true,
      advanced_reports: true,
      advanced_progress: true,
      digital_contracts: true,
      smart_dashboard: true,
      pdf_export: true,
      advanced_automations: true
    }
  }
};

function normalizeFeatureKey(featureKey) {
  const normalized = String(featureKey || '').trim();
  return FEATURE_ALIASES[normalized] || normalized;
}

export function parsePlanId(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return null;
  if (PLAN_ACCESS_IDS.includes(normalized)) return normalized;
  return LEGACY_PLAN_MAP[normalized] || null;
}

export function normalizePlanId(value) {
  return parsePlanId(value) || DEFAULT_PLAN;
}

export function normalizePlanStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return PLAN_STATUS_IDS.includes(normalized) ? normalized : 'active';
}

export function isValidPlanId(value) {
  return PLAN_IDS.includes(String(value || '').trim().toLowerCase());
}

export function getPlanConfigById(value) {
  return PLAN_CATALOG[normalizePlanId(value)];
}

export function getPlanCapabilities(value) {
  return { ...getPlanConfigById(value).features };
}

export function getFeatureValue(planId, featureKey) {
  const config = getPlanConfigById(planId);
  const resolved = normalizeFeatureKey(featureKey);
  return config.features[resolved];
}

export function hasPlanFeature(planId, featureKey) {
  const value = getFeatureValue(planId, featureKey);
  if (value === null) return true;
  if (typeof value === 'number') return value > 0;
  return Boolean(value);
}

export function getStudentLimitByPlan(value) {
  return getPlanConfigById(value).studentLimit;
}

export function getAiMonthlyLimitByPlan(value) {
  return getPlanConfigById(value).aiMonthlyLimit;
}

export function getPremiumFeaturesEnabled(planId) {
  const capabilities = getPlanCapabilities(planId);
  return Object.entries(capabilities)
    .filter(([key, value]) => {
      if (['students_limit', 'student_management', 'manual_workouts', 'basic_schedule', 'financial_simple', 'profile_basic'].includes(key)) {
        return false;
      }

      if (value === null) return true;
      if (typeof value === 'number') return value > 0;
      return Boolean(value);
    })
    .map(([key]) => key);
}

export function resolvePlanAccess(planId, planStatus = 'active') {
  const normalizedPlanId = normalizePlanId(planId);
  const normalizedStatus = normalizePlanStatus(planStatus);
  const config = getPlanConfigById(normalizedPlanId);

  return {
    plan: normalizedPlanId,
    planStatus: normalizedStatus,
    studentLimit: config.studentLimit,
    aiMonthlyLimit: config.aiMonthlyLimit,
    premiumFeaturesEnabled: getPremiumFeaturesEnabled(normalizedPlanId),
    capabilities: { ...config.features }
  };
}
