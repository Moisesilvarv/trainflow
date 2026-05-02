import { motion } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

export function StatCard({ title, value, subtitle, icon: Icon, deltaText = '', deltaTone = 'neutral' }) {
  const deltaClass =
    deltaTone === 'positive'
      ? 'bg-emerald-50 text-emerald-700'
      : deltaTone === 'negative'
        ? 'bg-rose-50 text-rose-700'
        : 'bg-slate-100 text-slate-600';

  const DeltaIcon = deltaTone === 'positive' ? ArrowUpRight : deltaTone === 'negative' ? ArrowDownRight : Minus;

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <h3 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</h3>
          {subtitle ? <p className="mt-2 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        {Icon ? (
          <span className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
            <Icon size={18} />
          </span>
        ) : null}
      </div>

      {deltaText ? (
        <div className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${deltaClass}`}>
          <DeltaIcon size={12} />
          {deltaText}
        </div>
      ) : null}
    </motion.article>
  );
}
