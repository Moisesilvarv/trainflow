import { sendTransactionalEmail } from './emailService.js';
import { getOfficialLogoDataUri } from '../utils/brandAssets.js';

function safeText(value, fallback = '-') {
  const text = String(value || '').trim();
  return text || fallback;
}

function summarizeWorkoutNotes(notes = '') {
  const text = String(notes || '').trim();
  if (!text) return 'Treino estruturado para acompanhamento profissional e execucao clara.';
  const firstSentence = text.split(/(?<=[.!?])\s+/)[0]?.trim();
  return safeText(firstSentence || text);
}

function escapeHtml(value = '') {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderExerciseLine(exercise = {}, index = 0) {
  const name = safeText(exercise.name, `Atividade ${index + 1}`);
  const details = [
    exercise.muscle_group ? `Foco: ${exercise.muscle_group}` : '',
    exercise.sets ? `Series ou duracao: ${exercise.sets}` : '',
    exercise.reps ? `Repeticoes ou tempo: ${exercise.reps}` : '',
    exercise.rest ? `Intervalo: ${exercise.rest}` : ''
  ].filter(Boolean);
  const notes = safeText(exercise.notes, '');

  return {
    html: `
      <li style="margin-bottom:16px;">
        <strong style="color:#0f172a;">${escapeHtml(name)}</strong>
        ${details.length ? `<div style="margin-top:4px;color:#475569;">${escapeHtml(details.join(' | '))}</div>` : ''}
        ${notes ? `<div style="margin-top:6px;color:#64748b;">${escapeHtml(notes)}</div>` : ''}
      </li>
    `,
    text: [
      `${index + 1}. ${name}`,
      details.length ? `   ${details.join(' | ')}` : '',
      notes ? `   ${notes}` : ''
    ].filter(Boolean).join('\n')
  };
}

const OFFICIAL_LOGO_DATA_URI = getOfficialLogoDataUri();

export function buildWorkoutEmailContent({
  studentName,
  coachName,
  workoutName,
  workoutGoal,
  workoutSummary,
  observations,
  exercises = [],
  customMessage,
  portalLink
}) {
  const safeStudentName = safeText(studentName, 'Aluno');
  const safeCoachName = safeText(coachName, 'Profissional responsavel');
  const safeWorkoutName = safeText(workoutName, 'Seu treino');
  const safeGoal = safeText(workoutGoal, 'Objetivo nao informado');
  const safeSummary = safeText(workoutSummary, summarizeWorkoutNotes(observations));
  const safeObservations = safeText(observations, 'Sem observacoes adicionais.');
  const safeCustomMessage = safeText(customMessage, '');

  const renderedExercises = exercises.map((exercise, index) => renderExerciseLine(exercise, index));
  const exercisesHtml = renderedExercises.length
    ? renderedExercises.map((item) => item.html).join('')
    : '<li style="margin-bottom:16px;">Treino sem atividades detalhadas no momento.</li>';
  const exercisesText = renderedExercises.length
    ? renderedExercises.map((item) => item.text).join('\n')
    : 'Treino sem atividades detalhadas no momento.';

  const portalSectionHtml = portalLink
    ? `
      <div style="margin-top:24px;">
        <a href="${escapeHtml(portalLink)}" style="display:inline-block;border-radius:14px;background:#2563eb;padding:14px 18px;color:#ffffff;text-decoration:none;font-weight:700;">
          Ver treino no portal do aluno
        </a>
      </div>
    `
    : '';

  const portalSectionText = portalLink ? `\nVer treino no portal do aluno: ${portalLink}\n` : '';

  const html = `
    <div style="margin:0;padding:24px;background:#f8fafc;font-family:Segoe UI,Arial,sans-serif;color:#0f172a;">
      <div style="max-width:720px;margin:0 auto;border:1px solid #e2e8f0;border-radius:28px;background:#ffffff;overflow:hidden;">
        <div style="padding:28px 32px;background:linear-gradient(135deg,#eff6ff 0%,#ffffff 60%,#ecfeff 100%);border-bottom:1px solid #e2e8f0;">
          <div style="text-align:center;">
            <img src="${OFFICIAL_LOGO_DATA_URI}" alt="TrainFlow" width="92" height="92" style="display:block;margin:0 auto 14px;width:92px;height:92px;border-radius:22px;" />
            <div style="display:inline-block;border-radius:999px;background:#dbeafe;padding:8px 14px;color:#1d4ed8;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">
              TrainFlow
            </div>
          </div>
          <h1 style="margin:18px 0 0;font-size:30px;line-height:1.1;text-align:center;">Treino enviado para ${escapeHtml(safeStudentName)}</h1>
          <p style="margin:14px 0 0;font-size:16px;line-height:1.7;color:#475569;text-align:center;">
            ${escapeHtml(safeCoachName)} compartilhou um novo treino com voce pela plataforma TrainFlow.
          </p>
        </div>

        <div style="padding:28px 32px;">
          ${safeCustomMessage ? `<p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#334155;">${escapeHtml(safeCustomMessage)}</p>` : ''}

          <div style="border:1px solid #e2e8f0;border-radius:22px;background:#f8fafc;padding:20px;">
            <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#2563eb;">Resumo do treino</p>
            <h2 style="margin:10px 0 0;font-size:24px;line-height:1.2;">${escapeHtml(safeWorkoutName)}</h2>
            <p style="margin:12px 0 0;color:#475569;line-height:1.7;"><strong>Objetivo:</strong> ${escapeHtml(safeGoal)}</p>
            <p style="margin:10px 0 0;color:#475569;line-height:1.7;"><strong>Resumo:</strong> ${escapeHtml(safeSummary)}</p>
          </div>

          <div style="margin-top:24px;">
            <h3 style="margin:0 0 12px;font-size:18px;">Atividades / exercicios</h3>
            <ol style="margin:0;padding-left:20px;color:#334155;line-height:1.7;">
              ${exercisesHtml}
            </ol>
          </div>

          <div style="margin-top:24px;border-top:1px solid #e2e8f0;padding-top:20px;">
            <h3 style="margin:0 0 10px;font-size:18px;">Observacoes</h3>
            <p style="margin:0;color:#475569;line-height:1.7;">${escapeHtml(safeObservations)}</p>
            ${portalSectionHtml}
          </div>

          <div style="margin-top:28px;border-top:1px solid #e2e8f0;padding-top:20px;color:#64748b;font-size:13px;line-height:1.7;">
            <p style="margin:0;">Email enviado via TrainFlow.</p>
            <p style="margin:8px 0 0;">Caso tenha duvidas sobre a execucao, responda diretamente ao profissional responsavel.</p>
          </div>
        </div>
      </div>
    </div>
  `;

  const text = [
    `Treino enviado para ${safeStudentName}`,
    '',
    `${safeCoachName} compartilhou um novo treino com voce pela plataforma TrainFlow.`,
    '',
    safeCustomMessage ? `${safeCustomMessage}\n` : '',
    `Treino: ${safeWorkoutName}`,
    `Objetivo: ${safeGoal}`,
    `Resumo: ${safeSummary}`,
    '',
    'Atividades / exercicios:',
    exercisesText,
    '',
    `Observacoes: ${safeObservations}`,
    portalSectionText,
    'Enviado via TrainFlow.'
  ].filter(Boolean).join('\n');

  return { html, text };
}

export async function sendWorkoutEmail({
  to,
  subject,
  html,
  text,
  attachment = null
}) {
  const attachments = attachment ? [attachment] : [];
  return sendTransactionalEmail({
    to,
    subject,
    html,
    text,
    attachments
  });
}

