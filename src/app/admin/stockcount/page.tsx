'use client';
import { useState } from 'react';
import { useStore, useProductMap } from '@/lib/store';
import { LOCS } from '@/lib/types';
import { fmtDate } from '@/lib/rules';
import { useScreenKeys } from '@/lib/hotkeys';
import { DataGrid } from '@/components/grid/DataGrid';
import { KBtn, ScreenHead } from '@/components/grid/Screen';
import { useProductFilters } from '@/components/grid/ProductFilters';
import { toast } from '@/components/grid/Toast';

const PAGE = 40;
/** Stock Count: correct stock after counting it by hand. Pick the place, type what you counted, give a reason, post. */
export default function StockCount() {
  const adjustStock = useStore((s) => s.adjustStock); const adjustments = useStore((s) => s.adjustments); const pm = useProductMap(); const staff = useStore((s) => s.staff);
  const { list, bar } = useProductFilters();
  const [loc, setLoc] = useState(0); const [counted, setCounted] = useState<Record<string, string>>({}); const [reason, setReason] = useState(''); const [page, setPage] = useState(0); const [err, setErr] = useState('');
  const pages = Math.max(1, Math.ceil(list.length / PAGE)); const cur = Math.min(page, pages - 1); const rows = list.slice(cur * PAGE, cur * PAGE + PAGE);
  const key = (id: string) => `${loc}:${id}`;
  const diffs = Object.entries(counted).filter(([k, v]) => { if (v === '' || !k.startsWith(loc + ':')) return false; const p = pm.get(k.slice(k.indexOf(':') + 1)); return p && +v !== (p.stock[loc] ?? 0); });
  const post = () => {
    if (!diffs.length) return setErr('Nothing to post: type a counted quantity that differs from the system quantity.');
    if (reason.trim().length < 5) { setErr('A reason is required (at least 5 characters), for example "Physical count 30 Oct".'); document.getElementById('sc-reason')?.focus(); return; }
    diffs.forEach(([k, v]) => adjustStock(k.slice(k.indexOf(':') + 1), loc, Math.max(0, Math.round(+v)), reason.trim()));
    setCounted((c) => { const n = { ...c }; diffs.forEach(([k]) => delete n[k]); return n; }); setErr(''); toast(`${diffs.length} ${diffs.length === 1 ? 'correction' : 'corrections'} posted at ${LOCS[loc]}`);
  };
  useScreenKeys([{ key: 'F9', label: 'Post corrections', run: post }, { key: 'Ctrl+S', label: '', run: post, hidden: true },
    { key: 'PgDn', label: '', run: () => setPage(Math.min(pages - 1, cur + 1)), hidden: true, typing: true }, { key: 'PgUp', label: '', run: () => setPage(Math.max(0, cur - 1)), hidden: true, typing: true }]);
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const to = e.key === 'Enter' && !e.ctrlKey ? i + (e.shiftKey ? -1 : 1) : e.key === 'ArrowDown' ? i + 1 : e.key === 'ArrowUp' ? i - 1 : null;
    if (to === null) return; e.preventDefault(); e.stopPropagation();
    const el = document.getElementById(`sc-${to}`) as HTMLInputElement | null; el?.focus(); el?.select();
  };
  return (
    <div>
      <ScreenHead title="Stock Count" hint="The only place stock is corrected. Leave a row empty if the count matches.">
        <select aria-label="Storage place" className="rounded-md border border-line bg-white px-2 py-1.5 text-[13px]" value={loc} onChange={(e) => setLoc(+e.target.value)}>{LOCS.map((l, i) => <option key={l} value={i}>{l}</option>)}</select>
        <KBtn primary k="F9" onClick={post} disabled={!diffs.length}>Post {diffs.length || ''} {diffs.length === 1 ? 'correction' : 'corrections'}</KBtn>
      </ScreenHead>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[13px]"><label className="font-medium" htmlFor="sc-reason">Reason</label><input id="sc-reason" className="!w-96 !rounded-md !px-2.5 !py-1.5" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is the count different? e.g. Physical count 30 Oct" /></div>
      {err && <p className="mb-2 rounded bg-blush-bg px-3 py-1.5 text-[13px] text-blush-fg">{err}</p>}
      {bar}
      <div className="overflow-auto rounded-md border border-line bg-white" style={{ maxHeight: 'calc(100vh - 330px)' }}>
        <table className="w-full border-collapse text-[13px]"><thead className="sticky top-0 z-10 bg-paper text-[11px] uppercase tracking-wide text-steel"><tr><th className="px-2.5 py-1.5 text-left">SKU</th><th className="px-2.5 py-1.5 text-left">Product</th><th className="px-2.5 py-1.5 text-right">In system ({LOCS[loc]})</th><th className="px-2.5 py-1.5 text-right">Counted</th><th className="px-2.5 py-1.5 text-right">Difference</th></tr></thead>
          <tbody>{rows.map((p, i) => { const sys = p.stock[loc] ?? 0; const v = counted[key(p.id)] ?? ''; const d = v === '' ? null : +v - sys; return (
            <tr key={p.id} className="border-t border-line/70"><td className="px-2.5 py-0.5 font-mono text-[12px]">{p.sku}</td><td className="px-2.5 py-0.5">{p.name}</td><td className="px-2.5 py-0.5 text-right tabular-nums">{sys}</td>
              <td className="px-1 py-0.5 text-right"><input id={`sc-${i}`} inputMode="numeric" aria-label={`Counted ${p.name}`} className="!w-24 !rounded !px-2 !py-1 text-right tabular-nums" value={v} onFocus={(e) => e.target.select()} onChange={(e) => { if (/^\d{0,7}$/.test(e.target.value)) setCounted({ ...counted, [key(p.id)]: e.target.value }); }} onKeyDown={(e) => onKey(e, i)} /></td>
              <td className={`px-2.5 py-0.5 text-right tabular-nums ${d ? (d < 0 ? 'font-semibold text-blush-fg' : 'font-semibold text-good') : 'text-steel'}`}>{d === null ? '' : d > 0 ? `+${d}` : d}</td></tr>); })}
            {!rows.length && <tr><td colSpan={5} className="px-3 py-8 text-center text-steel">No products match</td></tr>}</tbody></table>
      </div>
      <p className="mt-1.5 text-[12px] text-steel">Page {cur + 1} of {pages} (PgUp / PgDn). Typed counts are kept while you change page.</p>
      <h2 className="mb-1.5 mt-6 text-[14px] font-semibold">Past corrections</h2>
      <DataGrid csvName="stock-corrections" rows={adjustments} rowKey={(a) => a.id} pageSize={10} primary={false}
        cols={[{ h: 'Date', v: (a) => fmtDate(a.date), csv: (a) => a.date }, { h: 'Product', v: (a) => pm.get(a.pid)?.name ?? a.pid }, { h: 'Place', v: (a) => LOCS[a.loc] ?? '' }, { h: 'From', right: true, v: (a) => a.from }, { h: 'To', right: true, v: (a) => a.to }, { h: 'Reason', v: (a) => a.reason }, { h: 'By', v: (a) => staff.find((s) => s.id === a.by)?.name ?? '' }]} />
    </div>
  );
}
