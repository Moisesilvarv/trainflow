import { useEffect, useState } from 'react';
import api from '../api/client';

export function AdminPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api
      .get('/admin/overview')
      .then(({ data }) => setData(data))
      .catch(() => setData(null));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Painel admin</h1>
        <p className="text-slate-500">Usuarios cadastrados, planos e faturamento da plataforma.</p>
      </div>

      {!data ? (
        <article className="card p-5 text-slate-600">Acesso admin necessario para visualizar os dados da plataforma.</article>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <article className="card p-5">
            <p className="text-slate-500">Usuarios</p>
            <h3 className="text-3xl font-bold text-slate-900">{data.totalUsers}</h3>
          </article>

          <article className="card p-5">
            <p className="text-slate-500">Planos</p>
            <p className="mt-2 text-sm text-slate-700">Basico: {data.plans.basic}</p>
            <p className="text-sm text-slate-700">Pro: {data.plans.pro}</p>
            <p className="text-sm text-slate-700">Premium: {data.plans.premium}</p>
          </article>

          <article className="card p-5">
            <p className="text-slate-500">Faturamento</p>
            <h3 className="text-3xl font-bold text-slate-900">R$ {data.platformRevenue}</h3>
          </article>
        </div>
      )}
    </div>
  );
}
