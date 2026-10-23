'use client';
import React, { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CountUp, GrowBar } from '@/components/CountUp';
import { dk, download, money, toCsv } from '@/lib/rules';

/** Building blocks for the Reports screen (soft swatch theme). */
export const short = (n: number) => (n >= 1e7 ? (n / 1e7).toFixed(2) + ' Cr' : n >= 1e5 ? (n / 1e5).toFixed(1) + ' L' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(Math.round(n)));
export const TONE = {
  sage: 'bg-sage-bg text-sage-fg', butter: 'bg-butter-bg text-butter-fg', blush: 'bg-blush-bg text-blush-fg', sky: 'bg-sky-bg text-sky-fg', lilac: 'bg-lilac-bg text-lilac-fg', paper: 'bg-paper text-steel',
};
export type Tone = keyof typeof TONE;
const BAR = ['#1F6F68', '#7FB5A6', '#E3B04B', '#8FB4D6', '#A99BDD', '#D9705F'];

export const pctDelta = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null);

export function Kpi({ label, value, kind = 'money', sub, tone = 'sage', delta }: { label: string; value: number; kind?: 'money' | 'num' | 'pct'; sub?: string; tone?: Tone; delta?: number | null }) {
  const fmt = kind === 'money' ? (n: number) => (n >= 1e7 ? '₹' + (n / 1e7).toFixed(2) + ' Cr' : '₹' + Math.round(n).toLocaleString('en-IN')) : kind === 'pct' ? (n: number) => Math.round(n) + '%' : undefined;
  return (
    <div className={`rounded-[20px] p-4 ${TONE[tone]}`}>
      <div className="text-sm font-medium opacity-80">{label}</div>
      <div className="font-display text-[34px] font-semibold leading-tight"><CountUp value={value} duration={900} format={fmt} /></div>
      {delta != null && <div className="text-xs opacity-80">{delta === 0 ? 'Same as the period before' : `${Math.abs(delta)}% ${delta > 0 ? 'more' : 'less'} than the period before`}</div>}
      {sub && <div className="text-xs opacity-80">{sub}</div>}
    </div>
  );
}
export function Panel({ title, sub, action, children, className = '' }: { title: string; sub?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[22px] border border-line bg-white p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-display text-xl font-semibold leading-6">{title}</h2>{sub && <p className="text-sm text-steel">{sub}</p>}</div>{action}</div>
      {children}
    </section>
  );
}
/** Horizontal bars, largest first. Each bar grows in once. */
export function BarList({ rows, fmt = money, empty = 'Nothing in this period', limit = 8 }: { rows: { label: string; value: number; sub?: string }[]; fmt?: (n: number) => string; empty?: string; limit?: number }) {
  const list = rows.slice(0, limit); const max = Math.max(...list.map((r) => r.value), 1);
  if (!list.length) return <p className="py-6 text-center text-sm text-steel">{empty}</p>;
  return (
    <ol className="space-y-3.5">{list.map((r, i) => (
      <li key={r.label}>
        <div className="flex items-baseline justify-between gap-3 text-sm"><span className="min-w-0 truncate font-medium">{r.label}{r.sub && <span className="ml-2 text-xs font-normal text-steel">{r.sub}</span>}</span><span className="shrink-0 tabular-nums">{fmt(r.value)}</span></div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-paper"><GrowBar pct={(r.value / max) * 100} color={BAR[i % BAR.length]} delay={i * 50} /></div>
      </li>))}
    </ol>
  );
}
export function Trend({ data, name = 'Net sales' }: { data: { label: string; v: number }[]; name?: string }) {
  return (
    <div className="h-64" role="img" aria-label={`${name} over time`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 5" vertical={false} stroke="#E1E8E5" />
          <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} stroke="#5E7077" minTickGap={24} />
          <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={short} stroke="#5E7077" width={48} />
          <Tooltip formatter={(v: number) => money(v)} contentStyle={{ borderRadius: 12, border: '1px solid #E1E8E5', fontSize: 13 }} />
          <Area type="monotone" dataKey="v" name={name} stroke="#1F6F68" strokeWidth={2.75} fill="#1F6F68" fillOpacity={0.1} animationDuration={1000} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
/** Date range with quick choices. */
export function RangeBar({ from, to, set }: { from: string; to: string; set: (a: string, b: string) => void }) {
  const now = new Date(); const t = dk(now); const ago = (n: number) => dk(new Date(now.getTime() - n * 86400000));
  const som = t.slice(0, 8) + '01'; const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1); const lme = new Date(now.getFullYear(), now.getMonth(), 0);
  const fy = (now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1) + '-04-01';
  const presets: [string, string, string][] = [['Today', t, t], ['7 days', ago(6), t], ['30 days', ago(29), t], ['This month', som, t], ['Last month', dk(lm), dk(lme)], ['This year', fy, t]];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1.5 text-sm">{presets.map(([l, a, b]) => <button key={l} onClick={() => set(a, b)} className={`rounded-full px-3.5 py-1.5 font-medium transition ${from === a && to === b ? 'bg-brand text-white' : 'border border-line bg-white text-steel hover:text-ink'}`}>{l}</button>)}</div>
      <div className="flex items-center gap-1.5 text-sm text-steel"><input type="date" aria-label="From" max={to} value={from} onChange={(e) => e.target.value && set(e.target.value, to)} className="!rounded-xl" />to<input type="date" aria-label="To" min={from} value={to} onChange={(e) => e.target.value && set(from, e.target.value)} className="!rounded-xl" /></div>
    </div>
  );
}
export interface TCol<T> { h: string; v: (r: T) => React.ReactNode; csv?: (r: T) => string | number; right?: boolean }
/** Detail table: optional search, shows rows in steps, exports every row as CSV. */
export function Table<T>({ cols, rows, csv, search, pageSize = 12, empty = 'Nothing in this period', toolbar }: { cols: TCol<T>[]; rows: T[]; csv: string; search?: (r: T, q: string) => boolean; pageSize?: number; empty?: string; toolbar?: React.ReactNode }) {
  const [q, setQ] = useState(''); const [n, setN] = useState(pageSize);
  const list = useMemo(() => (q && search ? rows.filter((r) => search(r, q.toLowerCase())) : rows), [rows, q, search]);
  const exp = () => download(csv + '.csv', toCsv([cols.map((c) => c.h), ...list.map((r) => cols.map((c) => { if (c.csv) return c.csv(r); const x = c.v(r); return typeof x === 'string' || typeof x === 'number' ? x : ''; }))]));
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {search && <div className="relative"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" /><input value={q} onChange={(e) => { setQ(e.target.value); setN(pageSize); }} placeholder="Search" className="!rounded-xl !py-2 !pl-10" /></div>}
        {toolbar}
        <button onClick={exp} disabled={!list.length} className="ml-auto flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2 text-sm font-medium hover:bg-paper disabled:opacity-40"><Download className="h-4 w-4" />Export CSV</button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-paper text-left text-xs text-steel"><tr>{cols.map((c) => <th key={c.h} className={`whitespace-nowrap px-3.5 py-2.5 font-medium ${c.right ? 'text-right' : ''}`}>{c.h}</th>)}</tr></thead>
          <tbody>{list.slice(0, n).map((r, i) => <tr key={i} className="border-t border-line hover:bg-paper/60">{cols.map((c) => <td key={c.h} className={`px-3.5 py-2.5 ${c.right ? 'text-right tabular-nums' : ''}`}>{c.v(r)}</td>)}</tr>)}
            {!list.length && <tr><td colSpan={cols.length} className="px-3 py-10 text-center text-steel">{empty}</td></tr>}</tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center justify-between px-1 text-xs text-steel"><span>Showing {Math.min(n, list.length)} of {list.length.toLocaleString('en-IN')}</span>{list.length > n && <button onClick={() => setN(n + pageSize * 2)} className="rounded-lg bg-white px-3 py-1.5 font-medium text-ink hover:bg-paper">Show more</button>}</div>
    </div>
  );
}
export const Pill = ({ tone, children }: { tone: Tone; children: React.ReactNode }) => <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[tone]}`}>{children}</span>;