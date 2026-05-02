import {
  changeAuthenticatedUserPassword,
  getCurrentUser,
  loginUser,
  registerUser,
  resendVerificationEmail,
  sendPasswordRecovery,
  verifyEmailAddress,
  updateAuthenticatedUserPlan
} from '../services/authService.js';
import { assertAllowedKeys, ensureObjectPayload, toTrimmedString } from '../utils/payloadValidation.js';
import { clearAuthCookie, setAuthCookie } from '../utils/cookies.js';

export async function register(req, res, next) {
  try {
    const payload = ensureObjectPayload(req.body);
    assertAllowedKeys(payload, ['name', 'email', 'password', 'confirmPassword', 'accountType', 'plan', 'trialRequested', 'fingerprint']);
    const forwardedFor = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const ipAddress = forwardedFor || req.ip || req.socket?.remoteAddress || '';
    const result = await registerUser(payload, {
      ipAddress,
      userAgent: req.get('user-agent') || ''
    });
    setAuthCookie(res, result.token);
    return res.status(201).json({ message: 'Conta criada com sucesso.', ...result });
  } catch (error) {
    return next(error);
  }
}

export async function login(req, res, next) {
  try {
    const payload = ensureObjectPayload(req.body);
    assertAllowedKeys(payload, ['email', 'password']);
    const result = await loginUser(payload);
    setAuthCookie(res, result.token);
    return res.json({ message: 'Login realizado com sucesso.', ...result });
  } catch (error) {
    return next(error);
  }
}

export async function me(req, res, next) {
  try {
    const profile = await getCurrentUser(req.user.id);
    return res.json(profile);
  } catch (error) {
    return next(error);
  }
}

export async function verifyEmail(req, res, next) {
  try {
    const token = toTrimmedString(req.query?.token, { fieldLabel: 'Token', required: true, maxLength: 255 });
    const result = await verifyEmailAddress(token);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function resendVerification(req, res, next) {
  try {
    const result = await resendVerificationEmail(req.user.id);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const payload = ensureObjectPayload(req.body);
    assertAllowedKeys(payload, ['email']);
    const email = toTrimmedString(payload.email, { fieldLabel: 'Email', required: true, maxLength: 180 });
    const result = await sendPasswordRecovery(email, req.headers.origin);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    const payload = ensureObjectPayload(req.body);
    assertAllowedKeys(payload, ['currentPassword', 'newPassword', 'confirmNewPassword']);
    const { currentPassword, newPassword, confirmNewPassword } = payload;

    await changeAuthenticatedUserPassword({
      userId: req.user.id,
      email: req.user.email,
      currentPassword,
      newPassword,
      confirmNewPassword
    });

    return res.json({ message: 'Senha alterada com sucesso.' });
  } catch (error) {
    return next(error);
  }
}

export async function updatePlan(req, res, next) {
  try {
    const payload = ensureObjectPayload(req.body);
    assertAllowedKeys(payload, ['plan']);
    const plan = toTrimmedString(payload.plan, { fieldLabel: 'Plano', required: true, maxLength: 32 });
    const result = await updateAuthenticatedUserPlan({ userId: req.user.id, plan });
    return res.json({ message: 'Plano atualizado com sucesso.', ...result });
  } catch (error) {
    return next(error);
  }
}

export async function logout(req, res) {
  clearAuthCookie(res);
  return res.json({ message: 'Sessao encerrada com sucesso.' });
}
