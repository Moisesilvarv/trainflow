import { generateGeminiText } from '../services/geminiService.js';
import { supabase } from '../services/supabase.js';

const GENERIC_WORKOUT_PROMPT_PATTERNS = [
  /^o+i+$/i,
  /^ol[áa]+$/i,
  /^e+a+i+$/i,
  /^opa+$/i,
  /^hello$/i,
  /^hi+$/i,
  /^bom dia$/i,
  /^boa tarde$/i,
  /^boa noite$/i,
  /^teste(r)?$/i,
  /^ok(?:ay)?$/i,
  /^blz+$/i,
  /^valeu$/i
];

const WORKOUT_SIGNAL_PATTERNS = [
  /trein/i,
  /sess[aã]o/i,
  /ficha/i,
  /planej/i,
  /periodiza/i,
  /corrida/i,
  /for[çc]a/i,
  /hipertrof/i,
  /emagrec/i,
  /condicion/i,
  /mobilidade/i,
  /cardio/i,
  /resist[eê]ncia/i,
  /reabilit/i,
  /alongamento/i,
  /funcional/i,
  /pilates/i,
  /crossfit/i,
  /nata[çc][aã]o/i,
  /ciclismo/i,
  /futebol/i,
  /luta/i
];

const CONTEXT_SIGNAL_PATTERNS = [
  /objetiv/i,
  /foco/i,
  /meta/i,
  /nivel/i,
  /iniciante/i,
  /intermedi/i,
  /avan[çc]ad/i,
  /restr/i,
  /dor/i,
  /les[aã]o/i,
  /joelho/i,
  /ombro/i,
  /coluna/i,
  /tempo/i,
  /minut/i,
  /dias?/i,
  /semana/i,
  /volum/i,
  /carga/i,
  /s[eé]ries?/i,
  /repeti[çc][õo]es/i
];

const REFINEMENT_SIGNAL_PATTERNS = [
  /ajust/i,
  /refin/i,
  /adapt/i,
  /alter/i,
  /troc/i,
  /substitu/i,
  /progress/i,
  /regress/i,
  /evolu/i,
  /intens/i,
  /mais leve/i,
  /mais forte/i,
  /reduz/i,
  /aument/i,
  /mant[eê]m/i
];

function toNum(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function parseAiJsonReply(reply = '') {
  const cleaned = String(reply || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  const candidates = [cleaned];
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(cleaned.slice(firstBrace, lastBrace + 1).trim());
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next candidate shape.
    }
  }

  throw Object.assign(
    new Error('A IA nao retornou um JSON valido para montar a sugestao de treino. Tente novamente.'),
    { status: 502, code: 'invalid_ai_json' }
  );
}

function parseWorkoutLinesReply(reply = '') {
  const lines = String(reply || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const workout = {
    workoutName: 'Treino sugerido por IA',
    summary: '',
    warmup: [],
    exercises: [],
    observations: [],
    coachMessage: ''
  };

  for (const line of lines) {
    const parts = line.split('|').map((part) => part.trim());
    const kind = (parts[0] || '').toUpperCase();

    if (kind === 'NAME' && parts.length >= 2) {
      workout.workoutName = parts.slice(1).join(' | ') || workout.workoutName;
      continue;
    }

    if (kind === 'SUMMARY' && parts.length >= 2) {
      workout.summary = parts.slice(1).join(' | ');
      continue;
    }

    if (kind === 'WARMUP' && parts.length >= 2) {
      workout.warmup.push(parts.slice(1).join(' | '));
      continue;
    }

    if (kind === 'EX' && parts.length >= 7) {
      workout.exercises.push({
        name: parts[1] || '',
        muscle_group: parts[2] || '',
        sets: parts[3] || '',
        reps: parts[4] || '',
        rest: parts[5] || '',
        notes: parts[6] || ''
      });
      continue;
    }

    if (kind === 'NOTE' && parts.length >= 2) {
      workout.observations.push(parts.slice(1).join(' | '));
      continue;
    }

    if (kind === 'MESSAGE' && parts.length >= 2) {
      workout.coachMessage = parts.slice(1).join(' | ');
    }
  }

  if (!workout.exercises.length) {
    throw Object.assign(
      new Error('A IA nao retornou um formato de treino utilizavel. Tente novamente.'),
      { status: 502, code: 'invalid_ai_workout_lines' }
    );
  }

  return workout;
}

const workoutSuggestionSchema = {
  type: 'object',
  properties: {
    workoutName: { type: 'string' },
    summary: { type: 'string' },
    coachMessage: { type: 'string' },
    warmup: {
      type: 'array',
      items: { type: 'string' }
    },
    exercises: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          muscle_group: { type: 'string' },
          sets: { type: 'string' },
          reps: { type: 'string' },
          rest: { type: 'string' },
          notes: { type: 'string' }
        },
        required: ['name', 'muscle_group', 'sets', 'reps', 'rest', 'notes']
      }
    },
    observations: {
      type: 'array',
      items: { type: 'string' }
    }
  },
  required: ['workoutName', 'summary', 'coachMessage', 'warmup', 'exercises', 'observations']
};

