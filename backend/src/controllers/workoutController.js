import { supabase } from '../services/supabase.js';
import { hasPlanFeature } from '../constants/plans.js';
import { getUserPlanProfile } from '../services/planService.js';
import { getPortalAccessByStudent, evaluatePortalAccessState } from '../services/studentPortalService.js';
import { buildWorkoutEmailContent, sendWorkoutEmail } from '../services/workoutEmailService.js';
import { assertStudentBelongsToCoach } from '../utils/ownership.js';
import { assertAllowedKeys, ensureObjectPayload, toJsonArray, toTrimmedString, toUrl } from '../utils/payloadValidation.js';
import { isValidEmail } from '../utils/validation.js';
import { createModernWorkoutPdfStream, renderWorkoutPdfToBuffer } from '../utils/workoutPdf.js';

function normalizeWorkoutPayload(body = {}, { requireName = false } = {}) {
  const payload = ensureObjectPayload(body);
  assertAllowedKeys(payload, ['student_id', 'name', 'exercises', 'notes', 'demo_video_url', 'demo_image_url', 'category']);

  const out = {};
  if (Object.hasOwn(payload, 'student_id')) out.student_id = toTrimmedString(payload.student_id, { fieldLabel: 'Aluno', emptyAsNull: true, maxLength: 80 });
  if (requireName || Object.hasOwn(payload, 'name')) out.name = toTrimmedString(payload.name, { fieldLabel: 'Nome do treino', required: requireName, maxLength: 140 });
  if (Object.hasOwn(payload, 'exercises')) out.exercises = toJsonArray(payload.exercises, { fieldLabel: 'Exercicios' });
  if (Object.hasOwn(payload, 'notes')) out.notes = toTrimmedString(payload.notes, { fieldLabel: 'Observacoes', emptyAsNull: true, maxLength: 4000 });
  if (Object.hasOwn(payload, 'demo_video_url')) out.demo_video_url = toUrl(payload.demo_video_url, { fieldLabel: 'URL do video' });
  if (Object.hasOwn(payload, 'demo_image_url')) out.demo_image_url = toUrl(payload.demo_image_url, { fieldLabel: 'URL da imagem' });
  if (Object.hasOwn(payload, 'category')) out.category = toTrimmedString(payload.category, { fieldLabel: 'Categoria', emptyAsNull: true, maxLength: 120 });
  return out;
}

function safeFileName(value) {
  return String(value || 'treino')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
}

function safeText(value, fallback = '-') {
  const text = String(value || '').trim();
  return text || fallback;
}

function summarizeWorkoutNotes(notes = '') {
  const text = String(notes || '').trim();
  if (!text) return 'Treino estruturado para acompanhamento profissional.';
  const firstSentence = text.split(/(?<=[.!?])\s+/)[0]?.trim();
  return safeText(firstSentence || text);
}

function parseOptionalBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw Object.assign(new Error('Anexar PDF deve ser true ou false.'), { status: 400 });
}

