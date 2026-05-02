import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  Bot,
  Camera,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Copy,
  CreditCard,
  Dumbbell,
  ExternalLink,
  Mail,
  Phone,
  Quote,
  Save,
  ShieldAlert,
  Star,
  Target,
  Trophy,
  User,
  Wand2,
  X
} from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../api/client';
import { UpgradeModal } from '../components/UpgradeModal';
import { useAuth } from '../context/AuthContext';
import { getAiMonthlyLimitByPlan, hasPlanFeature } from '../constants/plans';
import { resizeImageFileToDataUrl } from '../utils/imageFiles';
import { formatPersonName } from '../utils/personName';

const emptyForm = {
  name: '',
  birth_date: '',
  goal: '',
  level: '',
  restrictions: '',
  phone: '',
  email: '',
  notes: '',
  profession: '',
  weight: '',
  height: '',
  status: 'active',
  avatar_url: ''
};

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date);
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function getInitials(name = '') {
  const parts = formatPersonName(name).split(/\s+/).filter(Boolean).slice(0, 2);
  if (!parts.length) return 'AL';
  return parts.map((part) => part[0]).join('').toUpperCase();
}

function getAvatarUrl(student = {}) {
  return student.avatar_url || student.avatarUrl || '';
}

function sanitizePhoneInput(value) {
  return String(value || '').replace(/[^\d()+\-\s]/g, '').slice(0, 20);
}

function paymentStatusLabel(status = '') {
  const normalized = String(status).toLowerCase();
  if (normalized.includes('paid')) return 'Pago';
  if (normalized.includes('pending')) return 'Pendente';
  return 'Aguardando';
}

function paymentStatusClass(status = '') {
  const normalized = String(status).toLowerCase();
  if (normalized.includes('paid')) return 'bg-emerald-50 text-emerald-700';
  if (normalized.includes('pending')) return 'bg-amber-50 text-amber-700';
  return 'bg-slate-100 text-slate-600';
}

function metricChipClass(tone = 'neutral') {
  if (tone === 'positive') return 'bg-emerald-50 text-emerald-700';
  if (tone === 'warning') return 'bg-amber-50 text-amber-700';
  return 'bg-slate-100 text-slate-500';
}

