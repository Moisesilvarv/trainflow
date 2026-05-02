import test from 'node:test';
import assert from 'node:assert/strict';
import { env } from '../src/config/env.js';
import { ensureGeminiConfigured, generateGeminiText } from '../src/services/geminiService.js';

test('gemini retorna mensagem clara quando a chave nao esta configurada', () => {
  if (env.geminiApiKey) {
    assert.doesNotThrow(() => ensureGeminiConfigured());
    return;
  }

  assert.throws(() => ensureGeminiConfigured(), /GEMINI_API_KEY/);
});

test('gemini normaliza erro de modelo indisponivel', async () => {
  const originalKey = env.geminiApiKey;
  const originalModel = env.geminiModel;
  const originalFetch = global.fetch;

  try {
    env.geminiApiKey = 'test-key';
    env.geminiModel = 'gemini-model-invalid';
    global.fetch = async () => ({
      ok: false,
      status: 404,
      async text() {
        return JSON.stringify({
          error: {
            status: 'NOT_FOUND',
            message: 'model not found'
          }
        });
      }
    });

    await assert.rejects(
      () => generateGeminiText('teste rapido'),
      (error) => error?.code === 'gemini_model_not_available' && error?.status === 503
    );
  } finally {
    env.geminiApiKey = originalKey;
    env.geminiModel = originalModel;
    global.fetch = originalFetch;
  }
});
