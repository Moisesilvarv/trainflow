import { supabase } from '../services/supabase.js';
import { assertStudentBelongsToCoach } from '../utils/ownership.js';
import { assertAllowedKeys, ensureObjectPayload, toDateTimeString, toEnum, toTrimmedString } from '../utils/payloadValidation.js';

function normalizeSchedulePayload(body = {}, { requireBaseFields = false } = {}) {
  const payload = ensureObjectPayload(body);
  assertAllowedKeys(payload, ['student_id', 'title', 'class_date', 'status', 'reminder_sent']);

  const out = {};
  if (Object.hasOwn(payload, 'student_id')) out.student_id = toTrimmedString(payload.student_id, { fieldLabel: 'Aluno', emptyAsNull: true, maxLength: 80 });
  if (requireBaseFields || Object.hasOwn(payload, 'title')) out.title = toTrimmedString(payload.title, { fieldLabel: 'Titulo da aula', required: requireBaseFields, maxLength: 180 });
  if (requireBaseFields || Object.hasOwn(payload, 'class_date')) out.class_date = toDateTimeString(payload.class_date, { fieldLabel: 'Data da aula', required: requireBaseFields });
  if (Object.hasOwn(payload, 'status')) out.status = toEnum(payload.status, ['scheduled', 'cancelled'], { fieldLabel: 'Status', required: false });
  if (Object.hasOwn(payload, 'reminder_sent')) out.reminder_sent = Boolean(payload.reminder_sent);
  return out;
}

export async function listSchedule(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('schedule')
      .select('*')
      .eq('coach_id', req.user.id)
      .order('class_date', { ascending: true });

    if (error) throw error;
    return res.json(data);
  } catch (error) {
    return next(error);
  }
}

export async function createSchedule(req, res, next) {
  try {
    const payload = normalizeSchedulePayload(req.body, { requireBaseFields: true });
    if (Object.hasOwn(payload, 'student_id')) {
      payload.student_id = await assertStudentBelongsToCoach({
        studentId: payload.student_id,
        coachId: req.user.id,
        allowNull: true
      });
    }

    const { data, error } = await supabase
      .from('schedule')
      .insert({ ...payload, coach_id: req.user.id, reminder_sent: false })
      .select('*')
      .single();

    if (error) throw error;
    return res.status(201).json(data);
  } catch (error) {
    return next(error);
  }
}

export async function updateSchedule(req, res, next) {
  try {
    const payload = normalizeSchedulePayload(req.body, { requireBaseFields: false });
    if (Object.hasOwn(payload, 'student_id')) {
      payload.student_id = await assertStudentBelongsToCoach({
        studentId: payload.student_id,
        coachId: req.user.id,
        allowNull: true
      });
    }

    const { data, error } = await supabase
      .from('schedule')
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

export async function cancelSchedule(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('schedule')
      .update({ status: 'cancelled' })
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

export async function deleteSchedule(req, res, next) {
  try {
    const { error } = await supabase
      .from('schedule')
      .delete()
      .eq('id', req.params.id)
      .eq('coach_id', req.user.id);

    if (error) throw error;
    return res.json({ message: 'Evento removido com sucesso.' });
  } catch (error) {
    return next(error);
  }
}

export async function runReminderDispatch(req, res, next) {
  try {
    const now = new Date();
    const limit = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const { data: upcoming, error } = await supabase
      .from('schedule')
      .select('id, title, class_date, student_id')
      .eq('coach_id', req.user.id)
      .eq('status', 'scheduled')
      .eq('reminder_sent', false)
      .lte('class_date', limit)
      .gte('class_date', now.toISOString());

    if (error) throw error;

    const ids = (upcoming || []).map((item) => item.id);
    if (ids.length) {
      const { error: updateError } = await supabase
        .from('schedule')
        .update({ reminder_sent: true })
        .in('id', ids);

      if (updateError) throw updateError;
    }

    return res.json({
      message: 'Lembretes processados com sucesso.',
      remindersDispatched: ids.length
    });
  } catch (error) {
    return next(error);
  }
}
