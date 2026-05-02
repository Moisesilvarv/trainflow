import {
  BellRing,
  Briefcase,
  CalendarClock,
  Check,
  ChevronRight,
  CircleDollarSign,
  ChevronUp,
  CircleHelp,
  CreditCard,
  Download,
  Globe,
  ImageUp,
  Link as LinkIcon,
  Lock,
  Mail,
  Monitor,
  MoreVertical,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  UserCircle2,
  UserRound,
  Wallet,
  X
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { PasswordField } from '../components/auth/PasswordField';
import { useAuth } from '../context/AuthContext';
import {
  PLAN_FEATURE_LABELS,
  PLAN_ORDER,
  formatPlanCurrency,
  getPlanById,
  getStudentLimitByPlan,
  getUpgradePlanForFeature,
  hasPlanFeature,
  normalizePlanId
} from '../constants/plans';
import { getFieldClass, getPasswordChecks, isStrongPassword, passwordRules } from '../utils/authValidation';

const sectionItems = [
  { id: 'perfil', title: 'Perfil profissional', icon: UserCircle2 },
  { id: 'seguranca', title: 'Seguranca', icon: ShieldCheck },
  { id: 'plano', title: 'Plano e assinatura', icon: CreditCard },
  { id: 'financeiro', title: 'Financeiro', icon: Wallet },
  { id: 'integracoes', title: 'Integracoes', icon: LinkIcon },
  { id: 'notificacoes', title: 'Notificacoes', icon: BellRing },
  { id: 'preferencias', title: 'Preferencias', icon: Globe },
  { id: 'exportacao', title: 'Exportacao', icon: Download }
];

const notificationDefaults = {
  newPayments: true,
  classReminder: true,
  inactiveStudents: true,
  weeklyFinanceSummary: false
};

const preferenceDefaults = {
  theme: 'light',
  language: 'pt-BR',
  dateFormat: 'DD/MM/AAAA',
  timezone: 'America/Sao_Paulo'
};

function normalizeProfileState(profile = {}, fallbackName = '') {
  return {
    fullName: profile.fullName || fallbackName || '',
    whatsapp: profile.whatsapp || '',
    instagram: profile.instagram || '',
    specialty: profile.specialty || '',
    bio: profile.bio || ''
  };
}

function formatWhatsappInput(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  if (digits.length <= 11) {
    const middle = digits.length === 10 ? digits.slice(2, 6) : digits.slice(2, 7);
    const end = digits.length === 10 ? digits.slice(6) : digits.slice(7);
    return `${digits.slice(0, 2)} ${middle}-${end}`;
  }
  return digits;
}

function SectionShell({ children }) {
  return (
    <section className="card p-6 sm:p-8">
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function SecurityHeaderCard() {
  return (
    <div className="ml-auto flex max-w-md items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <ShieldCheck size={20} />
        </span>
        <div>
          <p className="text-sm font-semibold text-emerald-700">Sua conta esta protegida</p>
          <p className="text-sm text-slate-500">Ultima atividade: agora</p>
        </div>
      </div>
      <ChevronRight size={18} className="text-slate-400" />
    </div>
  );
}

function SecurityActionCard({
  icon: Icon,
  title,
  description,
  actions,
  children,
  accent = 'blue'
}) {
  const accentClasses = {
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-rose-50 text-rose-600'
  };

  return (
    <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-4">
          <span className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${accentClasses[accent] || accentClasses.blue}`}>
            <Icon size={22} />
          </span>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          </div>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
      {children ? <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-5 sm:px-6">{children}</div> : null}
    </article>
  );
}

function SecurityButton({ children, className = '', tone = 'secondary', ...props }) {
  const toneClass = tone === 'danger'
    ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50';

  return (
    <button
      type="button"
      className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 ${toneClass} ${className}`}
      {...props}
    >
      {children}
      <ChevronRight size={16} className="text-slate-400" />
    </button>
  );
}

function SubBlock({ title, description, children, tone = 'default' }) {
  const toneClass = tone === 'danger' ? 'border-rose-200 bg-rose-50/70' : 'border-slate-200 bg-white';

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${toneClass}`}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

function Label({ children }) {
  return <label className="mb-1.5 block text-sm font-medium text-slate-600">{children}</label>;
}

function ActionRow({ onCancel, onSave, saveLabel = 'Salvar alteracoes', cancelLabel = 'Cancelar', saveClassName = '' }) {
  return (
    <div className="flex flex-wrap justify-end gap-2 pt-2">
      <button type="button" className="btn-secondary" onClick={onCancel}>{cancelLabel}</button>
      <button type="button" className={`btn-primary ${saveClassName}`} onClick={onSave}>{saveLabel}</button>
    </div>
  );
}

function ToggleRow({ checked, onChange, title, description, disabled = false }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60"
    >
      <div>
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <span className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${checked ? 'bg-blue-600' : 'bg-slate-300'}`}>
        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
      </span>
    </button>
  );
}

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const headerLine = headers.map(escape).join(',');
  const bodyLines = rows.map((row) => headers.map((h) => escape(row[h])).join(','));
  return [headerLine, ...bodyLines].join('\n');
}

