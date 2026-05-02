import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3 } from 'lucide-react';

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value) || 0);
}

export function RevenueChart({ data = [] }) {
  const validData = Array.isArray(data)
    ? data.map((item) => ({ month: item.month, value: Number(item.value) || 0 }))
    : [];

  const hasRevenue = validData.some((item) => item.value > 0);

  return (
    <div className="card h-80 p-5">
      <h3 className="text-lg font-semibold text-slate-900">Faturamento mensal</h3>
      <p className="mt-1 text-sm text-slate-500">Evolucao de receita recebida nos ultimos meses.</p>

      {!validData.length || !hasRevenue ? (
        <div className="mt-4 flex h-[78%] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 text-center">
          <BarChart3 size={24} className="mb-2 text-slate-400" />
          <p className="text-sm font-medium text-slate-600">Sem receita registrada ainda.</p>
          <p className="mt-1 text-xs text-slate-500">Quando os primeiros pagamentos forem concluídos, o gráfico aparece aqui.</p>
        </div>
      ) : (
        <div className="mt-3 h-[82%]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={validData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" stroke="#64748b" tickLine={false} axisLine={false} />
              <YAxis
                stroke="#64748b"
                tickLine={false}
                axisLine={false}
                width={58}
                tickFormatter={(value) => `R$ ${Number(value).toFixed(0)}`}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(value), 'Faturamento']}
                labelFormatter={(label) => `Mes: ${label}`}
                contentStyle={{ borderRadius: 12, borderColor: '#cbd5e1' }}
              />
              <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} maxBarSize={42} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
