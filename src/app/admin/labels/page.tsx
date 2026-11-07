'use client';
import { useEffect, useMemo, useState } from 'react';
import { Minus, Plus, Printer, X } from 'lucide-react';
import { useScreenKeys } from '@/lib/hotkeys';
import { KBtn, ScreenHead } from '@/components/grid/Screen';
import { Combobox, Opt } from '@/components/grid/Combobox';
import { LabelCard, useLabelSizes } from '@/components/grid/LabelCard';
import { toast } from '@/components/grid/Toast';
import { CONTENT_FIELDS, DEFAULT_CONTENT, MAX_MM, MIN_MM, contentOf, hasMrp, printable, sameContent, sizeName, toggleContent } from '@/lib/label';
import { fmtPrice } from '@/lib/pricing';
import { LabelContent, Product } from '@/lib/types';
import { useStore } from '@/lib/store';

type Mode = 'sheet' | 'roll';
/** One line in the print list: a single product (pid), or a whole category / sub-category. n = labels per product. */
interface Line { key: string; pid?: string; cat?: string; sub?: string; n: number; /** groups only: one choice of what to print for every item; left empty, each item uses its own */ content?: LabelContent }
const sel = 'w-full rounded-md border border-line bg-white px-2.5 py-1.5 text-[13px]';
const rep = (q: Product, n: number, k: string, c: LabelContent) => Array.from({ length: n }, (_, i) => ({ q, c, k: k + '-' + i }));
const card = 'rounded-lg border border-line bg-white';

