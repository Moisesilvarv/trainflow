import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Users } from 'lucide-react';

export function RetentionChart({ rate = 0, total = 0, active = 0 }) {
  const safeRate = Math.max(0, Math.min(100, Number(rate) || 0));
  const data = [
    { name: 'Retencao', value: safeRate },
    { name: 'Churn', value: Math.max(100 - safeRate, 0) }
  ];

  const hasData = Number(total) > 0;

  return (
    <div className="card h-80 p-5">
      <h3 className="text-lg font-semibold text-slate-900">Retencao de alunos</h3>
      <p className="mt-1 text-sm text-slate-500">Percentual de alunos ativos sobre o total da base.</p>

      {!hasData ? (
        <div className="mt-4 flex h-[78%] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 text-center">
          <Users size={24} className="mb-2 text-slate-400" />
          <p className="text-sm font-medium text-slate-600">Sem base suficiente para retenção.</p>
          <p className="mt-1 text-xs text-slate-500">Cadastre alunos para acompanhar a qualidade da retenção mensal.</p>
        </div>
      ) : (
        <div className="mt-3 grid h-[82%] grid-cols-[1fr_180px] gap-2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={56} outerRadius={84}>
                <Cell fill="#2563eb" />
                <Cell fill="#cbd5e1" />
              </Pie>
              <Tooltip formatter={(value) => [`${Number(value).toFixed(0)}%`, 'Percentual']} />
            </PieChart>
          </ResponsiveContainer>

          <div className="flex flex-col justify-center gap-2 text-sm">
            <div className="rounded-xl bg-blue-50 p-3">
              <p className="text-xs text-blue-700">Retencao</p>
              <p className="text-xl font-bold text-blue-700">{safeRate}%</p>
            </div>
            <div className="rounded-xl bg-slate-100 p-3">
              <p className="text-xs text-slate-600">Ativos</p>
              <p className="text-lg font-semibold text-slate-800">{active}</p>
            </div>
            <div className="rounded-xl bg-slate-100 p-3">
              <p className="text-xs text-slate-600">Base total</p>
              <p className="text-lg font-semibold text-slate-800">{total}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
