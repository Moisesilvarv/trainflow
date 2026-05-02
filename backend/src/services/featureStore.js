import crypto from 'crypto';

const paymentIntegrationStore = new Map();
const contractStore = new Map();
const recurringPaymentStore = new Map();
const whatsappAutomationStore = new Map();
const automationLogStore = new Map();
const portalAccessStore = new Map();
const aiConversationStore = new Map();
const aiUsageStore = new Map();

function userList(map, userId) {
  if (!map.has(userId)) map.set(userId, []);
  return map.get(userId);
}

function keyForAi(userId, month, studentId = '') {
  return `${userId}:${month}:${studentId}`;
}

export function getDefaultPaymentIntegrations() {
  return {
    stripe: { connected: false, publicKey: '' },
    mercadoPago: { connected: false, accessTokenMasked: '' },
    pix: { connected: true, keyMasked: 'pix@trainflow.app' }
  };
}

export function getPaymentIntegrations(userId) {
  return paymentIntegrationStore.get(userId) || getDefaultPaymentIntegrations();
}

export function savePaymentIntegrations(userId, payload = {}) {
  const current = getPaymentIntegrations(userId);
  const next = {
    stripe: {
      connected: Boolean(payload?.stripe?.connected),
      publicKey: String(payload?.stripe?.publicKey || current.stripe.publicKey || '').slice(0, 200)
    },
    mercadoPago: {
      connected: Boolean(payload?.mercadoPago?.connected),
      accessTokenMasked: String(payload?.mercadoPago?.accessTokenMasked || current.mercadoPago.accessTokenMasked || '').slice(0, 40)
    },
    pix: {
      connected: payload?.pix?.connected === undefined ? current.pix.connected : Boolean(payload?.pix?.connected),
      keyMasked: String(payload?.pix?.keyMasked || current.pix.keyMasked || '').slice(0, 80)
    }
  };
  paymentIntegrationStore.set(userId, next);
  return next;
}

export function getContracts(userId) {
  return contractStore.get(userId) || [];
}

export function createContract(userId, payload = {}) {
  const list = userList(contractStore, userId);
  const contract = {
    id: `ct-${Date.now()}`,
    studentName: String(payload?.studentName || 'Aluno').slice(0, 120),
    title: String(payload?.title || 'Contrato de acompanhamento').slice(0, 160),
    status: 'pending_signature',
    createdAt: new Date().toISOString(),
    signature: null
  };
  list.unshift(contract);
  return contract;
}

export function signContract(userId, contractId, signerName) {
  const list = getContracts(userId);
  const contract = list.find((item) => item.id === contractId);
  if (!contract) return null;

  contract.status = 'signed';
  contract.signature = {
    signerName: String(signerName || 'Assinatura digital').slice(0, 120),
    signedAt: new Date().toISOString(),
    ipHash: 'hash-local-simulado'
  };

  return contract;
}

export function getDefaultWhatsappAutomations() {
  return {
    workoutReminder: true,
    paymentReminder: true,
    evaluationReminder: false,
    renewalMessage: true,
    provider: 'mock',
    active: true
  };
}

export function getWhatsappAutomations(userId) {
  return whatsappAutomationStore.get(userId) || getDefaultWhatsappAutomations();
}

export function saveWhatsappAutomations(userId, payload = {}) {
  const current = getWhatsappAutomations(userId);
  const next = {
    workoutReminder: payload.workoutReminder === undefined ? current.workoutReminder : Boolean(payload.workoutReminder),
    paymentReminder: payload.paymentReminder === undefined ? current.paymentReminder : Boolean(payload.paymentReminder),
    evaluationReminder: payload.evaluationReminder === undefined ? current.evaluationReminder : Boolean(payload.evaluationReminder),
    renewalMessage: payload.renewalMessage === undefined ? current.renewalMessage : Boolean(payload.renewalMessage),
    provider: String(payload.provider || current.provider || 'mock').slice(0, 40),
    active: payload.active === undefined ? current.active : Boolean(payload.active)
  };
  whatsappAutomationStore.set(userId, next);
  return next;
}

