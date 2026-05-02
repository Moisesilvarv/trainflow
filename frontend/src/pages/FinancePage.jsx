import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertCircle, CalendarClock, CheckCircle2, CircleDollarSign, FileText, Plus, ReceiptText } from 'lucide-react';
import api from '../api/client';

const empty = { student_id: '', description: '', amount: '', due_date: '' };

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value) || 0);
}

function formatCurrencyInput(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  const numeric = Number(digits) / 100;
  return numeric.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseCurrencyInput(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return 0;
  return Number(digits) / 100;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function buildMonthlyRevenue(payments) {
  const formatter = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
  const now = new Date();
  const months = [];

  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    months.push({ key, month: formatter.format(date), value: 0 });
  }

  const byMonth = Object.fromEntries(months.map((m) => [m.key, m]));

  (payments || []).forEach((payment) => {
    if (payment.status !== 'paid') return;
    const dateSource = payment.paid_at || payment.due_date;
    if (!dateSource) return;

    const date = new Date(dateSource);
    if (Number.isNaN(date.getTime())) return;

    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonth[key]) return;
    byMonth[key].value += Number(payment.amount) || 0;
  });

  return months;
}

export function FinancePage() {
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [summary, setSummary] = useState({ total: 0, pending: 0, paid: 0 });
  const [errorMessage, setErrorMessage] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [form, setForm] = useState(empty);
  const [dueDateFocused, setDueDateFocused] = useState(false);

  async function load() {
    const [{ data: list }, { data: studentsList }] = await Promise.all([
      api.get('/finance'),
      api.get('/students')
    ]);
    setPayments(list || []);
    try {
      const { data: sum } = await api.get('/finance/summary');
      setSummary(sum || { total: 0, pending: 0, paid: 0 });
    } catch {
      const rows = list || [];
      const total = rows.reduce((acc, item) => acc + Number(item.amount || 0), 0);
      const pending = rows.filter((item) => item.status === 'pending').reduce((acc, item) => acc + Number(item.amount || 0), 0);
      const paid = rows.filter((item) => item.status === 'paid').reduce((acc, item) => acc + Number(item.amount || 0), 0);
      setSummary({ total, pending, paid });
    }
    setStudents(studentsList || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function createPayment(e) {
    e.preventDefault();
    setErrorMessage('');
    setNoticeMessage('');

    try {
      const amountValue = parseCurrencyInput(form.amount);
      await api.post('/finance', {
        ...form,
        student_id: form.student_id || null,
        amount: amountValue
      });
      setForm(empty);
      load();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Nao foi possivel lancar pagamento.');
    }
  }

  async function markPaid(id) {
    setNoticeMessage('');
    await api.patch(`/finance/${id}/paid`);
    load();
  }

  async function deletePayment(id) {
    setNoticeMessage('');
    await api.delete(`/finance/${id}`);
    load();
  }

  async function dispatchMonthlyReminders() {
    setErrorMessage('');
    setNoticeMessage('');
    try {
      const { data } = await api.post('/finance/reminders/dispatch');
      setNoticeMessage(`Lembretes de mensalidade enviados: ${data.remindersDispatched}`);
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Nao foi possivel enviar lembretes de mensalidade.');
    }
  }

  const studentNameById = useMemo(() => {
    return Object.fromEntries((students || []).map((student) => [student.id, student.name]));
  }, [students]);

  const recentTransactions = useMemo(() => {
    return [...payments]
      .sort((a, b) => new Date(b.created_at || b.due_date || 0) - new Date(a.created_at || a.due_date || 0))
      .slice(0, 6);
  }, [payments]);

  const monthlyRevenueData = useMemo(() => buildMonthlyRevenue(payments), [payments]);

  const metricCards = [
    {
      title: 'Receita total',
      value: formatCurrency(summary.total),
      subtitle: 'Acumulado de cobrancas cadastradas',
      icon: CircleDollarSign,
      tone: 'text-slate-900'
    },
    {
      title: 'Em aberto',
      value: formatCurrency(summary.pending),
      subtitle: 'Cobrancas com pagamento pendente',
      icon: AlertCircle,
      tone: 'text-amber-600'
    },
    {
      title: 'Recebido',
      value: formatCurrency(summary.paid),
      subtitle: 'Pagamentos concluidos',
      icon: CheckCircle2,
      tone: 'text-emerald-600'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Financeiro</h1>
        <p className="text-slate-500">Controle de cobrancas, fluxo de recebimentos e visao de receita mensal.</p>
        <div className="mt-3">
          <button type="button" className="btn-secondary" onClick={dispatchMonthlyReminders}>
            Enviar lembretes de mensalidade
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {metricCards.map((metric) => (
          <article key={metric.title} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">{metric.title}</p>
                <h3 className={`mt-2 text-3xl font-bold tracking-tight ${metric.tone}`}>{metric.value}</h3>
                <p className="mt-2 text-xs text-slate-500">{metric.subtitle}</p>
              </div>
              <span className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                <metric.icon size={18} />
              </span>
            </div>
          </article>
        ))}
      </div>

      {noticeMessage ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {noticeMessage}
        </p>
      ) : null}

      <section className="card p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Nova cobranca</h2>
            <p className="text-sm text-slate-500">Cadastre uma cobranca com vencimento e aluno vinculado.</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={createPayment}>
          {errorMessage ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage}
            </p>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">Aluno</label>
              <select
                className="input"
                value={form.student_id}
                onChange={(e) => setForm({ ...form, student_id: e.target.value })}
              >
                <option value="">Selecionar aluno (opcional)</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>{student.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">Descricao</label>
              <input
                className="input"
                placeholder="Mensalidade de abril"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">Valor</label>
              <div className="input flex items-center gap-2 px-3">
                <span className="text-sm font-semibold text-slate-500">R$</span>
                <input
                  className="w-full border-0 bg-transparent px-0 py-0 text-sm text-slate-900 outline-none"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: formatCurrencyInput(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">Vencimento</label>
              <input
                className="input"
                type={dueDateFocused || form.due_date ? 'date' : 'text'}
                placeholder="dd/mm/aaaa"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                onFocus={() => setDueDateFocused(true)}
                onBlur={() => setDueDateFocused(false)}
                required
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button className="btn-primary inline-flex items-center gap-2">
              <Plus size={16} />
              Criar cobranca
            </button>
          </div>
        </form>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr]">
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Receita mensal</h3>
              <p className="text-sm text-slate-500">Ultimos 6 meses com base em pagamentos concluidos.</p>
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyRevenueData}>
                <defs>
                  <linearGradient id="financeRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} stroke="#64748b" />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={54}
                  stroke="#64748b"
                  tickFormatter={(value) => `R$ ${Number(value).toFixed(0)}`}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), 'Receita']}
                  labelFormatter={(label) => `Mes: ${label}`}
                  contentStyle={{ borderRadius: 12, borderColor: '#cbd5e1' }}
                />
                <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2.5} fill="url(#financeRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <aside className="card p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-slate-900">Transacoes recentes</h3>
            <ReceiptText size={16} className="text-slate-400" />
          </div>

          <div className="space-y-2.5">
            {recentTransactions.map((item) => (
              <article key={item.id} className="rounded-xl bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{item.description || 'Mensalidade'}</p>
                    <p className="text-xs text-slate-500">{studentNameById[item.student_id] || 'Sem aluno vinculado'}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      item.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {item.status === 'paid' ? 'Pago' : 'Pendente'}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>{formatCurrency(item.amount)}</span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock size={12} />
                    {formatDate(item.due_date)}
                  </span>
                </div>
              </article>
            ))}
            {recentTransactions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                Ainda nao existem transacoes recentes.
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-900">Cobrancas</h3>
          <p className="text-sm text-slate-500">Lista completa de cobrancas cadastradas.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-5 py-3">Descricao</th>
                <th className="px-5 py-3">Aluno</th>
                <th className="px-5 py-3">Valor</th>
                <th className="px-5 py-3">Vencimento</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((pay) => (
                <tr key={pay.id} className="border-t border-slate-100">
                  <td className="px-5 py-3 text-slate-700">{pay.description || 'Mensalidade'}</td>
                  <td className="px-5 py-3 text-slate-600">{studentNameById[pay.student_id] || '-'}</td>
                  <td className="px-5 py-3 text-slate-700">{formatCurrency(pay.amount)}</td>
                  <td className="px-5 py-3 text-slate-600">{formatDate(pay.due_date)}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${pay.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {pay.status === 'paid' ? 'Pago' : 'Pendente'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      {pay.status === 'pending' ? (
                        <button type="button" className="btn-secondary py-2 text-xs" onClick={() => markPaid(pay.id)}>Marcar pago</button>
                      ) : null}
                      <button type="button" className="btn-secondary py-2 text-xs" onClick={() => deletePayment(pay.id)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
              {payments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-14 text-center">
                    <div className="mx-auto max-w-sm space-y-2">
                      <FileText size={28} className="mx-auto text-slate-300" />
                      <p className="text-sm font-medium text-slate-600">Nenhuma cobranca registrada ainda.</p>
                      <p className="text-sm text-slate-500">Use o card de Nova cobranca para criar a primeira transacao.</p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
