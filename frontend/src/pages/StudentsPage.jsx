import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Pencil,
  Plus,
  Search,
  Star,
  Target,
  Trash2,
  UserRound,
  Users,
  X
} from 'lucide-react';
import api from '../api/client';
import { UpgradeModal } from '../components/UpgradeModal';
import { useAuth } from '../context/AuthContext';
import { resizeImageFileToDataUrl } from '../utils/imageFiles';
import { formatPersonName } from '../utils/personName';

const emptyStudent = {
  name: '',
  birth_date: '',
  weight: '',
  height: '',
  goal: '',
  level: '',
  objective_notes: '',
  restrictions: '',
  phone: '',
  email: '',
  avatar_url: '',
  status: 'active'
};

const goalOptions = [
  { value: 'desenvolvimento_fisico', label: 'Desenvolvimento fisico' },
  { value: 'emagrecimento', label: 'Composicao corporal' },
  { value: 'performance', label: 'Desempenho' },
  { value: 'reabilitacao', label: 'Reabilitacao e mobilidade' }
];

const levelOptions = [
  { value: 'iniciante', label: 'Iniciante' },
  { value: 'intermediario', label: 'Intermediario' },
  { value: 'avancado', label: 'Avancado' }
];

const pageSize = 5;

function parseNumberInput(value) {
  const normalized = String(value || '').trim().replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function sanitizeDecimalInput(value) {
  const text = String(value || '').replace(',', '.');
  const digits = text.replace(/[^\d.]/g, '');
  const [integer = '', ...decimalParts] = digits.split('.');
  const decimal = decimalParts.join('');
  return decimalParts.length ? `${integer}.${decimal}` : integer;
}

function sanitizePhoneInput(value) {
  return String(value || '').replace(/[^\d()+\-\s]/g, '').slice(0, 20);
}

function isValidDecimalText(value) {
  const text = String(value || '').trim();
  return !text || /^\d+([.,]\d+)?$/.test(text);
}

function isValidPhoneText(value) {
  const text = String(value || '').trim();
  return !text || /^[\d()+\-\s]+$/.test(text);
}

function getAgeFromBirthDate(birthDate) {
  if (!birthDate) return null;
  const date = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  const dayDiff = today.getDate() - date.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age -= 1;
  return age >= 0 ? age : null;
}

function toDateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function getInitials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return '';
  return parts.map((part) => part[0]).join('').toUpperCase();
}

function getGoalLabel(goal = '') {
  const normalized = String(goal).toLowerCase();
  if (normalized.includes('hipertrofia') || normalized.includes('desenvolv')) return 'Desenvolvimento fisico';
  if (normalized.includes('emagrec')) return 'Composicao corporal';
  if (normalized.includes('perfor')) return 'Desempenho';
  if (normalized.includes('reabil')) return 'Reabilitacao e mobilidade';
  return goal || 'Sem objetivo';
}

function getGoalBadgeClass(goal = '') {
  const normalized = String(goal).toLowerCase();
  if (normalized.includes('hipertrofia') || normalized.includes('desenvolv')) return 'bg-amber-50 text-amber-700';
  if (normalized.includes('emagrec')) return 'bg-violet-50 text-violet-700';
  if (normalized.includes('perfor')) return 'bg-emerald-50 text-emerald-700';
  if (normalized.includes('reabil')) return 'bg-cyan-50 text-cyan-700';
  return 'bg-slate-100 text-slate-700';
}

function getLevelLabel(student) {
  const raw = String(student.level || '').toLowerCase();
  if (raw.includes('inic')) return 'Iniciante';
  if (raw.includes('inter')) return 'Intermediario';
  if (raw.includes('avan')) return 'Avancado';
  return 'Intermediario';
}

function getStatusLabel(status = '') {
  return String(status).toLowerCase() === 'active' ? 'Ativo' : 'Inativo';
}

function getAvatarUrl(student = {}) {
  return student.avatar_url || student.avatarUrl || '';
}

