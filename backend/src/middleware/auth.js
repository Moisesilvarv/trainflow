import { env } from '../config/env.js';
import { supabase, supabaseAuth } from '../services/supabase.js';
import { getCookie } from '../utils/cookies.js';
import { verifyToken } from '../utils/jwt.js';

async function buildUserFromSupabaseToken(token) {
  const { data, error } = await supabaseAuth.auth.getUser(token);
  const authUser = data?.user;

  if (error || !authUser?.id) return null;

  const [{ data: userProfile }, { data: coachProfile }] = await Promise.all([
    supabase.from('users').select('id, email, account_type').eq('id', authUser.id).maybeSingle(),
    supabase.from('coaches').select('id, role, coach_type').eq('id', authUser.id).maybeSingle()
  ]);

  return {
    id: authUser.id,
    email: authUser.email || userProfile?.email || '',
    role: coachProfile?.role || 'coach',
    coachType: coachProfile?.coach_type || 'personal_trainer',
    accountType: userProfile?.account_type || 'personal'
  };
}

export async function authRequired(req, res, next) {
  const authHeader = req.headers.authorization;
  const cookieToken = getCookie(req, env.authCookieName);
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : cookieToken;

  console.log('AUTH HEADER:', req.headers.authorization);

  if (!token) {
    console.log('USER:', undefined);
    console.log('SUBSCRIPTION:', undefined);
    console.log('BLOCK REASON:', 'missing_authorization');
    return res.status(401).json({ message: 'Token ausente.' });
  }

  try {
    req.user = await buildUserFromSupabaseToken(token);
    if (!req.user) {
      req.user = verifyToken(token);
    }

    console.log('USER:', req.user?.id);
    return next();
  } catch {
    console.log('USER:', undefined);
    console.log('SUBSCRIPTION:', undefined);
    console.log('BLOCK REASON:', 'invalid_token');
    return res.status(401).json({ message: 'Token invalido.' });
  }
}

export function roleRequired(roles = []) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ message: 'Sem permissao para este recurso.' });
    }
    return next();
  };
}
