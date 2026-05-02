import { sendTransactionalEmail } from './emailService.js';

function escapeHtml(value = '') {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildEmailVerificationContent({ verificationUrl }) {
  const safeUrl = escapeHtml(verificationUrl);

  return {
    subject: 'Confirme seu email - TrainFlow',
    html: `
      <div style="margin:0;padding:0;background:#F8FAFC;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0f172a;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F8FAFC;margin:0;padding:36px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:22px;overflow:hidden;box-shadow:0 24px 60px rgba(15,23,42,0.08);">
                <tr>
                  <td style="padding:34px 34px 8px;text-align:center;">
                    <div style="display:inline-block;border-radius:16px;background:#eff6ff;padding:12px 16px;color:#2563eb;font-size:22px;font-weight:900;letter-spacing:-0.02em;">
                      TrainFlow
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 38px 8px;text-align:center;">
                    <h1 style="margin:0;font-size:32px;line-height:1.15;font-weight:900;letter-spacing:-0.03em;color:#0f172a;">Confirme seu email</h1>
                    <p style="margin:16px 0 0;font-size:16px;line-height:1.7;color:#475569;">
                      Voce esta a um passo de acessar o TrainFlow.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 38px 8px;text-align:center;">
                    <a href="${safeUrl}" style="display:inline-block;border-radius:12px;background:#2563eb;padding:15px 24px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:800;box-shadow:0 14px 28px rgba(37,99,235,0.22);">
              Confirmar email
                    </a>
                    <p style="margin:18px 0 0;font-size:14px;line-height:1.7;color:#64748b;">
                      Este link expira em 30 minutos.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 38px 30px;">
                    <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;text-align:center;">
                      Se o botao nao abrir, copie e cole este link no navegador:
                    </p>
                    <p style="margin:8px 0 0;font-size:12px;line-height:1.6;word-break:break-all;color:#1d4ed8;text-align:center;">
                      ${safeUrl}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="border-top:1px solid #e2e8f0;background:#f8fafc;padding:20px 34px;text-align:center;">
                    <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
                      Se voce nao criou essa conta, ignore este email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>
    `,
    text: [
      'Confirme seu email - TrainFlow',
      '',
      'Voce esta a um passo de acessar o TrainFlow.',
      'Confirme seu email pelo link abaixo:',
      verificationUrl,
      '',
      'Este link expira em 30 minutos.',
      'Se voce nao criou essa conta, ignore este email.'
    ].join('\n')
  };
}

export async function sendEmailVerification({ to, verificationUrl }) {
  const content = buildEmailVerificationContent({ verificationUrl });

  return sendTransactionalEmail({
    to,
    subject: content.subject,
    html: content.html,
    text: content.text
  });
}
