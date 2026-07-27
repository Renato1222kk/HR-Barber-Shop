'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency, formatCurrencyShort } from '@/lib/utils/format';

// Paleta clara: traco em grafite, eixos em cinza e grade bem discreta.
const LINE = '#111827';
const AXIS = '#6b7280';
const GRID = '#e5e7eb';

const tooltipStyle = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  boxShadow: '0 8px 28px -12px rgba(17, 24, 39, 0.18)',
  fontSize: 12,
  color: '#111827',
};

const tooltipLabelStyle = { color: '#6b7280' };
const tooltipItemStyle = { color: '#111827' };

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
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={LINE} stopOpacity={0.14} />
            <stop offset="100%" stopColor={LINE} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
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
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          formatter={(v: number) => [formatCurrency(v), 'Faturamento']}
          cursor={{ stroke: '#d1d5db' }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={LINE}
          strokeWidth={2}
          fill="url(#revenueFill)"
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
          tick={{ fill: '#374151', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={110}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          cursor={{ fill: 'rgba(17, 24, 39, 0.04)' }}
          formatter={(v: number) => [v, 'Qtd']}
        />
        <Bar dataKey="value" radius={[0, 8, 8, 0]} fill={LINE} barSize={20} />
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
      <div className="flex h-[220px] items-center justify-center text-sm text-ink-500">
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
          stroke="#ffffff"
          strokeWidth={2}
        >
          {filtered.map((d) => (
            <Cell key={d.label} fill={d.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          formatter={(v: number, n) => [v, n]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