function downloadCsv(filename, rows) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function SettingsPage() {
  const { user, changePassword, refreshUser, startCheckout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState('perfil');
  const [notice, setNotice] = useState({ type: '', text: '' });

  const [studentsCount, setStudentsCount] = useState(0);
  const [workoutsCount, setWorkoutsCount] = useState(0);
  const [scheduleCount, setScheduleCount] = useState(0);

  const [profilePhoto, setProfilePhoto] = useState('');

  const [profileForm, setProfileForm] = useState({
    fullName: '',
    whatsapp: '',
    instagram: '',
    specialty: '',
    bio: ''
  });
  const [savedProfileForm, setSavedProfileForm] = useState({
    fullName: '',
    whatsapp: '',
    instagram: '',
    specialty: '',
    bio: ''
  });
  const [savedProfilePhoto, setSavedProfilePhoto] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  const [securityForm, setSecurityForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
    newEmail: ''
  });

  const [securityTouched, setSecurityTouched] = useState({
    currentPassword: false,
    newPassword: false,
    confirmNewPassword: false
  });

  const [twoFactorEnabled] = useState(false);
  const [expandedSecurityCard, setExpandedSecurityCard] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState('');

  const [integrationRows, setIntegrationRows] = useState([]);
  const [preferencesSaving, setPreferencesSaving] = useState(false);

  const [notifications, setNotifications] = useState(notificationDefaults);
  const [savedNotifications, setSavedNotifications] = useState(notificationDefaults);

  const [preferences, setPreferences] = useState(preferenceDefaults);
  const [savedPreferences, setSavedPreferences] = useState(preferenceDefaults);

  const sessions = [
    { id: 's1', label: 'Este dispositivo - Windows / Chrome', lastAccess: 'Agora', current: true },
    { id: 's2', label: 'Android - App', lastAccess: 'Ontem, 22:13', current: false }
  ];

  const checks = useMemo(() => getPasswordChecks(securityForm.newPassword), [securityForm.newPassword]);
  const passwordsMatch = securityForm.newPassword.length > 0 && securityForm.newPassword === securityForm.confirmNewPassword;
  const canChangePassword = securityForm.currentPassword && isStrongPassword(securityForm.newPassword) && passwordsMatch;
  function showNotice(type, text) {
    setNotice({ type, text });
    window.clearTimeout(showNotice.timeoutId);
    showNotice.timeoutId = window.setTimeout(() => setNotice({ type: '', text: '' }), 3000);
  }

  function readImageFile(file, callback) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => callback(String(reader.result || ''));
    reader.readAsDataURL(file);
  }

  useEffect(() => {
    setSecurityForm((prev) => ({ ...prev, newEmail: user?.email || '' }));
  }, [user]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (!tab) return;

    const exists = sectionItems.some((item) => item.id === tab);
    if (exists) setActiveSection(tab);
  }, [searchParams]);

  useEffect(() => {
    async function loadUsage() {
      try {
        const [studentsRes, workoutsRes, scheduleRes] = await Promise.all([
          api.get('/students'),
          api.get('/workouts'),
          api.get('/schedule')
        ]);
        setStudentsCount((studentsRes.data || []).length);
        setWorkoutsCount((workoutsRes.data || []).length);
        setScheduleCount((scheduleRes.data || []).length);
      } catch {
        setStudentsCount(0);
        setWorkoutsCount(0);
        setScheduleCount(0);
      }
    }

    loadUsage();
  }, []);

  useEffect(() => {
    async function loadAccountPreferences() {
      try {
        const { data } = await api.get('/account/preferences');
        if (data?.notifications) {
          const nextNotifications = { ...notificationDefaults, ...data.notifications };
          setNotifications(nextNotifications);
          setSavedNotifications(nextNotifications);
        }
        if (data?.preferences) {
          const nextPreferences = {
            ...preferenceDefaults,
            theme: data.preferences.theme || preferenceDefaults.theme,
            language: data.preferences.language || preferenceDefaults.language,
            dateFormat: data.preferences.dateFormat || preferenceDefaults.dateFormat,
            timezone: data.preferences.timezone || preferenceDefaults.timezone
          };
          setPreferences(nextPreferences);
          setSavedPreferences(nextPreferences);
        }
      } catch {
        // Mantem defaults locais se a conta ainda nao tiver preferencias persistidas.
      }
    }

    async function loadProfessionalProfile() {
      try {
        const { data } = await api.get('/account/profile');
        const nextForm = normalizeProfileState(data, user?.name || '');
        const nextPhoto = data?.photo || '';
        setProfileForm(nextForm);
        setSavedProfileForm(nextForm);
        setProfilePhoto(nextPhoto);
        setSavedProfilePhoto(nextPhoto);
      } catch {
        const fallbackProfile = normalizeProfileState({}, user?.name || '');
        setProfileForm(fallbackProfile);
        setSavedProfileForm(fallbackProfile);
      }
    }

    async function loadIntegrations() {
      try {
        const { data } = await api.get('/account/integrations');
        const rows = Array.isArray(data) ? data : [];
        setIntegrationRows(rows);
      } catch {
        setIntegrationRows([]);
      }
    }

    loadProfessionalProfile();
    loadAccountPreferences();
    loadIntegrations();
  }, [user?.name]);

  async function handleChangePassword(e) {
    e.preventDefault();
    setSecurityTouched({ currentPassword: true, newPassword: true, confirmNewPassword: true });
    if (!canChangePassword) return;

    try {
      setPasswordLoading(true);
      await changePassword({
        currentPassword: securityForm.currentPassword,
        newPassword: securityForm.newPassword,
        confirmNewPassword: securityForm.confirmNewPassword
      });
      setSecurityForm((prev) => ({ ...prev, currentPassword: '', newPassword: '', confirmNewPassword: '' }));
      setSecurityTouched({ currentPassword: false, newPassword: false, confirmNewPassword: false });
      showNotice('success', 'Senha atualizada com sucesso.');
    } catch (error) {
      showNotice('error', error.response?.data?.message || 'Nao foi possivel atualizar a senha.');
    } finally {
      setPasswordLoading(false);
    }
  }

  async function exportStudents() {
    const { data } = await api.get('/students');
    downloadCsv('trainflow-alunos.csv', data || []);
  }

  async function exportFinance() {
    const { data } = await api.get('/finance');
    downloadCsv('trainflow-financeiro.csv', data || []);
  }

  async function exportWorkouts() {
    if (!hasPlanFeature(user?.plan, 'pdf_export')) {
      const requiredPlan = getUpgradePlanForFeature('pdf_export');
      showNotice('error', `Exportacao avancada disponivel no plano ${requiredPlan.publicName || requiredPlan.name}.`);
      return;
    }

    const { data } = await api.get('/workouts');
    const normalized = (data || []).map((item) => ({ ...item, exercises: JSON.stringify(item.exercises || []) }));
    downloadCsv('trainflow-treinos.csv', normalized);
  }

  async function exportBackup() {
    if (!hasPlanFeature(user?.plan, 'pdf_export')) {
      const requiredPlan = getUpgradePlanForFeature('pdf_export');
      showNotice('error', `Backup completo disponivel no plano ${requiredPlan.publicName || requiredPlan.name}.`);
      return;
    }

    const [studentsRes, financeRes, workoutsRes, scheduleRes] = await Promise.all([
      api.get('/students'),
      api.get('/finance'),
      api.get('/workouts'),
      api.get('/schedule')
    ]);

    const payload = {
      generatedAt: new Date().toISOString(),
      students: studentsRes.data || [],
      finance: financeRes.data || [],
      workouts: workoutsRes.data || [],
      schedule: scheduleRes.data || []
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'trainflow-backup.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function handlePlanChange(planId) {
    const currentPlan = normalizePlanId(user?.plan);
    if (currentPlan === planId) {
      showNotice('success', 'Este plano ja esta ativo na sua assinatura.');
      return;
    }

    try {
      setPlanLoading(planId);
      const result = await startCheckout({ plan: planId, paymentMethod: 'card' });
      if (result?.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      showNotice('error', 'Nao foi possivel iniciar o checkout.');
    } catch (error) {
      showNotice('error', error.response?.data?.message || 'Nao foi possivel atualizar o plano.');
    } finally {
      setPlanLoading('');
    }
  }

  async function saveAccountPreferences(nextPayload) {
    try {
      setPreferencesSaving(true);
      const { data } = await api.put('/account/preferences', nextPayload);
      if (data?.notifications) {
        setNotifications(data.notifications);
        setSavedNotifications(data.notifications);
      }
      if (data?.preferences) {
        const nextPreferences = {
          theme: data.preferences.theme || 'light',
          language: data.preferences.language || 'pt-BR',
          dateFormat: data.preferences.dateFormat || 'DD/MM/AAAA',
          timezone: data.preferences.timezone || 'America/Sao_Paulo'
        };
        setPreferences(nextPreferences);
        setSavedPreferences(nextPreferences);
      }
      showNotice('success', 'Preferencias atualizadas com sucesso.');
    } catch (error) {
      showNotice('error', error.response?.data?.message || 'Nao foi possivel salvar as preferencias.');
    } finally {
      setPreferencesSaving(false);
    }
  }

  async function saveProfessionalProfile() {
    try {
      setProfileSaving(true);
      const payload = {
        ...profileForm,
        photo: profilePhoto
      };
      const { data } = await api.put('/account/profile', payload);
      const nextForm = normalizeProfileState(data, user?.name || '');
      const nextPhoto = data?.photo || '';
      setProfileForm(nextForm);
      setSavedProfileForm(nextForm);
      setProfilePhoto(nextPhoto);
      setSavedProfilePhoto(nextPhoto);
      await refreshUser();
      showNotice('success', 'Perfil profissional atualizado com sucesso.');
    } catch (error) {
      showNotice('error', error.response?.data?.message || 'Nao foi possivel salvar o perfil profissional.');
    } finally {
      setProfileSaving(false);
    }
  }

  function handleSectionClick(sectionId) {
    setActiveSection(sectionId);
    setSearchParams({ tab: sectionId });
  }

  function toggleSecurityCard(cardId) {
    setExpandedSecurityCard((current) => (current === cardId ? '' : cardId));
  }

  function renderProfile() {
    const resetProfile = () => {
      setProfileForm(savedProfileForm);
      setProfilePhoto(savedProfilePhoto);
    };

    const bioLength = String(profileForm.bio || '').length;

    return (
      <section className="card p-5 sm:p-6">
        <div className="mb-5">
          <h2 className="text-3xl font-black tracking-tight text-slate-900">Perfil profissional</h2>
          <p className="mt-1 text-slate-500">Mantenha apenas as informacoes que fortalecem sua presenca profissional no MVP.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-800">Foto de perfil</h3>
              <div className="mt-4 flex justify-center">
                <div className="relative h-40 w-40 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Perfil" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-3xl font-bold text-slate-500">
                      {String(profileForm.fullName || user?.name || 'PF').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <label className="absolute bottom-2 right-2 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-blue-600 shadow-sm transition hover:bg-blue-50">
                    <ImageUp size={15} />
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => readImageFile(e.target.files?.[0], setProfilePhoto)} />
                  </label>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <label className="btn-secondary inline-flex w-full cursor-pointer items-center justify-center gap-2">
                  <ImageUp size={15} />
                  Trocar foto
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => readImageFile(e.target.files?.[0], setProfilePhoto)} />
                </label>
                <button type="button" className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50" onClick={() => setProfilePhoto('')}>
                  <Trash2 size={14} />
                  Remover foto
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
              <p className="inline-flex items-start gap-2 text-sm text-slate-600">
                <CircleHelp size={16} className="mt-0.5 shrink-0 text-blue-600" />
                Use uma foto profissional e transmita confianca para seus alunos e clientes.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <article className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="inline-flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
                  <span className="inline-flex rounded-full bg-blue-50 p-1.5 text-blue-600"><UserRound size={14} /></span>
                  Dados basicos
                </p>
                <ChevronUp size={16} className="text-blue-600" />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Nome profissional</Label>
                  <input className="input" value={profileForm.fullName} onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })} />
                </div>
                <div>
                  <Label>Especialidade</Label>
                  <input className="input" value={profileForm.specialty} onChange={(e) => setProfileForm({ ...profileForm, specialty: e.target.value })} />
                </div>
                <div>
                  <Label>Instagram</Label>
                  <input className="input" placeholder="@seuperfil" value={profileForm.instagram} onChange={(e) => setProfileForm({ ...profileForm, instagram: e.target.value })} />
                </div>
                <div>
                  <Label>WhatsApp</Label>
                  <input className="input" placeholder="11 91111-1111" value={profileForm.whatsapp} onChange={(e) => setProfileForm({ ...profileForm, whatsapp: formatWhatsappInput(e.target.value) })} />
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="inline-flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
                  <span className="inline-flex rounded-full bg-blue-50 p-1.5 text-blue-600"><Briefcase size={14} /></span>
                  Bio profissional
                </p>
                <ChevronUp size={16} className="text-blue-600" />
              </div>
              <div className="space-y-3">
                <div>
                  <Label>Bio profissional</Label>
                  <div className="relative">
                    <textarea className="input min-h-28 resize-y pr-14" maxLength={200} value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} />
                    <span className="pointer-events-none absolute bottom-2 right-3 text-xs text-slate-400">{bioLength}/200</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-sm font-semibold text-slate-700">Branding enxuto para o MVP</p>
                  <p className="mt-1 text-sm text-slate-500">Logo, assinatura e cores personalizadas sairam do fluxo principal. Se precisarmos de logo em PDFs no futuro, ela volta aqui dentro do Perfil profissional e nao em uma aba separada.</p>
                </div>
              </div>
            </article>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={resetProfile}>Cancelar</button>
          <button type="button" className="btn-primary" onClick={saveProfessionalProfile} disabled={profileSaving}>{profileSaving ? 'Salvando...' : 'Salvar alteracoes'}</button>
        </div>
      </section>
    );
  }

  function renderSecurity() {
    const isPasswordOpen = expandedSecurityCard === 'password';
    const isEmailOpen = expandedSecurityCard === 'email';
    const _isDangerOpen = expandedSecurityCard === 'danger';

    return (
      <SectionShell
        icon={ShieldCheck}
        title="Seguranca"
        subtitle="Proteja sua conta com senha forte, controle de acesso e configuracoes sensiveis."
      >
        <div className="space-y-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="text-4xl font-black tracking-tight text-slate-900">Seguranca</h2>
              <p className="mt-2 max-w-2xl text-base text-slate-500">Gerencie as configuracoes de seguranca da sua conta para mante-la protegida.</p>
            </div>
            <SecurityHeaderCard />
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-2xl font-bold tracking-tight text-slate-900">Acesso a conta</p>
            </div>

            <SecurityActionCard
              icon={Lock}
              title="Alterar senha"
              description="Atualize sua senha periodicamente para manter sua conta segura."
              actions={<SecurityButton onClick={() => toggleSecurityCard('password')}>Alterar senha</SecurityButton>}
            >
              {isPasswordOpen ? (
                <form className="space-y-4" onSubmit={handleChangePassword}>
                  <div className="grid gap-3 lg:grid-cols-3">
                    <div>
                      <Label>Senha atual</Label>
                      <PasswordField
                        value={securityForm.currentPassword}
                        onChange={(e) => setSecurityForm({ ...securityForm, currentPassword: e.target.value })}
                        onBlur={() => setSecurityTouched((prev) => ({ ...prev, currentPassword: true }))}
                        className={getFieldClass({ hasError: securityTouched.currentPassword && !securityForm.currentPassword, isValid: securityTouched.currentPassword && Boolean(securityForm.currentPassword) })}
                      />
                    </div>
                    <div>
                      <Label>Nova senha</Label>
                      <PasswordField
                        value={securityForm.newPassword}
                        onChange={(e) => setSecurityForm({ ...securityForm, newPassword: e.target.value })}
                        onBlur={() => setSecurityTouched((prev) => ({ ...prev, newPassword: true }))}
                        className={getFieldClass({ hasError: securityTouched.newPassword && !isStrongPassword(securityForm.newPassword), isValid: securityTouched.newPassword && isStrongPassword(securityForm.newPassword) })}
                      />
                    </div>
                    <div>
                      <Label>Confirmar nova senha</Label>
                      <PasswordField
                        value={securityForm.confirmNewPassword}
                        onChange={(e) => setSecurityForm({ ...securityForm, confirmNewPassword: e.target.value })}
                        onBlur={() => setSecurityTouched((prev) => ({ ...prev, confirmNewPassword: true }))}
                        className={getFieldClass({ hasError: securityTouched.confirmNewPassword && !passwordsMatch, isValid: securityTouched.confirmNewPassword && passwordsMatch })}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="mb-3 text-sm font-semibold text-slate-700">Requisitos da senha</p>
                    <ul className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                      {passwordRules.map((rule) => (
                        <li key={rule.key} className="flex items-center gap-2">
                          {checks[rule.key] ? <Check size={14} className="text-emerald-600" /> : <X size={14} className="text-slate-400" />}
                          {rule.label}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex justify-end">
                    <button className="btn-primary disabled:opacity-50" type="submit" disabled={passwordLoading || !canChangePassword}>
                      {passwordLoading ? 'Atualizando...' : 'Salvar alteracoes'}
                    </button>
                  </div>
                </form>
              ) : null}
            </SecurityActionCard>

            <SecurityActionCard
              icon={Mail}
              title="Email da conta"
              description="Solicite alteracao do email principal da sua conta."
              actions={<SecurityButton disabled>Em breve</SecurityButton>}
            >
              {isEmailOpen ? (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input className="input" value={securityForm.newEmail} onChange={(e) => setSecurityForm({ ...securityForm, newEmail: e.target.value })} />
                  <button type="button" className="btn-primary whitespace-nowrap" onClick={() => showNotice('success', 'Solicitacao de alteracao de email enviada.')}>Atualizar email</button>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                  Em breve: a troca de email vai exigir confirmacao por senha e validacao por email.
                </div>
              )}
            </SecurityActionCard>

            <SecurityActionCard
              icon={Smartphone}
              title="Autenticacao em dois fatores (2FA)"
              description="Adicione uma camada extra de seguranca no login."
              actions={
                <>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${twoFactorEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    Em breve
                  </span>
                  <SecurityButton disabled>
                    Configuracao necessaria
                  </SecurityButton>
                </>
              }
            />
          </div>

          <div className="space-y-4">
            <p className="text-2xl font-bold tracking-tight text-slate-900">Dispositivos e sessoes</p>

            <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:p-6">
              <div className="mb-5">
                <h3 className="text-lg font-bold text-slate-900">Sessoes ativas</h3>
                <p className="mt-1 text-sm text-slate-500">Gerencie os dispositivos conectados na sua conta.</p>
              </div>

              <div className="space-y-3">
                {sessions.map((session) => {
                  const SessionIcon = session.current ? Monitor : Smartphone;

                  return (
                    <div key={session.id} className="flex flex-col gap-4 rounded-2xl bg-slate-50/90 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                          <SessionIcon size={20} />
                        </span>
                        <div>
                          <p className="text-base font-semibold text-slate-900">{session.label}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                            {session.current ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Dispositivo atual</span> : null}
                            <span>Ultimo acesso: {session.lastAccess.toLowerCase()}</span>
                          </div>
                        </div>
                      </div>

                      {!session.current ? (
                        <button type="button" disabled className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-400">
                          Em breve
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-center">
                <button type="button" disabled className="text-sm font-semibold text-slate-400">
                  Gerenciamento completo em breve
                </button>
              </div>
            </article>
          </div>

          <div className="space-y-4">
            <p className="text-2xl font-bold tracking-tight text-rose-600">Zona de perigo</p>

            <SecurityActionCard
              icon={ShieldAlert}
              title="Excluir conta permanentemente"
              description="Todos os seus dados serao removidos de forma irreversivel."
              accent="red"
              actions={<SecurityButton tone="danger" disabled>Fluxo protegido em breve</SecurityButton>}
            >
              <div className="flex flex-col gap-4 rounded-2xl border border-rose-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-2xl text-sm text-rose-700">Em breve: a exclusao vai exigir senha atual, confirmacao textual e remocao segura dos dados.</p>
                <button type="button" disabled className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-400">
                  Indisponivel por seguranca
                </button>
              </div>
            </SecurityActionCard>
          </div>
        </div>
      </SectionShell>
    );
  }

  function _renderPlan() {
    const currentPlan = getPlanById(user?.plan);
    const studentLimit = getStudentLimitByPlan(user?.plan);
    const usagePercent = studentLimit
      ? Math.min(100, Math.round((studentsCount / Math.max(studentLimit, 1)) * 100))
      : 0;
    const highlightFeatures = [
      'ai_assistant',
      'student_portal',
      'recurring_billing',
      'whatsapp_automation',
      'smart_dashboard'
    ];

    return (
      <SectionShell
        icon={CreditCard}
        title="Plano e assinatura"
        subtitle="Gerencie sua assinatura, recursos do plano e utilizacao atual."
      >
        <SubBlock title="Plano atual" description="Resumo do plano ativo no momento.">
          <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl bg-slate-50 p-4">
            <div>
              <p className="text-lg font-semibold text-slate-900">{currentPlan.publicName || currentPlan.name}</p>
              <p className="text-sm text-slate-500">{currentPlan.description}</p>
            </div>
            <p className="text-2xl font-black text-blue-600">{formatPlanCurrency(currentPlan.price)}<span className="ml-1 text-sm font-semibold text-slate-500">/mes</span></p>
          </div>
        </SubBlock>

        <SubBlock title="Planos disponiveis" description="Compare beneficios e altere quando quiser.">
          <div className="grid gap-3 lg:grid-cols-3">
            {PLAN_ORDER.map((plan) => {
              const isCurrent = normalizePlanId(user?.plan) === plan.id;
              const isUpdating = planLoading === plan.id;

              return (
                <article key={plan.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                  {plan.badge ? <p className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${plan.recommended ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>{plan.badge}</p> : null}
                  <p className="mt-2 text-sm font-semibold text-slate-700">{plan.publicName || plan.name}</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">{formatPlanCurrency(plan.price)}</p>
                  <p className="text-xs text-slate-500">por mes</p>
                  <p className="mt-3 text-sm text-slate-600">{plan.cap}</p>
                  <p className="mt-1 text-xs text-slate-500">{plan.description}</p>
                  <ul className="mt-3 space-y-1 text-xs text-slate-600">
                    {plan.benefits.slice(0, 4).map((benefit) => (
                      <li key={benefit}>- {benefit}</li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className={`mt-4 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      isCurrent ? 'border border-slate-200 bg-slate-100 text-slate-500' : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                    onClick={() => handlePlanChange(plan.id)}
                    disabled={Boolean(planLoading) || isCurrent}
                  >
                    {isCurrent ? 'Plano ativo' : isUpdating ? 'Atualizando...' : 'Selecionar plano'}
                  </button>
                </article>
              );
            })}
          </div>
        </SubBlock>

        <SubBlock title="Uso do plano" description="Acompanhe como os recursos estao sendo utilizados.">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Alunos</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{studentsCount}</p>
              <p className="mt-1 text-xs text-slate-500">
                {studentLimit ? `${studentsCount}/${studentLimit} usados` : 'Ilimitado'}
              </p>
              {studentLimit ? (
                <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-blue-600" style={{ width: `${usagePercent}%` }} />
                </div>
              ) : null}
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Treinos</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{workoutsCount}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Agendamentos</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{scheduleCount}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {highlightFeatures.map((feature) => {
              const enabled = hasPlanFeature(user?.plan, feature);
              const requiredPlan = getUpgradePlanForFeature(feature);
              return (
                <div key={feature} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5">
                  <p className="text-sm text-slate-700">{PLAN_FEATURE_LABELS[feature] || feature}</p>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {enabled ? 'Ativo' : `Upgrade: ${requiredPlan.publicName || requiredPlan.name}`}
                  </span>
                </div>
              );
            })}
          </div>
        </SubBlock>
      </SectionShell>
    );
  }

  function renderPlanModern() {
    const currentPlan = getPlanById(user?.plan);
    const studentLimit = getStudentLimitByPlan(user?.plan);
    const usagePercent = studentLimit
      ? Math.min(100, Math.round((studentsCount / Math.max(studentLimit, 1)) * 100))
      : 0;
    const currentPlanId = normalizePlanId(user?.plan);
    const usageCards = [
      {
        label: 'Alunos',
        value: studentsCount,
        detail: studentLimit ? `de ${studentLimit} aluno${studentLimit === 1 ? '' : 's'}` : 'alunos ilimitados',
        percent: studentLimit ? usagePercent : 0,
        accent: 'bg-blue-50 text-blue-600',
        icon: UserRound
      },
      {
        label: 'Treinos',
        value: workoutsCount,
        detail: `${Math.max(workoutsCount, 5)} como referencia`,
        percent: workoutsCount ? Math.min(100, Math.round((workoutsCount / Math.max(workoutsCount, 5)) * 100)) : 0,
        accent: 'bg-emerald-50 text-emerald-600',
        icon: Briefcase
      },
      {
        label: 'Agendamentos',
        value: scheduleCount,
        detail: 'uso mensal da agenda',
        percent: scheduleCount ? Math.min(100, Math.round((scheduleCount / Math.max(scheduleCount, 10)) * 100)) : 0,
        accent: 'bg-violet-50 text-violet-600',
        icon: CalendarClock
      }
    ];
    const lockedFeatures = [
      { title: 'Assistente IA', description: 'Sugestoes inteligentes', feature: 'ai_assistant', icon: Sparkles, accent: 'bg-blue-50 text-blue-600' },
      { title: 'Area do aluno', description: 'Portal completo', feature: 'student_portal', icon: UserRound, accent: 'bg-violet-50 text-violet-600' },
      { title: 'Cobranca recorrente', description: 'Automacao financeira', feature: 'recurring_billing', icon: CircleDollarSign, accent: 'bg-emerald-50 text-emerald-600' },
      { title: 'WhatsApp automatico', description: 'Envio de treinos e lembretes', feature: 'whatsapp_automation', icon: Smartphone, accent: 'bg-emerald-50 text-emerald-600' },
      { title: 'Dashboard inteligente', description: 'Relatorios avancados', feature: 'smart_dashboard', icon: CalendarClock, accent: 'bg-indigo-50 text-indigo-600' }
    ];
    return (
      <SectionShell
        icon={CreditCard}
        title="Plano e assinatura"
        subtitle="Gerencie sua assinatura, recursos do plano e utilizacao atual."
      >
        <div className="space-y-5">
          <article className="overflow-hidden rounded-[30px] border border-slate-200 bg-gradient-to-r from-white via-violet-50/60 to-slate-50 px-6 py-6 shadow-[0_16px_35px_rgba(15,23,42,0.05)]">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-start gap-4">
                <span className="inline-flex h-16 w-16 items-center justify-center rounded-[28px] bg-violet-50 text-violet-600">
                  <Lock size={28} />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-3xl font-black tracking-tight text-slate-900">
                      {currentPlanId === 'basic' ? 'Voce ainda nao possui um plano pago ativo' : `Seu plano atual: ${currentPlan.publicName || currentPlan.name}`}
                    </h2>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${currentPlanId === 'basic' ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}>
                      {currentPlanId === 'basic' ? 'Plano inicial' : 'Assinatura ativa'}
                    </span>
                  </div>
                  <p className="mt-3 max-w-3xl text-base text-slate-500">
                    {currentPlanId === 'basic'
                      ? 'Escolha o plano ideal para levar sua gestao para o proximo nivel.'
                      : 'Gerencie seu plano, acompanhe limites e libere recursos para escalar sua operacao com mais previsibilidade.'}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-2"><ShieldCheck size={14} className="text-violet-500" /> Cancelamento facil</span>
                    <span className="inline-flex items-center gap-2"><ShieldCheck size={14} className="text-violet-500" /> Sem fidelidade</span>
                    <span className="inline-flex items-center gap-2"><ShieldCheck size={14} className="text-violet-500" /> Ativacao imediata</span>
                  </div>
                  <div className="mt-5 rounded-[24px] border border-violet-200 bg-white/90 px-4 py-4">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-white">
                        <CreditCard size={18} />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-slate-900">Cartao recorrente</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          O checkout segue temporariamente apenas com assinatura recorrente no cartao via Stripe.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative min-h-[150px] w-full max-w-sm overflow-hidden rounded-[26px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_40px_rgba(99,102,241,0.08)]">
                <div className="absolute -right-4 bottom-0 h-24 w-24 rounded-full bg-violet-100/80" />
                <div className="absolute right-8 top-2 h-16 w-12 rotate-12 rounded-t-full rounded-b-[14px] bg-gradient-to-b from-violet-400 to-indigo-600" />
                <div className="absolute right-5 top-16 h-16 w-1 rounded-full bg-violet-200" />
                <div className="absolute bottom-0 right-16 h-20 w-3 rounded-t-full bg-violet-100" />
                <div className="absolute bottom-0 right-24 h-14 w-3 rounded-t-full bg-violet-100" />
                <div className="absolute bottom-0 right-32 h-9 w-3 rounded-t-full bg-violet-100" />
                <div className="relative z-10 flex h-full flex-col justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">Plano e assinatura</p>
                    <p className="mt-2 text-lg font-bold tracking-tight text-slate-900">{currentPlan.publicName || currentPlan.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{formatPlanCurrency(currentPlan.price)}/mes</p>
                  </div>
                  <button type="button" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_32px_rgba(99,102,241,0.24)] transition hover:from-violet-500 hover:to-indigo-500" onClick={() => handlePlanChange(currentPlanId === 'basic' ? 'pro' : 'premium')}>
                    Ver planos e precos
                  </button>
                </div>
              </div>
            </div>
          </article>

          <div>
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-3xl font-black tracking-tight text-slate-900">Escolha o plano ideal para voce</p>
                <p className="mt-2 text-sm text-slate-500">Compare beneficios e escolha a estrutura ideal para sua fase atual.</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
                <span className="rounded-xl bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700">Mensal</span>
                <span className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500">Anual</span>
                <span className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">Economize ate 20%</span>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              {PLAN_ORDER.map((plan) => {
                const isCurrent = currentPlanId === plan.id;
                const isUpdating = planLoading === plan.id;
                const featured = Boolean(plan.recommended);

                return (
                  <article key={plan.id} className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_35px_rgba(15,23,42,0.05)]">
                    <div className="flex min-h-[44px] items-start justify-between gap-3">
                      <div>
                        {plan.badge ? (
                          <p className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${featured ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            {featured ? 'Mais escolhido' : plan.id === 'premium' ? 'Mais completo' : plan.badge}
                          </p>
                        ) : null}
                      </div>
                      {isCurrent ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">Plano atual</span> : null}
                    </div>

                    <h3 className="mt-5 text-3xl font-black tracking-tight text-slate-900">{plan.publicName || plan.name}</h3>
                    <div className="mt-3 flex items-end gap-2">
                      <p className="text-5xl font-black tracking-tight text-slate-900">{formatPlanCurrency(plan.price)}</p>
                      <p className="pb-1 text-sm font-semibold text-slate-500">/mes</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-500">{plan.description}</p>

                    <ul className="mt-6 space-y-3 text-sm text-slate-700">
                      {plan.benefits.slice(0, 5).map((benefit) => (
                        <li key={benefit} className="flex items-start gap-2">
                          <Check size={15} className="mt-0.5 shrink-0 text-slate-900" />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      className={`mt-6 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                        isCurrent
                          ? 'border border-slate-200 bg-slate-100 text-slate-500'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                      onClick={() => handlePlanChange(plan.id)}
                      disabled={Boolean(planLoading) || isCurrent}
                    >
                      {isCurrent ? 'Plano atual' : isUpdating ? 'Redirecionando...' : 'Escolher plano'}
                    </button>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <article className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_35px_rgba(15,23,42,0.05)]">
              <div>
                <p className="text-2xl font-black tracking-tight text-slate-900">Recursos disponiveis no seu plano atual</p>
                <p className="mt-2 text-sm text-slate-500">Veja como seus recursos estao sendo utilizados.</p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {usageCards.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-[24px] bg-slate-50/80 p-4">
                      <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${item.accent}`}>
                        <Icon size={18} />
                      </span>
                      <p className="mt-4 text-sm font-medium text-slate-500">{item.label}</p>
                      <p className="mt-1 text-4xl font-black tracking-tight text-slate-900">{item.value}</p>
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-500">
                        <span>{item.detail}</span>
                        <span>{item.percent}%</span>
                      </div>
                      <div className="mt-3 h-2 w-full rounded-full bg-slate-200">
                        <div className="h-2 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: `${item.percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 rounded-2xl bg-violet-50/80 px-4 py-3 text-sm text-violet-700">
                Os limites aumentam conforme o plano escolhido.
              </div>
            </article>

            <article className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_14px_35px_rgba(15,23,42,0.05)]">
              <div className="relative z-10 max-w-xl">
                <p className="text-2xl font-black tracking-tight text-slate-900">Recursos exclusivos dos planos pagos</p>
                <p className="mt-2 text-sm text-slate-500">Desbloqueie ferramentas poderosas para otimizar sua rotina.</p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {lockedFeatures.map((item) => {
                    const enabled = hasPlanFeature(user?.plan, item.feature);
                    const requiredPlan = getUpgradePlanForFeature(item.feature);
                    const Icon = item.icon;

                    return (
                      <div key={item.feature} className="flex items-start gap-3 rounded-2xl bg-slate-50/80 p-3">
                        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${item.accent}`}>
                          <Icon size={18} />
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                            {enabled ? <Check size={14} className="mt-0.5 shrink-0 text-emerald-600" /> : <Lock size={14} className="mt-0.5 shrink-0 text-slate-400" />}
                          </div>
                          <p className="mt-1 text-xs text-slate-500">{enabled ? 'Disponivel na sua conta' : item.description}</p>
                          {!enabled ? <p className="mt-1 text-[11px] font-semibold text-violet-600">Upgrade: {requiredPlan.publicName || requiredPlan.name}</p> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button type="button" className="mt-5 inline-flex items-center gap-2 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-700 transition hover:bg-violet-100" onClick={() => handlePlanChange(currentPlanId === 'basic' ? 'pro' : 'premium')}>
                  Ver todos os beneficios
                </button>
              </div>

              <div className="pointer-events-none absolute bottom-0 right-0 h-48 w-48 rounded-tl-[44px] bg-gradient-to-br from-violet-100/70 to-indigo-100/90" />
              <div className="pointer-events-none absolute bottom-12 right-10 h-24 w-28 rounded-[26px] border border-white/60 bg-white/80 shadow-[0_12px_30px_rgba(99,102,241,0.1)]" />
              <div className="pointer-events-none absolute bottom-8 right-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-violet-600 text-white shadow-[0_18px_32px_rgba(99,102,241,0.2)]">
                <Lock size={22} />
              </div>
            </article>
          </div>

          <article className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-[0_12px_25px_rgba(15,23,42,0.04)] lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800"><ShieldCheck size={16} className="text-violet-600" /> Ambiente seguro</p>
              <p className="mt-1 text-sm text-slate-500">Seus dados e pagamentos sao protegidos com criptografia de ponta e monitoramento 24/7.</p>
            </div>
            <div className="flex flex-wrap items-center gap-5 text-sm font-semibold text-slate-500">
              <span>VISA</span>
              <span>Mastercard</span>
              <span>Amex</span>
              <span>Elo</span>
              <span>Pix</span>
            </div>
          </article>
        </div>
      </SectionShell>
    );
  }

  function renderFinance() {
    return (
      <SectionShell icon={Wallet} title="Financeiro" subtitle="Configuracoes financeiras da conta.">
        <article className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50 p-6 shadow-[0_14px_35px_rgba(15,23,42,0.05)] sm:p-8">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <span className="inline-flex rounded-3xl bg-blue-600 p-4 text-white shadow-[0_14px_30px_rgba(37,99,235,0.22)]">
              <Wallet size={28} />
            </span>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Em breve</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Financeiro em preparacao.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              As configuracoes de recebimento, gateways, repasses e automacoes financeiras ainda estao sendo finalizadas para ficarem consistentes com o fluxo principal de pagamentos.
            </p>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {[
              { title: 'Meios de recebimento', description: 'PIX, Mercado Pago e Stripe em um painel unico.' },
              { title: 'Resumo de caixa', description: 'Saldo, pendencias e repasses com leitura rapida.' },
              { title: 'Automacoes', description: 'Cobrancas, recibos e lembretes sem trabalho manual.' }
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                <p className="mt-1 text-sm leading-5 text-slate-500">{item.description}</p>
              </div>
            ))}
          </div>
        </article>
      </SectionShell>
    );
  }

  function renderIntegrations() {
    const integrationStatusByProvider = Object.fromEntries(
      integrationRows.map((item) => [item.provider, item])
    );
    const integrationItems = [
      {
        label: 'WhatsApp',
        key: 'whatsapp',
        provider: 'whatsapp',
        feature: 'whatsapp_automation',
        description: 'Envie mensagens e lembretes automaticos para seus alunos.',
        icon: Smartphone,
        accent: 'bg-emerald-50 text-emerald-600'
      },
      {
        label: 'Google Calendar',
        key: 'googleCalendar',
        provider: 'google_calendar',
        feature: null,
        description: 'Sincronize sua agenda e compromissos automaticamente.',
        icon: CalendarClock,
        accent: 'bg-blue-50 text-blue-600'
      },
      {
        label: 'Email automatico',
        key: 'automaticEmail',
        provider: 'email',
        feature: null,
        description: 'Envie emails automaticos e personalizados para seus alunos.',
        icon: Mail,
        accent: 'bg-indigo-50 text-indigo-600'
      }
    ];

    function handleIntegrationAction(item) {
      const row = integrationStatusByProvider[item.provider];
      const status = row?.status || 'coming_soon';

      if (item.feature && !hasPlanFeature(user?.plan, item.feature)) {
        const requiredPlan = getUpgradePlanForFeature(item.feature);
        showNotice('error', `${item.label} disponivel no plano ${requiredPlan.publicName || requiredPlan.name}.`);
        return;
      }

      if (status === 'coming_soon') {
        showNotice('error', `${item.label} em breve. Ainda nao ha conexao oficial habilitada.`);
        return;
      }

      if (status === 'config_required') {
        showNotice('error', `${item.label} requer configuracao do provider no backend antes de conectar.`);
        return;
      }

      showNotice('success', `${item.label} conectado e pronto para uso.`);
    }

    return (
      <SectionShell icon={LinkIcon} title="Integracoes" subtitle="Conecte servicos externos para automatizar sua operacao.">
        <div className="space-y-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h2 className="text-4xl font-black tracking-tight text-slate-900">Integracoes</h2>
              <p className="mt-2 max-w-2xl text-base text-slate-500">Conecte ferramentas e automatize processos para ganhar mais tempo.</p>
            </div>

            <button type="button" className="inline-flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition hover:bg-slate-50">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <CircleHelp size={18} />
                </span>
                <div>
                  <p className="text-lg font-semibold text-slate-900">Sobre integracoes</p>
                  <p className="mt-1 text-sm text-slate-500">Saiba como as integracoes podem te ajudar</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-400" />
            </button>
          </div>

          <article className="rounded-[28px] border border-blue-100 bg-gradient-to-r from-white via-blue-50/70 to-slate-50 px-6 py-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-[0_12px_30px_rgba(59,130,246,0.16)]">
                  <span className="absolute left-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-blue-600 text-white">
                    <LinkIcon size={16} />
                  </span>
                  <span className="absolute bottom-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-500">
                    <Sparkles size={16} />
                  </span>
                </div>

                <div>
                  <h3 className="text-3xl font-black tracking-tight text-slate-900">Tudo conectado. Tudo no lugar.</h3>
                  <p className="mt-2 text-base text-slate-500">Conecte suas ferramentas favoritas e centralize suas automacoes.</p>
                </div>
              </div>

              <button type="button" className="inline-flex items-center gap-3 rounded-2xl border border-blue-200 bg-white px-5 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50" onClick={() => showNotice('success', 'As automacoes ficam centralizadas em Integracoes e Financeiro.')}>
                <Sparkles size={16} />
                Ver automacoes
                <ChevronRight size={16} className="text-blue-400" />
              </button>
            </div>
          </article>

          <div className="space-y-3">
            <div>
              <p className="text-2xl font-bold tracking-tight text-slate-900">Conexoes disponiveis</p>
              <p className="mt-2 text-base text-slate-500">Ative ou desative integracoes conforme sua necessidade.</p>
            </div>

            <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
              {integrationItems.map((item, index) => {
                const Icon = item.icon;
                const row = integrationStatusByProvider[item.provider];
                const status = row?.status || 'coming_soon';
                const connected = status === 'connected';
                const statusLabel = connected
                  ? 'Conectado'
                  : status === 'config_required'
                    ? 'Configuracao necessaria'
                    : 'Em breve';
                const actionLabel = connected
                  ? 'Gerenciar'
                  : status === 'config_required'
                    ? 'Configurar backend'
                    : 'Em breve';

                return (
                  <div key={item.key} className={`flex flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between ${index > 0 ? 'border-t border-slate-200' : ''}`}>
                    <div className="flex items-start gap-4">
                      <span className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${item.accent}`}>
                        <Icon size={24} />
                      </span>
                      <div>
                        <p className="text-2xl font-bold tracking-tight text-slate-900">{item.label}</p>
                        <p className="mt-2 text-base text-slate-500">{item.description}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`rounded-full px-4 py-2 text-sm font-semibold ${connected ? 'bg-emerald-50 text-emerald-700' : status === 'config_required' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                        {statusLabel}
                      </span>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-white px-5 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:hover:bg-white"
                        onClick={() => handleIntegrationAction(item)}
                        disabled={!connected}
                      >
                        {actionLabel}
                      </button>
                      {connected ? (
                        <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" onClick={() => showNotice('success', `${item.label} pronto para configuracao.`)}>
                          <MoreVertical size={18} />
                        </button>
                      ) : (
                        <ChevronRight size={18} className="text-slate-400" />
                      )}
                    </div>
                  </div>
                );
              })}
            </article>
          </div>

          <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-blue-50/60 px-6 py-6 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <Sparkles size={22} />
                  </span>
                  <div>
                    <p className="text-3xl font-black tracking-tight text-slate-900">Dica para turbinar seu negocio</p>
                    <p className="mt-3 text-base leading-8 text-slate-500">
                      Automatize lembretes, envios e follow-ups e foque no que realmente importa: seus alunos.
                    </p>
                    <button type="button" className="mt-6 inline-flex items-center gap-2 text-lg font-semibold text-blue-600 transition hover:text-blue-500" onClick={() => showNotice('success', 'A automacao de lembretes depende das integracoes ativas da sua conta.')}>
                      Ver todas as automacoes
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="relative mx-auto h-36 w-full max-w-sm">
                <div className="absolute right-2 top-2 h-20 w-32 rounded-3xl bg-white/90 shadow-[0_18px_40px_rgba(15,23,42,0.08)]" />
                <div className="absolute right-0 top-14 h-24 w-28 rounded-3xl bg-white/95 shadow-[0_18px_40px_rgba(15,23,42,0.08)]" />
                <div className="absolute left-8 top-16 h-12 w-12 rounded-full bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]" />
                <div className="absolute left-24 top-4 h-14 w-14 rounded-full bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]" />
                <div className="absolute left-44 top-12 h-14 w-14 rounded-full bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]" />
                <div className="absolute left-14 top-20 h-px w-24 border-t-2 border-dashed border-blue-200" />
                <div className="absolute left-34 top-20 h-px w-20 border-t-2 border-dashed border-blue-200" />
                <span className="absolute left-[42px] top-[66px] inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <CalendarClock size={18} />
                </span>
                <span className="absolute left-[106px] top-[16px] inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Smartphone size={18} />
                </span>
                <span className="absolute left-[170px] top-[58px] inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                  <Mail size={18} />
                </span>
              </div>
            </div>
          </article>
        </div>
      </SectionShell>
    );
  }

  function renderNotifications() {
    return (
      <SectionShell icon={BellRing} title="Notificacoes" subtitle="Defina quais alertas sao importantes para sua rotina.">
        <SubBlock
          title="Preferencias de alerta"
          description="Essas notificacoes serao enviadas por email conforme os eventos acontecerem."
        >
          <div className="space-y-2">
            <ToggleRow checked={notifications.newPayments} onChange={(value) => setNotifications({ ...notifications, newPayments: value })} title="Novos pagamentos" description="Avisar quando um pagamento for confirmado." />
            <ToggleRow checked={notifications.classReminder} onChange={(value) => setNotifications({ ...notifications, classReminder: value })} title="Lembrete de aulas" description="Enviar lembretes de aula agendada." />
            <ToggleRow checked={notifications.inactiveStudents} onChange={(value) => setNotifications({ ...notifications, inactiveStudents: value })} title="Alunos inativos" description="Alerta quando aluno fica sem atividade." />
            <ToggleRow checked={notifications.weeklyFinanceSummary} onChange={(value) => setNotifications({ ...notifications, weeklyFinanceSummary: value })} title="Resumo financeiro semanal" description="Receber consolidado semanal de receitas." />
          </div>
        </SubBlock>
        <ActionRow
          onCancel={() => setNotifications(savedNotifications)}
          onSave={() => saveAccountPreferences({ notifications, preferences })}
          saveLabel={preferencesSaving ? 'Salvando...' : 'Salvar notificacoes'}
        />
      </SectionShell>
    );
  }

  function renderPreferences() {
    const reset = () => setPreferences(savedPreferences);

    return (
      <SectionShell icon={Globe} title="Preferencias" subtitle="Configuracoes gerais de idioma, data, fuso e tema da conta.">
        <SubBlock title="Preferencias da conta">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>Tema</Label>
              <select className="input" value={preferences.theme} onChange={(e) => setPreferences({ ...preferences, theme: e.target.value })}>
                <option value="light">Tema claro</option>
                <option value="system">Seguir sistema</option>
              </select>
            </div>
            <div>
              <Label>Idioma</Label>
              <select className="input" value={preferences.language} onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}>
                <option value="pt-BR">Portugues (Brasil)</option>
                <option value="en-US">English (US)</option>
                <option value="es-ES">Espanol</option>
              </select>
            </div>
            <div>
              <Label>Formato de data</Label>
              <select className="input" value={preferences.dateFormat} onChange={(e) => setPreferences({ ...preferences, dateFormat: e.target.value })}>
                <option value="DD/MM/AAAA">DD/MM/AAAA</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
            <div>
              <Label>Fuso horario</Label>
              <select className="input" value={preferences.timezone} onChange={(e) => setPreferences({ ...preferences, timezone: e.target.value })}>
                <option value="America/Sao_Paulo">America/Sao_Paulo</option>
                <option value="America/Fortaleza">America/Fortaleza</option>
                <option value="America/Manaus">America/Manaus</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>
        </SubBlock>

        <ActionRow
          onCancel={reset}
          onSave={() => saveAccountPreferences({ notifications, preferences })}
          saveLabel={preferencesSaving ? 'Salvando...' : 'Salvar preferencias'}
        />
      </SectionShell>
    );
  }

  function renderExport() {
    return (
      <SectionShell icon={Download} title="Exportacao" subtitle="Exportacao rapida de dados e backup completo da operacao.">
        <SubBlock title="Arquivos disponiveis">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <button type="button" className="btn-secondary" onClick={exportStudents}>Exportar alunos</button>
            <button type="button" className="btn-secondary" onClick={exportFinance}>Exportar financeiro</button>
            <button type="button" className="btn-secondary" onClick={exportWorkouts}>Exportar treinos</button>
            <button type="button" className="btn-primary" onClick={exportBackup}>Backup completo</button>
          </div>
        </SubBlock>
      </SectionShell>
    );
  }

  function renderContent() {
    if (activeSection === 'perfil') return renderProfile();
    if (activeSection === 'seguranca') return renderSecurity();
    if (activeSection === 'plano') return renderPlanModern();
    if (activeSection === 'financeiro') return renderFinance();
    if (activeSection === 'integracoes') return renderIntegrations();
    if (activeSection === 'notificacoes') return renderNotifications();
    if (activeSection === 'preferencias') return renderPreferences();
    return renderExport();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Configuracoes</h1>
        <p className="text-slate-500">Centro de controle da conta, operacao e identidade da sua assessoria.</p>
      </div>

      {notice.text ? (
        <div className={`rounded-xl border px-4 py-2.5 text-sm ${notice.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {notice.text}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[250px_1fr]">
        <aside className="card h-fit p-3 sm:p-4">
          <nav className="space-y-1">
            {sectionItems.map((section) => {
              const Icon = section.icon;
              const active = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => handleSectionClick(section.id)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                    active
                      ? 'bg-blue-600/95 text-white shadow-[0_8px_18px_rgba(37,99,235,0.25)]'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <Icon size={16} />
                  <span className="font-medium">{section.title}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="space-y-4">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
