export const PLAN_ORDER = [
  {
    id: 'basic',
    name: 'Basico',
    publicName: 'Basico',
    badge: 'Para comecar',
    price: 19.9,
    studentLimit: 20,
    aiMonthlyLimit: 0,
    cap: 'Ate 20 alunos',
    description: 'Para profissionais de treino que querem organizar atendimento, treinos e agenda sem complexidade.',
    headline: 'Comece com estrutura profissional.',
    benefits: [
      'Ate 20 alunos',
      'Cadastro de alunos',
      'Criacao manual de treinos',
      'Agenda basica',
      'Controle financeiro simples',
      'Perfil profissional basico'
    ],
    blocked: [
      'Assistente IA',
      'Area do aluno',
      'Cobranca recorrente',
      'WhatsApp automatico',
      'Relatorios avancados',
      'Contratos digitais',
      'Automacoes premium'
    ],
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
  {
    id: 'pro',
    name: 'Pro',
    publicName: 'Pro',
    badge: 'Mais estrategico',
    price: 39.9,
    studentLimit: 80,
    aiMonthlyLimit: 30,
    cap: 'Ate 80 alunos',
    description: 'Para profissionais em crescimento que querem ganhar tempo, padrao e organizacao no dia a dia.',
    headline: 'Profissionalize sua operacao.',
    benefits: [
      'Tudo do Basico',
      'Financeiro completo',
      'Relatorios simples',
      'Contratos digitais',
      'Biblioteca de treinos',
      'Assistente IA com 30 mensagens por mes',
      'Exportacao PDF de treinos e relatorios'
    ],
    blocked: [
      'Area do aluno',
      'Cobranca recorrente automatica',
      'WhatsApp automatico',
      'IA ilimitada',
      'Dashboard inteligente de retencao'
    ],
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
  {
    id: 'premium',
    name: 'Premium',
    publicName: 'Premium',
    badge: 'Mais completo',
    recommended: true,
    price: 79.9,
    studentLimit: null,
    aiMonthlyLimit: null,
    cap: 'Alunos ilimitados',
    description: 'Para profissionais que querem automatizar cobrancas, relacionamento com alunos e acompanhamento da carteira.',
    headline: 'Automatize e profissionalize o negocio.',
    benefits: [
      'Tudo do Pro',
      'Area exclusiva do aluno',
      'Cobranca recorrente automatica',
      'Integracao com Mercado Pago e Stripe',
      'Lembrete automatico de pagamento',
      'WhatsApp automatico',
      'IA ilimitada',
      'Dashboard inteligente',
      'Alertas de risco, inadimplencia e inatividade',
      'Automacoes avancadas'
    ],
    blocked: [],
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
];

const TRIAL_PLAN = {
  id: 'trial',
  name: 'Teste gratis',
  publicName: 'Teste gratis',
  badge: '7 dias liberados',
  price: 0,
  studentLimit: null,
  aiMonthlyLimit: null,
  cap: 'Acesso temporario',
  description: 'Experimente a plataforma por 7 dias antes de escolher um plano pago.',
  headline: 'Conheca o sistema sem compromisso.',
  benefits: [
    'Acesso liberado por 7 dias',
    'Gestao de alunos',
    'Treinos e agenda',
    'Financeiro e relatorios',
    'Assistente de IA'
  ],
  blocked: [],
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
};

const BASIC_FREE_PLAN = {
  id: 'basic_free',
  name: 'Basico Free',
  publicName: 'Basico Free',
  badge: 'Modo limitado',
  price: 0,
  studentLimit: 20,
  aiMonthlyLimit: 0,
  cap: 'Ate 20 alunos',
  description: 'Opcao gratuita limitada para continuar organizando o atendimento apos o teste.',
  headline: 'Continue com o essencial.',
  benefits: [
    'Ate 20 alunos',
    'Cadastro de alunos',
    'Criacao manual de treinos',
    'Agenda basica'
  ],
  blocked: [
    'Assistente IA',
    'Geracao automatica de treino',
    'Relatorios avancados',
    'Cobrancas automaticas',
    'WhatsApp automatico',
    'Dashboard inteligente',
    'Automacoes premium'
  ],
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
};

export const PLAN_FEATURE_LABELS = {
  ai_assistant: 'Assistente de IA multinicho',
  ai_unlimited: 'IA ilimitada',
  student_portal: 'Area do aluno',
  recurring_billing: 'Cobranca recorrente',
  payment_integrations: 'Mercado Pago e Stripe',
  whatsapp_automation: 'WhatsApp automatico',
  advanced_reports: 'Relatorios avancados',
  simple_reports: 'Relatorios simples',
  digital_contracts: 'Contratos digitais',
  smart_dashboard: 'Dashboard inteligente',
  pdf_export: 'Exportacao PDF',
  workout_library: 'Biblioteca de treinos',
  advanced_automations: 'Automacoes avancadas'
};

export const FEATURE_UPGRADE_COPY = {
  subscription_required: {
    title: 'Seu teste gratis expirou.',
    description: 'Faca upgrade para continuar criando treinos, usando IA, enviando materiais e liberando os recursos principais do TrainFlow.'
  },
  ai_assistant: {
    title: 'Assistente IA disponivel no plano Pro e Premium.',
    description: 'Gere treinos e sessoes personalizados para diferentes modalidades, adapte atividades e economize tempo na rotina com cada aluno.'
  },
  ai_unlimited: {
    title: 'IA ilimitada disponivel no plano Premium.',
    description: 'Automatize ajustes e conversas por aluno sem se preocupar com limite mensal.'
  },
  student_portal: {
    title: 'Area do aluno disponivel no plano Premium.',
    description: 'Entregue uma experiencia profissional com acesso a treinos, agenda, pagamentos, evolucao e avaliacoes.'
  },
  recurring_billing: {
    title: 'Cobranca recorrente disponivel no plano Premium.',
    description: 'Automatize mensalidades, acompanhe inadimplencia e profissionalize o financeiro.'
  },
  whatsapp_automation: {
    title: 'WhatsApp automatico disponivel no plano Premium.',
    description: 'Envie lembretes de treino, pagamento, avaliacao e renovacao sem operacao manual.'
  },
  advanced_reports: {
    title: 'Relatorios avancados disponiveis no plano Premium.',
    description: 'Acompanhe retencao, carteira e sinais de risco com muito mais profundidade.'
  },
  smart_dashboard: {
    title: 'Dashboard inteligente disponivel no plano Premium.',
    description: 'Veja alunos inadimplentes, em risco de cancelamento e sem atividade recente em um so lugar.'
  },
  digital_contracts: {
    title: 'Contratos digitais disponiveis no plano Pro e Premium.',
    description: 'Formalize o atendimento com mais profissionalismo e menos atrito.'
  },
  pdf_export: {
    title: 'Exportacao PDF disponivel no plano Pro e Premium.',
    description: 'Entregue treinos e avaliacoes com acabamento profissional e mais valor percebido.'
  },
  workout_library: {
    title: 'Biblioteca de treinos disponivel no plano Pro e Premium.',
    description: 'Ganhe velocidade com modelos reaproveitaveis e mais consistencia na entrega.'
  },
  payment_integrations: {
    title: 'Integracoes de pagamento disponiveis no plano Premium.',
    description: 'Conecte Stripe e Mercado Pago para preparar uma operacao escalavel.'
  },
  advanced_automations: {
    title: 'Automacoes avancadas disponiveis no plano Premium.',
    description: 'Estruture fluxos inteligentes para reduzir trabalho operacional e aumentar retencao.'
  }
};

const FEATURE_ALIASES = {
  subscription_required: 'subscription_required',
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

const LEGACY_PLAN_MAP = {
  trial: 'trial',
  basic_free: 'basic_free',
  free: 'basic',
  professional: 'pro',
  medium: 'pro',
  advanced: 'premium',
  premium: 'premium'
};

const PLANS_BY_ID = PLAN_ORDER.reduce((acc, plan) => {
  acc[plan.id] = plan;
  return acc;
}, { trial: TRIAL_PLAN });

PLANS_BY_ID.basic_free = BASIC_FREE_PLAN;

const FEATURE_MIN_PLAN = PLAN_ORDER.reduce((acc, plan) => {
  Object.entries(plan.features || {}).forEach(([feature, value]) => {
    if (acc[feature]) return;
    if (value === false || value === 0) return;
    acc[feature] = plan.id;
  });
  return acc;
}, {});

function normalizeFeatureKey(featureKey) {
  const normalized = String(featureKey || '').trim();
  return FEATURE_ALIASES[normalized] || normalized;
}

export function normalizePlanId(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return PLANS_BY_ID[normalized] ? normalized : LEGACY_PLAN_MAP[normalized] || 'basic';
}

export function getPlanById(value) {
  return PLANS_BY_ID[normalizePlanId(value)];
}

export function getStudentLimitByPlan(value) {
  return getPlanById(value).studentLimit;
}

export function getAiMonthlyLimitByPlan(value) {
  return getPlanById(value).aiMonthlyLimit;
}

export function getFeatureValue(planId, featureKey) {
  const plan = getPlanById(planId);
  return plan.features[normalizeFeatureKey(featureKey)];
}

export function hasPlanFeature(planId, featureKey) {
  const value = getFeatureValue(planId, featureKey);
  if (value === null) return true;
  if (typeof value === 'number') return value > 0;
  return Boolean(value);
}

export function getUpgradePlanForFeature(featureKey) {
  const normalizedFeature = normalizeFeatureKey(featureKey);
  if (normalizedFeature === 'subscription_required') return getPlanById('pro');
  const planId = FEATURE_MIN_PLAN[normalizedFeature] || 'premium';
  return getPlanById(planId);
}

export function getUpgradeCopy(featureKey) {
  const normalizedFeature = normalizeFeatureKey(featureKey);
  const fallbackPlan = getUpgradePlanForFeature(normalizedFeature);
  return FEATURE_UPGRADE_COPY[normalizedFeature] || {
    title: `Recurso disponivel no plano ${fallbackPlan.publicName || fallbackPlan.name}.`,
    description: 'Faca upgrade para liberar este recurso na sua operacao.'
  };
}

export function formatPlanCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}
