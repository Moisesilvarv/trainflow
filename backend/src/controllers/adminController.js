import { normalizePlanId, parsePlanId } from '../constants/plans.js';
import { supabase } from '../services/supabase.js';

export async function adminOverview(req, res, next) {
  try {
    const [usersRes, plansRes, paymentsRes] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('plan'),
      supabase.from('platform_revenue').select('amount')
    ]);

    const plans = { basic: 0, pro: 0, premium: 0 };
    (plansRes.data || []).forEach((row) => {
      const normalizedPlan = normalizePlanId(row.plan);
      plans[normalizedPlan] = (plans[normalizedPlan] || 0) + 1;
    });

    const revenue = (paymentsRes.data || []).reduce((acc, item) => acc + Number(item.amount), 0);

    return res.json({
      totalUsers: usersRes.count || 0,
      plans,
      platformRevenue: revenue
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateUserPlanAsAdmin(req, res, next) {
  try {
    const userId = String(req.params.userId || '').trim();
    const plan = parsePlanId(req.body?.plan);

    if (!userId || !plan) {
      return res.status(400).json({ message: 'userId e plan sao obrigatorios.' });
    }

    const payload = {
      plan,
      plan_status: String(req.body?.planStatus || 'active').trim() || 'active',
      updated_at: new Date().toISOString()
    };

    const { error: userError } = await supabase.from('users').update(payload).eq('id', userId);
    if (userError) throw userError;

    const { error: coachError } = await supabase.from('coaches').update(payload).eq('id', userId);
    if (coachError) throw coachError;

    return res.json({ message: 'Plano atualizado manualmente.', plan: payload.plan, planStatus: payload.plan_status });
  } catch (error) {
    return next(error);
  }
}
