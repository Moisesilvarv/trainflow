import { supabase } from '../services/supabase.js';

function monthKeyFromDate(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

function monthLabelFromDate(date) {
  const month = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  const year = String(date.getFullYear()).slice(-2);
  return `${month}/${year}`;
}

function buildLastSixMonths() {
  const currentMonthStart = new Date();
  currentMonthStart.setDate(1);
  currentMonthStart.setHours(0, 0, 0, 0);

  const months = [];
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() - i, 1);
    months.push({
      key: monthKeyFromDate(date),
      month: monthLabelFromDate(date),
      value: 0
    });
  }

  return months;
}

export async function getDashboardMetrics(req, res, next) {
  try {
    const coachId = req.user.id;

    const [
      { count: totalStudents },
      { count: activeStudents },
      { count: pendingPayments },
      { count: upcomingClasses },
      { count: workoutsCreated }
    ] = await Promise.all([
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('coach_id', coachId),
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('coach_id', coachId).eq('status', 'active'),
      supabase.from('payments').select('*', { count: 'exact', head: true }).eq('coach_id', coachId).eq('status', 'pending'),
      supabase.from('schedule').select('*', { count: 'exact', head: true }).eq('coach_id', coachId).gte('class_date', new Date().toISOString()),
      supabase.from('workouts').select('*', { count: 'exact', head: true }).eq('coach_id', coachId)
    ]);

    const { data: revenueData } = await supabase
      .from('payments')
      .select('amount, paid_at')
      .eq('coach_id', coachId)
      .eq('status', 'paid')
      .order('paid_at', { ascending: true });

    const lastSixMonths = buildLastSixMonths();
    const monthlyByKey = Object.fromEntries(lastSixMonths.map((item) => [item.key, item]));

    (revenueData || []).forEach((payment) => {
      if (!payment.paid_at) return;
      const paidAt = new Date(payment.paid_at);
      if (Number.isNaN(paidAt.getTime())) return;

      const key = monthKeyFromDate(paidAt);
      if (!monthlyByKey[key]) return;

      monthlyByKey[key].value += Number(payment.amount || 0);
    });

    const monthlyRevenue = lastSixMonths.map((item) => ({
      month: item.month,
      value: Number(monthlyByKey[item.key].value.toFixed(2))
    }));

    const monthlyRevenueTotal = (revenueData || []).reduce((acc, item) => acc + Number(item.amount), 0);

    return res.json({
      totalStudents: totalStudents || 0,
      activeStudents: activeStudents || 0,
      workoutsCreated: workoutsCreated || 0,
      pendingPayments: pendingPayments || 0,
      upcomingClasses: upcomingClasses || 0,
      monthlyRevenue,
      monthlyRevenueTotal,
      retentionRate: Math.round(((activeStudents || 0) / Math.max(totalStudents || 1, 1)) * 100)
    });
  } catch (error) {
    return next(error);
  }
}
