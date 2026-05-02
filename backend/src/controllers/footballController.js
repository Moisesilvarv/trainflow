import { supabase } from '../services/supabase.js';
import { assertStudentBelongsToCoach } from '../utils/ownership.js';
import {
  assertAllowedKeys,
  ensureObjectPayload,
  toDateString,
  toNullableNumber,
  toTrimmedString
} from '../utils/payloadValidation.js';

function normalizeFootballAssessmentPayload(body = {}) {
  const payload = ensureObjectPayload(body);
  assertAllowedKeys(payload, [
    'student_id',
    'pass_score',
    'finishing_score',
    'speed_score',
    'endurance_score',
    'positioning_score',
    'decision_making_score',
    'psychological_score',
    'training_focus',
    'notes',
    'assessment_date'
  ]);

  const out = {
    student_id: toTrimmedString(payload.student_id, { fieldLabel: 'Aluno', emptyAsNull: true, maxLength: 80 }),
    pass_score: toNullableNumber(payload.pass_score, { fieldLabel: 'Passe', min: 0, max: 10 }),
    finishing_score: toNullableNumber(payload.finishing_score, { fieldLabel: 'Finalizacao', min: 0, max: 10 }),
    speed_score: toNullableNumber(payload.speed_score, { fieldLabel: 'Velocidade', min: 0, max: 10 }),
    endurance_score: toNullableNumber(payload.endurance_score, { fieldLabel: 'Resistencia', min: 0, max: 10 }),
    positioning_score: toNullableNumber(payload.positioning_score, { fieldLabel: 'Posicionamento', min: 0, max: 10 }),
    decision_making_score: toNullableNumber(payload.decision_making_score, { fieldLabel: 'Tomada de decisao', min: 0, max: 10 }),
    psychological_score: toNullableNumber(payload.psychological_score, { fieldLabel: 'Psicologico', min: 0, max: 10 }),
    training_focus: payload.training_focus && typeof payload.training_focus === 'object' ? payload.training_focus : {},
    notes: toTrimmedString(payload.notes, { fieldLabel: 'Notas', emptyAsNull: true, maxLength: 3000 })
  };

  if (Object.hasOwn(payload, 'assessment_date')) {
    out.assessment_date = toDateString(payload.assessment_date, { fieldLabel: 'Data da avaliacao', required: false });
  }

  return out;
}

export async function listFootballAssessments(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('football_assessments')
      .select('*')
      .eq('coach_id', req.user.id)
      .order('assessment_date', { ascending: false });

    if (error) throw error;
    return res.json(data);
  } catch (error) {
    return next(error);
  }
}

export async function createFootballAssessment(req, res, next) {
  try {
    const payload = {
      ...normalizeFootballAssessmentPayload(req.body),
      coach_id: req.user.id
    };

    if (Object.hasOwn(payload, 'student_id')) {
      payload.student_id = await assertStudentBelongsToCoach({
        studentId: payload.student_id,
        coachId: req.user.id,
        allowNull: true
      });
    }

    const { data, error } = await supabase
      .from('football_assessments')
      .insert(payload)
      .select('*')
      .single();

    if (error) throw error;
    return res.status(201).json(data);
  } catch (error) {
    return next(error);
  }
}
