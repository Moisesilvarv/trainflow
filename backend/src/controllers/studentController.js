import { supabase } from '../services/supabase.js';
import { getStudentLimitByPlan, normalizePlanId } from '../constants/plans.js';
import {
  assertAllowedKeys,
  ensureObjectPayload,
  toDateString,
  toEnum,
  toNullableNumber,
  toTrimmedString
} from '../utils/payloadValidation.js';
import { formatPersonName } from '../utils/personName.js';
import { isValidEmail } from '../utils/validation.js';

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function isMissingColumnError(error, columnName) {
  const message = String(error?.message || '').toLowerCase();
  const normalizedColumn = String(columnName || '').toLowerCase();
  return (
    message.includes(`column "${normalizedColumn}"`) && message.includes('does not exist')
  ) || message.includes(`could not find the '${normalizedColumn}' column`);
}

function stripUnsupportedStudentFields(payload = {}, error) {
  const next = { ...payload };
  if (isMissingColumnError(error, 'level')) delete next.level;
  if (isMissingColumnError(error, 'objective_notes')) delete next.objective_notes;
  if (isMissingColumnError(error, 'birth_date')) delete next.birth_date;
  return next;
}

function hasRetriableMissingStudentColumn(error) {
  return (
    isMissingColumnError(error, 'level') ||
    isMissingColumnError(error, 'objective_notes') ||
    isMissingColumnError(error, 'birth_date')
  );
}

async function runStudentWriteWithFallback(execute, initialPayload) {
  let currentPayload = { ...initialPayload };
  let lastResult = null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    lastResult = await execute(currentPayload);

    if (!lastResult?.error) {
      return lastResult;
    }

    if (!hasRetriableMissingStudentColumn(lastResult.error)) {
      return lastResult;
    }

    const nextPayload = stripUnsupportedStudentFields(currentPayload, lastResult.error);
    const changed = Object.keys(currentPayload).length !== Object.keys(nextPayload).length;

    if (!changed) {
      return lastResult;
    }

    currentPayload = nextPayload;
  }

  return lastResult;
}

export function normalizeStudentPayload(body = {}, { requireName = false } = {}) {
  const payload = ensureObjectPayload(body);
  assertAllowedKeys(payload, [
    'name',
    'birth_date',
    'age',
    'weight',
    'height',
    'goal',
    'restrictions',
    'phone',
    'email',
    'avatar_url',
    'status',
    'notes',
    'level',
    'objective_notes'
  ]);

  const out = {};

  if (requireName || Object.hasOwn(payload, 'name')) {
    const normalizedName = toTrimmedString(payload.name, { fieldLabel: 'Nome', required: requireName, maxLength: 120, emptyAsNull: !requireName });
    out.name = normalizedName ? formatPersonName(normalizedName) : normalizedName;
  }
  if (Object.hasOwn(payload, 'birth_date')) out.birth_date = toDateString(payload.birth_date, { fieldLabel: 'Data de nascimento', required: false });
  if (Object.hasOwn(payload, 'age')) out.age = toNullableNumber(payload.age, { fieldLabel: 'Idade', min: 0, max: 120 });
  if (Object.hasOwn(payload, 'weight')) out.weight = toNullableNumber(payload.weight, { fieldLabel: 'Peso', min: 0, max: 500 });
  if (Object.hasOwn(payload, 'height')) out.height = toNullableNumber(payload.height, { fieldLabel: 'Altura', min: 0, max: 300 });
  if (Object.hasOwn(payload, 'goal')) out.goal = toTrimmedString(payload.goal, { fieldLabel: 'Objetivo', required: false, emptyAsNull: true, maxLength: 140 });
  if (Object.hasOwn(payload, 'restrictions')) out.restrictions = toTrimmedString(payload.restrictions, { fieldLabel: 'Restricoes', required: false, emptyAsNull: true, maxLength: 500 });
  if (Object.hasOwn(payload, 'phone')) {
    const phone = toTrimmedString(payload.phone, { fieldLabel: 'Telefone', required: false, emptyAsNull: true, maxLength: 40 });
    if (phone && !/^[\d()+\-\s]+$/.test(phone)) {
      throw badRequest('Telefone deve conter apenas numeros e simbolos como (), + ou -.');
    }
    out.phone = phone;
  }
  if (Object.hasOwn(payload, 'email')) {
    const email = toTrimmedString(payload.email, { fieldLabel: 'Email', required: false, emptyAsNull: true, maxLength: 180 });
    if (email && !isValidEmail(email)) {
      throw badRequest('Email invalido.');
    }
    out.email = email;
  }
  if (Object.hasOwn(payload, 'avatar_url')) {
    out.avatar_url = toTrimmedString(payload.avatar_url, {
      fieldLabel: 'Foto do aluno',
      required: false,
      emptyAsNull: true,
      maxLength: 7_000_000
    });
  }
  if (Object.hasOwn(payload, 'status')) out.status = toEnum(payload.status, ['active', 'inactive'], { fieldLabel: 'Status', required: false }) || 'active';
  if (Object.hasOwn(payload, 'notes')) out.notes = toTrimmedString(payload.notes, { fieldLabel: 'Observacoes', required: false, emptyAsNull: true, maxLength: 2000 });
  if (Object.hasOwn(payload, 'level')) out.level = toTrimmedString(payload.level, { fieldLabel: 'Nivel', required: false, emptyAsNull: true, maxLength: 60 });
  if (Object.hasOwn(payload, 'objective_notes')) {
    out.objective_notes = toTrimmedString(payload.objective_notes, {
      fieldLabel: 'Resumo de objetivo',
      required: false,
      emptyAsNull: true,
      maxLength: 1000
    });
  }

  return out;
}

