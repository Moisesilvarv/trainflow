import { supabase } from '../services/supabase.js';
import { sendPaymentConfirmedEmail } from '../services/notificationService.js';
import { assertStudentBelongsToCoach } from '../utils/ownership.js';
import { assertAllowedKeys, ensureObjectPayload, toDateString, toRequiredNumber, toTrimmedString } from '../utils/payloadValidation.js';

function normalizePaymentPayload(body = {}) {
  const payload = ensureObjectPayload(body);
  assertAllowedKeys(payload, ['student_id', 'description', 'amount', 'due_date', 'status', 'paid_at']);
  return {
    student_id: toTrimmedString(payload.student_id, { fieldLabel: 'Aluno', emptyAsNull: true, maxLength: 80 }),
    description: toTrimmedString(payload.description, { fieldLabel: 'Descricao', emptyAsNull: true, maxLength: 200 }),
    amount: toRequiredNumber(payload.amount, { fieldLabel: 'Valor', min: 0.01, max: 100000000 }),
    due_date: toDateString(payload.due_date, { fieldLabel: 'Data de vencimento', required: true })
  };
}

async function getPaymentStudent(payment) {
  if (!payment?.student_id) return null;

  const { data } = await supabase
    .from('students')
    .select('id, name')
    .eq('id', payment.student_id)
    .eq('coach_id', payment.coach_id)
    .maybeSingle();

  return data || null;
}

export async function listPayments(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('coach_id', req.user.id)
      .order('due_date', { ascending: false });

    if (error) throw error;
    return res.json(data);
  } catch (error) {
    return next(error);
  }
}

export async function createPayment(req, res, next) {
  try {
    const payload = normalizePaymentPayload(req.body);
    if (Object.hasOwn(payload, 'student_id')) {
      payload.student_id = await assertStudentBelongsToCoach({
        studentId: payload.student_id,
        coachId: req.user.id,
        allowNull: true
      });
    }

    const { data, error } = await supabase
      .from('payments')
      .insert({ ...payload, coach_id: req.user.id })
      .select('*')
      .single();

    if (error) throw error;
    return res.status(201).json(data);
  } catch (error) {
    return next(error);
  }
}

export async function markPaymentAsPaid(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('payments')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('coach_id', req.user.id)
      .select('*')
      .single();

    if (error) throw error;
    const student = await getPaymentStudent(data);
    await sendPaymentConfirmedEmail({
      userId: req.user.id,
      payment: {
        ...data,
        paymentMethod: 'manual'
      },
      student,
      source: 'manual'
    }).catch(() => {});
    return res.json(data);
  } catch (error) {
    return next(error);
  }
}

export async function deletePayment(req, res, next) {
  try {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', req.params.id)
      .eq('coach_id', req.user.id);

    if (error) throw error;
    return res.json({ message: 'Pagamento removido com sucesso.' });
  } catch (error) {
    return next(error);
  }
}

export async function financeSummary(req, res, next) {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('amount, status')
      .eq('coach_id', req.user.id);

    if (error) throw error;

    const total = (data || []).reduce((acc, item) => acc + Number(item.amount), 0);
    const pending = (data || []).filter((p) => p.status === 'pending').reduce((acc, item) => acc + Number(item.amount), 0);
    const paid = (data || []).filter((p) => p.status === 'paid').reduce((acc, item) => acc + Number(item.amount), 0);

    return res.json({ total, pending, paid });
  } catch (error) {
    return next(error);
  }
}

export async function dispatchPaymentReminders(req, res, next) {
  try {
    const now = new Date();
    const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('payments')
      .select('id, student_id, due_date, amount, description')
      .eq('coach_id', req.user.id)
      .eq('status', 'pending');

    if (error) throw error;

    const reminders = (data || []).filter((payment) => {
      const due = new Date(`${payment.due_date}T00:00:00`);
      if (Number.isNaN(due.getTime())) return false;
      return due >= new Date(now.getFullYear(), now.getMonth(), now.getDate()) && due <= inThreeDays;
    });

    return res.json({
      message: 'Lembretes de mensalidade processados com sucesso.',
      remindersDispatched: reminders.length,
      reminders
    });
  } catch (error) {
    return next(error);
  }
}
