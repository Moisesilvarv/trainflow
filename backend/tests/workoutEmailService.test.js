import test from 'node:test';
import assert from 'node:assert/strict';
import { env } from '../src/config/env.js';
import { sendTransactionalEmail } from '../src/services/emailService.js';
import { buildWorkoutEmailContent } from '../src/services/workoutEmailService.js';

const originalFetch = global.fetch;
const originalProvider = env.emailProvider;
const originalFrom = env.emailFrom;
const originalFromName = env.emailFromName;
const originalFromEmail = env.emailFromEmail;
const originalReplyTo = env.emailReplyTo;
const originalResendApiKey = env.resendApiKey;

test.afterEach(() => {
  global.fetch = originalFetch;
  env.emailProvider = originalProvider;
  env.emailFrom = originalFrom;
  env.emailFromName = originalFromName;
  env.emailFromEmail = originalFromEmail;
  env.emailReplyTo = originalReplyTo;
  env.resendApiKey = originalResendApiKey;
});

test('monta conteudo de email de treino com portal e observacoes', () => {
  const content = buildWorkoutEmailContent({
    studentName: 'Camila Rocha',
    coachName: 'Ricardo Costa',
    workoutName: 'Treino funcional premium',
    workoutGoal: 'Melhorar condicionamento',
    workoutSummary: 'Sessao focada em progressao de intensidade.',
    observations: 'Respeitar a tecnica e ajustar pausas quando necessario.',
    exercises: [
      {
        name: 'Agachamento',
        muscle_group: 'Forca',
        sets: '4 series',
        reps: '12 repeticoes',
        rest: '60s',
        notes: 'Controlar descida.'
      }
    ],
    customMessage: 'Qualquer duvida me chame.',
    portalLink: 'https://app.trainflow.com/athlete/token-123'
  });

  assert.match(content.html, /Camila Rocha/);
  assert.match(content.html, /Treino funcional premium/);
  assert.match(content.html, /Ver treino no portal do aluno/);
  assert.match(content.text, /Qualquer duvida me chame/);
  assert.match(content.text, /Agachamento/);
});

test('envia email transacional pelo Resend com anexo opcional', async () => {
  env.emailProvider = 'resend';
  env.emailFrom = 'TrainFlow <no-reply@trainflow.com.br>';
  env.emailFromName = 'TrainFlow';
  env.emailFromEmail = 'no-reply@trainflow.com.br';
  env.emailReplyTo = 'suporte@trainflow.com.br';
  env.resendApiKey = 're_test_key';

  let requestPayload = null;
  global.fetch = async (url, options) => {
    requestPayload = {
      url,
      headers: options.headers,
      body: JSON.parse(options.body)
    };

    return {
      ok: true,
      async json() {
        return { id: 'email_123', status: 'queued' };
      }
    };
  };

  const result = await sendTransactionalEmail({
    to: 'aluno@trainflow.com',
    subject: 'Seu treino da semana',
    html: '<p>Teste</p>',
    text: 'Teste',
    attachments: [{ filename: 'treino.pdf', content: 'ZmFrZSBiYXNlNjQ=' }]
  });

  assert.equal(result.status, 'queued');
  assert.equal(requestPayload.url, 'https://api.resend.com/emails');
  assert.equal(requestPayload.body.from, 'TrainFlow <no-reply@trainflow.com.br>');
  assert.equal(requestPayload.body.to, 'aluno@trainflow.com');
  assert.equal(requestPayload.body.reply_to, 'suporte@trainflow.com.br');
  assert.equal(requestPayload.body.attachments[0].filename, 'treino.pdf');
});
