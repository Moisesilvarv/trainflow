import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { supabase } from './supabase.js';

function hashPortalToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function generatePortalToken() {
  return crypto.randomBytes(32).toString('hex');
}

function getPortalExpiryDate(baseDate = new Date()) {
  return new Date(baseDate.getTime() + env.portalTokenTtlHours * 60 * 60 * 1000);
}

function serializePortalAccess(row, link = null) {
  if (!row?.id) return null;

  return {
    id: row.id,
    studentId: row.student_id,
    userId: row.user_id,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    lastAccessAt: row.last_access_at,
    link
  };
}

export async function getPortalAccessByStudent(userId, studentId) {
  const { data, error } = await supabase
    .from('student_portal_access')
    .select('*')
    .eq('user_id', userId)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  const link = data?.access_token ? buildPortalAccessLink(data.access_token) : null;
  return serializePortalAccess(data, link);
}

export async function createOrRefreshPortalAccess(userId, student) {
  const token = generatePortalToken();
  const expiresAt = getPortalExpiryDate().toISOString();

  await supabase
    .from('student_portal_access')
    .update({
      is_active: false,
      revoked_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('student_id', student.id)
    .is('revoked_at', null);

  const { data, error } = await supabase
    .from('student_portal_access')
    .insert({
      user_id: userId,
      student_id: student.id,
      access_token: token,
      access_token_hash: hashPortalToken(token),
      is_active: true,
      expires_at: expiresAt
    })
    .select('*')
    .single();

  if (error) throw error;

  return {
    ...serializePortalAccess(data),
    token
  };
}

export async function revokePortalAccess(userId, studentId) {
  const { data, error } = await supabase
    .from('student_portal_access')
    .update({
      is_active: false,
      revoked_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('student_id', studentId)
    .is('revoked_at', null)
    .select('*');

  if (error) throw error;
  return data || [];
}

export async function getPortalSessionByToken(token) {
  const tokenHash = hashPortalToken(token);
  const { data, error } = await supabase
    .from('student_portal_access')
    .select('*')
    .eq('access_token_hash', tokenHash)
    .eq('is_active', true)
    .is('revoked_at', null)
    .maybeSingle();

  if (error) throw error;
  if (!data?.id) return null;

  if (data.expires_at && new Date(data.expires_at) <= new Date()) {
    return null;
  }

  await supabase
    .from('student_portal_access')
    .update({ last_access_at: new Date().toISOString() })
    .eq('id', data.id);

  return serializePortalAccess({
    ...data,
    last_access_at: new Date().toISOString()
  });
}

export function buildPortalAccessLink(token) {
  return `${env.appUrl}/athlete/${token}`;
}

export function evaluatePortalAccessState(access, now = new Date()) {
  if (!access?.isActive) return 'inactive';
  if (access.revokedAt) return 'revoked';
  if (access.expiresAt && new Date(access.expiresAt) <= now) return 'expired';
  return 'active';
}
