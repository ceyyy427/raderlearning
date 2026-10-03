// Dependency-free SVG charts for the admin dashboards: multi-series lines and stacked bars, with a
// hover readout. Colors come from the theme tokens so both themes work.
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { num } from "./format";
import { useEntrance } from "../../lib/hydration";

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
  /** null where the day has no figure: the line breaks there instead of dropping to zero. */
  values: Array<number | null>;
  dashed?: boolean;
}

const W = 720;
const PAD = { top: 12, right: 12, bottom: 22, left: 40 };

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

function Legend({ series }: { series: Array<{ key: string; label: string; color: string; dashed?: boolean }> }) {
  return (
    <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-3">
      {series.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5">
          <span className="inline-block h-[3px] w-3.5 rounded-full" style={{ background: s.color, opacity: s.dashed ? 0.6 : 1 }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

export function LineChart({ labels, series, height = 200, format = (v: number) => num(v) }: { labels: string[]; series: ChartSeries[]; height?: number; format?: (v: number) => string }) {
  const entrance = useEntrance();
  const [hover, setHover] = useState<number | null>(null);
  const max = useMemo(() => niceMax(Math.max(0, ...series.flatMap((s) => s.values.filter((v): v is number => v !== null)))), [series]);
  const n = labels.length;
  const iw = W - PAD.left - PAD.right;
  const ih = height - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => PAD.top + ih - (v / max) * ih;
  if (!n) return <div className="py-10 text-center text-[13px] text-ink-4">暂无数据</div>;
  const ticks = [0, 0.5, 1].map((t) => t * max);
  const step = Math.max(1, Math.ceil(n / 8));
  return (
    <div>
      <Legend series={series} />
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${height}`}
          className="w-full select-none"
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
            const px = ((e.clientX - r.left) / r.width) * W;
            setHover(Math.max(0, Math.min(n - 1, Math.round(((px - PAD.left) / iw) * (n - 1)))));
          }}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--line)" />
              <text x={PAD.left - 6} y={y(t) + 3.5} textAnchor="end" className="fill-[var(--ink-4)] text-[10px]">{format(t)}</text>
            </g>
          ))}
          {labels.map((l, i) => (i % step === 0 || i === n - 1 ? <text key={l + i} x={x(i)} y={height - 6} textAnchor="middle" className="fill-[var(--ink-4)] text-[10px]">{l}</text> : null))}
          {series.map((s) => {
            const d = s.values.map((v, i) => (v === null ? "" : `${i && s.values[i - 1] !== null ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)).join("");
            return (
              <motion.path
                key={s.key}
                d={d}
                fill="none"
                stroke={s.color}
                strokeWidth={s.dashed ? 1.4 : 2}
                strokeDasharray={s.dashed ? "4 4" : undefined}
                strokeLinejoin="round"
                strokeLinecap="round"
                initial={entrance ? { pathLength: 0, opacity: 0 } : false}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
              />
            );
          })}
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + ih} stroke="var(--line-strong)" />
              {series.map((s) => {
                const v = s.values[hover];
                return v === null || v === undefined ? null : <circle key={s.key} cx={x(hover)} cy={y(v)} r={3.2} fill="var(--surface)" stroke={s.color} strokeWidth={2} />;
              })}
            </g>
          )}
        </svg>
        {hover !== null && (
          <div
            className="pointer-events-none absolute top-1 z-10 min-w-[120px] rounded-control bg-raised px-3 py-2 text-[12px] shadow-lg ring-1 ring-line-strong"
            style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > n / 2 ? "-105%" : "5%"})` }}
          >
            <div className="mb-1 font-medium text-ink">{labels[hover]}</div>
            {series.map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-3 text-ink-2">
                <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: s.color }} />{s.label}</span>
                <span className="num">{s.values[hover] === null || s.values[hover] === undefined ? "—" : format(s.values[hover]!)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function StackedBars({ labels, series, height = 180, format = num }: { labels: string[]; series: ChartSeries[]; height?: number; format?: (v: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  const totals = labels.map((_, i) => series.reduce((a, s) => a + (s.values[i] ?? 0), 0));
  const max = niceMax(Math.max(0, ...totals));
  const n = labels.length;
  const iw = W - PAD.left - PAD.right;
  const ih = height - PAD.top - PAD.bottom;
  const bw = Math.max(2, (iw / Math.max(1, n)) * 0.7);
  const x = (i: number) => PAD.left + (i + 0.5) * (iw / Math.max(1, n));
  const h = (v: number) => (v / max) * ih;
  if (!n) return <div className="py-10 text-center text-[13px] text-ink-4">暂无数据</div>;
  const step = Math.max(1, Math.ceil(n / 8));
  return (
    <div>
      <Legend series={series} />
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${height}`} className="w-full select-none" onMouseLeave={() => setHover(null)}>
          {[0, 0.5, 1].map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + ih - t * ih} y2={PAD.top + ih - t * ih} stroke="var(--line)" />
              <text x={PAD.left - 6} y={PAD.top + ih - t * ih + 3.5} textAnchor="end" className="fill-[var(--ink-4)] text-[10px]">{format(t * max)}</text>
            </g>
          ))}
          {labels.map((l, i) => {
            let acc = 0;
            return (
              <g key={l + i} onMouseEnter={() => setHover(i)} opacity={hover === null || hover === i ? 1 : 0.55}>
                <rect x={x(i) - (iw / n) / 2} y={PAD.top} width={iw / n} height={ih} fill="transparent" />
                {series.map((s) => {
                  const v = s.values[i] ?? 0;
                  const top = PAD.top + ih - h(acc + v);
                  acc += v;
                  return v ? <rect key={s.key} x={x(i) - bw / 2} y={top} width={bw} height={Math.max(0.5, h(v))} rx={1.5} fill={s.color} /> : null;
                })}
                {(i % step === 0 || i === n - 1) && <text x={x(i)} y={height - 6} textAnchor="middle" className="fill-[var(--ink-4)] text-[10px]">{l}</text>}
              </g>
            );
          })}
        </svg>
        {hover !== null && (
          <div
            className="pointer-events-none absolute top-1 z-10 min-w-[130px] rounded-control bg-raised px-3 py-2 text-[12px] shadow-lg ring-1 ring-line-strong"
            style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > n / 2 ? "-105%" : "5%"})` }}
          >
            <div className="mb-1 font-medium text-ink">{labels[hover]} · {format(totals[hover] ?? 0)}</div>
            {series.filter((s) => s.values[hover]).map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-3 text-ink-2">
                <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: s.color }} />{s.label}</span>
                <span className="num">{s.values[hover] === null || s.values[hover] === undefined ? "—" : format(s.values[hover]!)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Horizontal share bars for small breakdowns. */
export function ShareBars({ rows, total }: { rows: Array<{ label: string; value: number }>; total?: number }) {
  const sum = total ?? rows.reduce((a, r) => a + r.value, 0);
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="text-[12.5px]">
          <div className="flex justify-between text-ink-2"><span className="truncate">{r.label}</span><span className="num text-ink-3">{num(r.value)}{sum ? ` · ${Math.round((r.value / sum) * 100)}%` : ""}</span></div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg-sunk">
            <div className="h-full rounded-full bg-accent" style={{ width: `${sum ? Math.max(1.5, (r.value / sum) * 100) : 0}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
