'use client';
import { useEffect, useMemo, useState } from 'react';
import { Printer, X } from 'lucide-react';
import { useScreenKeys } from '@/lib/hotkeys';
import { KBtn, ScreenHead } from '@/components/grid/Screen';
import { Combobox, Opt } from '@/components/grid/Combobox';
import { LabelCard } from '@/components/grid/LabelCard';
import { toast } from '@/components/grid/Toast';
import { LABEL, hasMrp, mrpLine } from '@/lib/label';
import { fmtPrice } from '@/lib/pricing';
import { Product } from '@/lib/types';
import { useStore } from '@/lib/store';

type Mode = 'sheet' | 'roll';
/** One line in the print list: a single product (pid), or a whole category / sub-category. n = labels per product. */
interface Line { key: string; pid?: string; cat?: string; sub?: string; n: number }
const sel = 'w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-[13px]';
const rep = (q: Product, n: number, k: string) => Array.from({ length: n }, (_, i) => ({ q, k: k + '-' + i }));
const card = 'rounded-lg border border-line bg-white';

/** Print Labels: find a product by name or code, or add a whole category or sub-category. Each label is QR code, product code, MRP. */
export default function Labels() {
  const all = useStore((s) => s.products); const byId = useMemo(() => new Map(all.map((p) => [p.id, p])), [all]);
  const [lines, setLines] = useState<Line[]>([]); const [focus, setFocus] = useState(''); const [mode, setMode] = useState<Mode>('sheet'); const [gc, setGc] = useState(''); const [gs, setGs] = useState('');
  const inGroup = (l: { cat?: string; sub?: string }) => all.filter((p) => p.cat === l.cat && (!l.sub || p.sub === l.sub));

  const addProduct = (p: Product) => { setLines((ls) => ls.some((l) => l.pid === p.id) ? ls.map((l) => (l.pid === p.id ? { ...l, n: Math.min(999, l.n + 1) } : l)) : [...ls, { key: 'p:' + p.id, pid: p.id, n: 1 }]); setFocus('p:' + p.id); };
  // coming from a product page: add that product
  useEffect(() => { const id = new URLSearchParams(window.location.search).get('p'); const p = id ? useStore.getState().products.find((x) => x.id === id) : undefined; if (p) addProduct(p); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cats = useMemo(() => Array.from(new Set(all.map((p) => p.cat))).sort(), [all]);
  const subs = useMemo(() => Array.from(new Set(all.filter((p) => p.cat === gc && p.sub).map((p) => p.sub as string))).sort(), [all, gc]);
  const gProducts = useMemo(() => (gc ? inGroup({ cat: gc, sub: gs }) : []), [all, gc, gs]); // eslint-disable-line react-hooks/exhaustive-deps
  const gReady = gProducts.filter(hasMrp).length;
  const addGroup = () => {
    if (!gc) return; const key = `g:${gc}|${gs}`;
    if (lines.some((l) => l.key === key)) { setFocus(key); toast('That group is already in the list'); return; }
    setLines((ls) => [...ls, { key, cat: gc, sub: gs || undefined, n: 1 }]); setFocus(key); setGs('');
  };
  const setN = (key: string, v: string) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, n: Math.max(1, Math.min(999, Math.round(+v.replace(/\D/g, '')) || 1)) } : l)));
  const remove = (key: string) => setLines((ls) => ls.filter((l) => l.key !== key));

  const picked = useMemo(() => lines.flatMap((l) => {
    if (l.pid) { const q = byId.get(l.pid); return q ? rep(q, l.n, l.key) : []; }
    return inGroup(l).filter(hasMrp).flatMap((q) => rep(q, l.n, l.key + q.id));
  }), [lines, byId, all]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = picked.length;
  const lineProducts = (l: Line) => (l.pid ? [byId.get(l.pid)].filter(Boolean) as Product[] : inGroup(l));
  const fl = lines.find((l) => l.key === focus) ?? lines[lines.length - 1];
  const shown = fl ? (lineProducts(fl).find(hasMrp) ?? lineProducts(fl)[0]) : undefined;

  const opts: Opt[] = useMemo(() => all.map((p) => ({ id: p.id, label: p.name, sub: `${p.sku} · ${hasMrp(p) ? 'MRP ' + fmtPrice(p.mrp as number) : 'no MRP'}`, keys: p.sku })), [all]);
  const print = () => {
    if (!total) { toast(lines.length ? 'Nothing to print: none of these products has an MRP yet' : 'Add a product or a category first', 'bad'); return; }
    const missing = lines.filter((l) => l.pid).map((l) => byId.get(l.pid as string)).filter((p): p is Product => !!p && !hasMrp(p));
    if (missing.length) { toast(`No MRP yet for ${missing.slice(0, 2).map((m) => m.name).join(', ')}${missing.length > 2 ? ` and ${missing.length - 2} more` : ''}. Set the MRP, or remove them.`, 'bad'); return; }
    window.print();
  };
  useScreenKeys([
    { key: 'Ctrl+P', label: 'Print', run: print }, { key: '/', label: 'Find product', run: () => document.getElementById('lb-find')?.focus() },
    { key: 'X', label: 'Clear list', run: () => setLines([]) },
  ]);
  const pill = (m: Mode, label: string) => <button type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={`rounded-md border px-2.5 py-1 text-[12.5px] ${mode === m ? 'border-gold bg-sage-bg/70 font-semibold' : 'border-line bg-white hover:bg-paper'}`}>{label}</button>;

  return (
    <>
      <style>{mode === 'roll' ? `@media print { @page { size: ${LABEL.w}mm ${LABEL.h}mm; margin: 0 } }` : '@media print { @page { size: A4; margin: 10mm } }'}</style>
      <div className="no-print">
        <ScreenHead title="Print Labels" hint="Find a product by name or code, or add a whole category. Each label is QR code, product code and MRP.">
          <span className="text-[12.5px] text-steel">{total} {total === 1 ? 'label' : 'labels'}</span>
          <KBtn primary k="Ctrl+P" onClick={print}><Printer className="h-4 w-4" />Print</KBtn>
        </ScreenHead>
        <div className="mx-auto grid max-w-5xl items-start gap-4 lg:grid-cols-[1fr_300px]">
          <div className="space-y-3">
            <section className={`${card} p-5`}>
              <label htmlFor="lb-find" className="mb-2 block text-[14px] font-semibold">Find a product</label>
              <div className="[&_input]:!rounded-lg [&_input]:!px-3.5 [&_input]:!py-3 [&_input]:!text-[15px]"><Combobox id="lb-find" autoFocus options={opts} limit={8} minChars={1} placeholder="Type the product name or code, or scan a label, then Enter" onPick={(o) => { const p = byId.get(o.id); if (p) addProduct(p); }} /></div>
              <p className="mt-2 text-[12px] text-steel">Pick a product and it is added to the list below. Add as many as you like.</p>
            </section>

            <section className={`${card} p-5`}>
              <div className="mb-2 text-[14px] font-semibold">Or print a whole category</div>
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <select aria-label="Category" className={sel} value={gc} onChange={(e) => { setGc(e.target.value); setGs(''); }}><option value="">Choose a category</option>{cats.map((c) => <option key={c}>{c}</option>)}</select>
                <select aria-label="Sub-category" className={sel} value={gs} disabled={!gc || !subs.length} onChange={(e) => setGs(e.target.value)}><option value="">{gc && !subs.length ? 'No sub-categories' : 'All of the category'}</option>{subs.map((s) => <option key={s}>{s}</option>)}</select>
                <button type="button" onClick={addGroup} disabled={!gc} className="rounded-md border border-ink bg-ink px-4 py-1.5 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">Add</button>
              </div>
              {gc && <p className="mt-2 text-[12px] text-steel">{gProducts.length.toLocaleString('en-IN')} products{gProducts.length - gReady > 0 ? ` · ${gProducts.length - gReady} without an MRP will be skipped` : ''}.</p>}
            </section>

            <section className={card}>
              <header className="flex items-center justify-between border-b border-line px-4 py-2"><h2 className="text-[12px] font-semibold uppercase tracking-wide text-steel">To print</h2>{lines.length > 0 && <button type="button" className="text-[12px] text-steel underline" onClick={() => setLines([])}>Clear list</button>}</header>
              {!lines.length ? <p className="px-4 py-6 text-center text-[13px] text-steel">Nothing added yet. Search a product above, or add a whole category.</p> : (
                <ul>{lines.map((l) => {
                  const on = fl?.key === l.key; const p = l.pid ? byId.get(l.pid) : undefined; const gp = l.pid ? [] : inGroup(l); const skip = gp.filter((x) => !hasMrp(x)).length;
                  return (
                    <li key={l.key} onClick={() => setFocus(l.key)} className={`flex cursor-pointer items-center gap-3 border-b border-line/70 px-4 py-2 last:border-b-0 ${on ? 'bg-sage-bg/60 shadow-[inset_3px_0_0_#B8892B]' : 'hover:bg-paper/70'}`}>
                      <div className="min-w-0 flex-1">
                        {p ? (<><div className="truncate text-[13px] font-medium">{p.name}</div><div className="text-[11.5px] text-steel"><span className="font-mono">{p.sku}</span> · {hasMrp(p) ? `MRP ${fmtPrice(p.mrp as number)}` : <span className="font-medium text-butter-fg">No MRP yet</span>}</div></>)
                          : (<><div className="truncate text-[13px] font-medium">{l.sub ? `${l.cat} › ${l.sub}` : `${l.cat} (whole category)`}</div><div className="text-[11.5px] text-steel">{gp.length - skip} products{skip ? ` · ${skip} without MRP skipped` : ''} · {(gp.length - skip) * l.n} labels</div></>)}
                      </div>
                      <label className="flex items-center gap-1.5 text-[12px] text-steel">{p ? 'Labels' : 'Each'}<input aria-label={p ? `Labels for ${p.name}` : `Labels of each product in ${l.cat}`} inputMode="numeric" className="!w-16 !rounded !px-2 !py-1 text-right text-[13px] text-ink" value={l.n} onClick={(e) => e.stopPropagation()} onFocus={(e) => e.target.select()} onChange={(e) => setN(l.key, e.target.value)} /></label>
                      <button type="button" aria-label="Remove" onClick={(e) => { e.stopPropagation(); remove(l.key); }} className="rounded p-1 text-steel hover:bg-paper hover:text-ink"><X className="h-4 w-4" /></button>
                    </li>); })}</ul>)}
            </section>
          </div>

          <aside className={`${card} lg:sticky lg:top-3`}>
            <header className="border-b border-line px-4 py-2 text-[12px] font-semibold uppercase tracking-wide text-steel">Label preview</header>
            <div className="p-4">
              {shown ? (<>
                <div className="flex justify-center rounded-md bg-paper p-4"><LabelCard code={shown.sku} mrp={shown.mrp} scale={1.2} border /></div>
                <div className="mt-3 text-[13px] font-medium">{shown.name}</div>
                <div className="text-[12px] text-steel">{LABEL.w} × {LABEL.h} mm · {mrpLine(shown.mrp)}</div>
                {!hasMrp(shown) && <p className="mt-2 rounded bg-butter-bg px-3 py-1.5 text-[12.5px] text-butter-fg">No MRP yet. This label cannot be printed until the MRP is set on the product.</p>}
              </>) : <p className="rounded-md bg-paper px-3 py-8 text-center text-[13px] text-steel">Add a product to see its label here.</p>}
              <div className="mt-4 border-t border-line pt-3"><div className="mb-1.5 text-[12px] font-medium text-steel">Print on</div><div className="flex gap-2">{pill('sheet', 'A4 sheet')}{pill('roll', 'Label roll')}</div>
                <p className="mt-1.5 text-[11.5px] text-steel">{mode === 'roll' ? `One ${LABEL.w} × ${LABEL.h} mm sticker per page, for a label printer.` : 'Labels laid out side by side on A4, to cut or stick.'} The size is a placeholder until the real sticker size is confirmed.</p></div>
              <button type="button" onClick={print} className="mt-4 w-full rounded-md border border-ink bg-ink px-3 py-2 text-[13px] font-medium text-white">Print {total} {total === 1 ? 'label' : 'labels'}</button>
            </div>
          </aside>
        </div>
      </div>
      <div className="print-only"><div className={mode === 'roll' ? '' : 'flex flex-wrap'} style={mode === 'sheet' ? { gap: '2mm' } : undefined}>
        {picked.map(({ q, k }, i) => <div key={k} style={mode === 'roll' ? { breakAfter: i === picked.length - 1 ? 'auto' : 'page' } : { breakInside: 'avoid' }}><LabelCard code={q.sku} mrp={q.mrp} border={mode === 'sheet'} /></div>)}
      </div></div>
    </>
  );
}