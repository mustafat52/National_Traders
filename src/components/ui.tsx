'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { Search, ScanLine, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Product } from '@/lib/types';
import { download, toCsv } from '@/lib/rules';

export const cx = (...a: (string | false | undefined)[]) => a.filter(Boolean).join(' ');
export const Card = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cx('rounded-xl border border-slate-200 bg-white p-4 shadow-sm', className)}>{children}</div>
);
export function Btn({ variant = 'primary', className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'danger' | 'ghost' }) {
  const v = { primary: 'bg-brand text-white hover:bg-brand/90', outline: 'border border-slate-300 bg-white hover:bg-slate-50', danger: 'bg-red-600 text-white hover:bg-red-700', ghost: 'hover:bg-slate-100' }[variant];
  return <button {...p} className={cx('inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50', v, className)} />;
}
export const Badge = ({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'slate' | 'green' | 'red' | 'amber' | 'blue' }) => {
  const t = { slate: 'bg-slate-100 text-slate-700', green: 'bg-emerald-100 text-emerald-700', red: 'bg-red-100 text-red-700', amber: 'bg-amber-100 text-amber-800', blue: 'bg-sky-100 text-sky-700' }[tone];
  return <span className={cx('inline-block rounded-full px-2 py-0.5 text-xs font-medium', t)}>{children}</span>;
};
export const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>{children}</label>
);
export const PageTitle = ({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) => (
  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
    <div><h1 className="text-2xl font-bold text-brand">{title}</h1>{sub && <p className="text-sm text-slate-500">{sub}</p>}</div>
    <div className="flex gap-2">{children}</div>
  </div>
);
export const Stat = ({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) => (
  <Card><div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 text-2xl font-bold text-brand">{value}</div>{sub && <div className="text-xs text-slate-500">{sub}</div>}</Card>
);

export interface Col<T> { h: string; v: (r: T) => React.ReactNode; csv?: (r: T) => string | number; right?: boolean }
export function DataTable<T>({ cols, rows = [], csv, pageSize = 25, empty = 'No records' }: { cols: Col<T>[]; rows: T[]; csv?: string; pageSize?: number; empty?: string }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const cur = Math.min(page, pages - 1);
  const slice = rows.slice(cur * pageSize, cur * pageSize + pageSize);
  const exportCsv = () => download(csv + '.csv', toCsv([cols.map((c) => c.h), ...rows.map((r) => cols.map((c) => { if (c.csv) return c.csv(r); const x = c.v(r); return typeof x === 'string' || typeof x === 'number' ? x : ''; }))]));
  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-brand-soft text-left text-xs uppercase text-slate-600"><tr>{cols.map((c) => <th key={c.h} className={cx('whitespace-nowrap px-3 py-2 font-semibold', c.right && 'text-right')}>{c.h}</th>)}</tr></thead>
          <tbody>
            {slice.map((r, i) => <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">{cols.map((c) => <td key={c.h} className={cx('px-3 py-2', c.right && 'text-right tabular-nums')}>{c.v(r)}</td>)}</tr>)}
            {!slice.length && <tr><td colSpan={cols.length} className="px-3 py-8 text-center text-slate-400">{empty}</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>{rows.length.toLocaleString('en-IN')} records</span>
        <div className="flex items-center gap-2">
          {csv && <Btn variant="outline" className="!px-2 !py-1 text-xs" onClick={exportCsv}>Export CSV</Btn>}
          <Btn variant="outline" className="!px-2 !py-1 text-xs" disabled={cur === 0} onClick={() => setPage(cur - 1)}>Prev</Btn>
          <span>Page {cur + 1} / {pages}</span>
          <Btn variant="outline" className="!px-2 !py-1 text-xs" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Next</Btn>
        </div>
      </div>
    </div>
  );
}

export function ProductPicker({ onPick, placeholder = 'Search product name or SKU…', onScan }: { onPick: (p: Product) => void; placeholder?: string; onScan?: () => void }) {
  const products = useStore((s) => s.products);
  const [q, setQ] = useState('');
  const res = useMemo(() => {
    const t = q.trim().toLowerCase(); if (t.length < 2) return [];
    const out: Product[] = [];
    for (const p of products) { if (p.name.toLowerCase().includes(t) || p.sku.toLowerCase().includes(t)) { out.push(p); if (out.length >= 8) break; } }
    return out;
  }, [q, products]);
  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input className="w-full !pl-9" placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} /></div>
        {onScan && <Btn variant="outline" onClick={onScan}><ScanLine className="h-4 w-4" />Scan</Btn>}
      </div>
      {res.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {res.map((p) => <button key={p.id} className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-brand-soft" onClick={() => { onPick(p); setQ(''); }}>
            <div className="font-medium">{p.name}</div><div className="text-xs text-slate-500">{p.sku} · {p.cat}</div></button>)}
        </div>
      )}
    </div>
  );
}

export function Scanner({ onScan, onClose }: { onScan: (text: string) => void; onClose: () => void }) {
  const [err, setErr] = useState('');
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sc: any; let done = false;
    (async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        sc = new Html5Qrcode('qr-reader');
        await sc.start({ facingMode: 'environment' }, { fps: 10, qrbox: 220 }, (t: string) => { if (!done) { done = true; onScan(t); } }, () => {});
      } catch { setErr('Camera not available here (needs HTTPS and camera permission). Use search or "Demo scan" instead.'); }
    })();
    return () => { try { sc?.stop().then(() => sc.clear()).catch(() => {}); } catch { /* ignore */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-4">
        <div className="mb-2 flex items-center justify-between"><b>Scan product QR</b><button onClick={onClose}><X className="h-5 w-5" /></button></div>
        <div id="qr-reader" className="overflow-hidden rounded-lg" />
        {err && <p className="mt-2 text-sm text-amber-700">{err}</p>}
      </div>
    </div>
  );
}