async function getCoachCurrentPlan(coachId) {
  const [{ data: userProfile }, { data: coachProfile }] = await Promise.all([
    supabase.from('users').select('plan').eq('id', coachId).maybeSingle(),
    supabase.from('coaches').select('plan').eq('id', coachId).maybeSingle()
  ]);

  return normalizePlanId(userProfile?.plan || coachProfile?.plan || 'basic');
}

export async function listStudents(req, res, next) {
  try {
    const { q = '' } = req.query;
    let query = supabase
      .from('students')
      .select('*')
      .eq('coach_id', req.user.id)
      .order('created_at', { ascending: false });

    if (q) query = query.ilike('name', `%${q}%`);

    const { data, error } = await query;
    if (error) throw error;
    return res.json(data);
  } catch (error) {
    return next(error);
  }
}

export async function createStudent(req, res, next) {
  try {
    const currentPlan = await getCoachCurrentPlan(req.user.id);
    const studentLimit = getStudentLimitByPlan(currentPlan);

    if (typeof studentLimit === 'number') {
      const { count, error: countError } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('coach_id', req.user.id);

      if (countError) throw countError;

      if ((count || 0) >= studentLimit) {
        return res.status(403).json({
          message: `Limite do plano atingido. Seu plano permite ate ${studentLimit} alunos.`
        });
      }
    }

    const normalizedPayload = normalizeStudentPayload(req.body, { requireName: true });
    const payload = {
      ...normalizedPayload,
      coach_id: req.user.id,
      status: normalizedPayload.status || 'active'
    };

    const result = await runStudentWriteWithFallback(
      (insertPayload) => supabase.from('students').insert(insertPayload).select('*').single(),
      payload
    );

    if (result.error) throw result.error;
    return res.status(201).json(result.data);
  } catch (error) {
    return next(error);
  }
}

export async function getStudentById(req, res, next) {
  try {
    const studentId = req.params.id;

    const [studentRes, workoutsRes, progressRes, paymentsRes, scheduleRes] = await Promise.all([
      supabase.from('students').select('*').eq('id', studentId).eq('coach_id', req.user.id).single(),
      supabase.from('workouts').select('*').eq('student_id', studentId).eq('coach_id', req.user.id).order('created_at', { ascending: false }),
      supabase.from('progress_records').select('*').eq('student_id', studentId).eq('coach_id', req.user.id).order('record_date', { ascending: false }),
      supabase.from('payments').select('*').eq('student_id', studentId).eq('coach_id', req.user.id).order('due_date', { ascending: false }),
      supabase.from('schedule').select('*').eq('student_id', studentId).eq('coach_id', req.user.id).order('class_date', { ascending: false })
    ]);

    if (studentRes.error) throw studentRes.error;

    return res.json({
      ...studentRes.data,
      workouts: workoutsRes.data || [],
      progress: progressRes.data || [],
      payments: paymentsRes.data || [],
      attendance: scheduleRes.data || []
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateStudent(req, res, next) {
  try {
    const normalized = normalizeStudentPayload(req.body, { requireName: false });
    const payload = { ...normalized };

    const result = await runStudentWriteWithFallback(
      (updatePayload) => supabase
        .from('students')
        .update(updatePayload)
        .eq('id', req.params.id)
        .eq('coach_id', req.user.id)
        .select('*')
        .single(),
      payload
    );

    if (result.error) throw result.error;
    return res.json(result.data);
  } catch (error) {
    return next(error);
  }
}

export async function deleteStudent(req, res, next) {
  try {
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', req.params.id)
      .eq('coach_id', req.user.id);

    if (error) throw error;
    return res.json({ message: 'Aluno removido com sucesso.' });
  } catch (error) {
    return next(error);
  }
}
