import { useEffect, useState } from 'react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../api/client';

const empty = { student_id: '', weight: '', body_fat: '', performance_notes: '', evolution_photo_url: '' };

export function ProgressPage() {
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(empty);

  async function load() {
    const { data } = await api.get('/progress');
    setRecords(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e) {
    e.preventDefault();
    await api.post('/progress', {
      ...form,
      weight: Number(form.weight) || null,
      body_fat: Number(form.body_fat) || null
    });
    setForm(empty);
    load();
  }

  const chartData = [...records]
    .reverse()
    .map((item) => ({ date: item.record_date, weight: Number(item.weight || 0), bodyFat: Number(item.body_fat || 0) }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Evolucao fisica</h1>
        <p className="text-slate-500">Registre metricas e acompanhe progresso com visual claro.</p>
      </div>

      <form className="card grid gap-3 p-5 md:grid-cols-2" onSubmit={submit}>
        <input className="input" placeholder="ID do aluno" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} required />
        <input className="input" placeholder="Peso" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
        <input className="input" placeholder="% Gordura" value={form.body_fat} onChange={(e) => setForm({ ...form, body_fat: e.target.value })} />
        <input className="input" placeholder="Foto evolucao (URL)" value={form.evolution_photo_url} onChange={(e) => setForm({ ...form, evolution_photo_url: e.target.value })} />
        <textarea className="input md:col-span-2" placeholder="Desempenho" value={form.performance_notes} onChange={(e) => setForm({ ...form, performance_notes: e.target.value })} />
        <button className="btn-primary md:col-span-2">Registrar evolucao</button>
      </form>

      <div className="card h-80 p-5">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="date" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip />
            <Line type="monotone" dataKey="weight" stroke="#2563eb" strokeWidth={2} />
            <Line type="monotone" dataKey="bodyFat" stroke="#16a34a" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
