import test from 'node:test';
import assert from 'node:assert/strict';
import { renderWorkoutPdfToBuffer } from '../src/utils/workoutPdf.js';

test('gera PDF de treino com poucas atividades sem quebrar', async () => {
  const buffer = await renderWorkoutPdfToBuffer({
    workout: {
      id: 'workout-001',
      name: 'Treino tecnico funcional',
      category: 'Funcional',
      notes: 'Sessao focada em controle, estabilidade e progressao segura.',
      exercises: [
        {
          name: 'Mobilidade de quadril',
          muscle_group: 'Mobilidade',
          sets: '3 blocos',
          reps: '40 segundos',
          rest: '20 segundos',
          notes: 'Executar com controle e amplitude confortavel.'
        }
      ]
    },
    studentName: 'Aluno teste',
    studentGoal: 'Desempenho geral',
    studentAge: 28,
    coachName: 'Profissional teste',
    generatedAt: '2026-04-29T15:30:00.000Z',
    protocol: 'RG-260429-ABC123'
  });

  assert.ok(buffer.length > 1000);
  assert.equal(buffer.subarray(0, 4).toString(), '%PDF');
});

test('gera PDF de treino com muitas atividades e observacoes longas', async () => {
  const exercises = Array.from({ length: 10 }, (_, index) => ({
    name: `Atividade ${index + 1}`,
    muscle_group: 'Planejamento esportivo',
    sets: '4 series',
    reps: '12 repeticoes ou 45 segundos',
    rest: '60 segundos',
    notes: 'Manter execucao tecnica, controle respiratorio e ajuste progressivo de intensidade conforme resposta do aluno ao bloco.'
  }));

  const buffer = await renderWorkoutPdfToBuffer({
    workout: {
      id: 'workout-002',
      name: 'Planejamento integrado semanal',
      category: 'Treinamento esportivo',
      notes: 'Documento com volume maior para validar quebra de pagina, legibilidade e consistencia visual em treinos extensos.',
      exercises
    },
    studentName: 'Atleta teste',
    studentGoal: 'Evolucao de desempenho',
    studentAge: 17,
    coachName: 'Treinador teste',
    generatedAt: '2026-04-29T15:30:00.000Z',
    protocol: 'RG-260429-XYZ789'
  });

  assert.ok(buffer.length > 2000);
  assert.equal(buffer.subarray(0, 4).toString(), '%PDF');
});
