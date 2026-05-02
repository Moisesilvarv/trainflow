import { supabase } from '../services/supabase.js';
import { assertStudentBelongsToCoach } from '../utils/ownership.js';

const templates = [
  {
    id: 'tpl-planejamento-tecnico-base',
    name: 'Planejamento Tecnico - Base Superior',
    category: 'Planejamento tecnico',
    difficulty: 'Intermediario',
    focus: 'Empurrar, puxar e estabilidade',
    exercises: [
      { name: 'Empurrada horizontal', muscle_group: 'Membros superiores', sets: '4', reps: '8-10', rest: '90s', notes: '' },
      { name: 'Puxada horizontal', muscle_group: 'Membros superiores', sets: '4', reps: '10', rest: '90s', notes: '' },
      { name: 'Estabilidade de ombros', muscle_group: 'Controle corporal', sets: '3', reps: '12', rest: '60s', notes: '' }
    ]
  },
  {
    id: 'tpl-condicionamento-hiit',
    name: 'Condicionamento HIIT - Base',
    category: 'Condicionamento',
    difficulty: 'Iniciante',
    focus: 'Resistencia e cardio',
    exercises: [
      { name: 'Bloco intervalado principal', muscle_group: 'Condicionamento geral', sets: '8', reps: '30s forte / 60s leve', rest: '60s', notes: '' },
      { name: 'Padrao de agachar', muscle_group: 'Base inferior', sets: '3', reps: '15', rest: '45s', notes: '' },
      { name: 'Estabilidade central', muscle_group: 'Core', sets: '3', reps: '45s', rest: '45s', notes: '' }
    ]
  },
  {
    id: 'tpl-emagrecimento-metabolico',
    name: 'Emagrecimento Metabolico',
    category: 'Emagrecimento',
    difficulty: 'Intermediario',
    focus: 'Gasto calorico e consistencia',
    exercises: [
      { name: 'Levantamento terra romeno', muscle_group: 'Pernas', sets: '3', reps: '12', rest: '60s', notes: '' },
      { name: 'Afundo alternado', muscle_group: 'Gluteos', sets: '3', reps: '12/12', rest: '45s', notes: '' },
      { name: 'Burpee controlado', muscle_group: 'Core', sets: '4', reps: '10', rest: '60s', notes: '' }
    ]
  }
];

export async function listWorkoutTemplates(req, res) {
  return res.json(templates);
}

export async function applyWorkoutTemplate(req, res, next) {
  try {
    const templateId = String(req.params.templateId || '').trim();
    const template = templates.find((item) => item.id === templateId);
    if (!template) {
      return res.status(404).json({ message: 'Template de treino nao encontrado.' });
    }

    const studentIdRaw = String(req.body?.student_id || '').trim();
    const studentId = studentIdRaw
      ? await assertStudentBelongsToCoach({ studentId: studentIdRaw, coachId: req.user.id, allowNull: false })
      : null;

    const payload = {
      coach_id: req.user.id,
      student_id: studentId,
      name: template.name,
      category: template.category,
      notes: `Treino criado a partir da biblioteca pronta. Foco: ${template.focus}.`,
      exercises: template.exercises
    };

    const { data, error } = await supabase.from('workouts').insert(payload).select('*').single();
    if (error) throw error;

    return res.status(201).json(data);
  } catch (error) {
    return next(error);
  }
}