export function logAutomation(userId, payload = {}) {
  const list = userList(automationLogStore, userId);
  const item = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    userId,
    studentId: payload.studentId || null,
    type: String(payload.type || 'manual').slice(0, 60),
    status: String(payload.status || 'queued').slice(0, 40),
    createdAt: new Date().toISOString()
  };
  list.unshift(item);
  return item;
}

export function getAutomationLogs(userId) {
  return automationLogStore.get(userId) || [];
}

export function getRecurringPayments(userId) {
  return recurringPaymentStore.get(userId) || [];
}

export function createRecurringPayment(userId, payload = {}) {
  const list = userList(recurringPaymentStore, userId);
  const item = {
    id: `rp-${Date.now()}`,
    studentId: payload.studentId || null,
    userId,
    amount: Number(payload.amount || 0),
    dueDate: payload.dueDate || new Date().toISOString().slice(0, 10),
    status: String(payload.status || 'active'),
    provider: String(payload.provider || 'mock'),
    createdAt: new Date().toISOString()
  };
  list.unshift(item);
  return item;
}

export function updateRecurringPaymentStatus(userId, recurringPaymentId, status) {
  const list = getRecurringPayments(userId);
  const item = list.find((entry) => entry.id === recurringPaymentId);
  if (!item) return null;
  item.status = String(status || item.status).slice(0, 40);
  return item;
}

export function getPortalAccessByStudent(userId, studentId) {
  return (portalAccessStore.get(userId) || []).find((item) => item.studentId === studentId) || null;
}

export function createOrRefreshPortalAccess(userId, student = {}) {
  const list = userList(portalAccessStore, userId);
  const existing = list.find((item) => item.studentId === student.id);

  if (existing) {
    existing.isActive = true;
    existing.lastSentAt = new Date().toISOString();
    return existing;
  }

  const item = {
    id: `spa-${Date.now()}`,
    studentId: student.id,
    userId,
    accessToken: crypto.randomUUID(),
    isActive: true,
    studentName: String(student.name || 'Aluno').slice(0, 120),
    createdAt: new Date().toISOString(),
    lastSentAt: new Date().toISOString()
  };

  list.unshift(item);
  return item;
}

export function getPortalSessionByToken(token) {
  for (const list of portalAccessStore.values()) {
    const item = list.find((entry) => entry.accessToken === token && entry.isActive);
    if (item) return item;
  }

  return null;
}

export function getAiConversation(userId, studentId) {
  return aiConversationStore.get(keyForAi(userId, 'history', studentId)) || [];
}

export function appendAiConversation(userId, studentId, message) {
  const key = keyForAi(userId, 'history', studentId);
  const list = aiConversationStore.get(key) || [];
  list.push({
    id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    role: message.role,
    content: String(message.content || ''),
    createdAt: new Date().toISOString()
  });
  aiConversationStore.set(key, list.slice(-24));
  return aiConversationStore.get(key);
}

export function getAiUsage(userId, month) {
  const key = keyForAi(userId, month);
  return aiUsageStore.get(key) || { id: key, userId, month, messageCount: 0, createdAt: new Date().toISOString() };
}

export function incrementAiUsage(userId, month, studentId) {
  const userKey = keyForAi(userId, month);
  const studentKey = keyForAi(userId, month, studentId);
  const current = getAiUsage(userId, month);
  const next = {
    ...current,
    messageCount: current.messageCount + 1
  };

  aiUsageStore.set(userKey, next);
  const studentCurrent = aiUsageStore.get(studentKey) || {
    id: studentKey,
    userId,
    studentId,
    month,
    messageCount: 0,
    createdAt: new Date().toISOString()
  };
  aiUsageStore.set(studentKey, { ...studentCurrent, messageCount: studentCurrent.messageCount + 1 });

  return next;
}

