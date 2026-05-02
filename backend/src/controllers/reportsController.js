import { supabase } from '../services/supabase.js';

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date) {
  return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
}

function buildMonthSeries() {
  const now = new Date();
  const series = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    series.push({ key: monthKey(d), month: monthLabel(d), revenue: 0, students: 0, workouts: 0 });
  }
  return series;
}

export async function getAdvancedReport(req, res, next) {
  try {
    const coachId = req.user.id;
    const [paymentsRes, studentsRes, workoutsRes, scheduleRes] = await Promise.all([
      supabase.from('payments').select('amount, status, paid_at, due_date').eq('coach_id', coachId),
      supabase.from('students').select('id, status, created_at').eq('coach_id', coachId),
      supabase.from('workouts').select('id, created_at').eq('coach_id', coachId),
      supabase.from('schedule').select('id, status, class_date').eq('coach_id', coachId)
    ]);

    const months = buildMonthSeries();
    const byKey = Object.fromEntries(months.map((item) => [item.key, item]));

    (paymentsRes.data || []).forEach((item) => {
      if (item.status !== 'paid') return;
      const date = new Date(item.paid_at || item.due_date || 0);
      if (Number.isNaN(date.getTime())) return;
      const key = monthKey(date);
      if (!byKey[key]) return;
      byKey[key].revenue += Number(item.amount || 0);
    });

    (studentsRes.data || []).forEach((item) => {
      const date = new Date(item.created_at || 0);
      if (Number.isNaN(date.getTime())) return;
      const key = monthKey(date);
      if (!byKey[key]) return;
      byKey[key].students += 1;
    });

    (workoutsRes.data || []).forEach((item) => {
      const date = new Date(item.created_at || 0);
      if (Number.isNaN(date.getTime())) return;
      const key = monthKey(date);
      if (!byKey[key]) return;
      byKey[key].workouts += 1;
    });

    const totalStudents = (studentsRes.data || []).length;
    const activeStudents = (studentsRes.data || []).filter((item) => item.status === 'active').length;
    const retentionRate = totalStudents ? Math.round((activeStudents / totalStudents) * 100) : 0;
    const pendingPayments = (paymentsRes.data || []).filter((item) => item.status === 'pending').length;
    const scheduledClasses = (scheduleRes.data || []).filter((item) => item.status !== 'cancelled').length;

    return res.json({
      kpis: {
        totalStudents,
        activeStudents,
        retentionRate,
        pendingPayments,
        scheduledClasses
      },
      monthly: months.map((item) => ({
        month: item.month,
        revenue: Number(item.revenue.toFixed(2)),
        students: item.students,
        workouts: item.workouts
      }))
    });
  } catch (error) {
    return next(error);
  }
}

export async function getStudentHistory(req, res, next) {
  try {
    const coachId = req.user.id;
    const studentId = String(req.params.studentId || '').trim();

    const [studentRes, workoutsRes, progressRes, paymentsRes, scheduleRes] = await Promise.all([
      supabase.from('students').select('*').eq('id', studentId).eq('coach_id', coachId).maybeSingle(),
      supabase.from('workouts').select('id, name, created_at, exercises').eq('student_id', studentId).eq('coach_id', coachId).order('created_at', { ascending: false }),
      supabase.from('progress_records').select('*').eq('student_id', studentId).eq('coach_id', coachId).order('record_date', { ascending: true }),
      supabase.from('payments').select('id, amount, status, due_date, paid_at, description').eq('student_id', studentId).eq('coach_id', coachId).order('due_date', { ascending: false }),
      supabase.from('schedule').select('id, title, class_date, status').eq('student_id', studentId).eq('coach_id', coachId).order('class_date', { ascending: false })
    ]);

    if (!studentRes.data?.id) {
      return res.status(404).json({ message: 'Aluno nao encontrado.' });
    }

    return res.json({
      student: studentRes.data,
      workouts: workoutsRes.data || [],
      progress: progressRes.data || [],
      payments: paymentsRes.data || [],
      schedule: scheduleRes.data || []
    });
  } catch (error) {
    return next(error);
  }
}
