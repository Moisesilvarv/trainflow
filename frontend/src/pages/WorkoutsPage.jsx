import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, Bot, ChevronRight, ClipboardList, Copy, Crown, Dumbbell, FileDown, GripVertical, Image as ImageIcon, Link as LinkIcon, Lock, Plus, Send, Sparkles, Target, Trash2, TrendingUp, Wand2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { UpgradeModal } from '../components/UpgradeModal';
import { useAuth } from '../context/AuthContext';
import { formatPlanCurrency, getUpgradeCopy, getUpgradePlanForFeature, hasPlanFeature } from '../constants/plans';

const blankExercise = {
  name: '',
  muscle_group: '',
  sets: '',
  reps: '',
  rest: '',
  notes: ''
};

const emptyForm = {
  id: '',
  student_id: '',
  name: '',
  notes: '',
  demo_video_url: '',
  demo_image_url: '',
  exercises: [{ ...blankExercise }]
};

const muscleGroups = [
  'Tecnica',
  'Mobilidade',
  'Condicionamento',
  'Forca',
  'Velocidade',
  'Coordenacao',
  'Estabilidade',
  'Tatico'
];

const aiQuickSuggestions = ['Desempenho', 'Condicionamento', 'Futebol', 'Reabilitacao', 'Iniciante', 'Avancado'];
const AI_CHAT_STORAGE_PREFIX = 'trainflow-ai-chat-sessions';

function mapWorkoutToForm(workout = {}) {
  return {
    id: workout.id || '',
    student_id: workout.student_id || '',
    name: workout.name || '',
    notes: workout.notes || '',
    demo_video_url: workout.demo_video_url || '',
    demo_image_url: workout.demo_image_url || '',
    exercises: Array.isArray(workout.exercises) && workout.exercises.length
      ? workout.exercises.map((exercise) => ({ ...blankExercise, ...exercise }))
      : [{ ...blankExercise }]
  };
}

function createAiIntroMessage() {
  return {
    id: 'ai-intro',
    role: 'assistant',
    content: 'Descreva o tipo de sessao, modalidade, objetivo, nivel do aluno e qualquer restricao. Quanto mais contexto, melhor fica a sugestao.',
    intro: true,
    createdAt: Date.now()
  };
}

function createAiMessage(role, content, extras = {}) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: Date.now(),
    ...extras
  };
}

function getAiChatStorageKey(userId) {
  return `${AI_CHAT_STORAGE_PREFIX}:${userId || 'guest'}`;
}

function createAiSession(extras = {}) {
  const now = Date.now();
  return {
    id: `ai-session-${now}-${Math.random().toString(36).slice(2, 8)}`,
    title: extras.title || 'Nova conversa IA',
    createdAt: now,
    updatedAt: now,
    selectedStudentId: extras.selectedStudentId || '',
    draftWorkout: extras.draftWorkout || null,
    messages: Array.isArray(extras.messages) && extras.messages.length ? extras.messages : [createAiIntroMessage()]
  };
}

function normalizeAiSession(session) {
  return {
    id: session?.id || `ai-session-${Date.now()}`,
    title: session?.title || 'Nova conversa IA',
    createdAt: session?.createdAt || Date.now(),
    updatedAt: session?.updatedAt || Date.now(),
    selectedStudentId: session?.selectedStudentId || '',
    draftWorkout: session?.draftWorkout || null,
    messages: Array.isArray(session?.messages) && session.messages.length ? session.messages : [createAiIntroMessage()]
  };
}

function buildAiSessionTitle(prompt, fallback = 'Nova conversa IA') {
  const trimmed = String(prompt || '').trim();
  if (!trimmed) return fallback;
  return trimmed.length > 52 ? `${trimmed.slice(0, 52).trim()}...` : trimmed;
}

function formatChatTime(value) {
  if (!value) return '';

  try {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value));
  } catch {
    return '';
  }
}

function buildWorkoutNotesFromAi(workout = {}) {
  return [
    workout?.summary ? `Resumo: ${workout.summary}` : '',
    Array.isArray(workout?.warmup) && workout.warmup.length ? `Aquecimento: ${workout.warmup.join(' | ')}` : '',
    Array.isArray(workout?.observations) ? workout.observations.join(' | ') : ''
  ].filter(Boolean).join('\n');
}

function appendSuggestionToPrompt(currentPrompt, suggestion) {
  const base = String(currentPrompt || '').trim();
  if (!base) {
    return `Crie uma sessao com foco em ${suggestion.toLowerCase()}.`;
  }

  if (base.toLowerCase().includes(suggestion.toLowerCase())) {
    return currentPrompt;
  }

  return `${base} ${suggestion}`.trim();
}

function buildWorkoutEmailSubject(workout, student) {
  const workoutName = String(workout?.name || 'Treino').trim();
  const studentName = String(student?.name || 'Aluno').trim();
  return `Seu treino no TrainFlow: ${workoutName} - ${studentName}`;
}

function buildWorkoutEmailMessage(workout, student, coachName) {
  const studentName = String(student?.name || 'aluno').trim();
  const professionalName = String(coachName || 'seu profissional').trim();
  const workoutName = String(workout?.name || 'treino').trim();

  return [
    `Ola ${studentName},`,
    '',
    `Estou enviando seu treino "${workoutName}" para facilitar sua rotina e acompanhamento.`,
    '',
    'Revise as atividades com atencao e, se tiver qualquer duvida sobre execucao, intensidade ou adaptacao, me responda por este email.',
    '',
    `Bom treino!`,
    professionalName
  ].join('\n');
}