function StudentMetricCard({ icon: Icon, title, value, subtitle, chip, chipTone = 'neutral' }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-xl bg-slate-50 p-2 text-blue-600">
          <Icon size={16} />
        </span>
        {chip ? <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${metricChipClass(chipTone)}`}>{chip}</span> : null}
      </div>
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-1 text-4xl font-bold leading-none tracking-tight text-slate-900">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
    </article>
  );
}

function SectionCard({ title, action, children }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-[24px] font-extrabold leading-none tracking-tight text-slate-900">{title}</h3>
        {action}
      </div>
      {children}
    </article>
  );
}

function ChatMessage({ role, content }) {
  const isAssistant = role === 'assistant';
  return (
    <div
      className={`max-w-[88%] rounded-[24px] border px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)] ${
        isAssistant ? 'border-slate-200 bg-white text-slate-700' : 'ml-auto border-blue-500 bg-blue-600 text-white'
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${isAssistant ? 'bg-blue-50 text-blue-600' : 'bg-white/15 text-white'}`}>
          {isAssistant ? <Bot size={14} /> : <User size={14} />}
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">{isAssistant ? 'Assistente IA' : 'Voce'}</p>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-6">{content}</p>
    </div>
  );
}

export function StudentProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const [student, setStudent] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [photoPreview, setPhotoPreview] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const [editNotice, setEditNotice] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [portalAccess, setPortalAccess] = useState(null);
  const [upgradeFeature, setUpgradeFeature] = useState('');
  const [aiHistory, setAiHistory] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiOpen, setAiOpen] = useState(false);
  const [aiUsage, setAiUsage] = useState({ used: user?.aiUsageThisMonth || 0, limit: getAiMonthlyLimitByPlan(user?.plan), unlimited: hasPlanFeature(user?.plan, 'ai_unlimited') });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNotice, setAiNotice] = useState('');
  const profilePhotoRef = useRef(null);
  const aiChatScrollRef = useRef(null);

  const canStudentPortal = hasPlanFeature(user?.plan, 'student_portal');
  const canAiAssistant = hasPlanFeature(user?.plan, 'ai_assistant');

  const loadStudent = useCallback(async () => {
    const { data } = await api.get(`/students/${id}`);
    setStudent(data);
    setForm({
      name: data.name || '',
      birth_date: data.birth_date || '',
      goal: data.goal || '',
      level: data.level || '',
      restrictions: data.restrictions || '',
      phone: data.phone || '',
      email: data.email || '',
      notes: data.notes || '',
      profession: data.profession || '',
      weight: data.weight || '',
      height: data.height || '',
      status: data.status || 'active',
      avatar_url: getAvatarUrl(data)
    });
    setPhotoPreview(getAvatarUrl(data));
  }, [id]);

  const loadPortalAccess = useCallback(async () => {
    if (!canStudentPortal) return;
    try {
      const { data } = await api.get(`/student-portal/access/${id}`);
      setPortalAccess(data.access || null);
    } catch {
      setPortalAccess(null);
    }
  }, [canStudentPortal, id]);

  const loadAiHistory = useCallback(async () => {
    if (!canAiAssistant) return;
    try {
      const { data } = await api.get(`/ai/student-chat/${id}/history`);
      setAiHistory(data.history || []);
      setAiUsage(data.usage || aiUsage);
    } catch {
      setAiHistory([]);
    }
  }, [aiUsage, canAiAssistant, id]);

  useEffect(() => {
    loadStudent();
  }, [loadStudent]);

  useEffect(() => {
    loadPortalAccess();
  }, [loadPortalAccess]);

  useEffect(() => {
    if (!aiOpen) return;
    loadAiHistory();
  }, [aiOpen, loadAiHistory]);

  useEffect(() => {
    if (!aiOpen) return;
    const container = aiChatScrollRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, [aiHistory, aiOpen, aiLoading]);

  async function saveChanges(event) {
    event.preventDefault();
    const { profession: _profession, ...payload } = form;
    await api.put(`/students/${id}`, payload);
    setShowEditModal(false);
    setEditNotice('');
    await loadStudent();
  }

  async function handleProfilePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setEditNotice('A foto precisa ter no maximo 5MB.');
      return;
    }

    try {
      const nextPhoto = await resizeImageFileToDataUrl(file);
      setPhotoPreview(nextPhoto);
      setForm((current) => ({ ...current, avatar_url: nextPhoto }));
      setEditNotice('');
    } catch {
      setEditNotice('Nao foi possivel carregar a foto do aluno.');
    }
  }

  async function copyStudentId() {
    try {
      await navigator.clipboard.writeText(student.id);
      setCopyMessage('ID copiado.');
    } catch {
      setCopyMessage('Nao foi possivel copiar automaticamente.');
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const stats = useMemo(() => {
    if (!student) return null;

    const workoutsCount = (student.workouts || []).length;
    const attendancePast30 = (student.attendance || []).filter((item) => {
      const date = new Date(item.class_date);
      if (Number.isNaN(date.getTime())) return false;
      const threshold = new Date();
      threshold.setDate(threshold.getDate() - 30);
      return date >= threshold;
    });

    const donePast30 = attendancePast30.filter((item) => String(item.status || '').toLowerCase() !== 'cancelled');
    const frequency = attendancePast30.length ? Math.round((donePast30.length / attendancePast30.length) * 100) : 0;

    const payments = student.payments || [];
    const latestPayment = [...payments].sort((a, b) => new Date(b.due_date || 0) - new Date(a.due_date || 0))[0] || null;

    const progressAsc = [...(student.progress || [])].sort((a, b) => new Date(a.record_date || 0) - new Date(b.record_date || 0));
    const firstWeight = Number(progressAsc[0]?.weight || student.weight || 0);
    const lastWeight = Number(progressAsc[progressAsc.length - 1]?.weight || student.weight || 0);
    const weightDelta = Number.isFinite(lastWeight - firstWeight) ? lastWeight - firstWeight : 0;

    return {
      workoutsCount,
      frequency,
      latestPayment,
      weightDelta,
      attendancePast30Count: attendancePast30.length
    };
  }, [student]);

  const progressChartData = useMemo(() => {
    if (!student) return [];

    return [...(student.progress || [])]
      .sort((a, b) => new Date(a.record_date || 0) - new Date(b.record_date || 0))
      .slice(-8)
      .map((item) => ({
        date: formatDate(item.record_date),
        peso: Number(item.weight) || null,
        massa: Number(item.lean_mass ?? item.muscle_mass ?? item.mass_lean) || null
      }));
  }, [student]);

  const recentWorkouts = useMemo(() => {
    return [...(student?.workouts || [])].slice(0, 4).map((workout) => ({
      ...workout,
      exercisesCount: Array.isArray(workout.exercises) ? workout.exercises.length : 0
    }));
  }, [student]);

  const recentPayments = useMemo(() => [...(student?.payments || [])].slice(0, 3), [student]);
  const latestAssistantReply = [...aiHistory].reverse().find((item) => item.role === 'assistant');

  const tabs = [
    { id: 'overview', label: 'Visao geral', icon: ClipboardList },
    { id: 'workouts', label: 'Historico de treinos', icon: Dumbbell },
    { id: 'progress', label: 'Evolucao fisica', icon: CalendarDays },
    { id: 'payments', label: 'Pagamentos', icon: CreditCard },
    { id: 'notes', label: 'Observacoes', icon: Quote }
  ];

  async function handlePortalAction(action) {
    if (!canStudentPortal) {
      setUpgradeFeature('student_portal');
      return;
    }

    if (action === 'generate') {
      const { data } = await api.post(`/student-portal/access/${id}/generate`);
      setPortalAccess(data.access);
      setCopyMessage('Acesso do aluno gerado.');
      return;
    }

    if (action === 'copy' && portalAccess?.link) {
      try {
        await navigator.clipboard.writeText(portalAccess.link);
        setCopyMessage('Link de acesso copiado.');
      } catch {
        setCopyMessage('Nao foi possivel copiar o link automaticamente.');
      }
      return;
    }

    if (action === 'open' && portalAccess?.link) {
      window.open(portalAccess.link, '_blank', 'noopener,noreferrer');
      setCopyMessage('Portal do aluno aberto em uma nova guia.');
      return;
    }

    if (action === 'resend') {
      const { data } = await api.post(`/student-portal/access/${id}/resend`);
      setPortalAccess(data.access);
      setCopyMessage('Convite reenviado.');
      return;
    }

    if (action === 'revoke') {
      await api.post(`/student-portal/access/${id}/revoke`);
      setPortalAccess(null);
      setCopyMessage('Acesso revogado.');
    }
  }

  async function sendAiMessage() {
    if (!canAiAssistant) {
      setUpgradeFeature('ai_assistant');
      return;
    }
    if (!aiInput.trim()) return;

    try {
      setAiLoading(true);
      setAiNotice('');
      const { data } = await api.post('/ai/student-chat', {
        studentId: id,
        message: aiInput.trim()
      });
      setAiHistory(data.history || []);
      setAiUsage(data.usage || aiUsage);
      setAiInput('');
      setAiNotice('Resposta gerada e salva no historico deste aluno.');
    } catch (error) {
      setAiNotice(error.response?.data?.message || 'Nao foi possivel consultar o Assistente IA.');
    } finally {
      setAiLoading(false);
    }
  }

  async function saveAssistantReplyAsWorkout() {
    if (!latestAssistantReply?.content) return;

    await api.post('/workouts', {
      student_id: id,
      name: `Assistente IA • ${student?.name || 'Aluno'}`,
      notes: latestAssistantReply.content,
      exercises: []
    });
    setAiNotice('Resposta salva como treino rascunho na biblioteca.');
  }

  async function copyAssistantReply() {
    if (!latestAssistantReply?.content) return;

    try {
      await navigator.clipboard.writeText(latestAssistantReply.content);
      setAiNotice('Resposta copiada.');
    } catch {
      setAiNotice('Nao foi possivel copiar automaticamente.');
    }
  }

  function clearAssistantConversation() {
    setAiNotice('O historico da IA e persistido por aluno e nao pode ser apagado desta tela.');
  }

  if (!student || !stats) return <p className="text-slate-500">Carregando perfil...</p>;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/students" className="inline-flex items-center gap-2 text-base font-semibold text-slate-600 hover:text-slate-900">
          <ArrowLeft size={16} /> Voltar para alunos
        </Link>
        <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={handleLogout}>Sair</button>
      </header>

      <section className="overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-[0_14px_42px_rgba(15,23,42,0.06)]">
        <div className="grid xl:grid-cols-[1fr_285px]">
          <div className="relative p-5 md:p-6">
            <div className="relative space-y-5">
              <div className="grid gap-4 lg:grid-cols-[145px_1fr]">
                <div className="relative shrink-0 self-start pt-4">
                  <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-400 to-blue-700 text-4xl font-semibold text-white shadow-[0_18px_32px_rgba(37,99,235,0.22)] ring-4 ring-white">
                    {getAvatarUrl(student) ? (
                      <img src={getAvatarUrl(student)} alt={student.name || 'Aluno'} className="h-full w-full object-cover" />
                    ) : (
                      getInitials(student.name)
                    )}
                  </div>
                  <span className="absolute bottom-2 right-4 h-4 w-4 rounded-full border-3 border-white bg-emerald-500 shadow-sm" />
                </div>

                <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-indigo-700">
                    <User size={14} /> Perfil do aluno
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700">
                    <Activity size={14} /> Acompanhamento ativo
                  </span>
                </div>

                <h1 className="mt-5 truncate text-[32px] font-semibold leading-tight tracking-tight text-slate-950 md:text-[36px]">{formatPersonName(student.name || 'Aluno')}</h1>
                <p className="mt-3 flex flex-wrap items-center gap-3 text-sm font-medium text-slate-700">
                  <span className="inline-flex items-center gap-2"><User size={14} className="text-slate-500" /> {student.goal || 'Sem objetivo definido'}</span>
                  <span className="h-4 w-px bg-slate-200" />
                  <span>Restricao: <strong className="font-semibold text-blue-600">{student.restrictions || 'Nao possui'}</strong></span>
                </p>
                </div>
              </div>

              <div className="rounded-[8px] border border-slate-200 bg-white px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Dados principais</p>
                <div className="mt-4 grid gap-y-5 md:grid-cols-4">
                  <div className="flex items-center gap-4 md:border-r md:border-slate-200">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-indigo-600"><CalendarDays size={18} /></span>
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500">Idade</p>
                      <p className="text-2xl font-semibold leading-tight text-slate-950">{student.age || '-'}</p>
                      <p className="text-xs text-slate-500">anos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 md:border-r md:border-slate-200 md:pl-7">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Trophy size={18} /></span>
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500">Peso</p>
                      <p className="text-2xl font-semibold leading-tight text-slate-950">{student.weight || '-'}</p>
                      <p className="text-xs text-slate-500">kg</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 md:border-r md:border-slate-200 md:pl-7">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><User size={18} /></span>
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500">Altura</p>
                      <p className="text-2xl font-semibold leading-tight text-slate-950">{student.height || '-'}</p>
                      <p className="text-xs text-slate-500">cm</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 md:pl-7">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-500"><Dumbbell size={18} /></span>
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-500">Treinos</p>
                      <p className="text-2xl font-semibold leading-tight text-slate-950">{stats.workoutsCount || 0}</p>
                      <p className="text-xs text-slate-500">realizados</p>
                    </div>
                  </div>
                </div>
              </div>

                <div className="flex flex-col gap-4 rounded-[8px] border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-indigo-600">
                      <Activity size={22} />
                    </span>
                    <div>
                      <p className="text-base font-semibold text-slate-950">Acompanhe o progresso do aluno</p>
                      <p className="mt-1 text-sm text-slate-500">Visualize metricas, treinos realizados e evolucao fisica em tempo real.</p>
                    </div>
                  </div>
                  <button type="button" className="btn-secondary h-11 px-5 text-sm" onClick={() => setActiveTab('progress')}>
                    Ver evolucao completa <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

          <aside className="border-t border-slate-200 bg-white p-5 xl:border-l xl:border-t-0">
            <div className="rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">ID do aluno</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-xl font-semibold tracking-tight text-slate-950">#{String(student.id).slice(0, 6)}</p>
                <button type="button" onClick={copyStudentId} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50">
                  <Copy size={16} />
                </button>
              </div>
              {copyMessage ? <p className="mt-2 text-xs text-slate-500">{copyMessage}</p> : null}
            </div>

            <div className="mt-4 grid gap-3">
              <button type="button" className="flex h-12 w-full items-center justify-between rounded-[8px] bg-blue-600 px-4 text-sm font-semibold text-white shadow-[0_14px_24px_rgba(37,99,235,0.2)] transition hover:bg-blue-700" onClick={() => setShowEditModal(true)}>
                <span className="inline-flex items-center gap-3"><User size={17} /> Editar perfil</span><ChevronRight size={17} />
              </button>
              <button type="button" className="flex h-12 w-full items-center justify-between rounded-[8px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" onClick={() => navigate('/workouts')}>
                <span className="inline-flex items-center gap-3"><Dumbbell size={17} /> Criar treino</span><ChevronRight size={17} />
              </button>
              <button type="button" className="flex h-12 w-full items-center justify-between rounded-[8px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" onClick={() => navigate('/schedule')}>
                <span className="inline-flex items-center gap-3"><CalendarDays size={17} /> Agendar aula</span><ChevronRight size={17} />
              </button>
              <button type="button" className="flex h-12 w-full items-center justify-between rounded-[8px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50" onClick={() => setAiOpen(true)}>
                <span className="inline-flex items-center gap-3"><Wand2 size={17} /> Assistente IA</span><ChevronRight size={17} />
              </button>
            </div>

            <div className="mt-6 space-y-3 rounded-[8px] border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Contato</p>
              <p className="flex items-center gap-3"><Phone size={16} className="text-blue-600" /> {student.phone || 'Telefone nao informado'}</p>
              <p className="flex items-center gap-3"><Mail size={16} className="text-blue-600" /> {student.email || 'Email nao informado'}</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StudentMetricCard
          icon={Dumbbell}
          title="Treinos concluidos"
          value={stats.workoutsCount}
          subtitle="Ultimos 30 dias"
          chip={stats.workoutsCount > 0 ? '+20%' : 'Sem base'}
          chipTone={stats.workoutsCount > 0 ? 'positive' : 'neutral'}
        />
        <StudentMetricCard
          icon={CheckCircle2}
          title="Frequencia mensal"
          value={`${stats.frequency}%`}
          subtitle={`${stats.attendancePast30Count} aulas no mes`}
          chip={stats.frequency >= 70 ? '+8%' : 'Acompanhar'}
          chipTone={stats.frequency >= 70 ? 'positive' : 'warning'}
        />
        <StudentMetricCard
          icon={CreditCard}
          title="Mensalidade"
          value={formatCurrency(stats.latestPayment?.amount)}
          subtitle={`Proxima cobranca: ${formatDate(stats.latestPayment?.due_date)}`}
          chip={stats.latestPayment ? 'Em dia' : 'Sem dados'}
          chipTone={stats.latestPayment ? 'positive' : 'neutral'}
        />
        <StudentMetricCard
          icon={CalendarDays}
          title="Evolucao fisica"
          value={`${stats.weightDelta >= 0 ? '+' : ''}${stats.weightDelta.toFixed(1)} kg`}
          subtitle="Ultimos 30 dias"
          chip={Math.abs(stats.weightDelta) > 0 ? '+5%' : 'Estavel'}
          chipTone={Math.abs(stats.weightDelta) > 0 ? 'positive' : 'neutral'}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard
          title="Area do aluno"
          action={
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${canStudentPortal ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {canStudentPortal ? 'Premium ativo' : 'Premium'}
            </span>
          }
        >
          <p className="text-sm text-slate-500">Gere acesso, copie o link do portal e reenvie convites com uma experiencia mais profissional.</p>
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">Status do acesso</p>
              <p className="mt-1 text-sm text-slate-500">{portalAccess?.id ? 'Acesso ativo salvo com expiracao e auditoria.' : 'Nenhum acesso criado ainda.'}</p>
              {portalAccess?.link ? <p className="mt-3 break-all text-xs text-slate-500">{portalAccess.link}</p> : null}
              {portalAccess?.expiresAt ? <p className="mt-3 text-xs text-slate-500">Expira em {formatDateTime(portalAccess.expiresAt)}</p> : null}
              {portalAccess?.lastAccessAt ? <p className="mt-1 text-xs text-slate-500">Ultimo acesso: {formatDateTime(portalAccess.lastAccessAt)}</p> : null}
            </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-5">
            <button type="button" className="btn-primary" onClick={() => handlePortalAction('generate')}>Gerar acesso</button>
            <button type="button" className="btn-secondary" onClick={() => handlePortalAction('copy')} disabled={!portalAccess?.link}>Copiar link</button>
            <button type="button" className="btn-secondary" onClick={() => handlePortalAction('open')} disabled={!portalAccess?.link}>Abrir portal</button>
            <button type="button" className="btn-secondary" onClick={() => handlePortalAction('resend')}>Reenviar convite</button>
            <button type="button" className="btn-secondary" onClick={() => handlePortalAction('revoke')} disabled={!portalAccess?.id}>Revogar</button>
          </div>
        </SectionCard>

        <SectionCard
          title="Assistente IA"
          action={
            <button type="button" className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700" onClick={() => setAiOpen(true)}>
              Abrir chat
            </button>
          }
        >
          <p className="text-sm text-slate-500">Analise este aluno, ajuste treinos e salve ideias com historico dedicado por perfil.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Uso atual</p>
              <p className="mt-2 text-3xl font-black text-slate-900">{aiUsage.used || 0}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Limite mensal</p>
              <p className="mt-2 text-3xl font-black text-slate-900">{aiUsage.unlimited ? 'Ilimitado' : aiUsage.limit || 0}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Historico</p>
              <p className="mt-2 text-3xl font-black text-slate-900">{aiHistory.length}</p>
            </div>
          </div>
        </SectionCard>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-6 py-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  active ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'overview' ? (
          <div className="grid gap-4 p-5 lg:grid-cols-2">
            <SectionCard title="Historico de treinos" action={<button type="button" className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">Ver todos</button>}>
              {recentWorkouts.length ? (
                <div className="space-y-3">
                  {recentWorkouts.map((workout, index) => (
                    <div key={workout.id || `${index}-${workout.name}`} className="flex items-center gap-3">
                      <div className="flex h-full min-h-[44px] w-3 items-start justify-center pt-1">
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                      </div>
                      <div className="flex-1 border-b border-slate-100 pb-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xl font-bold text-slate-800">{workout.name || `Treino ${index + 1}`}</p>
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Concluido</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{formatDate(workout.created_at)} • {workout.exercisesCount || 0} exercicios</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Nenhum treino registrado.</p>
              )}
            </SectionCard>

            <SectionCard title="Evolucao fisica" action={<button type="button" className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">Ver todos</button>}>
              {progressChartData.length ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={progressChartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="date" stroke="#64748b" tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" tickLine={false} axisLine={false} width={42} />
                      <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#cbd5e1' }} />
                      <Legend />
                      <Line type="monotone" dataKey="peso" name="Peso (kg)" stroke="#2563eb" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="massa" name="Massa magra (kg)" stroke="#10b981" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-14 text-center text-sm text-slate-500">
                  Sem dados de evolucao para exibir no grafico.
                </div>
              )}
            </SectionCard>

            <SectionCard title="Pagamentos" action={<button type="button" className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">Ver todos</button>}>
              {recentPayments.length ? (
                <ul className="space-y-3">
                  {recentPayments.map((pay) => (
                    <li key={pay.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                      <div>
                        <p className="text-lg font-bold tracking-tight text-slate-800">{pay.description || 'Mensalidade'}</p>
                        <p className="text-sm text-slate-500">Venc. {formatDate(pay.due_date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black tracking-tight text-slate-900">{formatCurrency(pay.amount)}</p>
                        <span className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${paymentStatusClass(pay.status)}`}>
                          {paymentStatusLabel(pay.status)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">Nenhum pagamento registrado.</p>
              )}
            </SectionCard>

            <SectionCard title="Observacoes do personal" action={<button type="button" className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700" onClick={() => setShowEditModal(true)}>Editar</button>}>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <Quote size={18} className="mb-2 text-blue-600" />
                <p className="text-base leading-7 text-slate-700">{student.notes || 'Sem observacoes para este aluno no momento.'}</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
                    {getInitials(user?.name || 'Personal')}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{user?.name || 'Personal'}</p>
                    <p className="text-xs text-slate-500">{formatDateTime(student.updated_at)}</p>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        ) : null}

        {activeTab === 'workouts' ? (
          <div className="p-4">
            <SectionCard title="Historico de treinos">
              {(student.workouts || []).length ? (
                <ul className="space-y-3">
                  {(student.workouts || []).map((workout, index) => (
                    <li key={workout.id || `${index}-${workout.name}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-base font-bold text-slate-800">{workout.name || `Treino ${index + 1}`}</p>
                      <p className="text-sm text-slate-500">Criado em {formatDate(workout.created_at)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">Nenhum treino registrado.</p>
              )}
            </SectionCard>
          </div>
        ) : null}

        {activeTab === 'progress' ? (
          <div className="p-4">
            <SectionCard title="Evolucao fisica">
              {progressChartData.length ? (
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={progressChartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="date" stroke="#64748b" tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" tickLine={false} axisLine={false} width={42} />
                      <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#cbd5e1' }} />
                      <Legend />
                      <Line type="monotone" dataKey="peso" name="Peso (kg)" stroke="#2563eb" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="massa" name="Massa magra (kg)" stroke="#10b981" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-14 text-center text-sm text-slate-500">
                  Sem registros de evolucao para montar o grafico.
                </div>
              )}
            </SectionCard>
          </div>
        ) : null}

        {activeTab === 'payments' ? (
          <div className="p-4">
            <SectionCard title="Pagamentos">
              {(student.payments || []).length ? (
                <ul className="space-y-3">
                  {(student.payments || []).map((pay) => (
                    <li key={pay.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div>
                        <p className="text-lg font-bold tracking-tight text-slate-800">{pay.description || 'Mensalidade'}</p>
                        <p className="text-sm text-slate-500">Vencimento: {formatDate(pay.due_date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black tracking-tight text-slate-900">{formatCurrency(pay.amount)}</p>
                        <span className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${paymentStatusClass(pay.status)}`}>
                          {paymentStatusLabel(pay.status)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">Nenhum pagamento registrado.</p>
              )}
            </SectionCard>
          </div>
        ) : null}

        {activeTab === 'notes' ? (
          <div className="p-4">
            <SectionCard
              title="Observacoes"
              action={<button type="button" className="btn-primary" onClick={() => setShowEditModal(true)}>Editar observacoes</button>}
            >
              <p className="text-base leading-7 text-slate-700">{student.notes || 'Sem observacoes para este aluno.'}</p>
            </SectionCard>
          </div>
        ) : null}
      </section>

      <footer className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm text-slate-500">
        <span className="inline-flex items-center gap-2"><ShieldAlert size={14} /> Todas as informacoes sao privadas e protegidas com seguranca.</span>
      </footer>

      {showEditModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/35 px-3 py-8 backdrop-blur-sm sm:px-6" onClick={() => setShowEditModal(false)}>
          <div className="relative w-full max-w-[1240px] rounded-[26px] border border-slate-200 bg-white p-8 shadow-[0_28px_70px_rgba(15,23,42,0.28)] md:p-9" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="absolute right-8 top-8 rounded-2xl border border-slate-200 bg-white p-3 text-slate-500 shadow-sm transition hover:bg-slate-50" onClick={() => setShowEditModal(false)}>
              <X size={20} />
            </button>

            <form className="grid max-h-[calc(100vh-7rem)] gap-11 overflow-y-auto pr-1 lg:grid-cols-[355px_1fr]" onSubmit={saveChanges}>
              <aside>
                <div>
                  <h2 className="text-3xl font-black leading-tight tracking-tight text-slate-950">Editar perfil do aluno</h2>
                  <p className="mt-2 max-w-[18rem] text-lg leading-7 text-slate-500">Atualize as informacoes do aluno e mantenha os dados sempre em dia.</p>
                </div>

                <div className="mt-8 rounded-[18px] border border-slate-200 bg-white p-5 text-center shadow-[0_16px_40px_rgba(15,23,42,0.04)]">
                  <input ref={profilePhotoRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleProfilePhotoChange} />
                  <button
                    type="button"
                    className="group relative mx-auto flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-4xl font-black text-slate-700 ring-1 ring-slate-200"
                    onClick={() => profilePhotoRef.current?.click()}
                  >
                    {photoPreview ? (
                      <img src={photoPreview} alt={form.name || 'Aluno'} className="h-full w-full object-cover" />
                    ) : (
                      getInitials(form.name || student.name)
                    )}
                    <span className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition group-hover:bg-blue-700">
                      <Camera size={18} />
                    </span>
                  </button>

                  <h3 className="mt-5 text-2xl font-black tracking-tight text-slate-950">{formatPersonName(form.name || student.name || 'Aluno')}</h3>
                  <p className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    {form.status === 'inactive' ? 'Aluno inativo' : 'Aluno ativo'}
                  </p>

                  <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm">
                    <h4 className="text-sm font-black text-slate-800">Resumo do aluno</h4>
                    <div className="mt-5 space-y-4">
                      <p className="flex items-start gap-3 text-sm text-slate-600"><span className="rounded-xl bg-blue-50 p-2 text-blue-600"><CalendarDays size={17} /></span><span><strong className="block text-slate-700">Membro desde</strong>{formatDate(student.created_at)}</span></p>
                      <p className="flex items-start gap-3 text-sm text-slate-600"><span className="rounded-xl bg-blue-50 p-2 text-blue-600"><Target size={17} /></span><span><strong className="block text-slate-700">Objetivo principal</strong>{form.goal || 'Nao definido'}</span></p>
                      <p className="flex items-start gap-3 text-sm text-slate-600"><span className="rounded-xl bg-blue-50 p-2 text-blue-600"><CalendarDays size={17} /></span><span><strong className="block text-slate-700">Aulas realizadas</strong>{(student.attendance || []).length} aulas</span></p>
                      <p className="flex items-start gap-3 text-sm text-slate-600"><span className="rounded-xl bg-blue-50 p-2 text-blue-600"><Star size={17} /></span><span><strong className="block text-slate-700">Plano atual</strong>Plano Pro</span></p>
                    </div>
                    <button type="button" className="mt-6 h-12 w-full rounded-xl border border-blue-500 bg-white text-sm font-black text-blue-600 transition hover:bg-blue-50">
                      Ver historico completo
                    </button>
                  </div>

                  {editNotice ? <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">{editNotice}</p> : null}
                </div>
              </aside>

              <main className="pt-28 lg:pr-1">
                <section className="space-y-4">
                  <h3 className="flex items-center gap-3 text-xl font-bold text-blue-600"><User size={20} /> Informacoes pessoais</h3>
                  <div className="grid gap-x-7 gap-y-5 md:grid-cols-2">
                    <label className="space-y-2 text-sm font-bold text-slate-600">
                      Nome completo
                      <input className="input h-14 rounded-xl text-base" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nome completo" />
                    </label>
                    <label className="space-y-2 text-sm font-bold text-slate-600">
                      Data de nascimento
                      <input type="date" className="input h-14 rounded-xl text-base" value={form.birth_date || ''} onChange={(event) => setForm({ ...form, birth_date: event.target.value })} />
                    </label>
                    <label className="space-y-2 text-sm font-bold text-slate-600">
                      E-mail
                      <input className="input h-14 rounded-xl text-base" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="email@exemplo.com" />
                    </label>
                    <label className="space-y-2 text-sm font-bold text-slate-600">
                      Telefone
                      <input className="input h-14 rounded-xl text-base" inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: sanitizePhoneInput(event.target.value) })} placeholder="(11) 98765-4321" />
                    </label>
                    <label className="space-y-2 text-sm font-bold text-slate-600 md:col-span-2">
                      Objetivo principal
                      <input className="input h-14 rounded-xl text-base" value={form.goal} onChange={(event) => setForm({ ...form, goal: event.target.value })} placeholder="Ganho de massa muscular" />
                    </label>
                  </div>
                </section>

                <div className="my-8 border-t border-slate-200" />

                <section className="space-y-4">
                  <h3 className="flex items-center gap-3 text-xl font-bold text-blue-600"><ClipboardList size={20} /> Informacoes adicionais</h3>
                  <div className="grid gap-x-7 gap-y-5 md:grid-cols-2">
                    <label className="space-y-2 text-sm font-bold text-slate-600">
                      Nivel atual
                      <select className="input h-14 rounded-xl text-base" value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })}>
                        <option value="">Selecione o nivel</option>
                        <option value="beginner">Iniciante</option>
                        <option value="intermediate">Intermediario</option>
                        <option value="advanced">Avancado</option>
                      </select>
                    </label>
                    <label className="space-y-2 text-sm font-bold text-slate-600">
                      Profissao
                      <input className="input h-14 rounded-xl text-base" value={form.profession} onChange={(event) => setForm({ ...form, profession: event.target.value })} placeholder="Estudante" />
                    </label>
                    <label className="space-y-2 text-sm font-bold text-slate-600 md:col-span-2">
                      Observacoes
                      <textarea className="input min-h-28 resize-none rounded-xl text-base" maxLength={300} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Adicione observacoes importantes sobre o aluno..." />
                    </label>
                  </div>
                </section>

                <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-semibold text-blue-700">
                  As alteracoes serao salvas e refletidas em todo o sistema.
                </div>

                <div className="mt-7 flex flex-col justify-end gap-3 sm:flex-row">
                  <button type="button" className="btn-secondary h-14 px-8 text-base" onClick={() => setShowEditModal(false)}>Cancelar</button>
                  <button className="btn-primary h-14 px-8 text-base"><CheckCircle2 size={18} /> Salvar alteracoes</button>
                </div>
              </main>
            </form>
          </div>
        </div>
      ) : null}

      {aiOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/35 backdrop-blur-sm" onClick={() => setAiOpen(false)}>
          <div
            className="flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-slate-200 bg-[linear-gradient(180deg,_#f8fbff_0%,_#ffffff_26%,_#ffffff_100%)] shadow-[-24px_0_50px_rgba(15,23,42,0.14)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-100 px-5 pb-5 pt-6 md:px-7">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                    <Bot size={13} />
                    Assistente IA
                  </p>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-lg font-black text-white shadow-[0_14px_28px_rgba(37,99,235,0.22)]">
                      {getAvatarUrl(student) ? (
                        <img src={getAvatarUrl(student)} alt={student.name || 'Aluno'} className="h-full w-full object-cover" />
                      ) : (
                        getInitials(student.name)
                      )}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-3xl font-black tracking-tight text-slate-900">{student.name}</h2>
                      <p className="mt-1 text-sm text-slate-500">Analise contextual do perfil do aluno, com foco em ajustes, progresso, orientacoes e proximas acoes.</p>
                    </div>
                  </div>
                </div>
                <button type="button" className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm transition hover:bg-slate-50" onClick={() => setAiOpen(false)}>
                  <X size={17} />
                </button>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">Contexto do aluno</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">{student.goal || 'Objetivo em aberto'}</span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">{student.restrictions || 'Sem restricoes registradas'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Uso da IA</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">{aiUsage.unlimited ? 'Ilimitado' : `${aiUsage.used}/${aiUsage.limit || 0} mensagens no mes`}</p>
                  </div>
                  {canAiAssistant ? <button type="button" className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200" onClick={loadAiHistory}>Atualizar</button> : null}
                </div>
              </div>
            </div>

            <div ref={aiChatScrollRef} className="thin-scrollbar flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_30%),linear-gradient(180deg,_#ffffff,_#f8fafc)] px-5 py-5 md:px-7">
              <div className="mb-4 rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Conversa contextual</p>
                <p className="mt-1 text-sm text-slate-500">Use este espaco para pedir refinamentos de treino, abordagem, observacoes tecnicas e proximos passos para este aluno.</p>
              </div>

              <div className="space-y-4">
                {aiHistory.length ? aiHistory.map((message) => (
                  <ChatMessage key={message.id} role={message.role} content={message.content} />
                )) : (
                  <ChatMessage role="assistant" content="Estou analisando o perfil deste aluno. O que voce deseja criar ou ajustar hoje?" />
                )}

                {aiLoading ? (
                  <div className="max-w-[88%] rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                        <Bot size={14} />
                      </span>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700">Assistente IA</p>
                    </div>
                    <p className="text-sm text-slate-600">Analisando o perfil e montando uma resposta mais util...</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.2s]" />
                      <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.1s]" />
                      <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-blue-300" />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="border-t border-slate-100 bg-white px-5 py-4 md:px-7">
              {aiNotice ? <p className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{aiNotice}</p> : null}

              <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-3 shadow-[0_14px_30px_rgba(15,23,42,0.04)]">
                <textarea
                  className="min-h-28 w-full resize-none rounded-2xl border border-transparent bg-white px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  placeholder="Peca ajustes de treino, progressao, sugestoes de abordagem ou observacoes para este aluno."
                  value={aiInput}
                  onChange={(event) => setAiInput(event.target.value)}
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">A IA considera o historico desta conversa e o contexto do aluno para responder com mais precisao.</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={sendAiMessage} disabled={aiLoading}>
                      <Wand2 size={15} />
                      {aiLoading ? 'Analisando...' : 'Enviar para IA'}
                    </button>
                    <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={saveAssistantReplyAsWorkout}>
                      <Save size={15} />
                      Salvar como treino
                    </button>
                    <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={copyAssistantReply}>
                      <Copy size={15} />
                      Copiar
                    </button>
                    <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={clearAssistantConversation}>
                      <ExternalLink size={15} />
                      Limpar conversa
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <UpgradeModal featureKey={upgradeFeature} open={Boolean(upgradeFeature)} onClose={() => setUpgradeFeature('')} />
    </div>
  );
}
