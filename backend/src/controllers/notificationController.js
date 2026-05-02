import {
  logNotification,
  sendClassReminderEmail,
  sendInactiveStudentsEmail,
  sendWeeklyFinancialSummaryEmail
} from '../services/notificationService.js';
import { supabase } from '../services/supabase.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(from, to = new Date()) {
  const date = new Date(from);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.floor((to.getTime() - date.getTime()) / DAY_MS));
}

function toDateLabel(value) {
  if (!value) return 'Sem atividade registrada';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem atividade registrada';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeZone: 'America/Sao_Paulo'
  }).format(date);
}

function weekReference(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function groupBy(items = [], key) {
  return items.reduce((acc, item) => {
    const value = item?.[key];
    if (!value) return acc;
    if (!acc.has(value)) acc.set(value, []);
    acc.get(value).push(item);
    return acc;
  }, new Map());
}

async function getStudentsByIds(ids = []) {
  const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
  if (!uniqueIds.length) return new Map();

  const { data, error } = await supabase
    .from('students')
    .select('id, coach_id, name, created_at')
    .in('id', uniqueIds);

  if (error) throw error;
  return new Map((data || []).map((student) => [student.id, student]));
}

async function fetchStudentLastActivity(students = []) {
  const ids = students.map((student) => student.id).filter(Boolean);
  const activity = new Map(students.map((student) => [student.id, student.created_at]));

  if (!ids.length) return activity;

  const [workoutsResult, progressResult, scheduleResult] = await Promise.all([
    supabase.from('workouts').select('student_id, created_at').in('student_id', ids),
    supabase.from('progress_records').select('student_id, created_at, record_date').in('student_id', ids),
    supabase.from('schedule').select('student_id, class_date, created_at').in('student_id', ids)
  ]);

  for (const result of [workoutsResult, progressResult, scheduleResult]) {
    if (result.error) throw result.error;
  }

  const touch = (studentId, value) => {
    if (!studentId || !value) return;
    const current = activity.get(studentId);
    const currentDate = current ? new Date(current) : null;
    const nextDate = new Date(value);
    if (Number.isNaN(nextDate.getTime())) return;
    if (!currentDate || Number.isNaN(currentDate.getTime()) || nextDate > currentDate) {
      activity.set(studentId, nextDate.toISOString());
    }
  };

  (workoutsResult.data || []).forEach((item) => touch(item.student_id, item.created_at));
  (progressResult.data || []).forEach((item) => touch(item.student_id, item.record_date || item.created_at));
  (scheduleResult.data || []).forEach((item) => touch(item.student_id, item.class_date || item.created_at));

  return activity;
}

async function hasRecentInactiveStudentNotification({ userId, studentId, since }) {
  const { data, error } = await supabase
    .from('notification_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('type', 'inactive_students')
    .eq('channel', 'email')
    .eq('reference_id', studentId)
    .eq('status', 'sent')
    .gte('created_at', since.toISOString())
    .limit(1);

  if (error) throw error;
  return Boolean(data?.length);
}

async function fetchWeeklySummary(userId, start, end, previousStart) {
  const [paidResult, pendingResult, previousPaidResult] = await Promise.all([
    supabase
      .from('payments')
      .select('id, amount, student_id, paid_at')
      .eq('coach_id', userId)
      .eq('status', 'paid')
      .gte('paid_at', start.toISOString())
      .lt('paid_at', end.toISOString()),
    supabase
      .from('payments')
      .select('id, amount, student_id, due_date')
      .eq('coach_id', userId)
      .eq('status', 'pending'),
    supabase
      .from('payments')
      .select('id, amount, paid_at')
      .eq('coach_id', userId)
      .eq('status', 'paid')
      .gte('paid_at', previousStart.toISOString())
      .lt('paid_at', start.toISOString())
  ]);

  for (const result of [paidResult, pendingResult, previousPaidResult]) {
    if (result.error) throw result.error;
  }

  const paid = paidResult.data || [];
  const pending = pendingResult.data || [];
  const previousPaid = previousPaidResult.data || [];
  const today = new Date().toISOString().slice(0, 10);
  const overdueStudentIds = new Set(
    pending
      .filter((payment) => payment.student_id && payment.due_date && payment.due_date < today)
      .map((payment) => payment.student_id)
  );

  const revenueTotal = paid.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const previousRevenue = previousPaid.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const pendingTotal = pending.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const diff = revenueTotal - previousRevenue;
  const comparisonLabel = previousRevenue > 0
    ? `${diff >= 0 ? '+' : '-'}${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(diff))} vs. semana anterior`
    : 'Sem receita registrada na semana anterior';

  return {
    revenueTotal,
    paidCount: paid.length,
    pendingCount: pending.length,
    pendingTotal,
    overdueStudentsCount: overdueStudentIds.size,
    comparisonLabel
  };
}

export async function runClassReminders(req, res, next) {
  try {
    const now = new Date();
    const limit = new Date(now.getTime() + DAY_MS);
    const { data: classes, error } = await supabase
      .from('schedule')
      .select('id, coach_id, student_id, title, class_date, reminder_sent, status')
      .eq('status', 'scheduled')
      .eq('reminder_sent', false)
      .gte('class_date', now.toISOString())
      .lte('class_date', limit.toISOString());

    if (error) throw error;

    const studentsById = await getStudentsByIds((classes || []).map((item) => item.student_id));
    let sent = 0;
    let skipped = 0;
    let failed = 0;
    const reminderIdsToMark = [];

    for (const classItem of classes || []) {
      try {
        const result = await sendClassReminderEmail({
          userId: classItem.coach_id,
          classItem,
          student: studentsById.get(classItem.student_id) || null
        });

        if (result.sent || result.reason === 'duplicate') {
          reminderIdsToMark.push(classItem.id);
        }
        if (result.sent) sent += 1;
        else skipped += 1;
      } catch {
        failed += 1;
      }
    }

    if (reminderIdsToMark.length) {
      const { error: updateError } = await supabase
        .from('schedule')
        .update({ reminder_sent: true })
        .in('id', reminderIdsToMark);
      if (updateError) throw updateError;
    }

    return res.json({
      message: 'Lembretes de aula processados com sucesso.',
      processed: (classes || []).length,
      sent,
      skipped,
      failed
    });
  } catch (error) {
    return next(error);
  }
}

export async function runInactiveStudents(req, res, next) {
  try {
    const thresholdDays = Number(req.body?.days || 7);
    const threshold = new Date(Date.now() - thresholdDays * DAY_MS);
    const dedupeSince = new Date(Date.now() - 7 * DAY_MS);
    const { data: students, error } = await supabase
      .from('students')
      .select('id, coach_id, name, status, created_at')
      .eq('status', 'active');

    if (error) throw error;

    const lastActivityByStudent = await fetchStudentLastActivity(students || []);
    const inactiveByCoach = new Map();

    for (const student of students || []) {
      const lastActivity = lastActivityByStudent.get(student.id) || student.created_at;
      const lastDate = new Date(lastActivity);
      if (Number.isNaN(lastDate.getTime()) || lastDate > threshold) continue;
      if (await hasRecentInactiveStudentNotification({
        userId: student.coach_id,
        studentId: student.id,
        since: dedupeSince
      })) {
        continue;
      }

      if (!inactiveByCoach.has(student.coach_id)) inactiveByCoach.set(student.coach_id, []);
      inactiveByCoach.get(student.coach_id).push({
        id: student.id,
        name: student.name,
        daysInactive: daysBetween(lastActivity),
        lastActivityLabel: toDateLabel(lastActivity)
      });
    }

    let sent = 0;
    let skipped = 0;
    let failed = 0;
    const referenceDate = weekReference();

    for (const [userId, inactiveStudents] of inactiveByCoach.entries()) {
      try {
        const result = await sendInactiveStudentsEmail({
          userId,
          students: inactiveStudents,
          referenceId: `daily:${referenceDate}`
        });

        if (result.sent) {
          sent += 1;
          await Promise.all(inactiveStudents.map((student) => logNotification({
            userId,
            type: 'inactive_students',
            referenceId: student.id,
            status: 'sent'
          }).catch(() => {})));
        } else {
          skipped += 1;
        }
      } catch {
        failed += 1;
      }
    }

    return res.json({
      message: 'Verificacao de alunos inativos processada com sucesso.',
      inactiveStudents: Array.from(inactiveByCoach.values()).reduce((sum, items) => sum + items.length, 0),
      emailsSent: sent,
      skipped,
      failed
    });
  } catch (error) {
    return next(error);
  }
}

export async function runWeeklyFinancialSummary(req, res, next) {
  try {
    const end = new Date();
    const start = new Date(end.getTime() - 7 * DAY_MS);
    const previousStart = new Date(start.getTime() - 7 * DAY_MS);
    const { data: users, error } = await supabase
      .from('users')
      .select('id');

    if (error) throw error;

    let sent = 0;
    let skipped = 0;
    let failed = 0;
    const referenceId = `week:${weekReference(start)}`;
    const usersById = groupBy(users || [], 'id');

    for (const userId of usersById.keys()) {
      try {
        const summary = await fetchWeeklySummary(userId, start, end, previousStart);
        const result = await sendWeeklyFinancialSummaryEmail({ userId, summary, referenceId });
        if (result.sent) sent += 1;
        else skipped += 1;
      } catch {
        failed += 1;
      }
    }

    return res.json({
      message: 'Resumo financeiro semanal processado com sucesso.',
      processedUsers: (users || []).length,
      sent,
      skipped,
      failed
    });
  } catch (error) {
    return next(error);
  }
}
