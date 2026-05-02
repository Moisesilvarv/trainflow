function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

export function ensureObjectPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw badRequest('Payload invalido. Envie um objeto JSON.');
  }
  return body;
}

export function assertAllowedKeys(payload, allowedKeys = []) {
  const unknown = Object.keys(payload).filter((key) => !allowedKeys.includes(key));
  if (unknown.length) {
    throw badRequest(`Campos nao permitidos no payload: ${unknown.join(', ')}`);
  }
}

export function toTrimmedString(value, { fieldLabel = 'Campo', required = false, maxLength = 255, emptyAsNull = false } = {}) {
  if (value === undefined || value === null) {
    if (required) throw badRequest(`${fieldLabel} e obrigatorio.`);
    return emptyAsNull ? null : '';
  }

  const text = String(value).trim();

  if (!text) {
    if (required) throw badRequest(`${fieldLabel} e obrigatorio.`);
    return emptyAsNull ? null : '';
  }

  if (text.length > maxLength) {
    throw badRequest(`${fieldLabel} excede o limite de ${maxLength} caracteres.`);
  }

  return text;
}

export function toNullableNumber(value, { fieldLabel = 'Campo', min = null, max = null } = {}) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const normalized = String(value).trim().replace(',', '.');
  const number = Number(normalized);
  if (!Number.isFinite(number)) throw badRequest(`${fieldLabel} deve ser numerico.`);
  if (min !== null && number < min) throw badRequest(`${fieldLabel} deve ser maior ou igual a ${min}.`);
  if (max !== null && number > max) throw badRequest(`${fieldLabel} deve ser menor ou igual a ${max}.`);
  return number;
}

export function toRequiredNumber(value, { fieldLabel = 'Campo', min = null, max = null } = {}) {
  const number = toNullableNumber(value, { fieldLabel, min, max });
  if (number === null) throw badRequest(`${fieldLabel} e obrigatorio.`);
  return number;
}

export function toDateString(value, { fieldLabel = 'Data', required = false } = {}) {
  if (value === undefined || value === null || String(value).trim() === '') {
    if (required) throw badRequest(`${fieldLabel} e obrigatoria.`);
    return null;
  }
  const normalized = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw badRequest(`${fieldLabel} deve estar no formato YYYY-MM-DD.`);
  }
  const date = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(date.getTime())) throw badRequest(`${fieldLabel} invalida.`);
  return normalized;
}

export function toDateTimeString(value, { fieldLabel = 'Data e hora', required = false } = {}) {
  if (value === undefined || value === null || String(value).trim() === '') {
    if (required) throw badRequest(`${fieldLabel} e obrigatoria.`);
    return null;
  }
  const normalized = String(value).trim();
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) throw badRequest(`${fieldLabel} invalida.`);
  return date.toISOString();
}

export function toEnum(value, allowed, { fieldLabel = 'Campo', required = false } = {}) {
  if (value === undefined || value === null || String(value).trim() === '') {
    if (required) throw badRequest(`${fieldLabel} e obrigatorio.`);
    return null;
  }
  const normalized = String(value).trim().toLowerCase();
  if (!allowed.includes(normalized)) {
    throw badRequest(`${fieldLabel} invalido. Valores permitidos: ${allowed.join(', ')}.`);
  }
  return normalized;
}

export function toUrl(value, { fieldLabel = 'URL' } = {}) {
  const text = toTrimmedString(value, { fieldLabel, required: false, emptyAsNull: true, maxLength: 2048 });
  if (!text) return null;
  try {
    const url = new URL(text);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('invalid protocol');
    return text;
  } catch {
    throw badRequest(`${fieldLabel} deve comecar com http:// ou https://.`);
  }
}

export function toJsonArray(value, { fieldLabel = 'Lista' } = {}) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw badRequest(`${fieldLabel} deve ser uma lista.`);
  return value;
}
