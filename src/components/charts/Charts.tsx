'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency, formatCurrencyShort } from '@/lib/utils/format';

const GOLD = '#c9a24b';
const AXIS = '#52525b';
const GRID = '#26262b';

const tooltipStyle = {
  background: '#17171a',
  border: '1px solid #33333a',
  borderRadius: 12,
  fontSize: 12,
  color: '#fff',
};

// Faturamento por dia (area)
export function RevenueAreaChart({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GOLD} stopOpacity={0.45} />
            <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fill: AXIS, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => formatCurrencyShort(v)}
          width={56}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v: number) => [formatCurrency(v), 'Faturamento']}
          cursor={{ stroke: GRID }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={GOLD}
          strokeWidth={2}
          fill="url(#goldFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// Servicos mais vendidos (barras horizontais)
export function ServicesBarChart({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 46)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fill: '#a1a1aa', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={110}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: 'rgba(201,162,75,0.08)' }}
          formatter={(v: number) => [v, 'Qtd']}
        />
        <Bar dataKey="value" radius={[0, 8, 8, 0]} fill={GOLD} barSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Distribuicao de status (pizza/donut)
export function StatusPieChart({
  data,
}: {
  data: { label: string; value: number; color: string }[];
}) {
  const filtered = data.filter((d) => d.value > 0);
  if (!filtered.length) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-zinc-500">
        Sem dados no periodo.
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={filtered}
          dataKey="value"
          nameKey="label"
          innerRadius={52}
          outerRadius={86}
          paddingAngle={2}
          stroke="none"
        >
          {filtered.map((d) => (
            <Cell key={d.label} fill={d.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n) => [v, n]} />
      </PieChart>
    </ResponsiveContainer>
  );
}
