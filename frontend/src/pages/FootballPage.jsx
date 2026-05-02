import { useEffect, useState } from 'react';
import api from '../api/client';

const empty = {
  student_id: '',
  pass_score: 0,
  finishing_score: 0,
  speed_score: 0,
  endurance_score: 0,
  positioning_score: 0,
  decision_making_score: 0,
  psychological_score: 0,
  notes: ''
};

const fields = [
  { key: 'pass_score', label: 'Passe' },
  { key: 'finishing_score', label: 'Finalizacao' },
  { key: 'speed_score', label: 'Velocidade' },
  { key: 'endurance_score', label: 'Resistencia' },
  { key: 'positioning_score', label: 'Posicionamento' },
  { key: 'decision_making_score', label: 'Tomada de decisao' },
  { key: 'psychological_score', label: 'Aspectos psicologicos' }
];

export function FootballPage() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(empty);

  async function load() {
    const { data } = await api.get('/football/assessments');
    setList(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e) {
    e.preventDefault();
    await api.post('/football/assessments', {
      ...form,
      pass_score: Number(form.pass_score),
      finishing_score: Number(form.finishing_score),
      speed_score: Number(form.speed_score),
      endurance_score: Number(form.endurance_score),
      positioning_score: Number(form.positioning_score),
      decision_making_score: Number(form.decision_making_score),
      psychological_score: Number(form.psychological_score),
      training_focus: {
        technical: true,
        tactical: true,
        physical: true,
        psychological: true
      }
    });
    setForm(empty);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Modulo Futebol</h1>
        <p className="text-slate-500">Avaliacao tecnica, tatica, fisica e psicologica com visao profissional.</p>
      </div>

      <form className="card grid gap-3 p-5 md:grid-cols-2 lg:grid-cols-4" onSubmit={submit}>
        <input className="input lg:col-span-4" placeholder="ID do atleta" value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} />
        {fields.map((f) => (
          <input key={f.key} className="input" placeholder={f.label} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
        ))}
        <textarea className="input lg:col-span-4" placeholder="Observacoes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button className="btn-primary lg:col-span-4">Salvar avaliacao</button>
      </form>

      <div className="grid gap-4">
        {list.map((item) => (
          <article key={item.id} className="card p-5">
            <h3 className="text-lg font-semibold">Avaliacao {item.assessment_date}</h3>
            <p className="mt-2 text-sm text-slate-600">Passe: {item.pass_score} | Finalizacao: {item.finishing_score} | Velocidade: {item.speed_score}</p>
            <p className="mt-1 text-sm text-slate-600">Resistencia: {item.endurance_score} | Posicionamento: {item.positioning_score} | Decisao: {item.decision_making_score}</p>
          </article>
        ))}
        {list.length === 0 ? <p className="text-slate-400">Nenhuma avaliacao registrada.</p> : null}
      </div>
    </div>
  );
}
