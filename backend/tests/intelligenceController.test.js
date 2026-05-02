import test from 'node:test';
import assert from 'node:assert/strict';
import { validateWorkoutSuggestionInput } from '../src/controllers/intelligenceController.js';

test('bloqueia saudacao generica no sugerir treino com IA', () => {
  const result = validateWorkoutSuggestionInput({
    prompt: 'oi',
    student: null,
    history: []
  });

  assert.equal(result.ok, false);
  assert.match(result.message, /contexto|objetivo|nivel|restricoes|modalidade/i);
});

test('aceita prompt descritivo para gerar treino', () => {
  const result = validateWorkoutSuggestionInput({
    prompt: 'Crie um treino de corrida com foco em resistencia para aluno intermediario com 3 dias por semana.',
    student: null,
    history: []
  });

  assert.deepEqual(result, { ok: true });
});

test('aceita refinamento curto quando ja existe contexto de treino na conversa', () => {
  const result = validateWorkoutSuggestionInput({
    prompt: 'ajusta para joelho sensivel',
    student: null,
    history: [
      { role: 'user', content: 'Crie um treino funcional para emagrecimento.' },
      { role: 'assistant', content: 'Treino: Circuito funcional\nAquecimento\n- mobilidade\nBloco principal\n1. Agachamento' }
    ]
  });

  assert.deepEqual(result, { ok: true });
});

test('bloqueia mensagem vaga sem pedido claro de treino mesmo sendo longa', () => {
  const result = validateWorkoutSuggestionInput({
    prompt: 'Quero sua ajuda porque estou pensando em algumas coisas para hoje.',
    student: null,
    history: []
  });

  assert.equal(result.ok, false);
  assert.match(result.message, /nao ficou claro|foco da sessao|perfil do aluno|ajuste desejado/i);
});
