import { logAutomation } from '../services/premiumPersistence.js';
import {
  buildPortalAccessLink,
  createOrRefreshPortalAccess,
  getPortalAccessByStudent,
  getPortalSessionByToken,
  revokePortalAccess
} from '../services/studentPortalService.js';
import { supabase } from '../services/supabase.js';

async function loadPortalData({ coachId, studentId }) {
  const [studentRes, workoutsRes, progressRes, paymentsRes, scheduleRes, assessmentRes] = await Promise.all([
    supabase.from('students').select('*').eq('id', studentId).eq('coach_id', coachId).maybeSingle(),
    supabase.from('workouts').select('*').eq('student_id', studentId).eq('coach_id', coachId).order('created_at', { ascending: false }),
    supabase.from('progress_records').select('*').eq('student_id', studentId).eq('coach_id', coachId).order('record_date', { ascending: false }),
    supabase.from('payments').select('*').eq('student_id', studentId).eq('coach_id', coachId).order('due_date', { ascending: false }),
    supabase.from('schedule').select('*').eq('student_id', studentId).eq('coach_id', coachId).order('class_date', { ascending: true }),
    supabase.from('football_assessments').select('*').eq('student_id', studentId).eq('coach_id', coachId).order('assessment_date', { ascending: false })
  ]);

  if (studentRes.error) throw studentRes.error;

  return {
    student: studentRes.data,
    workouts: workoutsRes.data || [],
    progress: progressRes.data || [],
    payments: paymentsRes.data || [],
    schedule: scheduleRes.data || [],
    evaluations: assessmentRes.data || []
  };
}

export async function getStudentPortalAccess(req, res, next) {
  try {
    const studentId = String(req.params.studentId || '').trim();
    const { data: student, error } = await supabase
      .from('students')
      .select('id, name')
      .eq('id', studentId)
      .eq('coach_id', req.user.id)
      .maybeSingle();

    if (error) throw error;
    if (!student?.id) return res.status(404).json({ message: 'Aluno nao encontrado.' });

    const access = await getPortalAccessByStudent(req.user.id, studentId);
    if (!access) {
      return res.json({ access: null });
    }

    return res.json({ access });
  } catch (error) {
    return next(error);
  }
}

export async function generateStudentPortalAccess(req, res, next) {
  try {
    const studentId = String(req.params.studentId || '').trim();
    const { data: student, error } = await supabase
      .from('students')
      .select('id, name')
      .eq('id', studentId)
      .eq('coach_id', req.user.id)
      .maybeSingle();

    if (error) throw error;
    if (!student?.id) return res.status(404).json({ message: 'Aluno nao encontrado.' });

    const access = await createOrRefreshPortalAccess(req.user.id, student);
    await logAutomation(req.user.id, { studentId, type: 'student_portal_access', status: 'generated' });

    return res.status(201).json({
      access: {
        ...access,
        link: buildPortalAccessLink(access.token)
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function resendStudentPortalInvite(req, res, next) {
  try {
    const studentId = String(req.params.studentId || '').trim();
    const { data: student, error } = await supabase
      .from('students')
      .select('id, name')
      .eq('id', studentId)
      .eq('coach_id', req.user.id)
      .maybeSingle();

    if (error) throw error;
    if (!student?.id) return res.status(404).json({ message: 'Aluno nao encontrado.' });

    const access = await createOrRefreshPortalAccess(req.user.id, student);
    await logAutomation(req.user.id, { studentId, type: 'student_portal_invite', status: 'resent' });

    return res.json({
      message: 'Convite reenviado com sucesso.',
      access: {
        ...access,
        link: buildPortalAccessLink(access.token)
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function revokeStudentPortalAccess(req, res, next) {
  try {
    const studentId = String(req.params.studentId || '').trim();
    await revokePortalAccess(req.user.id, studentId);
    await logAutomation(req.user.id, { studentId, type: 'student_portal_access', status: 'revoked' });
    return res.json({ message: 'Acesso do portal revogado com sucesso.' });
  } catch (error) {
    return next(error);
  }
}

export async function getPortalSession(req, res, next) {
  try {
    const token = String(req.params.token || '').trim();
    const access = await getPortalSessionByToken(token);

    if (!access?.studentId) {
      return res.status(404).json({ message: 'Acesso do aluno nao encontrado ou expirado.' });
    }

    const portalData = await loadPortalData({
      coachId: access.userId,
      studentId: access.studentId
    });

    if (!portalData.student?.id) {
      return res.status(404).json({ message: 'Aluno nao encontrado.' });
    }

    return res.json({
      access: {
        createdAt: access.createdAt,
        expiresAt: access.expiresAt,
        lastAccessAt: access.lastAccessAt
      },
      ...portalData
    });
  } catch (error) {
    return next(error);
  }
}