async function loadWorkoutDeliveryContext({ workoutId, coachId }) {
  const { data: workout, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('id', workoutId)
    .eq('coach_id', coachId)
    .single();

  if (error) throw error;

  const [studentRes, coachRes] = await Promise.all([
    workout.student_id
      ? supabase
        .from('students')
        .select('id, name, email, goal')
        .eq('id', workout.student_id)
        .eq('coach_id', coachId)
        .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('coaches')
      .select('name, email')
      .eq('id', coachId)
      .maybeSingle()
  ]);

  let portalLink = null;
  if (workout.student_id) {
    const portalAccess = await getPortalAccessByStudent(coachId, workout.student_id);
    if (portalAccess?.link && evaluatePortalAccessState(portalAccess) === 'active') {
      portalLink = portalAccess.link;
    }
  }

  return {
    workout,
    student: studentRes.data || null,
    coach: coachRes.data || null,
    portalLink
  };
}

function buildPdfPayload({ workout, student, coach }) {
  const now = new Date();
  return {
    workout,
    studentName: safeText(student?.name),
    studentGoal: safeText(student?.goal),
    studentAge: null,
    coachName: safeText(coach?.name, 'Profissional responsavel'),
    generatedAt: now.toISOString(),
    protocol: `RG-${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${safeText(workout.id, '').slice(0, 6) || '000000'}`
  };
}

export async function listWorkouts(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('coach_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.json(data);
  } catch (error) {
    return next(error);
  }
}

export async function createWorkout(req, res, next) {
  try {
    const payload = {
      ...normalizeWorkoutPayload(req.body, { requireName: true }),
      coach_id: req.user.id
    };

    if (Object.hasOwn(payload, 'student_id')) {
      payload.student_id = await assertStudentBelongsToCoach({
        studentId: payload.student_id,
        coachId: req.user.id,
        allowNull: true
      });
    }

    const { data, error } = await supabase.from('workouts').insert(payload).select('*').single();
    if (error) throw error;
    return res.status(201).json(data);
  } catch (error) {
    return next(error);
  }
}

export async function updateWorkout(req, res, next) {
  try {
    const payload = normalizeWorkoutPayload(req.body, { requireName: false });
    if (Object.hasOwn(payload, 'student_id')) {
      payload.student_id = await assertStudentBelongsToCoach({
        studentId: payload.student_id,
        coachId: req.user.id,
        allowNull: true
      });
    }

    const { data, error } = await supabase
      .from('workouts')
      .update(payload)
      .eq('id', req.params.id)
      .eq('coach_id', req.user.id)
      .select('*')
      .single();

    if (error) throw error;
    return res.json(data);
  } catch (error) {
    return next(error);
  }
}

export async function deleteWorkout(req, res, next) {
  try {
    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', req.params.id)
      .eq('coach_id', req.user.id);

    if (error) throw error;
    return res.json({ message: 'Treino removido com sucesso.' });
  } catch (error) {
    return next(error);
  }
}

export async function exportWorkoutPdf(req, res, next) {
  try {
    const { data: workout, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('id', req.params.id)
      .eq('coach_id', req.user.id)
      .single();

    if (error) throw error;

    let studentName = '-';
    let studentAge = null;
    let studentGoal = '-';
    if (workout.student_id) {
      const { data: student } = await supabase
        .from('students')
        .select('name, age, goal')
        .eq('id', workout.student_id)
        .eq('coach_id', req.user.id)
        .maybeSingle();
      studentName = safeText(student?.name);
      studentAge = student?.age ?? null;
      studentGoal = safeText(student?.goal, '-');
    }

    const { data: coach } = await supabase
      .from('coaches')
      .select('name')
      .eq('id', req.user.id)
      .maybeSingle();

    const coachName = safeText(coach?.name, 'Profissional responsavel');
    const now = new Date();
    const generatedAt = now.toISOString();
    const protocol = `RG-${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${safeText(workout.id, '').slice(0, 6) || '000000'}`;
    const filename = `ficha-treino-${safeFileName(workout.name)}.pdf`;
    const doc = createModernWorkoutPdfStream({
      workout,
      studentName,
      studentGoal,
      studentAge,
      coachName,
      generatedAt,
      protocol
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);
    doc.end();
  } catch (error) {
    return next(error);
  }
}

export async function sendWorkoutByEmail(req, res, next) {
  try {
    const payload = ensureObjectPayload(req.body);
    assertAllowedKeys(payload, ['to', 'subject', 'message', 'attachPdf']);

    const to = toTrimmedString(payload.to, { fieldLabel: 'Email do aluno', required: true, maxLength: 180 });
    const subject = toTrimmedString(payload.subject, { fieldLabel: 'Assunto do email', required: true, maxLength: 180 });
    const customMessage = toTrimmedString(payload.message, { fieldLabel: 'Mensagem', required: false, emptyAsNull: true, maxLength: 4000 });
    const attachPdf = parseOptionalBoolean(payload.attachPdf ?? false);

    if (!isValidEmail(to)) {
      return res.status(400).json({ message: 'Informe um email valido para envio.' });
    }

    const { workout, student, coach, portalLink } = await loadWorkoutDeliveryContext({
      workoutId: req.params.id,
      coachId: req.user.id
    });

    let attachment = null;
    if (attachPdf) {
      const planProfile = await getUserPlanProfile(req.user.id);
      if (!hasPlanFeature(planProfile.plan, 'pdf_export')) {
        return res.status(403).json({
          message: 'Anexo em PDF disponivel a partir do plano Pro.'
        });
      }

      const pdfBuffer = await renderWorkoutPdfToBuffer(buildPdfPayload({ workout, student, coach }));
      attachment = {
        filename: `ficha-treino-${safeFileName(workout.name)}.pdf`,
        content: pdfBuffer.toString('base64')
      };
    }

    const { html, text } = buildWorkoutEmailContent({
      studentName: student?.name,
      coachName: coach?.name || req.user.email,
      workoutName: workout.name,
      workoutGoal: student?.goal,
      workoutSummary: summarizeWorkoutNotes(workout.notes),
      observations: workout.notes,
      exercises: Array.isArray(workout.exercises) ? workout.exercises : [],
      customMessage,
      portalLink
    });

    try {
      await sendWorkoutEmail({
        to,
        subject,
        html,
        text,
        attachment
      });
    } catch (error) {
      console.error('Falha ao enviar treino por email:', error);
      return res.status(502).json({
        message: 'Nao foi possivel enviar o email agora. Confira o endereco e tente novamente em alguns minutos.'
      });
    }

    return res.json({
      message: 'Treino enviado por email com sucesso.',
      portalLinkIncluded: Boolean(portalLink),
      pdfAttached: Boolean(attachment)
    });
  } catch (error) {
    return next(error);
  }
}
