import { supabase } from './supabase.js';

function missingTableError(message, code) {
  return Object.assign(new Error(message), {
    status: 503,
    code
  });
}

function isMissingTableError(error, tableName) {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes(`could not find the table 'public.${String(tableName || '').toLowerCase()}'`) ||
    message.includes(`relation "public.${String(tableName || '').toLowerCase()}" does not exist`) ||
    message.includes(`relation "${String(tableName || '').toLowerCase()}" does not exist`)
  );
}

function ensureMonthKey(value) {
  const safeValue = String(value || '').trim();
  if (!/^\d{4}-\d{2}$/.test(safeValue)) {
    throw Object.assign(new Error('Mes de uso de IA invalido.'), { status: 400 });
  }
  return safeValue;
}

export async function getAiUsageRecord(userId, month) {
  const monthKey = ensureMonthKey(month);
  const { data, error } = await supabase
    .from('ai_usage')
    .select('*')
    .eq('user_id', userId)
    .eq('month', monthKey)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error, 'ai_usage')) return null;
    throw error;
  }
  return data || null;
}

export async function getAiUsageMessageCount(userId, month) {
  const record = await getAiUsageRecord(userId, month);
  return Number(record?.message_count || 0);
}

export async function incrementAiUsage(userId, month) {
  const monthKey = ensureMonthKey(month);
  const current = await getAiUsageRecord(userId, monthKey);
  const nextCount = Number(current?.message_count || 0) + 1;

  const payload = {
    user_id: userId,
    month: monthKey,
    message_count: nextCount,
    updated_at: new Date().toISOString()
  };

  if (!current?.id) {
    payload.created_at = payload.updated_at;
  }

  const { data, error } = await supabase
    .from('ai_usage')
    .upsert(payload, { onConflict: 'user_id,month' })
    .select('*')
    .single();

  if (error) {
    if (isMissingTableError(error, 'ai_usage')) {
      throw missingTableError(
        'Controle de uso da IA indisponivel. Aplique a migration mais recente no banco.',
        'ai_usage_unavailable'
      );
    }
    throw error;
  }
  return data;
}

export async function getAiConversation(userId, studentId) {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('id, role, message, created_at')
    .eq('user_id', userId)
    .eq('student_id', studentId)
    .order('created_at', { ascending: true });

  if (error) {
    if (isMissingTableError(error, 'ai_conversations')) return [];
    throw error;
  }

  return (data || []).map((item) => ({
    id: item.id,
    role: item.role,
    content: item.message,
    createdAt: item.created_at
  }));
}

export async function appendAiConversation(userId, studentId, entry) {
  const role = String(entry?.role || '').trim();
  const message = String(entry?.content || '').trim();

  if (!['user', 'assistant'].includes(role) || !message) {
    throw Object.assign(new Error('Mensagem de conversa IA invalida.'), { status: 400 });
  }

  const { error } = await supabase.from('ai_conversations').insert({
    user_id: userId,
    student_id: studentId,
    role,
    message
  });

  if (error) {
    if (isMissingTableError(error, 'ai_conversations')) {
      throw missingTableError(
        'Persistencia de IA indisponivel. Aplique a migration mais recente no banco.',
        'ai_persistence_unavailable'
      );
    }
    throw error;
  }
  return getAiConversation(userId, studentId);
}
