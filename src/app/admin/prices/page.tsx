'use client';
import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { Product, TIER_NAMES } from '@/lib/types';
import { download, toCsv } from '@/lib/rules';
import { DEFAULT_DISC, fmtPrice, priceFrom } from '@/lib/pricing';
import { useScreenKeys } from '@/lib/hotkeys';
import { KBtn, ScreenHead } from '@/components/grid/Screen';
import { useProductFilters } from '@/components/grid/ProductFilters';
import { toast } from '@/components/grid/Toast';

const PAGE = 50; const COLS = 6; // 0 MRP, 1 cost, 2..5 discount % for Retail, Carpenter, Wholesale, Default
type Edit = Partial<Record<number, string>>;
const HEAD = ['MRP', 'Cost', ...TIER_NAMES.map((t) => t.replace(/ \(.\)/, '') + ' %')];

/** Price List: change MRP, cost and discounts. Prices are worked out (MRP minus discount). Enter moves down, Tab moves right, F9 saves all. */
export default function PriceList() {
  const saveProduct = useStore((s) => s.saveProduct); const { list, bar } = useProductFilters();
  const [edits, setEdits] = useState<Record<string, Edit>>({}); const [page, setPage] = useState(0); const [focus, setFocus] = useState<[number, number] | null>(null);
  const pages = Math.max(1, Math.ceil(list.length / PAGE)); const cur = Math.min(page, pages - 1);
  const rows = useMemo(() => list.slice(cur * PAGE, cur * PAGE + PAGE), [list, cur]);
  useEffect(() => setPage(0), [list.length]);
  useEffect(() => { if (!focus) return; const el = document.getElementById(`pl-${focus[0]}-${focus[1]}`) as HTMLInputElement | null; el?.focus(); el?.select(); setFocus(null); }, [focus, rows]);
  const orig = (p: Product, c: number) => (c === 0 ? p.mrp ?? 0 : c === 1 ? p.pp : (p.disc ?? DEFAULT_DISC)[c - 2]);
  const text = (p: Product, c: number) => edits[p.id]?.[c] ?? String(orig(p, c));
  const num = (p: Product, c: number) => { const v = parseFloat(text(p, c)); return Number.isFinite(v) && v >= 0 && (c < 2 || v <= 100) ? v : NaN; };
  const prices = (p: Product) => (num(p, 0) > 0 ? [2, 3, 4, 5].map((c) => priceFrom(num(p, 0), num(p, c))) : p.prices);
  const changedIds = Object.keys(edits).filter((id) => Object.entries(edits[id]).some(([c, v]) => { const p = useStore.getState().products.find((x) => x.id === id); return p && v !== undefined && parseFloat(v) !== orig(p, +c); }));
  const change = (p: Product, c: number, v: string) => { if (!/^\d*\.?\d{0,2}$/.test(v)) return; setEdits((e) => ({ ...e, [p.id]: { ...e[p.id], [c]: v } })); };
  const save = () => {
    const all = useStore.getState().products; let n = 0; let bad = 0; const done: string[] = [];
    for (const id of changedIds) {
      const p = all.find((x) => x.id === id)!; const v = [0, 1, 2, 3, 4, 5].map((c) => num(p, c));
      if (v.some(Number.isNaN)) { bad++; continue; }
      saveProduct({ ...p, mrp: v[0] > 0 ? v[0] : undefined, pp: v[1], disc: v.slice(2), prices: v[0] > 0 ? v.slice(2).map((d) => priceFrom(v[0], d)) : p.prices }); n++; done.push(id);
    }
    setEdits((e) => { const k = { ...e }; done.forEach((id) => delete k[id]); return k; });
    toast(n ? `${n} ${n === 1 ? 'product' : 'products'} updated` + (bad ? `, ${bad} skipped (check the numbers)` : '') : bad ? 'Some values are not valid numbers' : 'No changes to save', n ? 'ok' : 'bad');
  };
  const exportCsv = () => { download('price-list.csv', toCsv([['Code', 'Company', 'Product', 'MRP', 'Cost', ...HEAD.slice(2), ...TIER_NAMES.map((t) => t + ' price')], ...list.map((p) => [p.sku, p.brand ?? '', p.name, p.mrp ?? 0, p.pp, ...(p.disc ?? DEFAULT_DISC), ...p.prices])])); toast('Price list exported'); };
  const go = (r: number, c: number) => { const abs = cur * PAGE + r; if (abs < 0 || abs >= list.length) return; const np = Math.floor(abs / PAGE); if (np !== cur) setPage(np); setFocus([abs, c]); };
  useScreenKeys([
    { key: 'F9', label: 'Save changes', run: save }, { key: 'Ctrl+S', label: '', run: save, hidden: true }, { key: 'Ctrl+E', label: 'Export', run: exportCsv },
    { key: 'PgDn', label: '', run: () => { setPage(Math.min(pages - 1, cur + 1)); setFocus([(cur + 1) * PAGE, 0]); }, hidden: true, typing: true },
    { key: 'PgUp', label: '', run: () => { setPage(Math.max(0, cur - 1)); setFocus([Math.max(0, cur - 1) * PAGE, 0]); }, hidden: true, typing: true },
  ]);
  const onKey = (e: React.KeyboardEvent, abs: number, c: number) => {
    if ((e.key === 'Enter' && !e.ctrlKey) || e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); go(abs + (e.shiftKey && e.key === 'Enter' ? -1 : 1) - cur * PAGE, c); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); e.stopPropagation(); go(abs - 1 - cur * PAGE, c); }
  };
  return (
    <div>
      <ScreenHead title="Price List" hint="Change MRP, cost and discount %. The prices are worked out for you. Enter moves down, Tab moves right.">
        <span className="text-[12.5px] text-steel">{changedIds.length ? <b className="text-butter-fg">{changedIds.length} unsaved</b> : 'No changes'}</span>
        <KBtn primary k="F9" onClick={save} disabled={!changedIds.length}>Save changes</KBtn>
      </ScreenHead>
      {bar}
      <div className="overflow-auto rounded-md border border-line bg-white" style={{ maxHeight: 'calc(100vh - 260px)' }}>
        <table className="w-full border-collapse text-[13px]">
          <thead className="sticky top-0 z-10 bg-paper text-[11px] uppercase tracking-wide text-steel"><tr>
            <th className="border-b border-line px-2.5 py-1.5 text-left">Code</th><th className="border-b border-line px-2.5 py-1.5 text-left">Product</th>
            {HEAD.map((h) => <th key={h} className="border-b border-line px-1.5 py-1.5 text-right">{h}</th>)}
            <th className="border-b border-line px-2.5 py-1.5 text-right">Prices: Retail · Carpenter · Wholesale · Default</th></tr></thead>
          <tbody>
            {rows.map((p, r) => { const abs = cur * PAGE + r; const dirty = changedIds.includes(p.id); const pr = prices(p); const low = num(p, 1) > 0 && pr.some((x) => x > 0 && x < num(p, 1)); return (
              <tr key={p.id} className={`border-b border-line/70 ${dirty ? 'bg-butter-bg/40' : ''}`}>
                <td className="whitespace-nowrap px-2.5 py-0.5 font-mono text-[12px]">{p.sku}</td><td className="px-2.5 py-0.5">{p.name}{p.brand && <span className="ml-2 text-[12px] text-steel">{p.brand}</span>}</td>
                {[0, 1, 2, 3, 4, 5].map((c) => { const edited = edits[p.id]?.[c] !== undefined && parseFloat(edits[p.id]![c]!) !== orig(p, c); return (
                  <td key={c} className="px-1 py-0.5 text-right"><input id={`pl-${abs}-${c}`} inputMode="decimal" aria-label={`${p.name} ${HEAD[c]}`} value={text(p, c)} onFocus={(e) => e.target.select()} onChange={(e) => change(p, c, e.target.value)} onKeyDown={(e) => onKey(e, abs, c)}
                    className={`${c < 2 ? '!w-24' : '!w-16'} !rounded !px-2 !py-1 text-right tabular-nums ${edited ? '!border-gold !bg-butter-bg/60' : ''}`} /></td>); })}
                <td className={`px-2.5 py-0.5 text-right text-[12.5px] tabular-nums ${low ? 'font-semibold text-blush-fg' : ''}`} title={low ? 'A price is below the cost' : ''}>{pr.some((x) => x > 0) ? pr.map(fmtPrice).join(' · ') : 'not set'}</td>
              </tr>); })}
            {!rows.length && <tr><td colSpan={9} className="px-3 py-8 text-center text-steel">No products match</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[12px] text-steel"><span>Page {cur + 1} of {pages} (PgUp / PgDn)</span><span>Red prices are below the cost price.</span></div>
    </div>
  );
}
