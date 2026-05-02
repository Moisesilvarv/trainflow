import { env } from '../config/env.js';
import { sendTransactionalEmail } from './emailService.js';
import { supabase } from './supabase.js';

const defaultNotifications = {
  newPayments: true,
  classReminder: true,
  inactiveStudents: true,
  weeklyFinanceSummary: false,
  weeklyFinancialSummary: false
};

function escapeHtml(value = '') {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value || 0));
}

function toPositiveNumber(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return number;
  }
  return null;
}

function formatPaymentMethod(value) {
  const method = String(value || '').trim().toLowerCase();
  const labels = {
    card: 'Cartao',
    credit_card: 'Cartao de credito',
    pix: 'Pix',
    manual: 'Confirmacao manual',
    stripe_pix: 'Pix',
    stripe_invoice: 'Cartao'
  };
  return labels[method] || value || 'Nao informado';
}

function formatDateTime(value) {
  if (!value) return 'Nao informado';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Nao informado';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo'
  }).format(date);
}

function formatDate(value) {
  if (!value) return 'Nao informado';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Nao informado';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeZone: 'America/Sao_Paulo'
  }).format(date);
}

function getNotificationFlag(notifications = {}, key) {
  const merged = { ...defaultNotifications, ...(notifications || {}) };
  if (key === 'weeklyFinancialSummary') {
    return Boolean(merged.weeklyFinancialSummary ?? merged.weeklyFinanceSummary);
  }
  return Boolean(merged[key]);
}