/** Print Labels: find a product by name or code, or add a whole category or sub-category. Each label is QR code, product code, MRP. */
export default function Labels() {
  const all = useStore((s) => s.products); const byId = useMemo(() => new Map(all.map((p) => [p.id, p])), [all]);
  const saveProduct = useStore((st) => st.saveProduct); const setLabelSizes = useStore((st) => st.setLabelSizes); const { sizes, size } = useLabelSizes();
  const [manage, setManage] = useState(false); const [nw, setNw] = useState(''); const [nh, setNh] = useState(''); const [nq, setNq] = useState(''); const [sizeErr, setSizeErr] = useState('');
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
    if (l.pid) { const q = byId.get(l.pid); return q ? rep(q, l.n, l.key, contentOf(q)) : []; }
    return inGroup(l).flatMap((q) => { const c = l.content ?? contentOf(q); return printable(q, c) ? rep(q, l.n, l.key + q.id, c) : []; });
  }), [lines, byId, all]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = picked.length;
  const lineProducts = (l: Line) => (l.pid ? [byId.get(l.pid)].filter(Boolean) as Product[] : inGroup(l));
  const fl = lines.find((l) => l.key === focus) ?? lines[lines.length - 1];
  const shown = fl ? (lineProducts(fl).find((x) => printable(x, fl.content ?? contentOf(x))) ?? lineProducts(fl)[0]) : undefined;
  const shownContent = shown ? (fl?.content ?? contentOf(shown)) : DEFAULT_CONTENT;
  const flip = (l: Line, k: keyof LabelContent) => {
    if (l.pid) { const q = byId.get(l.pid); if (!q) return; const nx = toggleContent(contentOf(q), k); saveProduct({ ...q, label: sameContent(nx, DEFAULT_CONTENT) ? undefined : nx }); return; }
    setLines((ls) => ls.map((x) => (x.key === l.key ? { ...x, content: toggleContent(x.content ?? DEFAULT_CONTENT, k) } : x)));
  };
  const bump = (key: string, d: number) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, n: Math.max(1, Math.min(999, l.n + d)) } : l)));

  const opts: Opt[] = useMemo(() => all.map((p) => ({ id: p.id, label: p.name, sub: `${p.sku} · ${hasMrp(p) ? 'MRP ' + fmtPrice(p.mrp as number) : 'no MRP'}`, keys: p.sku + ' ' + (p.alias ?? '') })), [all]);
  const print = () => {
    if (!total) { toast(lines.length ? 'Nothing to print: none of these items has an MRP yet. Set the MRP, or switch MRP off on the label.' : 'Add a product or a category first', 'bad'); return; }
    const missing = lines.filter((l) => l.pid).map((l) => byId.get(l.pid as string)).filter((p): p is Product => !!p && !printable(p, contentOf(p)));
    if (missing.length) { toast(`No MRP yet for ${missing.slice(0, 2).map((m) => m.name).join(', ')}${missing.length > 2 ? ` and ${missing.length - 2} more` : ''}. Set the MRP, switch MRP off on its label, or remove it.`, 'bad'); return; }
    window.print();
  };
  const selectSize = (id: string) => setLabelSizes(sizes, id);
  const addSize = () => {
    const w = parseFloat(nw), h = parseFloat(nh), q = nq.trim() === '' ? undefined : parseFloat(nq);
    if (!(w >= MIN_MM && w <= MAX_MM && h >= MIN_MM && h <= MAX_MM)) { setSizeErr(`Width and height must be between ${MIN_MM} and ${MAX_MM} mm`); return; }
    if (q !== undefined && !(q >= 5 && q <= Math.min(w, h))) { setSizeErr(`QR size must be between 5 mm and ${Math.min(w, h)} mm, or left empty`); return; }
    if (sizes.some((x) => x.w === w && x.h === h && (x.qr ?? 0) === (q ?? 0))) { setSizeErr('That size is already in the list'); return; }
    const n = { id: 's-' + Date.now().toString(36), name: sizeName(w, h) + (q ? ` · QR ${q} mm` : ''), w, h, qr: q };
    setLabelSizes([...sizes, n], n.id); setNw(''); setNh(''); setNq(''); setSizeErr(''); toast(`Size ${n.name} added`);
  };
  const delSize = (id: string) => { if (sizes.length < 2) { setSizeErr('Keep at least one size'); return; } const rest = sizes.filter((x) => x.id !== id); setLabelSizes(rest, size.id === id ? rest[0].id : size.id); setSizeErr(''); };
  useScreenKeys([
    { key: 'Ctrl+P', label: 'Print', run: print }, { key: '/', label: 'Find product', run: () => document.getElementById('lb-find')?.focus() },
    { key: 'X', label: 'Clear list', run: () => setLines([]) },
  ]);
  const pill = (m: Mode, label: string) => <button type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={`rounded-md border px-2.5 py-1 text-[12.5px] ${mode === m ? 'border-gold bg-sage-bg/70 font-semibold' : 'border-line bg-white hover:bg-paper'}`}>{label}</button>;

  return (
    <>
      <style>{mode === 'roll' ? `@media print { @page { size: ${size.w}mm ${size.h}mm; margin: 0 } }` : '@media print { @page { size: A4; margin: 10mm } }'}</style>
      <div className="no-print">
        <ScreenHead title="Print Labels" hint="Find a product by name or code, or add a whole category. Choose what goes on each label and how many copies.">
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
              {gc && <p className="mt-2 text-[12px] text-steel">{gProducts.length.toLocaleString('en-IN')} products{gProducts.length - gReady > 0 ? ` · ${gProducts.length - gReady} without an MRP are skipped while MRP is on` : ''}.</p>}
            </section>

            <section className={card}>
              <header className="flex items-center justify-between border-b border-line px-4 py-2"><h2 className="text-[12px] font-semibold uppercase tracking-wide text-steel">To print</h2>{lines.length > 0 && <button type="button" className="text-[12px] text-steel underline" onClick={() => setLines([])}>Clear list</button>}</header>
              {!lines.length ? <p className="px-4 py-6 text-center text-[13px] text-steel">Nothing added yet. Search a product above, or add a whole category.</p> : (
                <ul>{lines.map((l) => {
                  const on = fl?.key === l.key; const p = l.pid ? byId.get(l.pid) : undefined; const gp = l.pid ? [] : inGroup(l); const skip = gp.filter((x) => !printable(x, l.content ?? contentOf(x))).length;
                  return (
                    <li key={l.key} onClick={() => setFocus(l.key)} className={`flex cursor-pointer items-center gap-3 border-b border-line/70 px-4 py-2 last:border-b-0 ${on ? 'bg-sage-bg/60 shadow-[inset_3px_0_0_#B8892B]' : 'hover:bg-paper/70'}`}>
                      <div className="min-w-0 flex-1">
                        {p ? (<><div className="truncate text-[13px] font-medium">{p.name}</div><div className="text-[11.5px] text-steel"><span className="font-mono">{p.sku}</span> · {hasMrp(p) ? `MRP ${fmtPrice(p.mrp as number)}` : contentOf(p).mrp ? <span className="font-medium text-butter-fg">No MRP yet</span> : 'no MRP (not printed)'}</div></>)
                          : (<><div className="truncate text-[13px] font-medium">{l.sub ? `${l.cat} › ${l.sub}` : `${l.cat} (whole category)`}</div><div className="text-[11.5px] text-steel">{gp.length - skip} products{skip ? ` · ${skip} without MRP skipped` : ''} · {(gp.length - skip) * l.n} labels{l.content ? '' : ' · each item uses its own setting'}</div></>)}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1" role="group" aria-label="What to print">
                          {CONTENT_FIELDS.map(({ k, label }) => { const c = l.content ?? (p ? contentOf(p) : DEFAULT_CONTENT); const onK = c[k]; return (
                            <button key={k} type="button" aria-pressed={onK} onClick={() => flip(l, k)} className={`rounded border px-1.5 py-0.5 text-[11.5px] font-medium ${onK ? 'border-ink bg-ink text-white' : 'border-line bg-white text-steel hover:bg-paper'}`}>{label}</button>); })}
                        </div>
                        <div className="flex items-center gap-1 text-[12px] text-steel">{p ? 'Copies' : 'Copies of each'}
                          <button type="button" aria-label="One fewer" onClick={() => bump(l.key, -1)} className="rounded border border-line p-1 text-ink hover:bg-paper"><Minus className="h-3 w-3" /></button>
                          <input aria-label={p ? `Copies of ${p.name}` : `Copies of each product in ${l.cat}`} inputMode="numeric" className="!w-14 !rounded !px-1.5 !py-0.5 text-center text-[13px] text-ink" value={l.n} onFocus={(e) => e.target.select()} onChange={(e) => setN(l.key, e.target.value)} />
                          <button type="button" aria-label="One more" onClick={() => bump(l.key, 1)} className="rounded border border-line p-1 text-ink hover:bg-paper"><Plus className="h-3 w-3" /></button>
                          <button type="button" aria-label="Remove" onClick={() => remove(l.key)} className="ml-1 rounded p-1 text-steel hover:bg-paper hover:text-ink"><X className="h-4 w-4" /></button>
                        </div>
                      </div>
                    </li>); })}</ul>)}
            </section>
          </div>

          <aside className={`${card} lg:sticky lg:top-3`}>
            <header className="border-b border-line px-4 py-2 text-[12px] font-semibold uppercase tracking-wide text-steel">Label preview</header>
            <div className="p-4">
              {shown ? (<>
                <div className="flex justify-center rounded-md bg-paper p-4"><LabelCard code={shown.sku} name={shown.name} desc={shown.desc} mrp={shown.mrp} content={shownContent} size={size} scale={Math.min(1.2, 250 / (Math.max(size.w, 1) * 3.78))} border /></div>
                <div className="mt-3 text-[13px] font-medium">{shown.name}</div>
                <div className="text-[12px] text-steel">{size.w} × {size.h} mm</div>
                {!printable(shown, shownContent) && <p className="mt-2 rounded bg-butter-bg px-3 py-1.5 text-[12.5px] text-butter-fg">No MRP yet. Set the MRP on the product, or switch MRP off for this label.</p>}
              </>) : <p className="rounded-md bg-paper px-3 py-8 text-center text-[13px] text-steel">Add a product to see its label here.</p>}

              <div className="mt-4 border-t border-line pt-3">
                <div className="mb-1.5 flex items-center justify-between"><span className="text-[12px] font-medium text-steel">Label size</span><button type="button" onClick={() => setManage(!manage)} className="text-[12px] underline">{manage ? 'Done' : 'Add or remove sizes'}</button></div>
                <select aria-label="Label size" className={sel} value={size.id} onChange={(e) => selectSize(e.target.value)}>{sizes.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
                <p className="mt-1 text-[11.5px] text-steel">The QR and the text are sized to fit the label.</p>
                {manage && (
                  <div className="mt-2 rounded-md border border-line p-2.5">
                    <ul className="mb-2 space-y-1">{sizes.map((x) => <li key={x.id} className="flex items-center justify-between text-[12.5px]"><span>{x.name}</span><button type="button" aria-label={`Remove ${x.name}`} onClick={() => delSize(x.id)} className="rounded p-1 text-steel hover:bg-paper hover:text-ink"><X className="h-3.5 w-3.5" /></button></li>)}</ul>
                    <div className="grid grid-cols-3 gap-1.5">
                      <input aria-label="Width in mm" inputMode="decimal" placeholder="Width mm" className="!rounded !px-2 !py-1 text-[12.5px]" value={nw} onChange={(e) => setNw(e.target.value.replace(/[^\d.]/g, ''))} />
                      <input aria-label="Height in mm" inputMode="decimal" placeholder="Height mm" className="!rounded !px-2 !py-1 text-[12.5px]" value={nh} onChange={(e) => setNh(e.target.value.replace(/[^\d.]/g, ''))} />
                      <input aria-label="QR size in mm" inputMode="decimal" placeholder="QR mm (auto)" className="!rounded !px-2 !py-1 text-[12.5px]" value={nq} onChange={(e) => setNq(e.target.value.replace(/[^\d.]/g, ''))} />
                    </div>
                    {sizeErr && <p className="mt-1.5 text-[11.5px] font-medium text-blush-fg">{sizeErr}</p>}
                    <button type="button" onClick={addSize} className="mt-2 w-full rounded-md border border-ink bg-ink px-3 py-1.5 text-[12.5px] font-medium text-white">Add this size</button>
                    <p className="mt-1.5 text-[11.5px] text-steel">Width and height of the sticker. Leave QR empty and the system picks the biggest QR that fits.</p>
                  </div>)}
              </div>

              <div className="mt-4 border-t border-line pt-3"><div className="mb-1.5 text-[12px] font-medium text-steel">Print on</div><div className="flex gap-2">{pill('sheet', 'A4 sheet')}{pill('roll', 'Label roll')}</div>
                <p className="mt-1.5 text-[11.5px] text-steel">{mode === 'roll' ? `One ${size.w} × ${size.h} mm sticker per page, for a label printer.` : 'Labels laid out side by side on A4, to cut or stick.'}</p></div>
              <button type="button" onClick={print} className="mt-4 w-full rounded-md border border-ink bg-ink px-3 py-2 text-[13px] font-medium text-white">Print {total} {total === 1 ? 'label' : 'labels'}</button>
            </div>
          </aside>
        </div>
      </div>
      <div className="print-only"><div className={mode === 'roll' ? '' : 'flex flex-wrap'} style={mode === 'sheet' ? { gap: '2mm' } : undefined}>
        {picked.map(({ q, c, k }, i) => <div key={k} style={mode === 'roll' ? { breakAfter: i === picked.length - 1 ? 'auto' : 'page' } : { breakInside: 'avoid' }}><LabelCard code={q.sku} name={q.name} desc={q.desc} mrp={q.mrp} content={c} size={size} border={mode === 'sheet'} /></div>)}
      </div></div>
    </>
  );
}