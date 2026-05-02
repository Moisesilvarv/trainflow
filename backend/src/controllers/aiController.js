import { env } from '../config/env.js';
import { appendAiConversation, getAiConversation, incrementAiUsage } from '../services/aiPersistenceService.js';
import { generateGeminiText } from '../services/geminiService.js';
import { canUseAi, currentMonthKey, getUserPlanProfile, hasUnlimitedAi } from '../services/planService.js';
import { supabase } from '../services/supabase.js';

function compactStudentContext(student = {}) {
  return {
    name: student.name,
    goal: student.goal,
    restrictions: student.restrictions,
    level: student.level,
    objectiveNotes: student.objective_notes,
    notes: student.notes
  };
}

function isAiStorageError(error) {
  return ['ai_persistence_unavailable', 'ai_usage_unavailable'].includes(String(error?.code || ''));
}

function buildUsagePayload(planProfile, overrides = {}) {
  const used = Number.isFinite(overrides.used) ? overrides.used : planProfile.aiUsageThisMonth;
  const unlimited = hasUnlimitedAi(planProfile);
  const limit = planProfile.aiMonthlyLimit;

  return {
    used,
    limit,
    unlimited,
    remaining: unlimited ? null : Math.max((limit || 0) - used, 0),
    unavailable: Boolean(overrides.unavailable),
    unavailableReason: overrides.unavailableReason || null
  };
}

async function loadConversationHistorySafely(userId, studentId) {
  try {
    return {
      history: await getAiConversation(userId, studentId),
      persistenceAvailable: true,
      persistenceWarning: null
    };
  } catch (error) {
    if (!isAiStorageError(error)) throw error;

    return {
      history: [],
      persistenceAvailable: false,
      persistenceWarning: error.message
    };
  }
}

async function generateGeminiReply({ student, message, history }) {
  const prompt = [
    'Voce eh um assistente para profissionais de treino de diferentes modalidades.',
    'Responda em portugues do Brasil.',
    'Seja pratico, profissional e seguro.',
    'Nao faca diagnosticos medicos.',
    `Perfil do aluno: ${JSON.stringify(compactStudentContext(student))}`,
    `Historico recente: ${JSON.stringify(history.slice(-8))}`,
    `Pergunta atual: ${message}`
  ].join('\n');

  return generateGeminiText(prompt, { temperature: 0.7, maxOutputTokens: 700 });
}

export async function getStudentChatHistory(req, res, next) {
  try {
    const studentId = String(req.params.studentId || '').trim();
    const { data: student, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .eq('coach_id', req.user.id)
      .maybeSingle();

    if (error) throw error;
    if (!student?.id) {
      return res.status(404).json({ message: 'Aluno nao encontrado.' });
    }

    const planProfile = await getUserPlanProfile(req.user.id);
    const conversationState = await loadConversationHistorySafely(req.user.id, studentId);

    return res.json({
      student: compactStudentContext(student),
      history: conversationState.history,
      usage: buildUsagePayload(planProfile, {
        used: planProfile.aiUsageThisMonth,
        unavailable: false
      }),
      persistenceAvailable: conversationState.persistenceAvailable,
      persistenceWarning: conversationState.persistenceWarning,
      available: Boolean(env.geminiApiKey),
      unavailableReason: env.geminiApiKey ? null : 'Assistente IA indisponivel. Configure a chave GEMINI_API_KEY.'
    });
  } catch (error) {
    return next(error);
  }
}

export async function studentChat(req, res, next) {
  try {
    const studentId = String(req.body?.studentId || '').trim();
    const message = String(req.body?.message || '').trim();

    if (!studentId || !message) {
      return res.status(400).json({ message: 'studentId e message sao obrigatorios.' });
    }

    const planProfile = await getUserPlanProfile(req.user.id);
    req.planProfile = planProfile;

    if (!canUseAi(planProfile)) {
      return res.status(403).json({
        message: 'Assistente IA disponivel no plano Pro e Premium.',
        feature: 'ai_assistant',
        plan: planProfile.plan
      });
    }

    if (!env.geminiApiKey) {
      return res.status(503).json({
        message: 'Assistente IA indisponivel. Configure a chave GEMINI_API_KEY.'
      });
    }

    if (!hasUnlimitedAi(planProfile) && planProfile.aiUsageThisMonth >= (planProfile.aiMonthlyLimit || 0)) {
      return res.status(403).json({
        message: `Limite mensal de IA atingido. Seu plano permite ${planProfile.aiMonthlyLimit} mensagens por mes.`,
        feature: 'ai_assistant',
        plan: planProfile.plan
      });
    }

    const { data: student, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', studentId)
      .eq('coach_id', req.user.id)
      .maybeSingle();

    if (error) throw error;
    if (!student?.id) {
      return res.status(404).json({ message: 'Aluno nao encontrado.' });
    }

    const conversationState = await loadConversationHistorySafely(req.user.id, studentId);
    const history = conversationState.history;
    const reply = await generateGeminiReply({ student, message, history });
    let updatedHistory = [
      ...history,
      {
        id: null,
        role: 'user',
        content: message,
        createdAt: new Date().toISOString()
      },
      {
        id: null,
        role: 'assistant',
        content: reply,
        createdAt: new Date().toISOString()
      }
    ];
    let persistenceAvailable = conversationState.persistenceAvailable;
    let persistenceWarning = conversationState.persistenceWarning;

    if (conversationState.persistenceAvailable) {
      try {
        await appendAiConversation(req.user.id, studentId, { role: 'user', content: message });
        updatedHistory = await appendAiConversation(req.user.id, studentId, { role: 'assistant', content: reply });
      } catch (error) {
        if (!isAiStorageError(error)) throw error;
        persistenceAvailable = false;
        persistenceWarning = error.message;
      }
    }

    let usagePayload = buildUsagePayload(planProfile, {
      used: planProfile.aiUsageThisMonth
    });

    try {
      const usage = await incrementAiUsage(req.user.id, currentMonthKey());
      usagePayload = buildUsagePayload(planProfile, {
        used: usage.message_count
      });
    } catch (error) {
      if (!isAiStorageError(error)) throw error;
      usagePayload = buildUsagePayload(planProfile, {
        used: planProfile.aiUsageThisMonth,
        unavailable: true,
        unavailableReason: error.message
      });
    }

    return res.json({
      reply,
      student: compactStudentContext(student),
      history: updatedHistory,
      usage: usagePayload,
      persistenceAvailable,
      persistenceWarning
    });
  } catch (error) {
    return next(error);
  }
}