async function getUserEmail(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function getUserNotifications(userId) {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('notifications')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return { ...defaultNotifications, ...(data?.notifications || {}) };
}

export async function hasSentNotification({ userId, type, referenceId, channel = 'email' }) {
  const { data, error } = await supabase
    .from('notification_logs')
    .select('id')
    .eq('user_id', userId)
    .eq('type', type)
    .eq('channel', channel)
    .eq('reference_id', String(referenceId || ''))
    .eq('status', 'sent')
    .limit(1);

  if (error) throw error;
  return Boolean(data?.length);
}

export async function logNotification({ userId, type, referenceId, channel = 'email', status, errorMessage = '' }) {
  await supabase.from('notification_logs').insert({
    user_id: userId,
    type,
    reference_id: String(referenceId || ''),
    channel,
    status,
    sent_at: status === 'sent' ? new Date().toISOString() : null,
    error_message: errorMessage || null
  });
}

function detailCard(label, value) {
  return `
    <div style="border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;padding:14px 16px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#64748b;">${escapeHtml(label)}</p>
      <p style="margin:0;font-size:15px;line-height:1.5;color:#0f172a;font-weight:700;">${escapeHtml(value || 'Nao informado')}</p>
    </div>
  `;
}

function buildEmailTemplate({ title, intro, details = '', body = '' }) {
  const appUrl = escapeHtml(env.frontendUrl || 'https://trainflow.com.br');
  return `
    <div style="margin:0;padding:0;background:#F8FAFC;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F8FAFC;margin:0;padding:36px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #e2e8f0;border-radius:22px;overflow:hidden;box-shadow:0 24px 60px rgba(15,23,42,0.08);">
              <tr>
                <td style="padding:30px 34px 8px;text-align:center;">
                  <div style="display:inline-block;border-radius:16px;background:#eff6ff;padding:12px 16px;color:#2563eb;font-size:22px;font-weight:900;">TrainFlow</div>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 38px 8px;text-align:center;">
                  <h1 style="margin:0;font-size:30px;line-height:1.15;font-weight:900;color:#0f172a;">${escapeHtml(title)}</h1>
                  <p style="margin:14px 0 0;font-size:16px;line-height:1.7;color:#475569;">${escapeHtml(intro)}</p>
                </td>
              </tr>
              <tr>
                <td style="padding:22px 34px;">
                  ${details ? `<div style="display:grid;gap:10px;">${details}</div>` : body}
                </td>
              </tr>
              <tr>
                <td style="padding:0 34px 30px;text-align:center;">
                  <a href="${appUrl}" style="display:inline-block;border-radius:12px;background:#2563eb;padding:14px 22px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:800;">Acessar TrainFlow</a>
                </td>
              </tr>
              <tr>
                <td style="border-top:1px solid #e2e8f0;background:#f8fafc;padding:18px 34px;text-align:center;">
                  <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">Voce recebeu este email porque esta notificacao esta ativa nas preferencias da sua conta.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}

async function sendNotificationEmail({ userId, type, referenceId, preferenceKey, subject, intro, details, body, text }) {
  const [user, notifications] = await Promise.all([
    getUserEmail(userId),
    getUserNotifications(userId)
  ]);

  if (!user?.email) return { sent: false, skipped: true, reason: 'user_email_missing' };
  if (!getNotificationFlag(notifications, preferenceKey)) {
    return { sent: false, skipped: true, reason: 'preference_disabled' };
  }
  if (await hasSentNotification({ userId, type, referenceId })) {
    return { sent: false, skipped: true, reason: 'duplicate' };
  }

  try {
    await sendTransactionalEmail({
      to: user.email,
      subject,
      html: buildEmailTemplate({ title: subject, intro, details, body }),
      text
    });
    await logNotification({ userId, type, referenceId, status: 'sent' });
    return { sent: true };
  } catch (error) {
    await logNotification({
      userId,
      type,
      referenceId,
      status: 'failed',
      errorMessage: error?.message || 'Falha ao enviar notificacao.'
    }).catch(() => {});
    throw error;
  }
}

export async function sendPaymentConfirmedEmail({ userId, payment, student = null, source = 'manual' }) {
  const paidAt = payment?.paid_at || payment?.paidAt || new Date().toISOString();
  const referenceId = payment?.id || payment?.externalId || `${source}:${paidAt}:${payment?.amount || 0}`;
  const amount = toPositiveNumber(
    payment?.amount,
    payment?.value,
    payment?.total,
    payment?.amountPaid,
    payment?.amount_paid,
    payment?.amountTotal,
    payment?.amount_total,
    payment?.price
  );
  if (source === 'manual' && (!payment?.id || !amount)) {
    return { sent: false, skipped: true, reason: 'incomplete_payment_payload' };
  }
  const serviceLabel = payment?.description
    || payment?.service
    || payment?.planName
    || payment?.plan
    || (source === 'manual' ? 'Pagamento manual' : 'Assinatura TrainFlow');
  const studentLabel = student?.name
    || payment?.studentName
    || (source === 'manual' ? 'Sem aluno vinculado' : 'Assinatura TrainFlow');
  const details = [
    detailCard(source === 'manual' ? 'Aluno' : 'Origem', studentLabel),
    detailCard('Valor pago', amount ? formatCurrency(amount) : 'Valor nao informado'),
    detailCard('Forma de pagamento', formatPaymentMethod(payment?.paymentMethod || payment?.payment_method || source)),
    detailCard('Confirmado em', formatDateTime(paidAt)),
    detailCard('Plano/servico', serviceLabel)
  ].join('');

  return sendNotificationEmail({
    userId,
    type: 'payment_confirmed',
    referenceId,
    preferenceKey: 'newPayments',
    subject: 'Novo pagamento confirmado',
    intro: 'Um novo pagamento foi confirmado no TrainFlow.',
    details,
    text: 'Um novo pagamento foi confirmado no TrainFlow.'
  });
}

export async function sendClassReminderEmail({ userId, classItem, student = null }) {
  const details = [
    detailCard('Aluno', student?.name || classItem?.studentName || 'Nao vinculado'),
    detailCard('Aula', classItem?.title || 'Aula agendada'),
    detailCard('Data e horario', formatDateTime(classItem?.class_date)),
    detailCard('Local', classItem?.location || 'Nao informado'),
    detailCard('Observacoes', classItem?.notes || 'Nao informado')
  ].join('');

  return sendNotificationEmail({
    userId,
    type: 'class_reminder',
    referenceId: classItem?.id,
    preferenceKey: 'classReminder',
    subject: 'Lembrete de aula agendada',
    intro: 'Voce tem uma aula agendada em breve.',
    details,
    text: 'Voce tem uma aula agendada em breve.'
  });
}

export async function sendInactiveStudentsEmail({ userId, students = [], referenceId = '' }) {
  if (!students.length) return { sent: false, skipped: true, reason: 'no_inactive_students' };

  const rows = students.map((student) => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#0f172a;">${escapeHtml(student.name)}</td>
      <td style="padding:10px;border-bottom:1px solid #e2e8f0;color:#475569;">${escapeHtml(String(student.daysInactive))} dias</td>
      <td style="padding:10px;border-bottom:1px solid #e2e8f0;color:#475569;">${escapeHtml(student.lastActivityLabel || 'Sem atividade registrada')}</td>
    </tr>
  `).join('');

  const body = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
      <thead>
        <tr style="background:#f8fafc;">
          <th align="left" style="padding:10px;color:#64748b;font-size:12px;text-transform:uppercase;">Aluno</th>
          <th align="left" style="padding:10px;color:#64748b;font-size:12px;text-transform:uppercase;">Inatividade</th>
          <th align="left" style="padding:10px;color:#64748b;font-size:12px;text-transform:uppercase;">Ultima atividade</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  return sendNotificationEmail({
    userId,
    type: 'inactive_students',
    referenceId,
    preferenceKey: 'inactiveStudents',
    subject: 'Alunos inativos detectados',
    intro: 'Alguns alunos estao sem atividade recente. Veja quem precisa de acompanhamento.',
    body,
    text: 'Alguns alunos estao sem atividade recente. Veja quem precisa de acompanhamento.'
  });
}

export async function sendWeeklyFinancialSummaryEmail({ userId, summary, referenceId }) {
  const details = [
    detailCard('Receita total da semana', formatCurrency(summary.revenueTotal)),
    detailCard('Pagamentos confirmados', String(summary.paidCount || 0)),
    detailCard('Pagamentos pendentes', `${summary.pendingCount || 0} (${formatCurrency(summary.pendingTotal)})`),
    detailCard('Alunos em atraso', String(summary.overdueStudentsCount || 0)),
    detailCard('Comparacao com semana anterior', summary.comparisonLabel || 'Nao informado')
  ].join('');

  return sendNotificationEmail({
    userId,
    type: 'weekly_financial_summary',
    referenceId,
    preferenceKey: 'weeklyFinancialSummary',
    subject: 'Resumo financeiro semanal TrainFlow',
    intro: 'Confira o resumo financeiro da sua operacao nesta semana.',
    details,
    text: 'Confira o resumo financeiro da sua operacao nesta semana.'
  });
}
