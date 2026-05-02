import { supabase } from './supabase.js';
import { formatPersonName } from '../utils/personName.js';

const defaultNotifications = {
  newPayments: true,
  classReminder: true,
  inactiveStudents: true,
  weeklyFinanceSummary: false
};

const defaultPreferences = {
  theme: 'light',
  language: 'pt-BR',
  dateFormat: 'DD/MM/AAAA',
  timezone: 'America/Sao_Paulo'
};

const defaultProfile = {
  fullName: '',
  photo: '',
  whatsapp: '',
  instagram: '',
  specialty: '',
  bio: ''
};

export function getDefaultWhatsappAutomations() {
  return {
    workoutReminder: true,
    paymentReminder: true,
    evaluationReminder: false,
    renewalMessage: true,
    provider: 'config_required',
    active: false
  };
}

function mapWhatsappRow(row) {
  const defaults = getDefaultWhatsappAutomations();
  return {
    workoutReminder: row?.workout_reminder ?? defaults.workoutReminder,
    paymentReminder: row?.payment_reminder ?? defaults.paymentReminder,
    evaluationReminder: row?.evaluation_reminder ?? defaults.evaluationReminder,
    renewalMessage: row?.renewal_message ?? defaults.renewalMessage,
    provider: row?.provider || defaults.provider,
    active: Boolean(row?.is_active)
  };
}

