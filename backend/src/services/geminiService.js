import { env } from '../config/env.js';

export function ensureGeminiConfigured() {
  if (!env.geminiApiKey) {
    throw Object.assign(new Error('Assistente IA indisponivel. Configure a chave GEMINI_API_KEY.'), {
      status: 503,
      code: 'gemini_not_configured'
    });
  }
}

const FALLBACK_GEMINI_MODELS = ['gemini-2.5-flash-lite'];

function parseRetrySecondsFromGeminiError(rawMessage = '') {
  const text = String(rawMessage || '');
  const match = text.match(/Please retry in\s+([0-9.]+)s/i);
  if (!match) return null;
  const seconds = Math.ceil(Number(match[1]));
  return Number.isFinite(seconds) ? seconds : null;
}

function normalizeGeminiError(error, rawBody) {
  const retrySeconds = parseRetrySecondsFromGeminiError(rawBody);

  if (error?.status === 429 || error?.geminiStatus === 'RESOURCE_EXHAUSTED') {
    const retryHint = retrySeconds ? ` Tente novamente em cerca de ${retrySeconds}s.` : '';
    return Object.assign(
      new Error(`O limite atual da IA foi atingido para esta chave do Gemini.${retryHint}`),
      {
        status: 429,
        code: 'gemini_quota_exceeded',
        geminiStatus: error?.geminiStatus || 'RESOURCE_EXHAUSTED',
        retrySeconds
      }
    );
  }

  if (error?.status === 404 || error?.geminiStatus === 'NOT_FOUND') {
    return Object.assign(
      new Error(`O modelo Gemini configurado nao esta disponivel para esta chave ou versao da API. Modelo atual: ${env.geminiModel}.`),
      {
        status: 503,
        code: 'gemini_model_not_available',
        geminiStatus: error?.geminiStatus || 'NOT_FOUND'
      }
    );
  }

  if (error?.status === 503 || error?.geminiStatus === 'UNAVAILABLE') {
    return Object.assign(
      new Error('A IA do Gemini esta com alta demanda no momento. Tente novamente em instantes.'),
      {
        status: 503,
        code: 'gemini_unavailable',
        geminiStatus: error?.geminiStatus || 'UNAVAILABLE'
      }
    );
  }

  if (error?.status >= 500) {
    return Object.assign(
      new Error('A IA do Gemini falhou temporariamente ao gerar a resposta. Tente novamente.'),
      {
        status: 502,
        code: 'gemini_upstream_error',
        geminiStatus: error?.geminiStatus || null
      }
    );
  }

  return error;
}

async function requestGeminiText(model, prompt, options = {}) {
  const generationConfig = {
    temperature: options.temperature ?? 0.6,
    maxOutputTokens: options.maxOutputTokens ?? 900
  };

  if (options.responseMimeType) {
    generationConfig.responseMimeType = options.responseMimeType;
  }

  if (options.responseSchema) {
    generationConfig.responseSchema = options.responseSchema;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }]
          }
        ],
        generationConfig
      })
    }
  );

  const rawBody = await response.text();
  let parsedBody;

  try {
    parsedBody = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    // Mantem o fallback para tratamento baseado no corpo bruto.
  }

  if (!response.ok) {
    const rawError = Object.assign(
      new Error(rawBody || 'Nao foi possivel obter resposta da IA.'),
      {
        status: response.status,
        geminiStatus: parsedBody?.error?.status || null
      }
    );

    throw normalizeGeminiError(rawError, rawBody);
  }

  const text = parsedBody?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join('\n')
    .trim();

  if (!text) {
    throw Object.assign(new Error('A IA retornou uma resposta vazia.'), {
      status: 502,
      code: 'gemini_empty_response'
    });
  }

  return text;
}

export async function generateGeminiText(prompt, options = {}) {
  ensureGeminiConfigured();

  const candidateModels = [env.geminiModel, ...FALLBACK_GEMINI_MODELS.filter((model) => model !== env.geminiModel)];
  let lastError = null;

  for (const model of candidateModels) {
    try {
      return await requestGeminiText(model, prompt, options);
    } catch (error) {
      lastError = error;

      const canFallback =
        error?.status === 503 ||
        error?.status === 429 ||
        error?.geminiStatus === 'UNAVAILABLE' ||
        error?.geminiStatus === 'RESOURCE_EXHAUSTED';
      if (!canFallback || model === candidateModels[candidateModels.length - 1]) {
        throw error;
      }
    }
  }

  throw lastError || Object.assign(new Error('Nao foi possivel obter resposta da IA.'), { status: 502 });
}