function compactStudentContext(student = {}) {
  return {
    id: student.id,
    name: student.name,
    goal: student.goal,
    restrictions: student.restrictions,
    level: student.level,
    notes: student.notes
  };
}

async function getStudentContext(studentId, coachId) {
  if (!studentId) return null;

  const { data, error } = await supabase
    .from('students')
    .select('id, name, goal, restrictions, level, notes')
    .eq('id', studentId)
    .eq('coach_id', coachId)
    .maybeSingle();

  if (error) throw error;
  return data?.id ? data : null;
}

function normalizeHistory(history = []) {
  if (!Array.isArray(history)) return [];

  return history
    .map((item) => ({
      role: String(item?.role || '').trim().toLowerCase() === 'assistant' ? 'assistant' : 'user',
      content: String(item?.content || '').trim()
    }))
    .filter((item) => item.content)
    .slice(-8);
}

function compactText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function hasAnyPattern(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function hasStudentPlanningContext(student = {}) {
  return Boolean(
    String(student?.goal || '').trim()
    || String(student?.restrictions || '').trim()
    || String(student?.level || '').trim()
    || String(student?.notes || '').trim()
  );
}

function hasWorkoutConversationContext(history = []) {
  return history.some((item) => {
    const content = compactText(item?.content || '');
    return hasAnyPattern(content, WORKOUT_SIGNAL_PATTERNS)
      || hasAnyPattern(content, CONTEXT_SIGNAL_PATTERNS)
      || /aquecimento|bloco principal|observacoes|treino:/i.test(content);
  });
}

export function validateWorkoutSuggestionInput({ prompt, student, history } = {}) {
  const normalizedPrompt = compactText(prompt);
  const rawPrompt = String(prompt || '').trim();
  const words = normalizedPrompt.split(/\s+/).filter(Boolean);
  const isGreetingOnly = GENERIC_WORKOUT_PROMPT_PATTERNS.some((pattern) => pattern.test(normalizedPrompt));
  const hasWorkoutSignals = hasAnyPattern(normalizedPrompt, WORKOUT_SIGNAL_PATTERNS);
  const hasContextSignals = hasAnyPattern(normalizedPrompt, CONTEXT_SIGNAL_PATTERNS);
  const hasRefinementSignals = hasAnyPattern(normalizedPrompt, REFINEMENT_SIGNAL_PATTERNS);
  const hasStudentContext = hasStudentPlanningContext(student);
  const hasHistoryContext = hasWorkoutConversationContext(history);
  const isDescriptivePrompt = rawPrompt.length >= 18 && words.length >= 4 && (hasWorkoutSignals || hasContextSignals);
  const isRefinementPrompt = words.length >= 2 && hasRefinementSignals && (hasHistoryContext || hasStudentContext);

  if (isGreetingOnly) {
    return {
      ok: false,
      message: 'Descreva o treino com mais contexto. Exemplo: objetivo, nivel, restricoes, modalidade ou ajuste desejado.'
    };
  }

  if (isDescriptivePrompt || isRefinementPrompt) {
    return { ok: true };
  }

  if (rawPrompt.length < 12 || words.length < 3) {
    return {
      ok: false,
      message: 'Sua mensagem ficou muito curta para montar um treino com seguranca. Informe objetivo, nivel, restricoes ou modalidade.'
    };
  }

  return {
    ok: false,
    message: 'Nao ficou claro que tipo de treino voce quer gerar. Inclua foco da sessao, perfil do aluno ou ajuste desejado.'
  };
}

function formatWorkoutAssistantMessage(workout = {}) {
  const warmupLines = Array.isArray(workout.warmup) && workout.warmup.length
    ? workout.warmup.map((item) => `- ${item}`).join('\n')
    : '- Mobilidade geral e ativacao leve por 5 a 8 minutos.';

  const exerciseLines = Array.isArray(workout.exercises)
    ? workout.exercises.map((exercise, index) => {
      const notes = String(exercise?.notes || '').trim();
      return [
        `${index + 1}. ${exercise?.name || 'Atividade'}`,
        `Series ou duracao: ${exercise?.sets || '-'} | Repeticoes ou tempo: ${exercise?.reps || '-'} | Intervalo: ${exercise?.rest || '-'}`,
        `Observacoes: ${notes || 'Sem observacoes adicionais.'}`
      ].join('\n');
    }).join('\n\n')
    : '';

  const observationLines = Array.isArray(workout.observations) && workout.observations.length
    ? workout.observations.map((item) => `- ${item}`).join('\n')
    : '- Ajuste as cargas conforme a resposta do aluno.';

  return [
    workout.coachMessage || 'Estruturei um planejamento objetivo e pronto para ajustar no aluno.',
    '',
    `Treino: ${workout.workoutName || 'Treino sugerido por IA'}`,
    `Foco: ${workout.summary || 'Plano equilibrado para o objetivo solicitado.'}`,
    '',
    'Aquecimento',
    warmupLines,
    '',
    'Bloco principal',
    exerciseLines,
    '',
    'Observacoes',
    observationLines
  ].filter(Boolean).join('\n');
}

function buildWorkoutPrompt({ prompt, student, history, studentName, goal, level, days }) {
  const normalizedPrompt = String(prompt || '').trim();
  const fallbackPrompt = `Crie um planejamento de treino para ${goal} para um aluno ${level} com ${days} dias por semana.`;
  const historyText = history.length
    ? `Historico recente da conversa:\n${history.map((item) => `${item.role === 'assistant' ? 'Assistente' : 'Profissional'}: ${item.content}`).join('\n')}`
    : 'Historico recente da conversa: sem mensagens anteriores.';

  return [
    'Voce eh um assistente premium para profissionais de treino de diferentes modalidades dentro de um SaaS profissional.',
    'Monte respostas praticas, seguras, objetivas e em portugues do Brasil.',
    'Nao faca diagnosticos medicos e nao prometa resultados.',
    'Retorne um planejamento estruturado para uso real em diferentes contextos, como atendimento individual, treinos esportivos, funcional, corrida, reabilitacao e sessoes tecnicas.',
    `Aluno selecionado: ${studentName}`,
    `Objetivo de referencia: ${goal}`,
    `Nivel de referencia: ${level}`,
    `Dias por semana: ${days}`,
    student ? `Contexto adicional do aluno: ${JSON.stringify(compactStudentContext(student))}` : 'Contexto adicional do aluno: nao informado.',
    historyText,
    `Solicitacao atual do profissional: ${normalizedPrompt || fallbackPrompt}`
  ].join('\n');
}

function mapStructuredWorkoutResponse(parsed = {}) {
  const workout = {
    workoutName: String(parsed?.workoutName || 'Treino sugerido por IA').trim(),
    summary: String(parsed?.summary || '').trim(),
    coachMessage: String(parsed?.coachMessage || '').trim(),
    warmup: Array.isArray(parsed?.warmup) ? parsed.warmup.map((item) => String(item || '').trim()).filter(Boolean) : [],
    exercises: Array.isArray(parsed?.exercises)
      ? parsed.exercises.map((exercise) => ({
          name: String(exercise?.name || '').trim(),
          muscle_group: String(exercise?.muscle_group || '').trim(),
          sets: String(exercise?.sets || '').trim(),
          reps: String(exercise?.reps || '').trim(),
          rest: String(exercise?.rest || '').trim(),
          notes: String(exercise?.notes || '').trim()
        })).filter((exercise) => exercise.name)
      : [],
    observations: Array.isArray(parsed?.observations) ? parsed.observations.map((item) => String(item || '').trim()).filter(Boolean) : []
  };

  if (!workout.exercises.length) {
    throw Object.assign(new Error('A IA nao retornou atividades suficientes para montar o planejamento.'), {
      status: 502,
      code: 'invalid_ai_workout'
    });
  }

  return workout;
}

export async function suggestWorkoutWithAi(req, res, next) {
  try {
    const prompt = String(req.body?.prompt || '').trim();
    const studentId = String(req.body?.studentId || '').trim();
    const history = normalizeHistory(req.body?.history);
    const student = await getStudentContext(studentId, req.user.id);
    const studentName = String(req.body?.studentName || student?.name || 'Aluno').trim();
    const goal = String(req.body?.goal || student?.goal || 'Condicionamento').trim();
    const level = String(req.body?.level || student?.level || 'Intermediario').trim();
    const days = Math.max(1, Math.min(6, toNum(req.body?.daysPerWeek, 3)));
    const inputValidation = validateWorkoutSuggestionInput({ prompt, student, history });

    if (!inputValidation.ok) {
      return res.status(400).json({ message: inputValidation.message });
    }

    const workoutPrompt = buildWorkoutPrompt({ prompt, student, history, studentName, goal, level, days });

    const geminiOptions = {
      temperature: 0.45,
      maxOutputTokens: 1600,
      responseMimeType: 'application/json',
      responseSchema: workoutSuggestionSchema
    };

    let structuredWorkout = null;

    try {
      const reply = await generateGeminiText(workoutPrompt, geminiOptions);
      structuredWorkout = mapStructuredWorkoutResponse(parseAiJsonReply(reply));
    } catch (error) {
      if (error?.code !== 'invalid_ai_json') {
        throw error;
      }

      try {
        const retryReply = await generateGeminiText(
          `${workoutPrompt}\nRetorne somente um objeto JSON valido que siga exatamente o schema solicitado.`,
          geminiOptions
        );
        structuredWorkout = mapStructuredWorkoutResponse(parseAiJsonReply(retryReply));
      } catch (retryError) {
        if (retryError?.code !== 'invalid_ai_json') {
          throw retryError;
        }

        const linePrompt = [
          'Voce eh um especialista em montar planejamentos de treino para diferentes modalidades e perfis de atendimento.',
          'Retorne somente texto puro, sem markdown e sem crases.',
          'Use exatamente estas linhas:',
          'NAME|nome do treino',
          'SUMMARY|resumo do foco do treino',
          'MESSAGE|resposta curta para o profissional explicando a estrategia',
          'WARMUP|etapa de aquecimento',
          'EX|nome|grupo_muscular|series|repeticoes|descanso|observacoes',
          'NOTE|observacao final',
          workoutPrompt
        ].join('\n');

        const lineReply = await generateGeminiText(linePrompt, {
          temperature: 0.3,
          maxOutputTokens: 1200
        });

        structuredWorkout = mapStructuredWorkoutResponse(parseWorkoutLinesReply(lineReply));
      }
    }

    const assistantMessage = formatWorkoutAssistantMessage(structuredWorkout);
    const notes = [
      structuredWorkout.summary,
      structuredWorkout.warmup.length ? `Aquecimento: ${structuredWorkout.warmup.join(' | ')}` : '',
      ...structuredWorkout.observations
    ].filter(Boolean);

    return res.json({
      generatedAt: new Date().toISOString(),
      athlete: studentName,
      goal,
      level,
      assistantMessage,
      workout: {
        name: structuredWorkout.workoutName,
        summary: structuredWorkout.summary,
        warmup: structuredWorkout.warmup,
        exercises: structuredWorkout.exercises,
        observations: structuredWorkout.observations
      },
      weeklyPlan: [
        {
          day: 1,
          title: structuredWorkout.workoutName,
          focus: structuredWorkout.summary,
          exercises: structuredWorkout.exercises
        }
      ],
      notes
    });
  } catch (error) {
    return next(error);
  }
}

export async function getAdvancedPhysicalEval(req, res, next) {
  try {
    const studentId = String(req.params.studentId || '').trim();
    const coachId = req.user.id;

    const { data, error } = await supabase
      .from('progress_records')
      .select('record_date, weight, body_fat, lean_mass, performance_notes')
      .eq('coach_id', coachId)
      .eq('student_id', studentId)
      .order('record_date', { ascending: true });

    if (error) throw error;

    const series = (data || []).map((item) => ({
      date: item.record_date,
      weight: toNum(item.weight, null),
      bodyFat: toNum(item.body_fat, null),
      muscleMass: toNum(item.lean_mass, null)
    }));

    const latest = series[series.length - 1] || null;
    const first = series[0] || null;

    const evolution = latest && first
      ? {
          weightDelta: Number((toNum(latest.weight) - toNum(first.weight)).toFixed(2)),
          bodyFatDelta: Number((toNum(latest.bodyFat) - toNum(first.bodyFat)).toFixed(2)),
          muscleMassDelta: Number((toNum(latest.muscleMass) - toNum(first.muscleMass)).toFixed(2))
        }
      : { weightDelta: 0, bodyFatDelta: 0, muscleMassDelta: 0 };

    return res.json({ series, evolution, latest });
  } catch (error) {
    return next(error);
  }
}

export async function analyzeAnamnesis(req, res) {
  const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];

  const risks = [];
  let score = 100;

  answers.forEach((item) => {
    const key = String(item?.key || '').toLowerCase();
    const value = String(item?.value || '').toLowerCase();

    if (key.includes('dor') && value.includes('sim')) {
      score -= 20;
      risks.push('Relata dor atual. Ajustar impacto e priorizar avaliacao funcional.');
    }

    if (key.includes('lesao') && value.includes('sim')) {
      score -= 25;
      risks.push('Historico de lesao informado. Evitar progressao agressiva.');
    }

    if (key.includes('sono') && (value.includes('ruim') || value.includes('baixo'))) {
      score -= 15;
      risks.push('Sono abaixo do ideal. Ajustar volume semanal e recuperacao.');
    }
  });

  if (!risks.length) {
    risks.push('Sem alertas relevantes no questionario inicial.');
  }

  const profile = score >= 80 ? 'baixo_risco' : score >= 60 ? 'medio_risco' : 'alto_risco';

  return res.json({
    score: Math.max(0, score),
    profile,
    risks,
    recommendations: [
      'Manter check-in semanal de fadiga e dor percebida.',
      'Revisar anamnese a cada 30 dias ou apos intercorrencias.',
      'Quando houver sinais clinicos, direcionar para profissional de saude habilitado.'
    ]
  });
}

export async function suggestNutritionPartnershipFlow(req, res) {
  const studentName = String(req.body?.studentName || 'Aluno');
  const goal = String(req.body?.goal || 'Performance');

  return res.json({
    studentName,
    goal,
    guidance: [
      'Apresentar ao aluno o programa de parceria nutricional com nutricionista habilitado.',
      'Coletar preferencia de atendimento (online/presencial) e disponibilidade.',
      'Compartilhar historico de treinos e evolucao para alinhar estrategia multidisciplinar.'
    ],
    legalNotice:
      'Este fluxo nao substitui consulta clinica ou prescricao de dieta. Plano alimentar deve ser definido por nutricionista habilitado.'
  });
}
