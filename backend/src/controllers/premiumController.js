import {
  createContract as createContractRecord,
  createRecurringPayment,
  getAutomationLogs,
  getContracts as getContractRecords,
  getDefaultWhatsappAutomations,
  getPaymentIntegrations as getStoredPaymentIntegrations,
  getRecurringPayments,
  getWhatsappAutomations,
  logAutomation,
  savePaymentIntegrations,
  saveWhatsappAutomations,
  signContract as signContractRecord,
  updateRecurringPaymentStatus
} from '../services/premiumPersistence.js';
import { supabase } from '../services/supabase.js';

function startOfMonth(baseDate = new Date()) {
  return new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function formatStudentSignal(student, reason) {
  return {
    id: student.id,
    name: student.name,
    goal: student.goal || 'Sem objetivo definido',
    reason
  };
}

export async function getPaymentIntegrations(req, res, next) {
  try {
    return res.json(await getStoredPaymentIntegrations(req.user.id));
  } catch (error) {
    return next(error);
  }
}

export async function updatePaymentIntegrations(req, res, next) {
  try {
    const nextConfig = await savePaymentIntegrations(req.user.id, req.body);
    await logAutomation(req.user.id, { type: 'payment_integration_update', status: 'saved' });
    return res.json(nextConfig);
  } catch (error) {
    return next(error);
  }
}

export async function getContracts(req, res, next) {
  try {
    return res.json(await getContractRecords(req.user.id));
  } catch (error) {
    return next(error);
  }
}

export async function createContract(req, res, next) {
  try {
    const contract = await createContractRecord(req.user.id, req.body);
    return res.status(201).json(contract);
  } catch (error) {
    return next(error);
  }
}

export async function signContract(req, res, next) {
  try {
    const contract = await signContractRecord(req.user.id, req.params.contractId, req.body?.signerName);
    if (!contract) {
      return res.status(404).json({ message: 'Contrato nao encontrado.' });
    }

    return res.json(contract);
  } catch (error) {
    return next(error);
  }
}

export async function getRecurringBilling(req, res, next) {
  try {
    return res.json(await getRecurringPayments(req.user.id));
  } catch (error) {
    return next(error);
  }
}

export async function createRecurringBilling(req, res, next) {
  try {
    const studentId = String(req.body?.studentId || '').trim();
    const amount = Number(req.body?.amount || 0);
    const nextDueDate = String(req.body?.nextDueDate || req.body?.dueDate || '').trim();
    const provider = String(req.body?.provider || 'config_required').trim();

    if (!studentId || !amount || !nextDueDate) {
      return res.status(400).json({ message: 'studentId, amount e nextDueDate sao obrigatorios.' });
    }

    const { data: student, error } = await supabase
      .from('students')
      .select('id')
      .eq('id', studentId)
      .eq('coach_id', req.user.id)
      .maybeSingle();

    if (error) throw error;
    if (!student?.id) {
      return res.status(404).json({ message: 'Aluno nao encontrado.' });
    }

    const item = await createRecurringPayment(req.user.id, {
      studentId,
      amount,
      nextDueDate,
      provider,
      status: provider === 'stripe' ? 'active' : 'config_required'
    });

    await logAutomation(req.user.id, { studentId, type: 'recurring_billing_created', status: item.status });
    return res.status(201).json(item);
  } catch (error) {
    return next(error);
  }
}

export async function updateRecurringBillingStatus(req, res, next) {
  try {
    const item = await updateRecurringPaymentStatus(req.user.id, req.params.recurringPaymentId, req.body?.status);
    if (!item) {
      return res.status(404).json({ message: 'Cobranca recorrente nao encontrada.' });
    }

    await logAutomation(req.user.id, { studentId: item.student_id, type: 'recurring_billing_status', status: item.status });
    return res.json(item);
  } catch (error) {
    return next(error);
  }
}

export async function getWhatsappAutomationSettings(req, res, next) {
  try {
    return res.json(await getWhatsappAutomations(req.user.id));
  } catch (error) {
    return next(error);
  }
}

export async function updateWhatsappAutomationSettings(req, res, next) {
  try {
    const nextConfig = await saveWhatsappAutomations(req.user.id, req.body);
    await logAutomation(req.user.id, { type: 'whatsapp_automation_updated', status: nextConfig.active ? 'active' : 'paused' });
    return res.json(nextConfig);
  } catch (error) {
    return next(error);
  }
}

export async function getAutomationAudit(req, res, next) {
  try {
    return res.json(await getAutomationLogs(req.user.id));
  } catch (error) {
    return next(error);
  }
}

export async function getPremiumResourcesOverview(req, res, next) {
  try {
    const [studentsRes, paymentsRes, recurringPayments, automationLogs] = await Promise.all([
      supabase.from('students').select('id').eq('coach_id', req.user.id),
      supabase.from('payments').select('id, status').eq('coach_id', req.user.id),
      getRecurringPayments(req.user.id),
      getAutomationLogs(req.user.id)
    ]);

    return res.json({
      resources: [
        {
          key: 'student_portal',
          title: 'Area do aluno',
          description: 'Acesso digital para treinos, agenda, pagamentos e evolucao.',
          status: 'Premium',
          configured: true,
          meta: `${studentsRes.data?.length || 0} aluno(s) elegiveis`
        },
        {
          key: 'recurring_billing',
          title: 'Cobranca recorrente',
          description: 'Estrutura pronta para automatizar mensalidades e repasses.',
          status: recurringPayments.length ? 'Configurar gateway' : 'Configurar gateway',
          configured: false,
          meta: 'Necessario configurar Stripe para ativar'
        },
        {
          key: 'whatsapp_automation',
          title: 'WhatsApp automatico',
          description: 'Lembretes de treino, pagamento, avaliacao e renovacao.',
          status: 'Em breve',
          configured: false,
          meta: 'Integracao oficial em implantacao'
        },
        {
          key: 'ai_unlimited',
          title: 'IA ilimitada',
          description: 'Assistente por aluno para ajustes, ideias e ganho de tempo.',
          status: 'Ativo',
          configured: true,
          meta: 'Sem limite mensal'
        },
        {
          key: 'smart_dashboard',
          title: 'Dashboard inteligente',
          description: 'Alertas de risco, inadimplencia e oportunidades de retencao.',
          status: 'Ativo',
          configured: true,
          meta: `${(paymentsRes.data || []).filter((item) => item.status === 'pending').length} pendencia(s)`
        },
        {
          key: 'advanced_automations',
          title: 'Automacoes avancadas',
          description: 'Logs, gatilhos e arquitetura pronta para novos fluxos.',
          status: 'Em breve',
          configured: false,
          meta: `${automationLogs.length} log(s) historicos`
        }
      ]
    });
  } catch (error) {
    return next(error);
  }
}

export async function getSmartDashboard(req, res, next) {
  try {
    const coachId = req.user.id;
    const [studentsRes, workoutsRes, scheduleRes, paymentsRes] = await Promise.all([
      supabase.from('students').select('id, name, goal, status, created_at').eq('coach_id', coachId),
      supabase.from('workouts').select('student_id, created_at').eq('coach_id', coachId),
      supabase.from('schedule').select('student_id, class_date, status').eq('coach_id', coachId),
      supabase.from('payments').select('student_id, amount, status, due_date, paid_at').eq('coach_id', coachId)
    ]);

    const students = studentsRes.data || [];
    const workouts = workoutsRes.data || [];
    const schedule = scheduleRes.data || [];
    const payments = paymentsRes.data || [];

    const workoutThreshold = daysAgo(21);
    const scheduleThreshold = daysAgo(14);
    const now = new Date();
    const monthStart = startOfMonth(now);

    const studentsWithoutRecentWorkout = students.filter((student) => {
      const recent = workouts.some((item) => item.student_id === student.id && new Date(item.created_at) >= workoutThreshold);
      return !recent;
    }).map((student) => formatStudentSignal(student, 'Sem treino recente'));

    const studentsWithoutRecentSchedule = students.filter((student) => {
      const recent = schedule.some((item) => item.student_id === student.id && item.status !== 'cancelled' && new Date(item.class_date) >= scheduleThreshold);
      return !recent;
    }).map((student) => formatStudentSignal(student, 'Sem agendamento recente'));

    const overdueStudents = students.filter((student) => {
      return payments.some((item) => item.student_id === student.id && item.status === 'pending' && item.due_date && new Date(`${item.due_date}T00:00:00`) < now);
    }).map((student) => formatStudentSignal(student, 'Pagamento vencido'));

    const cancellationRisk = students.filter((student) => {
      const noWorkout = !workouts.some((item) => item.student_id === student.id && new Date(item.created_at) >= workoutThreshold);
      const noSchedule = !schedule.some((item) => item.student_id === student.id && item.status !== 'cancelled' && new Date(item.class_date) >= scheduleThreshold);
      const hasOverdue = payments.some((item) => item.student_id === student.id && item.status === 'pending' && item.due_date && new Date(`${item.due_date}T00:00:00`) < now);
      return (noWorkout && noSchedule) || (hasOverdue && noWorkout);
    }).map((student) => formatStudentSignal(student, 'Possivel risco de cancelamento'));

    const monthlyRevenue = payments
      .filter((item) => item.status === 'paid' && item.paid_at && new Date(item.paid_at) >= monthStart)
      .reduce((acc, item) => acc + Number(item.amount || 0), 0);

    const pendingPayments = payments
      .filter((item) => item.status === 'pending')
      .reduce((acc, item) => acc + Number(item.amount || 0), 0);

    const activeStudents = students.filter((student) => student.status === 'active').length;
    const totalStudents = students.length;
    const growthRate = totalStudents ? Math.round((activeStudents / totalStudents) * 100) : 0;

    return res.json({
      alerts: {
        overdueStudents,
        studentsWithoutRecentWorkout,
        studentsWithoutRecentSchedule,
        cancellationRisk
      },
      metrics: {
        monthlyRevenue,
        pendingPayments,
        activeStudents,
        totalStudents,
        growthRate
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function getPremiumAutomationDefaults(req, res, next) {
  try {
    return res.json({
      paymentIntegrations: await getStoredPaymentIntegrations(req.user.id),
      whatsappAutomations: await getWhatsappAutomations(req.user.id),
      recurringPayments: await getRecurringPayments(req.user.id),
      automationLogs: await getAutomationLogs(req.user.id),
      defaults: getDefaultWhatsappAutomations()
    });
  } catch (error) {
    return next(error);
  }
}
