import { supabase } from '../services/supabase.js';
import { assertStudentBelongsToCoach } from '../utils/ownership.js';
import {
  assertAllowedKeys,
  ensureObjectPayload,
  toDateString,
  toNullableNumber,
  toTrimmedString
} from '../utils/payloadValidation.js';

function normalizeProgressPayload(body = {}) {
  const payload = ensureObjectPayload(body);
  assertAllowedKeys(payload, [
    'student_id',
    'weight',
    'body_fat',
    'body_measurements',
    'performance_notes',
    'evolution_photo_url',
    'record_date'
  ]);

  const out = {
    student_id: toTrimmedString(payload.student_id, { fieldLabel: 'Aluno', required: true, maxLength: 80 }),
    weight: toNullableNumber(payload.weight, { fieldLabel: 'Peso', min: 0, max: 500 }),
    body_fat: toNullableNumber(payload.body_fat, { fieldLabel: 'Percentual de gordura', min: 0, max: 100 }),
    body_measurements: payload.body_measurements && typeof payload.body_measurements === 'object' ? payload.body_measurements : {},
    performance_notes: toTrimmedString(payload.performance_notes, { fieldLabel: 'Notas de performance', emptyAsNull: true, maxLength: 3000 }),
    evolution_photo_url: toTrimmedString(payload.evolution_photo_url, { fieldLabel: 'URL da foto', emptyAsNull: true, maxLength: 2048 })
  };

  if (Object.hasOwn(payload, 'record_date')) {
    out.record_date = toDateString(payload.record_date, { fieldLabel: 'Data do registro', required: false });
  }

  return out;
}

export async function listProgress(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('progress_records')
      .select('*')
      .eq('coach_id', req.user.id)
      .order('record_date', { ascending: false });

    if (error) throw error;
    return res.json(data);
  } catch (error) {
    return next(error);
  }
}

export async function createProgress(req, res, next) {
  try {
    const payload = normalizeProgressPayload(req.body);
    payload.student_id = await assertStudentBelongsToCoach({
      studentId: payload.student_id,
      coachId: req.user.id,
      allowNull: false
    });

    const { data, error } = await supabase
      .from('progress_records')
      .insert({ ...payload, coach_id: req.user.id })
      .select('*')
      .single();

    if (error) throw error;
    return res.status(201).json(data);
  } catch (error) {
    return next(error);
  }
}
