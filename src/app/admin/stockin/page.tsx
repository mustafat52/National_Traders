'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useStore, useProductMap } from '@/lib/store';
import { LOCS, Product, StockIn as StockInRec } from '@/lib/types';
import { fmtDate, money } from '@/lib/rules';
import { vendorBalance } from '@/lib/selectors';
import { useScreenKeys } from '@/lib/hotkeys';
import { Combobox } from '@/components/grid/Combobox';
import { DataGrid } from '@/components/grid/DataGrid';
import { Dialog } from '@/components/grid/Dialog';
import { KBtn, ScreenHead } from '@/components/grid/Screen';
import { toast } from '@/components/grid/Toast';

interface L { pid: string; qty: number[] }
const sel = 'rounded-md border border-line bg-white px-2 py-1.5 text-[13px]';

/** Stock In: the ONLY place stock is added. A delivery voucher: pick the items, type the quantities per place, F9 saves. */
export default function StockIn() {
  const d = useStore(); const { addStockIn, stockIns, vendors, staff } = d; const pm = useProductMap(); const products = d.products;
  const [vendorMode, setVendorMode] = useState(true); const [vendorId, setVendorId] = useState(''); const [billNo, setBillNo] = useState(''); const [note, setNote] = useState('');
  const [lines, setLines] = useState<L[]>([]); const [prices, setPrices] = useState<Record<string, number>>({}); const [raw, setRaw] = useState<Record<string, string>>({});
  const [err, setErr] = useState(''); const [view, setView] = useState<StockInRec | null>(null); const refocus = useRef<string | null>(null);
  const opts = useMemo(() => products.map((p) => ({ id: p.id, label: p.name, sub: `${p.sku}${p.brand ? ' · ' + p.brand : ''}`, keys: p.sku })), [products]);
  const addLine = (p: Product) => { setErr(''); setLines((ls) => (ls.some((x) => x.pid === p.id) ? ls : [...ls, { pid: p.id, qty: LOCS.map(() => 0) }])); setPrices((pr) => (pr[p.id] ? pr : { ...pr, [p.id]: p.pp })); refocus.current = `si-${p.id}-0`; };
  useEffect(() => { const u = new URLSearchParams(window.location.search); const v = u.get('vendor'); if (v && useStore.getState().vendors.some((x) => x.id === v)) { setVendorMode(true); setVendorId(v); } const id = u.get('product'); const p = id ? useStore.getState().products.find((x) => x.id === id) : null; if (p) addLine(p); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (refocus.current) { const el = document.getElementById(refocus.current) as HTMLInputElement | null; el?.focus(); el?.select(); refocus.current = null; } }, [lines]);

  const commit = (i: number, k: number) => { // "3d" = 3 Dozen, "2b" = 2 Box (first letters of the pack name)
    const key = `${lines[i].pid}:${k}`; const t = raw[key]; if (t === undefined) return;
    const p = pm.get(lines[i].pid)!; let n = 0; const m = t.trim().match(/^(\d+)\s*([a-z]+)$/i);
    if (m) { const pk = (p.packs ?? []).find((x) => x.name.toLowerCase().startsWith(m[2].toLowerCase())); n = pk ? +m[1] * pk.per : 0; if (!pk) toast(`${p.name} has no pack starting with "${m[2]}"`, 'bad'); } else n = Math.max(0, Math.round(+t) || 0);
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, qty: l.qty.map((q, c) => (c === k ? n : q)) } : l)));
    setRaw((r) => { const x = { ...r }; delete x[key]; return x; });
  };
  const cols = LOCS.length + (vendorMode ? 1 : 0);
  const focusCell = (i: number, c: number) => { if (i < 0) return; if (i >= lines.length) { document.getElementById('si-add')?.focus(); return; } const el = document.getElementById(`si-${lines[i].pid}-${c}`) as HTMLInputElement | null; if (el && !el.disabled) { el.focus(); el.select(); } else if (c < cols - 1) focusCell(i, c + 1); else focusCell(i + 1, 0); };
  const onKey = (e: React.KeyboardEvent, i: number, c: number) => {
    if (e.key === 'Enter' && !e.ctrlKey) { e.preventDefault(); e.stopPropagation(); if (c < LOCS.length) commit(i, c); if (c + 1 < cols) focusCell(i, c + 1); else focusCell(i + 1, 0); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); commit(i, c); focusCell(i + 1, c); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); commit(i, c); focusCell(i - 1, c); }
    else if (e.key === 'Delete' && e.ctrlKey) { e.preventDefault(); setLines((ls) => ls.filter((_, j) => j !== i)); document.getElementById('si-add')?.focus(); }
  };
  const total = (l: L) => l.qty.reduce((a, b) => a + b, 0);
  const units = lines.reduce((a, l) => a + total(l), 0); const billTotal = lines.reduce((a, l) => a + (prices[l.pid] || 0) * total(l), 0);
  const vendor = vendors.find((v) => v.id === vendorId); const owed = vendor ? vendorBalance(d, vendor.id) : 0;
  const save = () => {
    lines.forEach((_, i) => LOCS.forEach((__, k) => commit(i, k)));
    setTimeout(() => {
      try {
        const cur = useStore.getState(); void cur;
        addStockIn(note, latest.current, vendorMode ? { vendorId, billNo, prices } : undefined);
        const s = useStore.getState(); toast(`${s.stockIns[0].no} saved: ${latest.current.reduce((a, l) => a + l.qty.reduce((x, y) => x + y, 0), 0).toLocaleString('en-IN')} units added`);
        setLines([]); setNote(''); setBillNo(''); setPrices({}); setErr(''); setTimeout(() => document.getElementById('si-add')?.focus(), 50);
      } catch (e) { setErr((e as Error).message); }
    }, 0);
  };
  const latest = useRef(lines); latest.current = lines;
  useScreenKeys([{ key: 'F9', label: 'Save delivery', run: save }, { key: 'Ctrl+S', label: '', run: save, hidden: true }, { key: 'Ctrl+Delete', label: 'Remove row', run: () => {}, hidden: true }]);

  return (
    <div>
      <ScreenHead title="Stock In" hint="The only place stock is added. Search or scan an item, type the quantity for each place. In a quantity cell, 3d means 3 Dozen, 2b means 2 Box."><KBtn primary k="F9" onClick={save} disabled={units <= 0}>Save delivery</KBtn></ScreenHead>
      <div className="mb-3 flex flex-wrap items-end gap-3 rounded-md border border-line bg-white p-3 text-[13px]">
        <label className="block"><span className="mb-0.5 block text-[11px] font-semibold uppercase text-steel">Came from</span><select className={sel} value={vendorMode ? 'v' : 'n'} onChange={(e) => setVendorMode(e.target.value === 'v')}><option value="v">A vendor (with bill)</option><option value="n">No vendor bill</option></select></label>
        {vendorMode && <><label className="block"><span className="mb-0.5 block text-[11px] font-semibold uppercase text-steel">Vendor</span><select className={sel} value={vendorId} onChange={(e) => setVendorId(e.target.value)}><option value="">Choose…</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
          <label className="block"><span className="mb-0.5 block text-[11px] font-semibold uppercase text-steel">Vendor bill no.</span><input className="!w-40 !rounded-md !px-2.5 !py-1.5" value={billNo} onChange={(e) => setBillNo(e.target.value)} /></label></>}
        <label className="block min-w-[200px] flex-1"><span className="mb-0.5 block text-[11px] font-semibold uppercase text-steel">Note</span><input className="w-full !rounded-md !px-2.5 !py-1.5" value={note} onChange={(e) => setNote(e.target.value)} placeholder={vendorMode ? 'Truck number, who received it' : 'Where did it come from?'} /></label>
        {vendor && <span className="text-[12.5px] text-steel">{owed < 0 ? `Advance held: ${money(-owed)}` : `You owe ${vendor.name}: `}{owed >= 0 && <b className="text-ink">{money(owed)}</b>}</span>}
      </div>
      {err && <p className="mb-2 rounded bg-blush-bg px-3 py-1.5 text-[13px] text-blush-fg">{err}</p>}
      <div className="overflow-auto rounded-md border border-line bg-white">
        <table className="w-full border-collapse text-[13px]">
          <thead className="bg-paper text-[11px] uppercase tracking-wide text-steel"><tr><th className="w-8 px-2 py-1.5">#</th><th className="px-2.5 py-1.5 text-left">Item</th>{LOCS.map((l) => <th key={l} className="px-2 py-1.5 text-right">{l}</th>)}<th className="px-2.5 py-1.5 text-right">Total</th>{vendorMode && <><th className="px-2 py-1.5 text-right">Rate / unit</th><th className="px-2.5 py-1.5 text-right">Amount</th></>}<th className="w-8" /></tr></thead>
          <tbody>
            {lines.map((l, i) => { const p = pm.get(l.pid)!; return (
              <tr key={l.pid} className="border-t border-line/70">
                <td className="px-2 py-0.5 text-center text-steel">{i + 1}</td>
                <td className="px-2.5 py-0.5"><div className="font-medium">{p.name}</div><div className="text-[11.5px] text-steel">{p.sku} · {p.unit}{p.packs?.length ? ' · ' + p.packs.map((k) => `${k.name} = ${k.per}`).join(', ') : ''}{p.shopOnly ? ' · direct to shop' : ''}</div></td>
                {LOCS.map((n, k) => { const off = p.shopOnly && k > 0; const key = `${l.pid}:${k}`; return (
                  <td key={n} className="px-1 py-0.5 text-right"><input id={`si-${l.pid}-${k}`} aria-label={`${p.name} ${n}`} disabled={off} inputMode="text" className="!w-20 !rounded !px-2 !py-1 text-right tabular-nums disabled:bg-paper" value={off ? '' : raw[key] ?? (l.qty[k] || '')} onFocus={(e) => e.target.select()} onChange={(e) => setRaw({ ...raw, [key]: e.target.value })} onBlur={() => commit(i, k)} onKeyDown={(e) => onKey(e, i, k)} /></td>); })}
                <td className="px-2.5 py-0.5 text-right font-semibold tabular-nums">{total(l)}</td>
                {vendorMode && <><td className="px-1 py-0.5 text-right"><input id={`si-${l.pid}-${LOCS.length}`} aria-label={`${p.name} rate`} inputMode="decimal" className="!w-24 !rounded !px-2 !py-1 text-right tabular-nums" value={prices[l.pid] ?? ''} onFocus={(e) => e.target.select()} onChange={(e) => { if (/^\d*\.?\d{0,2}$/.test(e.target.value)) setPrices({ ...prices, [l.pid]: +e.target.value }); }} onKeyDown={(e) => onKey(e, i, LOCS.length)} /></td><td className="px-2.5 py-0.5 text-right tabular-nums">{money((prices[l.pid] || 0) * total(l))}</td></>}
                <td className="px-1 text-center"><button aria-label={`Remove ${p.name}`} className="rounded p-1 text-steel hover:bg-paper" onClick={() => setLines(lines.filter((_, j) => j !== i))}><X className="h-4 w-4" /></button></td>
              </tr>); })}
            <tr className="border-t border-line"><td className="px-2 py-1 text-center text-steel">{lines.length + 1}</td><td colSpan={LOCS.length + (vendorMode ? 4 : 2)} className="px-2.5 py-1"><Combobox id="si-add" autoFocus options={opts} placeholder="Type name or SKU, or scan, then Enter" onPick={(o) => { const p = pm.get(o.id); if (p) addLine(p); }} /></td></tr>
          </tbody>
          <tfoot className="border-t-2 border-line bg-paper text-[13px]"><tr><td /><td className="px-2.5 py-1.5 font-semibold">{lines.length} {lines.length === 1 ? 'item' : 'items'}</td>{LOCS.map((n, k) => <td key={n} className="px-2 py-1.5 text-right tabular-nums">{lines.reduce((a, l) => a + l.qty[k], 0)}</td>)}<td className="px-2.5 py-1.5 text-right font-bold tabular-nums">{units}</td>{vendorMode && <><td /><td className="px-2.5 py-1.5 text-right font-bold tabular-nums">{money(billTotal)}</td></>}<td /></tr></tfoot>
        </table>
      </div>
      <p className="mt-1.5 text-[12px] text-steel">Enter = next cell · ↑ ↓ = other row · Ctrl+Delete = remove row · F9 = save. Stock is added only when you save.</p>

      <h2 className="mb-1.5 mt-6 text-[14px] font-semibold">Recent deliveries</h2>
      <DataGrid csvName="stock-in-history" rows={stockIns} rowKey={(r) => r.id} pageSize={10} primary={false} onOpen={setView} empty="No deliveries recorded yet"
        cols={[{ h: 'No.', v: (r) => r.no }, { h: 'Date', v: (r) => fmtDate(r.date), csv: (r) => r.date }, { h: 'Vendor / note', v: (r) => { const pu = d.purchases.find((x) => x.id === r.purchaseId); const vn = vendors.find((v) => v.id === pu?.vendorId); return vn ? `${vn.name} · bill ${pu?.billNo}` : r.note || 'No vendor bill'; } },
          { h: 'Items', right: true, v: (r) => r.lines.length }, { h: 'Units', right: true, v: (r) => r.lines.reduce((a, l) => a + l.qty.reduce((x, y) => x + y, 0), 0) }, { h: 'By', v: (r) => staff.find((s) => s.id === r.by)?.name ?? '' }]} />
      {view && <Dialog title={`${view.no} · ${fmtDate(view.date)}`} width="max-w-2xl" onClose={() => setView(null)}>
        <table className="w-full text-[13px]"><thead className="text-[11px] uppercase text-steel"><tr><th className="py-1 text-left">Item</th>{LOCS.map((l) => <th key={l} className="py-1 text-right">{l}</th>)}</tr></thead><tbody>{view.lines.map((l) => <tr key={l.pid} className="border-t border-line/70"><td className="py-1">{pm.get(l.pid)?.name ?? l.pid}</td>{LOCS.map((n, k) => <td key={n} className="py-1 text-right tabular-nums">{l.qty[k] || ''}</td>)}</tr>)}</tbody></table>
        {view.note && <p className="mt-2 text-[12.5px] text-steel">Note: {view.note}</p>}
      </Dialog>}
    </div>
  );
}
