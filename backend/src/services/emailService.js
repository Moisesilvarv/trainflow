import { env } from '../config/env.js';

function serviceUnavailable(message) {
  return Object.assign(new Error(message), { status: 503 });
}

function upstreamFailure(message) {
  return Object.assign(new Error(message), { status: 502 });
}

function buildFromAddress() {
  if (env.emailFrom) {
    return env.emailFrom;
  }

  if (!env.emailFromEmail) {
    throw serviceUnavailable('Envio de email indisponivel. Configure EMAIL_FROM.');
  }

  return env.emailFromName
    ? `${env.emailFromName} <${env.emailFromEmail}>`
    : env.emailFromEmail;
}

async function sendWithResend(payload) {
  if (!env.resendApiKey) {
    throw serviceUnavailable('Envio de email indisponivel. Configure RESEND_API_KEY.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text();
    throw upstreamFailure(body || 'Falha ao enviar email pelo provider configurado.');
  }

  return response.json();
}

export async function sendTransactionalEmail({
  to,
  subject,
  html,
  text,
  attachments = []
}) {
  const provider = String(env.emailProvider || '').trim().toLowerCase();

  if (!provider || provider === 'disabled') {
    throw serviceUnavailable('Envio de email indisponivel. Configure EMAIL_PROVIDER.');
  }

  const payload = {
    from: buildFromAddress(),
    to,
    subject,
    html,
    text
  };

  if (env.emailReplyTo) {
    payload.reply_to = env.emailReplyTo;
  }

  if (attachments.length) {
    payload.attachments = attachments;
  }

  if (provider === 'resend') {
    return sendWithResend(payload);
  }

  throw serviceUnavailable(`Provider de email nao suportado: ${provider}.`);
}
