import { supabase } from '../services/supabase.js';

export async function assertStudentBelongsToCoach({ studentId, coachId, allowNull = true }) {
  const normalizedStudentId = String(studentId || '').trim();

  if (!normalizedStudentId) {
    if (allowNull) return null;
    throw Object.assign(new Error('Aluno obrigatorio para esta operacao.'), { status: 400 });
  }

  const { data: student, error } = await supabase
    .from('students')
    .select('id')
    .eq('id', normalizedStudentId)
    .eq('coach_id', coachId)
    .maybeSingle();

  if (error) throw error;

  if (!student?.id) {
    throw Object.assign(new Error('Aluno invalido para este usuario.'), { status: 403 });
  }

  return student.id;
}