function mapIntegrationRow(row) {
  return {
    id: row.id,
    provider: row.provider,
    status: row.status,
    config: row.config || {},
    connectedAt: row.connected_at,
    disconnectedAt: row.disconnected_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapPreferenceRow(row) {
  const rawPreferences = row?.preferences || {};
  const rawProfile = rawPreferences?.profile || {};

  return {
    notifications: row?.notifications || defaultNotifications,
    preferences: {
      ...defaultPreferences,
      ...rawPreferences
    },
    profile: {
      ...defaultProfile,
      fullName: rawProfile?.fullName || '',
      photo: rawProfile?.photo || '',
      whatsapp: rawProfile?.whatsapp || '',
      instagram: rawProfile?.instagram || '',
      specialty: rawProfile?.specialty || '',
      bio: rawProfile?.bio || ''
    }
  };
}

function isMissingRelationError(error, relationName) {
  if (!error) return false;

  const message = String(error.message || '').toLowerCase();
  const details = String(error.details || '').toLowerCase();
  const hint = String(error.hint || '').toLowerCase();
  const relation = String(relationName || '').toLowerCase();

  return error.code === '42P01'
    || message.includes('does not exist')
    || details.includes('does not exist')
    || hint.includes('does not exist')
    || (relation && (message.includes(relation) || details.includes(relation)));
}

function isMissingColumnError(error, columnName) {
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  const normalizedColumn = String(columnName || '').toLowerCase();

  return (
    message.includes(`could not find the '${normalizedColumn}' column`)
    || (message.includes(`column "${normalizedColumn}"`) && message.includes('does not exist'))
    || (details.includes(`column "${normalizedColumn}"`) && details.includes('does not exist'))
  );
}

async function updateTableWithFallback(table, matchColumn, matchValue, payload) {
  let nextPayload = { ...payload };

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { error } = await supabase
      .from(table)
      .update(nextPayload)
      .eq(matchColumn, matchValue);

    if (!error) return;

    const strippedPayload = { ...nextPayload };

    if (isMissingColumnError(error, 'updated_at')) delete strippedPayload.updated_at;
    if (isMissingColumnError(error, 'avatar_url')) delete strippedPayload.avatar_url;
    if (isMissingColumnError(error, 'name')) delete strippedPayload.name;

    if (Object.keys(strippedPayload).length === Object.keys(nextPayload).length) {
      throw error;
    }

    nextPayload = strippedPayload;
  }
}

export async function logAutomation(userId, payload) {
  const { error } = await supabase.from('automation_logs').insert({
    user_id: userId,
    student_id: payload?.studentId || null,
    type: String(payload?.type || '').trim() || 'generic',
    status: String(payload?.status || '').trim() || 'logged',
    metadata: payload?.metadata && typeof payload.metadata === 'object' ? payload.metadata : {}
  });

  if (error) throw error;
}

export async function getAutomationLogs(userId) {
  const { data, error } = await supabase
    .from('automation_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPaymentIntegrations(userId) {
  const { data, error } = await supabase
    .from('billing_gateway_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error, 'billing_gateway_settings')) {
      return {
        pixConnected: false,
        mercadoPagoConnected: false,
        stripeConnected: false,
        providerStatus: 'config_required',
        updatedAt: null
      };
    }

    throw error;
  }

  return {
    pixConnected: Boolean(data?.pix_connected),
    mercadoPagoConnected: Boolean(data?.mercado_pago_connected),
    stripeConnected: Boolean(data?.stripe_connected),
    providerStatus: data?.provider_status || 'config_required',
    updatedAt: data?.updated_at || null
  };
}

export async function savePaymentIntegrations(userId, payload) {
  const { error } = await supabase
    .from('billing_gateway_settings')
    .upsert({
      user_id: userId,
      pix_connected: Boolean(payload?.pixConnected),
      mercado_pago_connected: Boolean(payload?.mercadoPagoConnected),
      stripe_connected: Boolean(payload?.stripeConnected),
      provider_status: String(payload?.providerStatus || 'config_required')
    }, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) throw error;
  return getPaymentIntegrations(userId);
}

export async function getContracts(userId) {
  const { data, error } = await supabase
    .from('contracts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createContract(userId, payload) {
  const { data, error } = await supabase
    .from('contracts')
    .insert({
      user_id: userId,
      student_id: payload?.studentId || null,
      title: String(payload?.title || 'Contrato sem titulo').trim(),
      content: String(payload?.content || '').trim(),
      status: 'draft'
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function signContract(userId, contractId, signerName) {
  const { data, error } = await supabase
    .from('contracts')
    .update({
      status: 'signed',
      signed_at: new Date().toISOString(),
      signer_name: String(signerName || '').trim() || null
    })
    .eq('id', contractId)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function getRecurringPayments(userId) {
  const { data, error } = await supabase
    .from('recurring_payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createRecurringPayment(userId, payload) {
  const { data, error } = await supabase
    .from('recurring_payments')
    .insert({
      user_id: userId,
      student_id: payload.studentId,
      amount: payload.amount,
      status: payload.status || 'config_required',
      provider: payload.provider || 'config_required',
      external_id: payload.externalId || null,
      external_subscription_id: payload.externalSubscriptionId || null,
      next_due_date: payload.nextDueDate || null
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateRecurringPaymentStatus(userId, recurringPaymentId, status) {
  const { data, error } = await supabase
    .from('recurring_payments')
    .update({
      status: String(status || 'inactive').trim() || 'inactive',
      updated_at: new Date().toISOString()
    })
    .eq('id', recurringPaymentId)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function getWhatsappAutomations(userId) {
  const { data, error } = await supabase
    .from('whatsapp_automation_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return mapWhatsappRow(data);
}

export async function saveWhatsappAutomations(userId, payload) {
  const { error } = await supabase
    .from('whatsapp_automation_settings')
    .upsert({
      user_id: userId,
      workout_reminder: Boolean(payload?.workoutReminder),
      payment_reminder: Boolean(payload?.paymentReminder),
      evaluation_reminder: Boolean(payload?.evaluationReminder),
      renewal_message: Boolean(payload?.renewalMessage),
      provider: String(payload?.provider || 'config_required'),
      is_active: Boolean(payload?.active)
    }, { onConflict: 'user_id' });

  if (error) throw error;
  return getWhatsappAutomations(userId);
}

export async function getIntegrations(userId) {
  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('user_id', userId)
    .order('provider', { ascending: true });

  if (error) {
    if (isMissingRelationError(error, 'integrations')) {
      return [];
    }

    throw error;
  }
  return (data || []).map(mapIntegrationRow);
}

export async function upsertIntegration(userId, payload) {
  const provider = String(payload?.provider || '').trim();
  const status = String(payload?.status || 'coming_soon').trim();

  const { data, error } = await supabase
    .from('integrations')
    .upsert({
      user_id: userId,
      provider,
      status,
      config: payload?.config && typeof payload.config === 'object' ? payload.config : {},
      connected_at: payload?.connectedAt || null,
      disconnected_at: payload?.disconnectedAt || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,provider' })
    .select('*')
    .single();

  if (error) throw error;
  return mapIntegrationRow(data);
}

export async function getUserPreferences(userId) {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    if (isMissingRelationError(error, 'user_preferences')) {
      return mapPreferenceRow(null);
    }

    throw error;
  }
  return mapPreferenceRow(data);
}

function sanitizeProfilePayload(payload = {}) {
  return {
    fullName: formatPersonName(payload.fullName || ''),
    photo: String(payload.photo || '').trim(),
    whatsapp: String(payload.whatsapp || '').trim(),
    instagram: String(payload.instagram || '').trim(),
    specialty: String(payload.specialty || '').trim(),
    bio: String(payload.bio || '').trim()
  };
}

export async function getProfessionalProfile(userId) {
  const [preferences, userRes, coachRes] = await Promise.all([
    getUserPreferences(userId),
    supabase.from('users').select('name, email, avatar_url').eq('id', userId).maybeSingle(),
    supabase.from('coaches').select('name, email').eq('id', userId).maybeSingle()
  ]);

  if (userRes.error) throw userRes.error;
  if (coachRes.error) throw coachRes.error;

  const baseProfile = preferences.profile || defaultProfile;
  const resolvedName = userRes.data?.name || coachRes.data?.name || baseProfile.fullName || '';
  const resolvedEmail = userRes.data?.email || coachRes.data?.email || '';
  const resolvedPhoto = userRes.data?.avatar_url || baseProfile.photo || '';

  return {
    fullName: resolvedName,
    email: resolvedEmail,
    photo: resolvedPhoto,
    whatsapp: baseProfile.whatsapp || '',
    instagram: baseProfile.instagram || '',
    specialty: baseProfile.specialty || '',
    bio: baseProfile.bio || ''
  };
}

export async function saveProfessionalProfile(userId, payload) {
  const currentPreferences = await getUserPreferences(userId);
  const nextProfile = {
    ...defaultProfile,
    ...currentPreferences.profile,
    ...sanitizeProfilePayload(payload)
  };
  const now = new Date().toISOString();

  const { error: preferencesError } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      notifications: currentPreferences.notifications,
      preferences: {
        ...currentPreferences.preferences,
        profile: nextProfile
      },
      updated_at: now
    }, { onConflict: 'user_id' });

  if (preferencesError) throw preferencesError;

  const userPayload = {
    updated_at: now,
    avatar_url: nextProfile.photo || null
  };

  if (nextProfile.fullName) {
    userPayload.name = nextProfile.fullName;
  }

  await updateTableWithFallback('users', 'id', userId, userPayload);

  const coachPayload = {
    updated_at: now
  };

  if (nextProfile.fullName) {
    coachPayload.name = nextProfile.fullName;
  }

  await updateTableWithFallback('coaches', 'id', userId, coachPayload);

  return getProfessionalProfile(userId);
}

export async function saveUserPreferences(userId, payload) {
  const current = await getUserPreferences(userId);
  const nextPreferences = payload?.preferences && typeof payload.preferences === 'object'
    ? { ...current.preferences, ...payload.preferences }
    : current.preferences;
  const nextNotifications = payload?.notifications && typeof payload.notifications === 'object'
    ? { ...current.notifications, ...payload.notifications }
    : current.notifications;
  const nextProfile = payload?.profile && typeof payload.profile === 'object'
    ? { ...current.profile, ...payload.profile }
    : current.profile;

  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      notifications: nextNotifications,
      preferences: {
        ...nextPreferences,
        profile: nextProfile
      },
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

  if (error) throw error;
  return getUserPreferences(userId);
}
