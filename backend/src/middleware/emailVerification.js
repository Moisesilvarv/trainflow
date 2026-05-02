import { getEmailVerificationStatus } from '../services/authService.js';

export async function emailVerifiedRequired(req, res, next) {
  try {
    const emailVerified = await getEmailVerificationStatus(req.user.id);

    if (emailVerified) {
      return next();
    }

    return res.status(403).json({
      error: 'email_verification_required',
      message: 'Confirme seu email para continuar.'
    });
  } catch (error) {
    return next(error);
  }
}