function WorkoutAiMessage({ message }) {
  const isAssistant = message.role === 'assistant';
  const workout = message.workout;
  const timestamp = formatChatTime(message.createdAt);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className={`max-w-3xl rounded-[24px] border px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] ${
        isAssistant ? 'border-slate-200 bg-white text-slate-700' : 'ml-auto border-blue-500 bg-blue-600 text-white'
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${isAssistant ? 'bg-blue-50 text-blue-600' : 'bg-white/15 text-white'}`}>
          {isAssistant ? <Bot size={15} /> : <Sparkles size={15} />}
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">{isAssistant ? 'Assistente IA' : 'Seu prompt'}</p>
        {timestamp ? <span className={`text-[11px] ${isAssistant ? 'text-slate-400' : 'text-blue-100'}`}>{timestamp}</span> : null}
      </div>

      {message.loading ? (
        <div className="space-y-3">
          <p className="text-sm leading-6 text-slate-600">{message.content || 'Montando o treino com base na conversa...'}</p>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.2s]" />
            <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.1s]" />
            <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-blue-300" />
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
      )}

      {workout && !message.loading ? (
        <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50/80 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Planejamento estruturado</p>
              <h4 className="mt-1 text-lg font-bold text-slate-900">{workout.name}</h4>
              <p className="mt-1 text-sm text-slate-600">{workout.summary}</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm">
              {Array.isArray(workout.exercises) ? workout.exercises.length : 0} atividades
            </span>
          </div>

          {Array.isArray(workout.warmup) && workout.warmup.length ? (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Aquecimento</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {workout.warmup.map((item) => (
                  <span key={item} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">{item}</span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 space-y-3">
            {(workout.exercises || []).map((exercise, index) => (
              <article key={`${exercise.name}-${index}`} className="rounded-2xl border border-white bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{exercise.name || `Atividade ${index + 1}`}</p>
                    <p className="mt-1 text-xs text-slate-500">{exercise.muscle_group || 'Foco livre'}</p>
                  </div>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">{exercise.rest || 'Sem descanso'}</span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Series ou duracao</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">{exercise.sets || '-'}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Repeticoes ou tempo</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">{exercise.reps || '-'}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Intervalo</p>
                    <p className="mt-1 text-sm font-semibold text-slate-700">{exercise.rest || '-'}</p>
                  </div>
                </div>
                {exercise.notes ? <p className="mt-3 text-sm text-slate-600">{exercise.notes}</p> : null}
              </article>
            ))}
          </div>

          {Array.isArray(workout.observations) && workout.observations.length ? (
            <div className="mt-4 rounded-2xl bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Observacoes</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                {workout.observations.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </motion.div>
  );
}

function LockedAiFeature({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-4 border-l border-slate-200 px-5 first:border-l-0 first:pl-0 last:pr-0 max-lg:border-l-0 max-lg:border-t max-lg:px-0 max-lg:pt-4 max-lg:first:border-t-0 max-lg:first:pt-0">
      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
        <Icon size={20} />
      </span>
      <div>
        <p className="text-lg font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export function WorkoutsPage() {
  const navigate = useNavigate();
  const { user, startCheckout } = useAuth();
  const [workouts, setWorkouts] = useState([]);
  const [students, setStudents] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [pdfLoadingId, setPdfLoadingId] = useState(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailModalError, setEmailModalError] = useState('');
  const [emailModalNotice, setEmailModalNotice] = useState('');
  const [emailForm, setEmailForm] = useState({
    workoutId: '',
    workoutName: '',
    studentName: '',
    to: '',
    subject: '',
    message: '',
    attachPdf: false
  });
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [activeStep, setActiveStep] = useState(1);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiPdfLoading, setAiPdfLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSelectedStudentId, setAiSelectedStudentId] = useState('');
  const [aiModalNotice, setAiModalNotice] = useState('');
  const [aiSessionMessages, setAiSessionMessages] = useState([createAiIntroMessage()]);
  const [aiDraftWorkout, setAiDraftWorkout] = useState(null);
  const [aiChatSessions, setAiChatSessions] = useState([]);
  const [activeAiSessionId, setActiveAiSessionId] = useState('');
  const [upgradeFeature, setUpgradeFeature] = useState('');
  const formScrollRef = useRef(null);
  const stepGeneralRef = useRef(null);
  const stepExercisesRef = useRef(null);
  const stepReviewRef = useRef(null);
  const aiChatScrollRef = useRef(null);
  const aiSessionHydratingRef = useRef(false);
  const canAiAssistant = hasPlanFeature(user?.plan, 'ai_assistant');
  const isExpiredTrial = user?.planStatus === 'expired';
  const aiUpgradePlan = getUpgradePlanForFeature('ai_assistant');
  const aiUpgradeCopy = getUpgradeCopy('ai_assistant');

  function blockIfExpired() {
    if (!isExpiredTrial) return false;
    setUpgradeFeature('subscription_required');
    return true;
  }

  async function loadAll() {
    const [{ data: workoutsData }, { data: studentsData }] = await Promise.all([
      api.get('/workouts'),
      api.get('/students')
    ]);
    setWorkouts(workoutsData || []);
    setStudents(studentsData || []);
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!user?.id || typeof window === 'undefined') return;

    try {
      const raw = window.localStorage.getItem(getAiChatStorageKey(user.id));
      const parsed = raw ? JSON.parse(raw) : [];
      const sessions = Array.isArray(parsed) ? parsed.map(normalizeAiSession).sort((a, b) => b.updatedAt - a.updatedAt) : [];
      setAiChatSessions(sessions);
      setActiveAiSessionId((current) => current || sessions[0]?.id || '');
    } catch {
      setAiChatSessions([]);
      setActiveAiSessionId('');
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || typeof window === 'undefined') return;
    window.localStorage.setItem(getAiChatStorageKey(user.id), JSON.stringify(aiChatSessions));
  }, [aiChatSessions, user?.id]);

  useEffect(() => {
    if (!aiModalOpen) return;
    const container = aiChatScrollRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, [aiSessionMessages, aiModalOpen]);

  const studentNameById = useMemo(() => {
    return Object.fromEntries((students || []).map((student) => [student.id, student.name]));
  }, [students]);

  const studentById = useMemo(() => {
    return Object.fromEntries((students || []).map((student) => [student.id, student]));
  }, [students]);

  const activeAiSession = useMemo(
    () => aiChatSessions.find((session) => session.id === activeAiSessionId) || null,
    [aiChatSessions, activeAiSessionId]
  );

  function hydrateSessionIntoView(session) {
    aiSessionHydratingRef.current = true;
    setActiveAiSessionId(session.id);
    setAiSelectedStudentId(session.selectedStudentId || '');
    setAiSessionMessages(Array.isArray(session.messages) && session.messages.length ? session.messages : [createAiIntroMessage()]);
    setAiDraftWorkout(session.draftWorkout || null);
    setAiPrompt('');
    setAiModalNotice('');
    window.requestAnimationFrame(() => {
      aiSessionHydratingRef.current = false;
    });
  }

  function upsertAiSessionState(sessionId, patch) {
    setAiChatSessions((current) => {
      const next = current.map((session) => {
        if (session.id !== sessionId) return session;
        return {
          ...session,
          ...patch,
          updatedAt: patch.updatedAt || Date.now()
        };
      });

      return [...next].sort((a, b) => b.updatedAt - a.updatedAt);
    });
  }

  function createNewAiSession(options = {}) {
    const session = createAiSession({
      title: options.title,
      selectedStudentId: options.selectedStudentId
    });

    setAiChatSessions((current) => [session, ...current].sort((a, b) => b.updatedAt - a.updatedAt));
    hydrateSessionIntoView(session);
    return session;
  }

  function startFreshAiChat() {
    createNewAiSession();
  }

  function deleteAiChatSession(sessionId) {
    setAiChatSessions((current) => {
      const remaining = current.filter((session) => session.id !== sessionId);
      const nextActive = remaining[0] || null;

      if (sessionId === activeAiSessionId) {
        if (nextActive) {
          hydrateSessionIntoView(nextActive);
        } else {
          const freshSession = createAiSession();
          setActiveAiSessionId(freshSession.id);
          setAiSelectedStudentId('');
          setAiSessionMessages(freshSession.messages);
          setAiDraftWorkout(null);
          setAiPrompt('');
          setAiModalNotice('');
          return [freshSession];
        }
      }

      return remaining;
    });
  }

  useEffect(() => {
    if (!activeAiSessionId || aiSessionHydratingRef.current) return;
    upsertAiSessionState(activeAiSessionId, {
      selectedStudentId: aiSelectedStudentId,
      messages: aiSessionMessages,
      draftWorkout: aiDraftWorkout,
      title: buildAiSessionTitle(
        aiSessionMessages.find((message) => message.role === 'user')?.content,
        activeAiSession?.title || 'Nova conversa IA'
      )
    });
  }, [activeAiSessionId, aiSelectedStudentId, aiSessionMessages, aiDraftWorkout, activeAiSession?.title]);

  function closeBuilder() {
    setBuilderOpen(false);
    setForm(emptyForm);
    setEditing(false);
    setActiveStep(1);
  }

  function openCreateBuilder() {
    if (blockIfExpired()) return;
    setErrorMessage('');
    setNotice('');
    setEditing(false);
    setForm(emptyForm);
    setActiveStep(1);
    setBuilderOpen(true);
  }

  function openEditBuilder(workout) {
    if (blockIfExpired()) return;
    setErrorMessage('');
    setNotice('');
    setEditing(true);
    setForm(mapWorkoutToForm(workout));
    setActiveStep(1);
    setBuilderOpen(true);
  }

  function updateStepFromScroll() {
    const container = formScrollRef.current;
    if (!container) return;

    if (container.scrollTop + container.clientHeight >= container.scrollHeight - 24) {
      setActiveStep(3);
      return;
    }

    const containerTop = container.getBoundingClientRect().top;
    const checkpoints = [
      { step: 1, ref: stepGeneralRef },
      { step: 2, ref: stepExercisesRef },
      { step: 3, ref: stepReviewRef }
    ];

    let nextStep = 1;
    checkpoints.forEach(({ step, ref }) => {
      const top = ref.current?.getBoundingClientRect().top;
      if (typeof top !== 'number') return;
      if (top - containerTop <= 120) nextStep = step;
    });

    setActiveStep(nextStep);
  }

  function scrollToStep(step) {
    const container = formScrollRef.current;
    if (!container) return;
    const refsByStep = {
      1: stepGeneralRef,
      2: stepExercisesRef,
      3: stepReviewRef
    };
    const target = refsByStep[step]?.current;
    if (!target) return;
    container.scrollTo({ top: target.offsetTop - 12, behavior: 'smooth' });
  }

  useEffect(() => {
    if (!builderOpen) return;
    const id = window.requestAnimationFrame(() => updateStepFromScroll());
    return () => window.cancelAnimationFrame(id);
  }, [builderOpen]);

  function addExercise() {
    setForm((current) => ({ ...current, exercises: [...current.exercises, { ...blankExercise }] }));
  }

  function removeExercise(index) {
    setForm((current) => {
      const next = current.exercises.filter((_, currentIndex) => currentIndex !== index);
      return { ...current, exercises: next.length ? next : [{ ...blankExercise }] };
    });
  }

  function updateExercise(index, key, value) {
    setForm((current) => {
      const next = [...current.exercises];
      next[index] = { ...next[index], [key]: value };
      return { ...current, exercises: next };
    });
  }

  async function handleSaveWorkout(e) {
    e.preventDefault();
    if (blockIfExpired()) return;
    setErrorMessage('');
    setNotice('');

    const basePayload = {
      student_id: form.student_id,
      name: form.name,
      notes: form.notes,
      demo_video_url: form.demo_video_url,
      demo_image_url: form.demo_image_url,
      exercises: form.exercises.filter((exercise) => String(exercise.name || '').trim())
    };

    try {
      if (editing && form.id) {
        await api.put(`/workouts/${form.id}`, basePayload);
      } else {
        await api.post('/workouts', basePayload);
      }

      closeBuilder();
      await loadAll();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Nao foi possivel salvar o treino.');
    }
  }

  async function removeWorkout(id) {
    if (blockIfExpired()) return;
    await api.delete(`/workouts/${id}`);
    await loadAll();
  }

  function duplicateWorkout(workout) {
    if (blockIfExpired()) return;
    setEditing(false);
    setForm({
      ...mapWorkoutToForm(workout),
      id: '',
      name: `${workout.name} (Copia)`
    });
    setBuilderOpen(true);
  }

  async function downloadWorkoutPdf(workout) {
    if (!hasPlanFeature(user?.plan, 'pdf_export')) {
      setUpgradeFeature('pdf_export');
      return;
    }

    setErrorMessage('');
    setPdfLoadingId(workout.id);

    try {
      const response = await api.get(`/workouts/${workout.id}/pdf`, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      const safeName = (workout.name || 'treino')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9-_ ]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .toLowerCase();
      link.href = blobUrl;
      link.download = `ficha-treino-${safeName || 'treino'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Nao foi possivel gerar o PDF do treino.');
    } finally {
      setPdfLoadingId(null);
    }
  }

  function closeEmailModal() {
    setEmailModalOpen(false);
    setEmailSending(false);
    setEmailModalError('');
    setEmailModalNotice('');
  }

  function openSendWorkoutModal(workout) {
    if (blockIfExpired()) return;
    const student = studentById[workout.student_id] || null;
    const canAttachPdf = hasPlanFeature(user?.plan, 'pdf_export');

    setErrorMessage('');
    setNotice('');
    setEmailModalError('');
    setEmailModalNotice('');
    setEmailForm({
      workoutId: workout.id,
      workoutName: workout.name || 'Treino',
      studentName: student?.name || 'Aluno',
      to: student?.email || '',
      subject: buildWorkoutEmailSubject(workout, student),
      message: buildWorkoutEmailMessage(workout, student, user?.name),
      attachPdf: canAttachPdf
    });
    setEmailModalOpen(true);
  }

  async function handleSendWorkoutEmail(event) {
    event.preventDefault();
    if (blockIfExpired()) return;
    if (!emailForm.workoutId) return;

    try {
      setEmailSending(true);
      setEmailModalError('');
      setEmailModalNotice('');
      setErrorMessage('');
      setNotice('');

      const { data } = await api.post(`/workouts/${emailForm.workoutId}/send-email`, {
        to: emailForm.to,
        subject: emailForm.subject,
        message: emailForm.message,
        attachPdf: emailForm.attachPdf
      });

      setEmailModalNotice(data?.message || 'Treino enviado por email com sucesso.');
      setNotice(data?.message || `Treino "${emailForm.workoutName}" enviado com sucesso.`);
      window.setTimeout(() => {
        closeEmailModal();
      }, 500);
    } catch (error) {
      const message = error.response?.data?.message || 'Nao foi possivel enviar o treino por email.';
      setEmailModalError(message);
      setErrorMessage(message);
    } finally {
      setEmailSending(false);
    }
  }

  function openAiModal() {
    if (blockIfExpired()) return;
    setErrorMessage('');
    setAiModalNotice('');
    setAiPrompt('');
    const existingSession = activeAiSession || aiChatSessions[0] || null;
    if (existingSession) {
      hydrateSessionIntoView(existingSession);
    } else {
      createNewAiSession();
    }
    setAiModalOpen(true);
  }

  function closeAiModal() {
    setAiModalOpen(false);
    setAiLoading(false);
    setAiSaving(false);
    setAiPdfLoading(false);
    setAiPrompt('');
    setAiModalNotice('');
  }

  function handleAiStudentChange(value) {
    setAiSelectedStudentId(value);
  }

  function handleQuickSuggestionClick(suggestion) {
    setAiPrompt((current) => appendSuggestionToPrompt(current, suggestion));
  }

  async function handleAiUpgrade() {
    const result = await startCheckout(aiUpgradePlan.id);
    if (result?.checkoutUrl) {
      window.location.href = result.checkoutUrl;
    }
  }

  async function generateAiWorkout() {
    if (blockIfExpired()) return;
    if (!canAiAssistant) return;
    const trimmedPrompt = String(aiPrompt || '').trim();
    if (!trimmedPrompt) {
      setAiModalNotice('Descreva a sessao ou planejamento que voce quer gerar antes de continuar.');
      return;
    }

    const sessionId = activeAiSessionId || createNewAiSession({ title: buildAiSessionTitle(trimmedPrompt) }).id;
    const userMessage = createAiMessage('user', trimmedPrompt);
    const loadingMessage = createAiMessage('assistant', 'Montando o treino com base no seu contexto...', { loading: true });
    const history = aiSessionMessages
      .filter((message) => !message.intro)
      .map((message) => ({ role: message.role, content: message.content }));
    const queuedMessages = [...aiSessionMessages, userMessage, loadingMessage];

    try {
      setAiLoading(true);
      setErrorMessage('');
      setAiModalNotice('');

      setAiSessionMessages((current) => [...current, userMessage, loadingMessage]);
      setAiPrompt('');
      upsertAiSessionState(sessionId, {
        title: buildAiSessionTitle(trimmedPrompt),
        selectedStudentId: aiSelectedStudentId,
        messages: queuedMessages
      });

      const { data } = await api.post('/intelligence/workout-suggestions', {
        prompt: trimmedPrompt,
        studentId: aiSelectedStudentId || undefined,
        studentName: studentNameById[aiSelectedStudentId] || '',
        history
      });

      const workout = {
        name: data?.workout?.name || 'Treino sugerido por IA',
        summary: data?.workout?.summary || '',
        warmup: Array.isArray(data?.workout?.warmup) ? data.workout.warmup : [],
        observations: Array.isArray(data?.workout?.observations) ? data.workout.observations : [],
        exercises: Array.isArray(data?.workout?.exercises)
          ? data.workout.exercises.map((exercise) => ({ ...blankExercise, ...exercise }))
          : []
      };

      setAiDraftWorkout(workout);
      const nextMessages = queuedMessages
        .map((message) => {
          if (message.id !== loadingMessage.id) return message;
          return createAiMessage(
            'assistant',
            data?.assistantMessage || 'Estruturei um planejamento para voce revisar e salvar no aluno.',
            { workout }
          );
        });

      setAiSessionMessages((current) => current.map((message) => {
        if (message.id !== loadingMessage.id) return message;
        return createAiMessage(
          'assistant',
          data?.assistantMessage || 'Estruturei um planejamento para voce revisar e salvar no aluno.',
          { workout }
        );
      }));
      upsertAiSessionState(sessionId, {
        title: buildAiSessionTitle(trimmedPrompt),
        selectedStudentId: aiSelectedStudentId,
        messages: nextMessages,
        draftWorkout: workout
      });
    } catch (error) {
      const message = error.response?.data?.message || 'Nao foi possivel gerar sugestao com IA.';
      setAiModalNotice(message);
      setErrorMessage(message);
      const failedMessages = queuedMessages
        .map((messageItem) => {
          if (messageItem.id !== loadingMessage.id) return messageItem;
          return createAiMessage('assistant', `Nao consegui concluir essa solicitacao agora. ${message}`.trim());
        });

      setAiSessionMessages((current) => current.map((messageItem) => {
        if (!messageItem.loading) return messageItem;
        return createAiMessage('assistant', `Nao consegui concluir essa solicitacao agora. ${message}`.trim());
      }));
      upsertAiSessionState(sessionId, {
        selectedStudentId: aiSelectedStudentId,
        messages: failedMessages
      });
    } finally {
      setAiLoading(false);
    }
  }

  async function downloadWorkoutPdfById(workoutId, workoutName) {
    if (!hasPlanFeature(user?.plan, 'pdf_export')) {
      setUpgradeFeature('pdf_export');
      return;
    }

    const response = await api.get(`/workouts/${workoutId}/pdf`, { responseType: 'blob' });
    const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    const safeName = (workoutName || 'treino')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_ ]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase();
    link.href = blobUrl;
    link.download = `ficha-treino-${safeName || 'treino'}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  }

  async function saveAiWorkoutToStudent(options = {}) {
    if (blockIfExpired()) return;
    if (!aiDraftWorkout) return;
    if (!aiSelectedStudentId) {
      setAiModalNotice('Selecione um aluno para vincular o treino.');
      return;
    }

    try {
      setAiSaving(true);
      if (options.downloadPdf) setAiPdfLoading(true);
      setAiModalNotice('');
      setErrorMessage('');
      let savedWorkout = null;

      if (aiDraftWorkout.savedWorkoutId) {
        savedWorkout = {
          id: aiDraftWorkout.savedWorkoutId,
          name: aiDraftWorkout.name
        };
      } else {
        const { data } = await api.post('/workouts', {
          student_id: aiSelectedStudentId,
          name: aiDraftWorkout.name,
          notes: buildWorkoutNotesFromAi(aiDraftWorkout),
          exercises: aiDraftWorkout.exercises
        });
        savedWorkout = data;
      }

      await loadAll();
      const nextDraft = {
        ...aiDraftWorkout,
        savedWorkoutId: savedWorkout.id
      };
      const confirmationMessage = createAiMessage(
        'assistant',
        options.downloadPdf
          ? `Treino salvo e PDF preparado para ${studentNameById[aiSelectedStudentId] || 'o aluno selecionado'}.`
          : `Treino adicionado com sucesso para ${studentNameById[aiSelectedStudentId] || 'o aluno selecionado'}.`
      );
      const nextMessages = [...aiSessionMessages, confirmationMessage];
      setAiDraftWorkout(nextDraft);
      setAiModalNotice(options.downloadPdf ? 'Treino salvo e PDF gerado com sucesso.' : 'Treino salvo e vinculado ao aluno selecionado.');
      setNotice(`Treino "${savedWorkout.name}" salvo para ${studentNameById[aiSelectedStudentId] || 'o aluno selecionado'}.`);
      setAiSessionMessages(nextMessages);
      if (activeAiSessionId) {
        upsertAiSessionState(activeAiSessionId, {
          selectedStudentId: aiSelectedStudentId,
          messages: nextMessages,
          draftWorkout: nextDraft
        });
      }

      if (options.downloadPdf) {
        await downloadWorkoutPdfById(savedWorkout.id, savedWorkout.name);
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Nao foi possivel adicionar o treino ao aluno.';
      setAiModalNotice(message);
      setErrorMessage(message);
    } finally {
      setAiSaving(false);
      setAiPdfLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-blue-50 px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Treinos</h1>
            <p className="text-slate-500">Biblioteca de treinos com builder modular e acoes profissionais.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary inline-flex items-center gap-2" onClick={openAiModal}>
              <Wand2 size={16} />
              {hasPlanFeature(user?.plan, 'ai_assistant') ? 'Sugerir com IA' : 'IA (Pro+)'}
            </button>
            <button className="btn-primary inline-flex items-center gap-2" onClick={openCreateBuilder}>
              <Plus size={16} />
              Criar treino
            </button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-[0_16px_32px_rgba(15,23,42,0.04)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Novo fluxo IA</p>
            <p className="mt-2 text-lg font-bold text-slate-900">Abra um chat, descreva o contexto e gere um treino com mais precisao.</p>
            <p className="mt-2 text-sm text-slate-500">A experiencia agora conversa com o personal, mostra o treino dentro do modal e salva direto no aluno selecionado.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-[0_16px_32px_rgba(15,23,42,0.04)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sugestoes rapidas</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {aiQuickSuggestions.map((item) => (
                <span key={item} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {errorMessage ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{errorMessage}</p> : null}
      {notice ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}

      <div className="grid gap-4">
        {workouts.map((workout) => (
          <article key={workout.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">{workout.name}</h3>
                <p className="mt-1 text-sm text-slate-500">{studentNameById[workout.student_id] || 'Sem aluno vinculado'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-secondary inline-flex items-center gap-1.5 text-xs" onClick={() => openEditBuilder(workout)}>
                  Editar
                </button>
                <button type="button" className="btn-secondary inline-flex items-center gap-1.5 text-xs" onClick={() => duplicateWorkout(workout)}>
                  <Copy size={13} />
                  Duplicar
                </button>
                <button
                  type="button"
                  className="btn-primary inline-flex items-center gap-1.5 text-xs"
                  onClick={() => openSendWorkoutModal(workout)}
                >
                  <Send size={13} />
                  Enviar ao aluno
                </button>
                <button type="button" className="btn-secondary inline-flex items-center gap-1.5 text-xs" onClick={() => downloadWorkoutPdf(workout)}>
                  <FileDown size={13} />
                  {pdfLoadingId === workout.id ? 'Gerando...' : hasPlanFeature(user?.plan, 'pdf_export') ? 'Baixar PDF' : 'PDF (Pro+)'}
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                  onClick={() => removeWorkout(workout.id)}
                >
                  <Trash2 size={13} className="mr-1 inline" />
                  Excluir
                </button>
              </div>
            </div>

            <p className="mt-3 text-sm text-slate-600">{workout.notes || 'Sem observacoes para este treino.'}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {(workout.exercises || []).slice(0, 4).map((exercise, index) => (
                <span key={`${workout.id}-${index}-${exercise.name}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {exercise.name || `Atividade ${index + 1}`}
                </span>
              ))}
              {(workout.exercises || []).length > 4 ? (
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  +{(workout.exercises || []).length - 4} atividades
                </span>
              ) : null}
            </div>
          </article>
        ))}

        {workouts.length === 0 ? (
          <div className="card px-5 py-10 text-center">
            <p className="text-base font-semibold text-slate-700">Nenhum treino criado ainda</p>
            <p className="mt-1 text-sm text-slate-500">Abra o builder para criar o primeiro treino da sua biblioteca.</p>
            <button className="btn-primary mt-4 inline-flex items-center gap-2" onClick={openCreateBuilder}>
              <Plus size={16} />
              Criar treino
            </button>
          </div>
        ) : null}
      </div>

      <AnimatePresence>
        {aiModalOpen ? (
          <motion.div
            key="ai-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/45 p-3 backdrop-blur-sm md:p-6"
            onClick={closeAiModal}
          >
            <motion.div
              initial={{ opacity: 0, y: 22, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.24 }}
              className="mx-auto flex h-[calc(100vh-24px)] max-w-7xl flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_28px_70px_rgba(15,23,42,0.28)] md:h-[calc(100vh-48px)]"
              onClick={(event) => event.stopPropagation()}
            >
              {canAiAssistant ? (
                <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[320px_1fr]">
                  <aside className="thin-scrollbar overflow-y-auto border-b border-slate-100 bg-gradient-to-b from-slate-50 via-white to-blue-50/70 p-5 lg:border-b-0 lg:border-r lg:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Assistente IA</p>
                        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Sugerir com IA</h2>
                          <p className="mt-2 text-sm leading-6 text-slate-500">Converse com a IA, refine o contexto e salve o planejamento pronto no aluno certo.</p>
                      </div>
                      <button type="button" className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" onClick={closeAiModal}>
                        <X size={18} />
                      </button>
                    </div>

                    <div className="mt-6 space-y-4">
                      <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-[0_14px_28px_rgba(15,23,42,0.04)]">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Conversas salvas</p>
                            <p className="mt-1 text-xs text-slate-500">Reabra qualquer chat desta sessao e continue de onde parou.</p>
                          </div>
                          <button
                            type="button"
                            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                            onClick={startFreshAiChat}
                          >
                            Novo chat
                          </button>
                        </div>

                        <div className="mt-4 space-y-2">
                          {aiChatSessions.slice(0, 6).map((session) => {
                            const isActive = session.id === activeAiSessionId;
                            return (
                              <div
                                key={session.id}
                                className={`flex w-full items-start justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                                  isActive ? 'border-blue-200 bg-blue-50/80' : 'border-slate-200 bg-slate-50/70 hover:bg-white'
                                }`}
                              >
                                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => hydrateSessionIntoView(session)}>
                                  <p className={`truncate text-sm font-semibold ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>{session.title}</p>
                                  <p className="mt-1 text-xs text-slate-500">{new Date(session.updatedAt).toLocaleDateString('pt-BR')} às {formatChatTime(session.updatedAt)}</p>
                                </button>
                                <button
                                  type="button"
                                  className="rounded-xl border border-rose-200 bg-white p-2 text-rose-500 transition hover:bg-rose-50"
                                  onClick={() => deleteAiChatSession(session.id)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-[0_14px_28px_rgba(15,23,42,0.04)]">
                        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Aluno para vincular</label>
                        <select
                          className="input mt-2"
                          value={aiSelectedStudentId}
                          onChange={(event) => handleAiStudentChange(event.target.value)}
                        >
                          <option value="">Selecione um aluno</option>
                          {students.map((student) => (
                            <option key={student.id} value={student.id}>{student.name}</option>
                          ))}
                        </select>
                        <p className="mt-2 text-xs text-slate-500">O treino sera salvo diretamente no aluno selecionado quando voce confirmar.</p>
                      </div>

                      <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Sugestoes rapidas</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {aiQuickSuggestions.map((item) => (
                            <button
                              key={item}
                              type="button"
                              className="rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:-translate-y-0.5 hover:bg-blue-50"
                              onClick={() => handleQuickSuggestionClick(item)}
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_14px_28px_rgba(15,23,42,0.04)]">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Como funciona</p>
                        <div className="mt-3 space-y-3 text-sm text-slate-600">
                          <p className="rounded-xl bg-slate-50 px-3 py-2">1. Escreva o contexto do treino com foco, nivel e restricoes.</p>
                          <p className="rounded-xl bg-slate-50 px-3 py-2">2. Gere o treino e refine com novas mensagens no mesmo chat.</p>
                          <p className="rounded-xl bg-slate-50 px-3 py-2">3. Salve no banco quando estiver satisfeito com a estrutura.</p>
                        </div>
                      </div>
                    </div>
                  </aside>

                  <div className="flex min-h-0 flex-col overflow-hidden">
                    <div className="border-b border-slate-100 px-5 py-4 md:px-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">Chat de criacao do planejamento</h3>
                            <p className="mt-1 text-sm text-slate-500">Use prompts livres e acompanhe o historico completo da conversa com a sugestao estruturada em tempo real.</p>
                        </div>
                        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          {activeAiSession ? activeAiSession.title : 'Nova conversa IA'}
                        </div>
                      </div>
                      {aiModalNotice ? <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">{aiModalNotice}</p> : null}
                      {aiDraftWorkout ? (
                        <div className="mt-4 rounded-[26px] border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-slate-50 p-4 shadow-[0_18px_36px_rgba(37,99,235,0.08)]">
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">Treino pronto para entrega</p>
                              <h4 className="mt-2 text-xl font-black text-slate-900">{aiDraftWorkout.name}</h4>
                              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                                Revise a estrutura, salve no aluno escolhido e gere o PDF em um clique para enviar com uma apresentacao mais premium.
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                                  {aiDraftWorkout.exercises?.length || 0} atividades
                                </span>
                                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                                  {aiSelectedStudentId ? (studentNameById[aiSelectedStudentId] || 'Aluno selecionado') : 'Escolha um aluno'}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row">
                              <button
                                type="button"
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_12px_24px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                                onClick={() => saveAiWorkoutToStudent()}
                                disabled={aiSaving}
                              >
                                {aiSaving ? 'Salvando...' : aiDraftWorkout.savedWorkoutId ? 'Atualizado no chat' : 'Salvar no aluno'}
                              </button>
                              <button
                                type="button"
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(37,99,235,0.22)] transition hover:-translate-y-0.5 hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                                onClick={() => saveAiWorkoutToStudent({ downloadPdf: true })}
                                disabled={aiSaving || aiPdfLoading}
                              >
                                <FileDown size={16} />
                                {aiPdfLoading ? 'Gerando PDF...' : aiDraftWorkout.savedWorkoutId ? 'Baixar PDF premium' : 'Salvar e gerar PDF'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div ref={aiChatScrollRef} className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_45%),linear-gradient(180deg,_#ffffff,_#f8fafc)] px-4 py-5 md:px-6">
                      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Historico da conversa</p>
                          <p className="mt-1 text-sm text-slate-500">Cada prompt e resposta ficam salvos enquanto este modal estiver aberto.</p>
                        </div>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {Math.max(aiSessionMessages.filter((message) => !message.intro).length, 0)} mensagens
                        </span>
                      </div>
                      <div className="space-y-4">
                        {aiSessionMessages.map((message) => (
                          <WorkoutAiMessage key={message.id} message={message} />
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 bg-white px-4 py-4 md:px-6">
                      <div className="rounded-[26px] border border-slate-200 bg-slate-50 p-3 shadow-[0_16px_30px_rgba(15,23,42,0.04)]">
                        <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Prompt do personal</label>
                        <textarea
                          className="mt-3 min-h-32 w-full resize-y rounded-2xl border border-transparent bg-white px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                          placeholder='Ex: Crie uma sessao para corrida com foco em resistencia para aluno intermediario com restricao no joelho.'
                          value={aiPrompt}
                          onChange={(event) => setAiPrompt(event.target.value)}
                        />
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs text-slate-500">{aiLoading ? 'A IA esta analisando o contexto e montando a resposta no chat...' : 'A IA usa o contexto atual do modal e o aluno selecionado para montar a sugestao.'}</p>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(37,99,235,0.25)] transition hover:-translate-y-0.5 hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={generateAiWorkout}
                            disabled={aiLoading}
                          >
                            <Wand2 size={16} />
                            {aiLoading ? 'Montando resposta...' : 'Gerar treino'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="thin-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto bg-white p-5 sm:p-6 lg:p-7">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Assistente IA</p>
                      <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Treinos com IA por plano</h2>
                      <p className="mt-2 text-sm leading-6 text-slate-500">Acesse um fluxo moderno de criacao assistida, prompts personalizados e salvamento direto no aluno.</p>
                    </div>
                    <button type="button" className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" onClick={closeAiModal}>
                      <X size={18} />
                    </button>
                  </div>
                  <div className="mt-6 flex-1 rounded-[32px] border border-slate-200 bg-gradient-to-b from-white via-slate-50/70 to-white px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
                    <div className="mx-auto max-w-5xl text-center">
                      <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-violet-50/80 text-violet-600 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.08)] sm:h-36 sm:w-36 lg:h-40 lg:w-40">
                        <Lock size={56} strokeWidth={1.8} />
                      </div>

                      <h2 className="mt-6 text-3xl font-black tracking-tight text-slate-900 sm:mt-8">
                        Esse recurso nao esta disponivel no seu plano atual.
                      </h2>
                      <p className="mx-auto mt-4 max-w-3xl text-lg leading-8 text-slate-600 sm:text-xl sm:leading-9">
                        Treinos com IA ajudam voce a acelerar prescricoes, personalizar melhor cada aluno e transformar prompts em fichas prontas para salvar.
                      </p>

                      <div className="mt-8 rounded-[28px] border border-slate-200 bg-slate-50/80 p-5 text-left sm:mt-10 sm:p-7 lg:p-8">
                        <p className="text-2xl font-bold tracking-tight text-slate-900">Com o assistente IA voce tera:</p>
                        <div className="mt-6 grid gap-4 lg:grid-cols-4 lg:gap-5">
                          <LockedAiFeature icon={Bot} title="Chat contextual" description="Converse com a IA usando prompts livres e ajustes em tempo real." />
                          <LockedAiFeature icon={TrendingUp} title="Planejamento estruturado" description="Receba aquecimento, atividades, series, tempo, repeticoes e intervalo organizados." />
                          <LockedAiFeature icon={BellRing} title="Mais agilidade" description="Ganhe velocidade na montagem sem perder contexto do aluno." />
                          <LockedAiFeature icon={Target} title="Mais conversao" description="Salve direto no aluno e entregue uma experiencia mais premium." />
                        </div>
                      </div>

                      <div className="mt-8 border-t border-slate-200 pt-8 sm:mt-10">
                        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                          <div className="text-left">
                            <p className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                              <Sparkles size={14} />
                              Disponivel no plano {aiUpgradePlan.publicName || aiUpgradePlan.name}
                            </p>
                            <h3 className="mt-4 text-3xl font-black tracking-tight text-slate-900">
                              {aiUpgradeCopy.title}
                            </h3>
                            <p className="mt-3 text-lg text-slate-500">
                              {aiUpgradeCopy.description}
                            </p>
                            <p className="mt-3 text-sm font-semibold text-slate-700">
                              {formatPlanCurrency(aiUpgradePlan.price)} por mes
                            </p>
                          </div>

                          <button
                            type="button"
                            className="inline-flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-7 py-4 text-lg font-semibold text-white shadow-[0_20px_40px_rgba(99,102,241,0.28)] transition hover:from-violet-500 hover:to-indigo-500"
                            onClick={handleAiUpgrade}
                          >
                            <Crown size={18} />
                            Fazer upgrade agora
                            <ChevronRight size={18} />
                          </button>
                        </div>

                        <div className="mt-8 flex justify-center">
                          <button
                            type="button"
                            className="text-lg font-semibold text-violet-600 underline decoration-violet-200 underline-offset-4 transition hover:text-violet-500"
                            onClick={() => navigate('/plans')}
                          >
                            Ver planos e recursos
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {builderOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-900/40 p-3 backdrop-blur-sm md:p-6" onClick={closeBuilder}>
          <div
            className="mx-auto h-[calc(100vh-24px)] max-w-7xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white shadow-[0_25px_60px_rgba(15,23,42,0.22)] md:h-[calc(100vh-48px)] lg:overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="grid min-h-full grid-cols-1 lg:h-full lg:grid-cols-[260px_1fr]">
              <aside className="flex flex-col border-b border-slate-100 bg-gradient-to-b from-slate-50 to-slate-100/70 p-6 lg:h-full lg:border-b-0 lg:border-r">
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => scrollToStep(1)}
                    className={`w-full rounded-2xl border p-3 text-left transition ${
                      activeStep === 1 ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`rounded-xl px-2.5 py-1 text-sm font-bold ${activeStep === 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>1</span>
                      <div>
                        <p className={`text-sm font-semibold ${activeStep === 1 ? 'text-blue-700' : 'text-slate-700'}`}>Informacoes gerais</p>
                        <p className="text-xs text-slate-500">Dados do planejamento</p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToStep(2)}
                    className={`w-full rounded-2xl border p-3 text-left transition ${
                      activeStep === 2 ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`rounded-xl px-2.5 py-1 text-sm font-bold ${activeStep === 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>2</span>
                      <div>
                        <p className={`text-sm font-semibold ${activeStep === 2 ? 'text-blue-700' : 'text-slate-700'}`}>Atividades</p>
                        <p className="text-xs text-slate-500">Adicione atividades e blocos</p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToStep(3)}
                    className={`w-full rounded-2xl border p-3 text-left transition ${
                      activeStep === 3 ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`rounded-xl px-2.5 py-1 text-sm font-bold ${activeStep === 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>3</span>
                      <div>
                        <p className={`text-sm font-semibold ${activeStep === 3 ? 'text-blue-700' : 'text-slate-700'}`}>Revisao</p>
                        <p className="text-xs text-slate-500">Revise e salve</p>
                      </div>
                    </div>
                  </button>
                </div>

                <div className="mt-auto rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-sm font-semibold text-blue-700">Dica</p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">Voce pode editar, duplicar ou enviar este planejamento para seus alunos depois.</p>
                </div>
              </aside>

              <form onSubmit={handleSaveWorkout} className="flex min-h-0 flex-col">
                <div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 md:px-8">
                  <div>
                    <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{editing ? 'Editar treino' : 'Criar treino'}</h2>
                    <p className="mt-1 text-sm text-slate-500">Monte um planejamento por atividades, blocos e observacoes tecnicas.</p>
                  </div>
                  <button type="button" className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" onClick={closeBuilder}>
                    <X size={18} />
                  </button>
                </div>

                <div ref={formScrollRef} onScroll={updateStepFromScroll} className="flex-1 space-y-8 px-5 py-5 md:px-8 lg:overflow-y-auto">
                  <section ref={stepGeneralRef} className="space-y-4">
                    <h3 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><ClipboardList size={20} className="text-blue-600" /> Informacoes gerais</h3>
                    <p className="text-sm text-slate-500">Preencha os dados basicos da sessao ou planejamento.</p>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Aluno</label>
                        <select className="input" value={form.student_id} onChange={(event) => setForm({ ...form, student_id: event.target.value })}>
                          <option value="">Selecione o aluno</option>
                          {students.map((student) => (
                            <option key={student.id} value={student.id}>{student.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Nome do treino</label>
                        <input className="input" placeholder="Ex: Sessao tecnica A, circuito funcional, treino de corrida" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Video demonstrativo (URL)</label>
                        <div className="relative">
                          <LinkIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input className="input !pl-14" placeholder="https://exemplo.com/video" value={form.demo_video_url} onChange={(event) => setForm({ ...form, demo_video_url: event.target.value })} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Imagem do treino (URL)</label>
                        <div className="relative">
                          <ImageIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input className="input !pl-14" placeholder="https://exemplo.com/imagem" value={form.demo_image_url} onChange={(event) => setForm({ ...form, demo_image_url: event.target.value })} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">Observacoes</label>
                      <div className="relative">
                        <textarea
                          className="input min-h-28 resize-y pr-14"
                          maxLength={500}
                          placeholder="Adicione observacoes gerais sobre este planejamento (objetivos, foco, instrucoes, modalidade...)"
                          value={form.notes}
                          onChange={(event) => setForm({ ...form, notes: event.target.value })}
                        />
                        <span className="pointer-events-none absolute bottom-3 right-3 text-xs text-slate-400">{form.notes.length}/500</span>
                      </div>
                    </div>
                  </section>

                  <section ref={stepExercisesRef} className="space-y-4 border-t border-slate-100 pt-7">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><Dumbbell size={20} className="text-blue-600" /> Atividades do treino</h3>
                        <p className="text-sm text-slate-500">Adicione e organize atividades, exercicios ou blocos da sessao.</p>
                      </div>
                      <button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={addExercise}>
                        <Plus size={15} /> Adicionar atividade
                      </button>
                    </div>

                    <div className="space-y-3">
                      {form.exercises.map((exercise, index) => (
                        <article key={`exercise-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <GripVertical size={15} className="text-slate-400" />
                              <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{index + 1}</span>
                              <p className="font-semibold text-slate-800">Atividade {index + 1}</p>
                            </div>
                            <button type="button" className="inline-flex items-center gap-1 text-sm font-semibold text-rose-600 hover:text-rose-700" onClick={() => removeExercise(index)}>
                              <Trash2 size={14} /> Remover
                            </button>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-1.5">
                              <label className="text-sm font-semibold text-slate-700">Nome da atividade / exercicio</label>
                              <input
                                className="input"
                                placeholder="Ex: Circuito tecnico, tiro de 200m, agachamento, mobilidade de quadril"
                                value={exercise.name}
                                onChange={(event) => updateExercise(index, 'name', event.target.value)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-sm font-semibold text-slate-700">Categoria / foco</label>
                              <select
                                className="input"
                                value={exercise.muscle_group}
                                onChange={(event) => updateExercise(index, 'muscle_group', event.target.value)}
                              >
                                <option value="">Selecione o foco</option>
                                {muscleGroups.map((group) => (
                                  <option key={group} value={group}>{group}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-sm font-semibold text-slate-700">Series ou duracao</label>
                              <input
                                className="input"
                                placeholder="Ex: 3 series ou 20 min"
                                value={exercise.sets}
                                onChange={(event) => updateExercise(index, 'sets', event.target.value)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-sm font-semibold text-slate-700">Repeticoes ou tempo</label>
                              <input
                                className="input"
                                placeholder="Ex: 12 reps ou 30 s"
                                value={exercise.reps}
                                onChange={(event) => updateExercise(index, 'reps', event.target.value)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-sm font-semibold text-slate-700">Intervalo</label>
                              <input
                                className="input"
                                placeholder="Ex: 60s"
                                value={exercise.rest}
                                onChange={(event) => updateExercise(index, 'rest', event.target.value)}
                              />
                            </div>
                          </div>

                          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <label className="text-sm font-semibold text-slate-700">Observacoes tecnicas (opcional)</label>
                            <textarea
                              className="input mt-2 min-h-20 resize-y"
                              placeholder="Tecnica, postura, intensidade, orientacao tatica ou observacao de mobilidade..."
                              value={exercise.notes}
                              onChange={(event) => updateExercise(index, 'notes', event.target.value)}
                            />
                          </div>
                        </article>
                      ))}

                      <button
                        type="button"
                        className="w-full rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-sm font-semibold text-blue-600 transition hover:border-blue-300 hover:bg-blue-50"
                        onClick={addExercise}
                      >
                        + Adicionar outra atividade
                      </button>
                    </div>
                  </section>

                  <section ref={stepReviewRef} className="space-y-4 border-t border-slate-100 pt-7">
                    <h3 className="text-2xl font-bold text-slate-900">Revisao</h3>
                    <p className="text-sm text-slate-500">Confira os dados antes de salvar.</p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Aluno</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{studentNameById[form.student_id] || 'Nao selecionado'}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Treino</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{form.name || 'Sem nome'}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Atividades</p>
                        <p className="mt-1 text-sm font-semibold text-slate-800">{form.exercises.filter((exercise) => String(exercise.name || '').trim()).length}</p>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-5 py-4 md:px-8">
                  <button type="button" className="btn-secondary min-w-28" onClick={closeBuilder}>Cancelar</button>
                  <button className="btn-primary min-w-40">{editing ? 'Salvar alteracoes' : 'Salvar treino'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {emailModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm" onClick={closeEmailModal}>
          <div
            className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white shadow-[0_25px_60px_rgba(15,23,42,0.22)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Entrega de treino</p>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">Enviar ao aluno</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Revise o email, personalize a mensagem e envie o treino com opcional de anexo em PDF.
                </p>
              </div>
              <button type="button" className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" onClick={closeEmailModal}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendWorkoutEmail} className="space-y-5 px-6 py-5">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">{emailForm.workoutName}</p>
                <p className="mt-1 text-sm text-slate-500">Aluno: {emailForm.studentName || 'Nao vinculado'}</p>
              </div>

              {emailModalError ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{emailModalError}</p> : null}
              {emailModalNotice ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{emailModalNotice}</p> : null}

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Email do aluno</label>
                <input
                  className="input"
                  type="email"
                  required
                  placeholder="aluno@exemplo.com"
                  value={emailForm.to}
                  onChange={(event) => setEmailForm((current) => ({ ...current, to: event.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Assunto do email</label>
                <input
                  className="input"
                  required
                  maxLength={180}
                  value={emailForm.subject}
                  onChange={(event) => setEmailForm((current) => ({ ...current, subject: event.target.value }))}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Mensagem personalizada</label>
                <textarea
                  className="input min-h-36 resize-y"
                  maxLength={4000}
                  value={emailForm.message}
                  onChange={(event) => setEmailForm((current) => ({ ...current, message: event.target.value }))}
                />
              </div>

              <label className={`flex items-start gap-3 rounded-2xl border px-4 py-4 ${hasPlanFeature(user?.plan, 'pdf_export') ? 'border-slate-200 bg-slate-50' : 'border-amber-200 bg-amber-50'}`}>
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={emailForm.attachPdf}
                  disabled={!hasPlanFeature(user?.plan, 'pdf_export')}
                  onChange={(event) => setEmailForm((current) => ({ ...current, attachPdf: event.target.checked }))}
                />
                <div>
                  <p className="text-sm font-semibold text-slate-800">Anexar PDF do treino</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {hasPlanFeature(user?.plan, 'pdf_export')
                      ? 'O aluno recebe o PDF junto com o resumo do treino no corpo do email.'
                      : 'Disponivel a partir do plano Pro. O envio por email continua funcionando sem anexo.'}
                  </p>
                </div>
              </label>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-2">
                <button type="button" className="btn-secondary min-w-28" onClick={closeEmailModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary inline-flex min-w-36 items-center justify-center gap-2" disabled={emailSending}>
                  <Send size={15} />
                  {emailSending ? 'Enviando...' : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <UpgradeModal featureKey={upgradeFeature} open={Boolean(upgradeFeature)} onClose={() => setUpgradeFeature('')} />
    </div>
  );
}

