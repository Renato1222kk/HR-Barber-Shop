'use client';

import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from '@/lib/utils/format';
import type { DayBucket } from '@/lib/data/finance';

/**
 * Marca do eixo Y: numero curto, sem "R$".
 *
 * O simbolo da moeda ocuparia metade da largura util do eixo no celular e
 * a marca acabaria cortada — o valor exato aparece no tooltip.
 */
function axisTick(value: number): string {
  if (!value) return '0';
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1).replace('.', ',')}k`;
  return String(Math.round(value));
}

const INK = '#111827';
const INK_SOFT = '#d1d5db';
const AXIS = '#6b7280';
const GRID = '#e5e7eb';
const GREEN = '#16a34a';
const RED = '#dc2626';

const tooltipStyle = {
  background: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: 12,
  boxShadow: '0 8px 28px -12px rgba(17, 24, 39, 0.18)',
  fontSize: 12,
  color: '#111827',
  padding: '8px 10px',
};

/** No celular o eixo so aguenta ~7 marcas: o resto vira tooltip por toque. */
function tickInterval(points: number): number {
  if (points <= 8) return 0;
  return Math.ceil(points / 7) - 1;
}

// O Recharts tipa tooltip de forma generica (valor pode ser string, numero
// ou lista). Recebemos como `unknown` e convertemos aqui — os dados sao
// sempre `DayBucket`.
type BucketPayload = { payload?: DayBucket };

const bucketLabel = (_label: unknown, payload: unknown): string => {
  const list = payload as BucketPayload[] | undefined;
  return list?.[0]?.payload?.label ?? '';
};

interface RevenueChartProps {
  data: DayBucket[];
  /** Chamado ao tocar em uma coluna diaria (baldes semanais não abrem detalhe). */
  onSelectDay?: (iso: string) => void;
  highlight?: string | null;
}

/**
 * Evolucao do faturamento no periodo.
 *
 * Barras (e nao linha) porque no celular a area de toque de cada coluna e
 * grande: tocar abre o detalhe daquele dia.
 */
export function RevenueChart({ data, onSelectDay, highlight }: RevenueChartProps) {
  const interval = useMemo(() => tickInterval(data.length), [data.length]);
  const clickable = Boolean(onSelectDay) && data.every((d) => d.days === 1);

  const handleClick = (state: { activeTooltipIndex?: number }) => {
    if (!clickable || state?.activeTooltipIndex == null) return;
    const bucket = data[state.activeTooltipIndex];
    if (bucket) onSelectDay?.(bucket.iso);
  };

  return (
    <ResponsiveContainer width="100%" height={216}>
      <BarChart
        data={data}
        margin={{ top: 8, right: 14, left: -8, bottom: 0 }}
        onClick={handleClick}
        barCategoryGap="18%"
      >
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="shortLabel"
          tick={{ fill: AXIS, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval={interval}
          minTickGap={4}
        />
        <YAxis
          tick={{ fill: AXIS, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={42}
          tickFormatter={axisTick}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: 'rgba(17, 24, 39, 0.05)' }}
          labelFormatter={bucketLabel}
          formatter={(value: unknown, _name: unknown, item: unknown) => {
            const bucket = (item as BucketPayload | undefined)?.payload;
            return [
              `${formatCurrency(Number(value))} · ${bucket?.count ?? 0} atend.`,
              'Faturamento',
            ] as [string, string];
          }}
        />
        <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={44}>
          {data.map((d) => (
            <Cell
              key={d.iso}
              fill={highlight && highlight !== d.iso ? INK_SOFT : INK}
              cursor={clickable ? 'pointer' : 'default'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Receitas x despesas lado a lado, na mesma granularidade do periodo. */
export function IncomeExpenseChart({ data }: { data: DayBucket[] }) {
  const interval = useMemo(() => tickInterval(data.length), [data.length]);
  const chartData = data.map((d) => ({
    ...d,
    income: d.revenue + d.extraIncome,
  }));

  return (
    <ResponsiveContainer width="100%" height={216}>
      <BarChart data={chartData} margin={{ top: 8, right: 14, left: -8, bottom: 0 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="shortLabel"
          tick={{ fill: AXIS, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval={interval}
          minTickGap={4}
        />
        <YAxis
          tick={{ fill: AXIS, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={42}
          tickFormatter={axisTick}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: 'rgba(17, 24, 39, 0.05)' }}
          labelFormatter={bucketLabel}
          formatter={(value: unknown, name: unknown) =>
            [formatCurrency(Number(value)), name === 'income' ? 'Receitas' : 'Despesas'] as [
              string,
              string,
            ]
          }
        />
        <Legend
          verticalAlign="top"
          height={28}
          iconType="circle"
          iconSize={8}
          formatter={(name: string) => (
            <span style={{ color: AXIS, fontSize: 11 }}>
              {name === 'income' ? 'Receitas' : 'Despesas'}
            </span>
          )}
        />
        <Bar dataKey="income" fill={GREEN} radius={[6, 6, 0, 0]} maxBarSize={26} />
        <Bar dataKey="expense" fill={RED} radius={[6, 6, 0, 0]} maxBarSize={26} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Mini grafico do card de faturamento. SVG puro: e pequeno demais para
 * justificar eixos, tooltip ou biblioteca.
 */
export function Sparkline({
  values,
  className,
}: {
  values: number[];
  className?: string;
}) {
  if (values.length < 2) return null;
  const width = 100;
  const height = 32;
  const max = Math.max(...values, 1);
  const step = width / (values.length - 1);
  const points = values.map((v, i) => [i * step, height - (v / max) * (height - 4) - 2]);
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `0,${height} ${line} ${width},${height}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <polygon points={area} fill="rgba(255,255,255,0.16)" />
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
