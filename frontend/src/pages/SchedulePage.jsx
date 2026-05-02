import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing, CalendarClock, ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { getUpgradePlanForFeature, hasPlanFeature } from '../constants/plans';

const empty = { student_id: '', title: '', class_date: '' };
const availableTimes = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

function toDateKey(dateLike) {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function monthGrid(baseDate) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekday = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

export function SchedulePage() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [students, setStudents] = useState([]);
  const [form, setForm] = useState(empty);
  const [createNotes, setCreateNotes] = useState('');
  const [reminderInfo, setReminderInfo] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState('');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [createMonth, setCreateMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [createSelectedDate, setCreateSelectedDate] = useState(() => new Date());
  const [createSelectedTime, setCreateSelectedTime] = useState('10:00');

  async function load() {
    const [{ data: scheduleData }, { data: studentsData }] = await Promise.all([
      api.get('/schedule'),
      api.get('/students')
    ]);
    setEvents(scheduleData || []);
    setStudents(studentsData || []);
  }

  useEffect(() => {
    load();
  }, []);

  const studentNameById = useMemo(() => {
    return Object.fromEntries((students || []).map((student) => [student.id, student.name]));
  }, [students]);

  const eventsByDate = useMemo(() => {
    const grouped = {};
    (events || []).forEach((event) => {
      const key = toDateKey(event.class_date);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(event);
    });
    return grouped;
  }, [events]);

  const monthCells = useMemo(() => monthGrid(currentMonth), [currentMonth]);

  const upcomingClasses = useMemo(() => {
    const now = new Date();
    return [...events]
      .filter((event) => event.status !== 'cancelled')
      .filter((event) => new Date(event.class_date) >= now)
      .sort((a, b) => new Date(a.class_date) - new Date(b.class_date))
      .slice(0, 6);
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (!selectedDateKey) return events;
    return events.filter((event) => toDateKey(event.class_date) === selectedDateKey);
  }, [events, selectedDateKey]);

  const createMonthCells = useMemo(() => monthGrid(createMonth), [createMonth]);

  const createCalendarWeeks = useMemo(() => {
    const weeks = [];
    for (let i = 0; i < createMonthCells.length; i += 7) weeks.push(createMonthCells.slice(i, i + 7));
    return weeks;
  }, [createMonthCells]);

  const selectedStudent = useMemo(() => {
    return (students || []).find((student) => String(student.id) === String(form.student_id)) || null;
  }, [students, form.student_id]);

  const createMonthLabel = createMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const selectedDateLabel = createSelectedDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  function composeClassDate(dateObj, time) {
    const key = toDateKey(dateObj);
    return `${key}T${time}:00`;
  }

  function openCreateModal() {
    const now = new Date();
    const baseDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const defaultStudent = students[0]?.id ? String(students[0].id) : '';
    setCreateMonth(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1));
    setCreateSelectedDate(baseDate);
    setCreateSelectedTime('10:00');
    setCreateNotes('');
    setForm({
      ...empty,
      student_id: defaultStudent,
      class_date: composeClassDate(baseDate, '10:00')
    });
    setShowCreateModal(true);
  }

  function closeCreateModal() {
    setShowCreateModal(false);
    setCreateNotes('');
    setForm(empty);
  }

  function selectCreateDate(date) {
    setCreateSelectedDate(date);
    setForm((prev) => ({ ...prev, class_date: composeClassDate(date, createSelectedTime) }));
  }

  function selectCreateTime(time) {
    setCreateSelectedTime(time);
    setForm((prev) => ({ ...prev, class_date: composeClassDate(createSelectedDate, time) }));
  }

  function changeCreateMonth(step) {
    setCreateMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + step, 1));
  }

  async function createEvent(e) {
    e.preventDefault();
    await api.post('/schedule', form);
    closeCreateModal();
    load();
  }

  async function cancelEvent(id) {
    await api.patch(`/schedule/${id}/cancel`);
    load();
  }

  async function deleteEvent(id) {
    await api.delete(`/schedule/${id}`);
    load();
  }

  async function dispatchReminders() {
    if (!hasPlanFeature(user?.plan, 'whatsapp_automation')) {
      const requiredPlan = getUpgradePlanForFeature('whatsapp_automation');
      setReminderInfo(`Lembretes automaticos via WhatsApp disponiveis a partir do plano ${requiredPlan.publicName || requiredPlan.name}.`);
      return;
    }
    const { data } = await api.post('/schedule/reminders/dispatch');
    setReminderInfo(`Lembretes enviados: ${data.remindersDispatched}`);
    load();
  }

  function changeMonth(step) {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + step, 1));
  }

  const monthLabel = currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-blue-50 px-4 py-4 sm:rounded-3xl sm:px-5 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Agenda</h1>
            <p className="mt-1 text-sm leading-5 text-slate-500 sm:text-base">Calendario visual com sessoes agendadas e automacao de lembretes.</p>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <button className="btn-secondary inline-flex items-center justify-center gap-2" type="button" onClick={dispatchReminders}>
              <BellRing size={15} />
              {hasPlanFeature(user?.plan, 'whatsapp_automation') ? 'Lembretes automaticos' : 'Lembretes (Pro+)'}
            </button>
            <button className="btn-primary inline-flex items-center justify-center gap-2" type="button" onClick={openCreateModal}>
              <Plus size={15} />
              Agendar sessao
            </button>
          </div>
        </div>
      </div>

      {reminderInfo ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{reminderInfo}</p> : null}

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <section className="card p-3 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <button className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" onClick={() => changeMonth(-1)}>
              <ChevronLeft size={16} />
            </button>
            <h2 className="text-sm font-semibold capitalize text-slate-800 sm:text-base">{monthLabel}</h2>
            <button className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" onClick={() => changeMonth(1)}>
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="mt-2">
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-500 sm:gap-2 sm:text-xs">
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map((day) => (
                <span key={day} className="pb-1">{day}</span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {monthCells.map((date, index) => {
                if (!date) return <div key={`empty-${index}`} className="min-h-14 rounded-lg bg-slate-50 sm:min-h-24 sm:rounded-xl" />;

                const key = toDateKey(date);
                const dayEvents = eventsByDate[key] || [];
                const selected = selectedDateKey === key;
                const today = toDateKey(new Date()) === key;

                return (
                  <button
                    key={key}
                    type="button"
                    className={`min-h-14 rounded-lg border p-1.5 text-left transition sm:min-h-24 sm:rounded-xl sm:p-2 ${
                      selected
                        ? 'border-blue-500 bg-blue-50'
                        : today
                          ? 'border-slate-300 bg-slate-50'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                    onClick={() => setSelectedDateKey(selected ? '' : key)}
                  >
                    <p className="text-[11px] font-semibold text-slate-700 sm:text-xs">{date.getDate()}</p>
                    {dayEvents.length ? (
                      <div className="mt-1 space-y-1 sm:mt-2">
                        <span className={`block h-1.5 w-1.5 rounded-full sm:hidden ${dayEvents.some((event) => event.status !== 'cancelled') ? 'bg-blue-500' : 'bg-rose-500'}`} />
                        {dayEvents.slice(0, 2).map((event) => (
                          <div
                            key={event.id}
                            className={`hidden truncate rounded-full px-2 py-0.5 text-[10px] font-semibold sm:block ${
                              event.status === 'cancelled' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 ? <p className="hidden text-[10px] text-slate-500 sm:block">+{dayEvents.length - 2}</p> : null}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="card p-4 sm:p-5">
          <h3 className="text-lg font-semibold text-slate-900">Proximas sessoes</h3>
          <p className="mt-1 text-sm text-slate-500">Compromissos mais proximos da sua agenda.</p>
          <div className="mt-4 space-y-2.5">
            {upcomingClasses.map((event) => (
              <article key={event.id} className="rounded-xl bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-700">{event.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">{studentNameById[event.student_id] || 'Sem aluno vinculado'}</p>
                <p className="mt-0.5 text-xs text-slate-500">{new Date(event.class_date).toLocaleString('pt-BR')}</p>
              </article>
            ))}
            {upcomingClasses.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                Sem sessoes futuras no momento.
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
          <h3 className="text-base font-semibold text-slate-900 sm:text-lg">Sessoes {selectedDateKey ? `em ${selectedDateKey}` : 'agendadas'}</h3>
          <p className="text-sm text-slate-500">Use o calendario para filtrar por dia.</p>
        </div>

        <div className="space-y-3 p-4 sm:hidden">
          {filteredEvents.map((event) => (
            <article key={event.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_22px_rgba(15,23,42,0.04)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800">{event.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{studentNameById[event.student_id] || 'Sem aluno vinculado'}</p>
                  <p className="mt-1 text-xs text-slate-500">{new Date(event.class_date).toLocaleString('pt-BR')}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  event.status === 'cancelled' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-700'
                }`}>
                  {event.status === 'cancelled' ? 'Cancelada' : 'Agendada'}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" className="btn-secondary py-2 text-xs" onClick={() => cancelEvent(event.id)}>
                  Cancelar
                </button>
                <button type="button" className="btn-secondary py-2 text-xs" onClick={() => deleteEvent(event.id)}>
                  Excluir
                </button>
              </div>
            </article>
          ))}
          {filteredEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
              <CalendarClock size={28} className="mx-auto text-slate-300" />
              <p className="mt-2 text-sm font-medium text-slate-600">Sem sessoes para este periodo</p>
              <p className="mt-1 text-sm text-slate-500">Agende a proxima sessao para preencher sua agenda.</p>
            </div>
          ) : null}
        </div>

        <div className="hidden overflow-x-auto sm:block">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-5 py-3">Aula</th>
                <th className="px-5 py-3">Aluno</th>
                <th className="px-5 py-3">Data</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event) => (
                <tr key={event.id} className="border-t border-slate-100">
                  <td className="px-5 py-3 font-medium text-slate-700">{event.title}</td>
                  <td className="px-5 py-3 text-slate-600">{studentNameById[event.student_id] || '-'}</td>
                  <td className="px-5 py-3 text-slate-600">{new Date(event.class_date).toLocaleString('pt-BR')}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      event.status === 'cancelled' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {event.status === 'cancelled' ? 'Cancelada' : 'Agendada'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <button type="button" className="btn-secondary py-2 text-xs" onClick={() => cancelEvent(event.id)}>
                        Cancelar
                      </button>
                      <button type="button" className="btn-secondary py-2 text-xs" onClick={() => deleteEvent(event.id)}>
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-5 py-14 text-center">
                    <div className="mx-auto max-w-sm space-y-2">
                      <CalendarClock size={28} className="mx-auto text-slate-300" />
                      <p className="text-sm font-medium text-slate-600">Sem sessoes para este periodo</p>
                      <p className="text-sm text-slate-500">Agende a proxima sessao para preencher sua agenda.</p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 bg-slate-900/35 p-2 backdrop-blur-sm md:p-6" onClick={closeCreateModal}>
          <div
            className="mx-auto h-[calc(100dvh-16px)] max-w-7xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-[0_25px_60px_rgba(15,23,42,0.22)] md:h-[calc(100vh-48px)] md:rounded-[28px] lg:overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="grid min-h-full grid-cols-1 lg:h-full lg:grid-cols-[300px_1fr]">
              <aside className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-slate-100/70 p-4 sm:gap-4 sm:p-6 lg:border-b-0 lg:border-r">
                <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-base font-black text-blue-700 sm:h-14 sm:w-14 sm:text-xl">
                      {selectedStudent?.name ? selectedStudent.name.slice(0, 1).toUpperCase() : 'M'}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-lg font-black tracking-tight text-slate-900 sm:text-2xl">{selectedStudent?.name || 'Sem aluno'}</p>
                      <p className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{selectedStudent?.goal || 'Aluno'}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-900">Informacoes do aluno</p>
                  <div className="space-y-2 text-sm text-slate-600">
                    <p>Idade: {selectedStudent?.age ? `${selectedStudent.age} anos` : '-'}</p>
                    <p>Objetivo: {selectedStudent?.goal || '-'}</p>
                    <p>Contato: {selectedStudent?.phone || selectedStudent?.email || '-'}</p>
                  </div>
                  {selectedStudent?.id ? (
                    <Link to={`/students/${selectedStudent.id}`} className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50">
                      Ver perfil completo
                    </Link>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 sm:p-4">
                  <p className="text-sm font-semibold text-blue-700">Dica</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">O aluno pode receber lembrete antes da sessao por WhatsApp.</p>
                </div>
              </aside>

              <form onSubmit={createEvent} className="flex min-h-0 flex-col">
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 md:px-8 md:py-5">
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-slate-900 sm:text-4xl">Agendar sessao</h2>
                    <p className="mt-1 text-sm text-slate-500">Crie um novo compromisso na agenda.</p>
                  </div>
                  <button type="button" className="shrink-0 rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" onClick={closeCreateModal}>
                    <X size={18} />
                  </button>
                </div>

                <div className="flex-1 space-y-4 px-4 py-4 md:px-8 md:py-5 lg:overflow-y-auto">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Aluno</label>
                    <select className="input" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })}>
                      <option value="">Selecione o aluno</option>
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>
                          {student.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Titulo da sessao</label>
                    <div className="relative">
                      <input
                        className="input pr-14"
                        placeholder="Ex: Sessao tecnica, treino funcional, corrida orientada..."
                        maxLength={60}
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        required
                      />
                      <span className="pointer-events-none absolute bottom-3 right-3 text-xs text-slate-400">{form.title.length}/60</span>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
                    <div className="rounded-2xl border border-slate-200 bg-white">
                      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                        <button type="button" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100" onClick={() => changeCreateMonth(-1)}>
                          <ChevronLeft size={16} />
                        </button>
                        <p className="text-lg font-bold capitalize text-slate-800">{createMonthLabel}</p>
                        <button type="button" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100" onClick={() => changeCreateMonth(1)}>
                          <ChevronRight size={16} />
                        </button>
                      </div>

                      <div className="p-3 sm:p-4">
                        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
                          {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map((day) => (
                            <span key={day}>{day}</span>
                          ))}
                        </div>

                        <div className="mt-2 grid grid-cols-7 gap-1">
                          {createCalendarWeeks.flat().map((date, index) => {
                            if (!date) return <div key={`calendar-empty-${index}`} className="h-8 rounded-lg sm:h-9" />;
                            const isSelected = toDateKey(createSelectedDate) === toDateKey(date);
                            const outMonth = date.getMonth() !== createMonth.getMonth();
                            return (
                              <button
                                key={`calendar-day-${index}`}
                                type="button"
                                className={`h-8 rounded-lg text-xs font-semibold transition sm:h-9 sm:text-sm ${
                                  isSelected
                                    ? 'bg-blue-600 text-white'
                                    : outMonth
                                      ? 'text-slate-300'
                                      : 'text-slate-700 hover:bg-slate-100'
                                }`}
                                onClick={() => selectCreateDate(date)}
                              >
                                {date.getDate()}
                              </button>
                            );
                          })}
                        </div>

                        <p className="mt-4 text-sm text-slate-500">{selectedDateLabel}</p>
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-sm font-semibold text-slate-700">Horario disponivel</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {availableTimes.map((time) => (
                          <button
                            key={time}
                            type="button"
                            onClick={() => selectCreateTime(time)}
                            className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition sm:py-3 ${
                              createSelectedTime === time
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Observacoes (opcional)</label>
                    <div className="relative">
                      <textarea
                        className="input min-h-24 resize-y pr-14 sm:min-h-32"
                        maxLength={300}
                        placeholder="Adicione observacoes, objetivo da aula ou informacoes importantes..."
                        value={createNotes}
                        onChange={(e) => setCreateNotes(e.target.value)}
                      />
                      <span className="pointer-events-none absolute bottom-3 right-3 text-xs text-slate-400">{createNotes.length}/300</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-white px-4 py-3 md:flex md:items-center md:justify-end md:gap-3 md:px-8 md:py-4">
                  <button type="button" className="btn-secondary min-w-0 md:min-w-28" onClick={closeCreateModal}>
                    Cancelar
                  </button>
                  <button className="btn-primary min-w-0 md:min-w-40">Agendar sessao</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