export function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [notice, setNotice] = useState({ type: '', text: '' });
  const [savingStudent, setSavingStudent] = useState(false);

  const [query, setQuery] = useState('');
  const [goalFilter, setGoalFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [page, setPage] = useState(1);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState('');
  const [form, setForm] = useState(emptyStudent);
  const [photoPreview, setPhotoPreview] = useState('');
  const [upgradeFeature, setUpgradeFeature] = useState('');
  const fileRef = useRef(null);
  const isExpiredTrial = user?.planStatus === 'expired';

  function blockIfExpired() {
    if (!isExpiredTrial) return false;
    setUpgradeFeature('subscription_required');
    return true;
  }

  async function loadData() {
    const [{ data: studentsData }, { data: scheduleData }] = await Promise.all([api.get('/students'), api.get('/schedule')]);
    setStudents(studentsData || []);
    setSchedule(scheduleData || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  const latestClassByStudent = useMemo(() => {
    const map = {};
    [...(schedule || [])]
      .filter((event) => event.student_id)
      .sort((a, b) => new Date(b.class_date || 0) - new Date(a.class_date || 0))
      .forEach((event) => {
        if (!map[event.student_id]) map[event.student_id] = event;
      });
    return map;
  }, [schedule]);

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = (students || []).filter((student) => {
      const matchQuery = !q || [student.name, student.phone, student.email].some((value) => String(value || '').toLowerCase().includes(q));
      const matchGoal = goalFilter === 'all' || String(student.goal || '').toLowerCase().includes(goalFilter);
      const level = String(student.level || getLevelLabel(student)).toLowerCase();
      const matchLevel = levelFilter === 'all' || level.includes(levelFilter);
      const status = String(student.status || 'active').toLowerCase();
      const matchStatus = statusFilter === 'all' || status === statusFilter;
      return matchQuery && matchGoal && matchLevel && matchStatus;
    });

    return filtered;
  }, [students, query, goalFilter, levelFilter, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredStudents.length / pageSize));

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const paginatedStudents = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, page]);

  const metrics = useMemo(() => {
    const total = students.length;
    const active = students.filter((s) => String(s.status || 'active').toLowerCase() === 'active').length;
    const todayKey = toDateKey(new Date());
    const classesToday = schedule.filter((s) => toDateKey(s.class_date) === todayKey && String(s.status || '').toLowerCase() !== 'cancelled').length;
    const birthdays = students.filter((s) => {
      if (!s.birth_date) return false;
      const date = new Date(s.birth_date);
      const now = new Date();
      return date.getDate() === now.getDate() && date.getMonth() === now.getMonth();
    }).length;

    return { total, active, classesToday, birthdays };
  }, [students, schedule]);

  function openCreateModal() {
    if (blockIfExpired()) return;
    setEditingStudentId('');
    setForm(emptyStudent);
    setPhotoPreview('');
    if (fileRef.current) fileRef.current.value = '';
    setShowCreateModal(true);
  }

  function openEditModal(student) {
    if (blockIfExpired()) return;
    setEditingStudentId(student.id);
    setForm({
      name: student.name || '',
      birth_date: student.birth_date || '',
      weight: student.weight || '',
      height: student.height || '',
      goal: student.goal || '',
      level: student.level || '',
      objective_notes: student.objective_notes || '',
      restrictions: student.restrictions || '',
      phone: student.phone || '',
      email: student.email || '',
      avatar_url: getAvatarUrl(student),
      status: student.status || 'active'
    });
    setPhotoPreview(getAvatarUrl(student));
    if (fileRef.current) fileRef.current.value = '';
    setShowCreateModal(true);
  }

  function closeCreateModal() {
    setShowCreateModal(false);
    setEditingStudentId('');
    setForm(emptyStudent);
    setPhotoPreview('');
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setNotice({ type: 'error', text: 'A foto deve ter no maximo 5MB.' });
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    try {
      const nextPhoto = await resizeImageFileToDataUrl(file);
      setPhotoPreview(nextPhoto);
      setForm((current) => ({ ...current, avatar_url: nextPhoto }));
    } catch {
      setNotice({ type: 'error', text: 'Nao foi possivel carregar a foto do aluno.' });
    }
  }

  async function handleSaveStudent(event) {
    event.preventDefault();
    if (blockIfExpired()) return;
    setNotice({ type: '', text: '' });

    if (!isValidDecimalText(form.weight)) {
      setNotice({ type: 'error', text: 'Peso deve conter apenas numeros. Use ponto ou virgula para decimais.' });
      return;
    }

    if (!isValidDecimalText(form.height)) {
      setNotice({ type: 'error', text: 'Altura deve conter apenas numeros. Use centimetros, por exemplo 175.' });
      return;
    }

    if (!isValidPhoneText(form.phone)) {
      setNotice({ type: 'error', text: 'Telefone deve conter apenas numeros e simbolos como (), + ou -.' });
      return;
    }

    const payload = {
      name: form.name,
      birth_date: form.birth_date || null,
      age: form.birth_date ? getAgeFromBirthDate(form.birth_date) : null,
      weight: parseNumberInput(form.weight),
      height: parseNumberInput(form.height),
      goal: form.goal,
      level: form.level,
      restrictions: form.restrictions,
      phone: form.phone,
      email: form.email,
      avatar_url: form.avatar_url || photoPreview || null,
      status: form.status,
      objective_notes: form.objective_notes
    };

    try {
      setSavingStudent(true);

      if (editingStudentId) {
        await api.put(`/students/${editingStudentId}`, payload);
      } else {
        await api.post('/students', payload);
      }

      closeCreateModal();
      setNotice({
        type: 'success',
        text: editingStudentId ? 'Aluno atualizado com sucesso.' : 'Aluno salvo com sucesso.'
      });
      await loadData();
    } catch (error) {
      setNotice({
        type: 'error',
        text: error.response?.data?.message || 'Nao foi possivel salvar o aluno.'
      });
    } finally {
      setSavingStudent(false);
    }
  }

  async function handleDelete(id) {
    if (blockIfExpired()) return;
    await api.delete(`/students/${id}`);
    await loadData();
  }

  function clearFilters() {
    setQuery('');
    setGoalFilter('all');
    setLevelFilter('all');
    setStatusFilter('all');
    setPage(1);
  }

  const startCount = filteredStudents.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const endCount = Math.min(page * pageSize, filteredStudents.length);

  return (
    <div className="space-y-5">
      {notice.text ? (
        <div className={`rounded-xl border px-4 py-3 text-sm ${notice.type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {notice.text}
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Alunos</h1>
          <p className="mt-1.5 text-base text-slate-600">Gerencie alunos, acompanhe evolucao e organize o atendimento.</p>
        </div>
        <button className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-base" onClick={openCreateModal}>
          <Plus size={16} />
          Novo aluno
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 inline-flex rounded-xl bg-blue-50 p-2.5 text-blue-600"><Users size={18} /></div>
          <p className="text-sm text-slate-600">Total de alunos</p>
          <p className="mt-1.5 text-4xl font-bold tracking-tight text-slate-900">{metrics.total}</p>
          <p className="mt-2 text-xs font-medium text-emerald-600">+ {Math.max(metrics.total - 21, 0)} este mes</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 inline-flex rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><CheckCircle2 size={18} /></div>
          <p className="text-sm text-slate-600">Alunos ativos</p>
          <p className="mt-1.5 text-4xl font-bold tracking-tight text-slate-900">{metrics.active}</p>
          <p className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            {metrics.total ? Math.round((metrics.active / metrics.total) * 100) : 0}% do total
          </p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 inline-flex rounded-xl bg-amber-50 p-2.5 text-amber-600"><CalendarDays size={18} /></div>
          <p className="text-sm text-slate-600">Sessoes hoje</p>
          <p className="mt-1.5 text-4xl font-bold tracking-tight text-slate-900">{metrics.classesToday}</p>
          <Link to="/schedule" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-500">
            Ver agenda
          </Link>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 inline-flex rounded-xl bg-violet-50 p-2.5 text-violet-600"><Star size={18} /></div>
          <p className="text-sm text-slate-600">Aniversariantes</p>
          <p className="mt-1.5 text-4xl font-bold tracking-tight text-slate-900">{metrics.birthdays}</p>
          <p className="mt-2 text-xs font-semibold text-blue-600">Ver detalhes</p>
        </article>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <div className="grid gap-3 xl:grid-cols-[1.6fr_repeat(3,minmax(0,1fr))_130px]">
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3">
              <Search size={16} className="text-slate-400" />
              <input
                className="w-full py-3 text-sm text-slate-800 outline-none"
                placeholder="Buscar aluno por nome, telefone ou email..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <select className="input h-12" value={goalFilter} onChange={(e) => { setGoalFilter(e.target.value); setPage(1); }}>
              <option value="all">Todos os objetivos</option>
              {goalOptions.map((goal) => (
                <option key={goal.value} value={goal.value}>{goal.label}</option>
              ))}
            </select>

            <select className="input h-12" value={levelFilter} onChange={(e) => { setLevelFilter(e.target.value); setPage(1); }}>
              <option value="all">Todos os niveis</option>
              {levelOptions.map((level) => (
                <option key={level.value} value={level.value}>{level.label}</option>
              ))}
            </select>

            <select className="input h-12" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="all">Todos os status</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>

            <button type="button" className="btn-secondary inline-flex h-12 items-center justify-center gap-2" onClick={clearFilters}>
              <Filter size={15} />
              Filtros
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Aluno</th>
                <th className="px-5 py-4 font-semibold">Objetivo</th>
                <th className="px-5 py-4 font-semibold">Nivel</th>
                <th className="px-5 py-4 font-semibold">Ultima sessao</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {paginatedStudents.map((student) => {
                const lastClass = latestClassByStudent[student.id];
                const status = String(student.status || 'active').toLowerCase();

                return (
                  <tr key={student.id} className="border-t border-slate-100 transition hover:bg-slate-50/60">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 overflow-hidden rounded-xl bg-slate-100 text-base font-semibold text-blue-700 ring-1 ring-slate-200">
                          {getAvatarUrl(student) ? (
                            <img src={getAvatarUrl(student)} alt={student.name || 'Aluno'} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              {getInitials(student.name) || 'A'}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-lg font-semibold tracking-tight text-slate-900">{student.name}</p>
                          <p className="mt-0.5 text-xs text-slate-500">{student.phone || student.email || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getGoalBadgeClass(student.goal)}`}>{getGoalLabel(student.goal)}</span>
                    </td>
                    <td className="px-5 py-4 text-base text-slate-700">{getLevelLabel(student)}</td>
                    <td className="px-5 py-4 text-base text-slate-700">{formatDate(lastClass?.class_date)}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        <span className={`h-2 w-2 rounded-full ${status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {getStatusLabel(status)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Link className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" to={`/students/${student.id}`}>
                          <UserRound size={14} /> Perfil
                        </Link>
                        <button type="button" className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50" onClick={() => openEditModal(student)}>
                          <Pencil size={14} />
                        </button>
                        <button type="button" className="rounded-xl border border-rose-200 bg-white p-2 text-rose-600 hover:bg-rose-50" onClick={() => handleDelete(student.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-14 text-center text-sm text-slate-500">
                    Nenhum aluno encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
          <p className="text-sm text-slate-500">Mostrando {startCount} a {endCount} de {filteredStudents.length} alunos</p>
          <div className="flex items-center gap-2">
            <button type="button" className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(prev - 1, 1))}>
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: pageCount }).slice(0, 5).map((_, index) => {
              const p = index + 1;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`h-10 w-10 rounded-xl border text-sm font-semibold ${p === page ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {p}
                </button>
              );
            })}
            <button type="button" className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 disabled:opacity-40" disabled={page >= pageCount} onClick={() => setPage((prev) => Math.min(prev + 1, pageCount))}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 bg-slate-900/40 p-3 backdrop-blur-sm md:p-6" onClick={closeCreateModal}>
          <div
            className="mx-auto h-[calc(100vh-24px)] max-w-6xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white shadow-[0_25px_60px_rgba(15,23,42,0.22)] md:h-[calc(100vh-48px)] lg:overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid min-h-full grid-cols-1 lg:h-full lg:grid-cols-[360px_1fr]">
              <aside className="flex flex-col border-b border-slate-100 bg-[radial-gradient(circle_at_top,#f8fbff_0%,#ffffff_58%)] p-6 lg:h-full lg:border-b-0 lg:border-r">
                <div className="mb-7">
                  <h2 className="text-3xl font-black tracking-tight text-slate-950">
                    {editingStudentId ? 'Editar perfil do aluno' : 'Novo perfil do aluno'}
                  </h2>
                  <p className="mt-2 max-w-[15rem] text-base leading-7 text-slate-500">
                    {editingStudentId ? 'Atualize as informacoes do aluno e mantenha os dados sempre em dia.' : 'Preencha as informacoes do aluno e salve a foto no perfil.'}
                  </p>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                  <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={handlePhotoChange} />
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="group relative mx-auto block h-36 w-36 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200 transition hover:ring-blue-300"
                    >
                      {photoPreview ? (
                        <img src={photoPreview} alt="Foto do aluno" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-4xl font-black text-blue-700">
                          {getInitials(form.name) || 'AL'}
                        </div>
                      )}
                      <span className="absolute bottom-2 right-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-[0_10px_24px_rgba(37,99,235,0.3)]">
                        <Camera size={18} />
                      </span>
                    </button>
                    <h3 className="mt-5 text-2xl font-black text-slate-950">{formatPersonName(form.name || 'Nome do aluno')}</h3>
                    <span className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${form.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      <span className={`h-2 w-2 rounded-full ${form.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {form.status === 'active' ? 'Aluno ativo' : 'Aluno inativo'}
                    </span>
                    <p className="mt-3 text-xs text-slate-500">PNG ou JPG. Max. 5MB</p>
                  </div>

                  <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-bold text-slate-900">Resumo do aluno</p>
                    <div className="mt-4 space-y-4">
                      <div className="flex gap-3">
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><UserRound size={18} /></span>
                        <div>
                          <p className="text-sm font-bold text-slate-700">Membro desde</p>
                          <p className="text-sm text-slate-500">{editingStudentId ? 'Perfil existente' : 'Novo cadastro'}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Target size={18} /></span>
                        <div>
                          <p className="text-sm font-bold text-slate-700">Objetivo principal</p>
                          <p className="text-sm text-slate-500">{getGoalLabel(form.goal)}</p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><CalendarDays size={18} /></span>
                        <div>
                          <p className="text-sm font-bold text-slate-700">Aulas realizadas</p>
                          <p className="text-sm text-slate-500">{editingStudentId ? (schedule || []).filter((item) => item.student_id === editingStudentId).length : 0} aulas</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </aside>

              <form onSubmit={handleSaveStudent} className="flex min-h-0 flex-col">
                <div className="flex items-start justify-end px-5 py-5 md:px-8">
                  <button type="button" className="rounded-2xl border border-slate-200 p-3 text-slate-500 shadow-[0_10px_22px_rgba(15,23,42,0.06)] hover:bg-slate-50" onClick={closeCreateModal}>
                    <X size={18} />
                  </button>
                </div>

                <div className="flex-1 px-5 pb-5 md:px-8 lg:overflow-y-auto">
                  <section className="space-y-4">
                    <h3 className="flex items-center gap-3 text-xl font-bold text-blue-600"><UserRound size={20} /> Informacoes pessoais</h3>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Nome completo</label>
                        <input className="input" placeholder="Nome do aluno" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Data de nascimento</label>
                        <input className="input" type="date" value={form.birth_date} onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">E-mail</label>
                        <input className="input" type="email" placeholder="email@exemplo.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Telefone</label>
                        <input
                          className="input"
                          inputMode="tel"
                          autoComplete="tel"
                          placeholder="(11) 99999-9999"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: sanitizePhoneInput(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-sm font-semibold text-slate-700">Objetivo principal</label>
                        <select className="input" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })}>
                          <option value="">Selecione o objetivo</option>
                          {goalOptions.map((goal) => (
                            <option key={goal.value} value={goal.value}>{goal.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </section>

                  <div className="my-8 h-px bg-slate-200" />

                  <section className="space-y-4">
                    <h3 className="flex items-center gap-3 text-xl font-bold text-blue-600"><Target size={20} /> Informacoes adicionais</h3>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Peso (kg)</label>
                        <input
                          className="input"
                          inputMode="decimal"
                          pattern="[0-9]*[.,]?[0-9]*"
                          placeholder="Ex: 75.5"
                          value={form.weight}
                          onChange={(e) => setForm({ ...form, weight: sanitizeDecimalInput(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Altura (cm)</label>
                        <input
                          className="input"
                          inputMode="decimal"
                          pattern="[0-9]*[.,]?[0-9]*"
                          placeholder="Ex: 175"
                          value={form.height}
                          onChange={(e) => setForm({ ...form, height: sanitizeDecimalInput(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Nivel atual</label>
                        <select className="input" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                          <option value="">Selecione o nivel</option>
                          {levelOptions.map((level) => (
                            <option key={level.value} value={level.value}>{level.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-slate-700">Status</label>
                        <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                          <option value="active">Ativo</option>
                          <option value="inactive">Inativo</option>
                        </select>
                      </div>
                      <div className="relative md:col-span-2">
                        <textarea
                          className="input min-h-28 resize-y pr-14"
                          maxLength={300}
                          placeholder="Observacoes importantes sobre o aluno..."
                          value={form.objective_notes}
                          onChange={(e) => setForm({ ...form, objective_notes: e.target.value })}
                        />
                        <span className="pointer-events-none absolute bottom-3 right-3 text-xs text-slate-400">{form.objective_notes.length}/300</span>
                      </div>
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-sm font-semibold text-slate-700">Restricoes / observacoes clinicas</label>
                        <input className="input" placeholder="Lesoes, limitacoes, cuidados ou observacoes relevantes" value={form.restrictions} onChange={(e) => setForm({ ...form, restrictions: e.target.value })} />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                      As alteracoes serao salvas e refletidas em todo o sistema.
                    </div>
                  </section>
                </div>

                <div className="flex items-center justify-end gap-3 bg-white px-5 py-5 md:px-8">
                  <button type="button" className="btn-secondary min-w-28 rounded-2xl py-3" onClick={closeCreateModal}>Cancelar</button>
                  <button className="btn-primary min-w-44 rounded-2xl py-3 disabled:opacity-60" disabled={savingStudent}>
                    {savingStudent ? 'Salvando...' : editingStudentId ? 'Salvar alteracoes' : 'Salvar aluno'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      <UpgradeModal featureKey={upgradeFeature} open={Boolean(upgradeFeature)} onClose={() => setUpgradeFeature('')} />
    </div>
  );
}
