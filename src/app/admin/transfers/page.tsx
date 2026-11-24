'use client';
import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useStore, useProductMap } from '@/lib/store';
import { LOCS } from '@/lib/types';
import { fmtDate } from '@/lib/rules';
import { useScreenKeys } from '@/lib/hotkeys';
import { Combobox } from '@/components/grid/Combobox';
import { DataGrid } from '@/components/grid/DataGrid';
import { KBtn, ScreenHead } from '@/components/grid/Screen';
import { Field, Panel } from '@/components/grid/Panel';
import { toast } from '@/components/grid/Toast';
import { errText } from '@/components/StaffBits';

interface Line { pid: string; qty: number }
const th = 'px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-steel';
const sel = 'rounded-md border border-line bg-white px-2 py-1 text-[13px]';

/** Stock Transfer: one voucher moves many items from one place to another. */
export default function Transfers() {
  const { transfer, transfers, staff, products } = useStore(); const pm = useProductMap();
  const [from, setFrom] = useState(1); const [to, setTo] = useState(0); const [lines, setLines] = useState<Line[]>([]); const [err, setErr] = useState('');
  const opts = useMemo(() => products.map((p) => ({ id: p.id, label: p.name, sub: `${p.sku} · ${p.stock[from] ?? 0} here`, keys: `${p.sku} ${p.alias ?? ''}` })), [products, from]);
  const add = (pid: string, qty = 1) => { setLines((l) => (l.some((x) => x.pid === pid) ? l.map((x) => (x.pid === pid ? { ...x, qty: x.qty + qty } : x)) : [...l, { pid, qty }])); setErr(''); setTimeout(() => document.getElementById('tr-add')?.focus(), 0); };
  useEffect(() => { const id = new URLSearchParams(window.location.search).get('product'); const p = id ? useStore.getState().products.find((y) => y.id === id) : null; if (p) { const best = p.stock.indexOf(Math.max(...p.stock)); setFrom(best); setTo(best === 0 ? 1 : 0); setLines([{ pid: p.id, qty: Math.min(1, p.stock[best]) || 1 }]); } }, []);
  const avail = (pid: string) => pm.get(pid)?.stock[from] ?? 0;
  const bad = (l: Line) => l.qty < 1 || l.qty > avail(l.pid);
  const problem = from === to ? 'From and To must be different places' : !lines.length ? 'Add at least one item' : lines.some(bad) ? 'Some quantities are zero or more than is available' : '';
  const save = () => {
    if (problem) { setErr(problem); return; }
    try { lines.forEach((l) => transfer(l.pid, from, to, l.qty)); toast(`${lines.length} ${lines.length === 1 ? 'item' : 'items'} moved from ${LOCS[from]} to ${LOCS[to]}`); setLines([]); setErr(''); }
    catch (e) { setErr(errText(e)); }
  };
  useScreenKeys([{ key: 'F2', label: 'Save transfer', run: save }, { key: 'Ctrl+S', label: '', run: save, hidden: true }, { key: 'Esc', label: 'Clear', run: () => { setLines([]); setErr(''); }, hidden: true, typing: true }]);
  const total = lines.reduce((a, l) => a + l.qty, 0);
  return (
    <div className="max-w-5xl">
      <ScreenHead title="Stock Transfer" hint="Move stock between the shop and the godowns. Nothing changes until you save.">
        <KBtn primary k="F2" onClick={save} disabled={!lines.length}>Save transfer</KBtn>
      </ScreenHead>
      <Panel title="Transfer" hint={`${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`}>
        <Field label="From"><select aria-label="From" className={sel} value={from} onChange={(e) => { const v = +e.target.value; setFrom(v); if (to === v) setTo(v === 0 ? 1 : 0); setErr(''); }}>{LOCS.map((l, i) => <option key={l} value={i}>{l}</option>)}</select></Field>
        <Field label="To"><select aria-label="To" className={sel} value={to} onChange={(e) => { setTo(+e.target.value); setErr(''); }}>{LOCS.map((l, i) => <option key={l} value={i} disabled={i === from}>{l}</option>)}</select></Field>
      </Panel>
      <div className="mt-3 overflow-x-auto rounded-md border border-line bg-white">
        <table className="w-full min-w-[600px] border-collapse text-[13px]">
          <thead className="bg-paper"><tr className="border-b border-line text-left"><th className={th + ' w-10'}>#</th><th className={th}>Item</th><th className={th + ' text-right'}>In {LOCS[from]}</th><th className={th + ' text-right'}>Move</th><th className={th + ' text-right'}>{LOCS[to]} after</th><th className="w-8" /></tr></thead>
          <tbody>
            {lines.map((l, i) => { const p = pm.get(l.pid); const a = avail(l.pid); return (
              <tr key={l.pid} className="border-b border-line/70">
                <td className="px-2.5 py-1 text-center text-steel">{i + 1}</td><td className="px-2.5 py-1">{p?.name ?? l.pid}<span className="ml-2 font-mono text-[11.5px] text-steel">{p?.sku}</span></td>
                <td className="px-2.5 py-1 text-right tabular-nums">{a}</td>
                <td className="px-1 py-0.5 text-right"><input aria-label={`Move ${p?.name}`} inputMode="numeric" className={`!w-20 !rounded !px-2 !py-1 text-right tabular-nums ${bad(l) ? '!border-blush-fg' : ''}`} value={l.qty || ''} onFocus={(e) => e.target.select()} onChange={(e) => { if (/^\d{0,7}$/.test(e.target.value)) setLines(lines.map((x, k) => (k === i ? { ...x, qty: +e.target.value } : x))); setErr(''); }} /></td>
                <td className="px-2.5 py-1 text-right tabular-nums text-steel">{(p?.stock[to] ?? 0) + (bad(l) ? 0 : l.qty)}</td>
                <td className="px-1 text-center"><button aria-label={`Remove ${p?.name}`} onClick={() => setLines(lines.filter((_, k) => k !== i))} className="rounded p-1 text-steel hover:bg-paper hover:text-blush-fg"><Trash2 className="h-4 w-4" /></button></td>
              </tr>); })}
            <tr><td className="px-2.5 py-1 text-center text-steel">{lines.length + 1}</td><td colSpan={5} className="px-2.5 py-1"><Combobox id="tr-add" autoFocus options={opts} placeholder="Type name or SKU, or scan, then Enter" onPick={(o) => add(o.id)} /></td></tr>
          </tbody>
          <tfoot className="border-t-2 border-line bg-paper"><tr><td /><td className="px-2.5 py-1.5 font-semibold">{lines.length} {lines.length === 1 ? 'item' : 'items'}</td><td /><td className="px-2.5 py-1.5 text-right font-bold tabular-nums">{total}</td><td colSpan={2} /></tr></tfoot>
        </table>
      </div>
      {err && <p className="mt-2 rounded bg-blush-bg px-3 py-1.5 text-[13px] text-blush-fg">{err}</p>}

      <h2 className="mb-1.5 mt-6 text-[13px] font-semibold uppercase tracking-wide text-steel">Past transfers</h2>
      <DataGrid csvName="stock-transfers" rows={transfers} rowKey={(t) => t.id} pageSize={12} primary={false} empty="No transfers yet"
        cols={[
          { h: 'Date', v: (t) => fmtDate(t.date), csv: (t) => t.date, sort: (t) => t.date },
          { h: 'Item', v: (t) => pm.get(t.pid)?.name ?? t.pid, csv: (t) => pm.get(t.pid)?.name ?? t.pid },
          { h: 'From', v: (t) => LOCS[t.from], csv: (t) => LOCS[t.from] }, { h: 'To', v: (t) => LOCS[t.to], csv: (t) => LOCS[t.to] },
          { h: 'Qty', right: true, v: (t) => t.qty, csv: (t) => t.qty, sort: (t) => t.qty },
          { h: 'By', v: (t) => staff.find((s) => s.id === t.by)?.name ?? '', csv: (t) => t.by },
        ]} />
    </div>
  );
}