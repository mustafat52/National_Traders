'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Plus } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Product } from '@/lib/types';
import { packBreakdown, stockTotal } from '@/lib/rules';
import { fmtPrice } from '@/lib/pricing';
import { GROUPS } from '@/lib/groups';
import { useScreenKeys } from '@/lib/hotkeys';
import { DataGrid } from '@/components/grid/DataGrid';
import { KBtn, ScreenHead } from '@/components/grid/Screen';

type Quick = 'all' | 'out' | 'noprice';
/** Stands for "products of this category that have no sub-category". */
const NONE = '\u0000none';
const noPrice = (p: Product) => !p.prices.some((x) => x > 0);
const cls = 'rounded-md border border-line bg-white px-2 py-1.5 text-[13px]';
const fmtN = (n: number) => n.toLocaleString('en-IN');

/**
 * Products, in three steps: the categories, then the sub-categories of the chosen category, then the products of the chosen sub-category.
 * A category with no sub-categories goes straight to its products. Searching jumps to the table. Esc steps back one level.
 */
export default function Products() {
  const router = useRouter(); const products = useStore((s) => s.products);
  // when a product is opened, remember where we were so Back returns to this exact list
  const saved = useMemo(() => { try { return JSON.parse(sessionStorage.getItem('nt-prod-nav') || 'null') as { q: string; cat: string; sub: string; allIn: boolean; brand: string; quick: Quick } | null; } catch { return null; } }, []);
  const [q, setQ] = useState(saved?.q ?? ''); const [cat, setCat] = useState(saved?.cat ?? ''); const [sub, setSub] = useState(saved?.sub ?? ''); const [allIn, setAllIn] = useState(saved?.allIn ?? false); const [brand, setBrand] = useState(saved?.brand ?? ''); const [quick, setQuick] = useState<Quick>(saved?.quick ?? 'all');
  const qRef = useRef<HTMLInputElement>(null); const bRef = useRef<HTMLSelectElement>(null); 
  useEffect(() => { try { sessionStorage.removeItem('nt-prod-nav'); } catch {} if (saved) return; const u = new URLSearchParams(window.location.search); setCat(u.get('cat') ?? ''); setBrand(u.get('brand') ?? ''); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const openProduct = (id: string) => { try { sessionStorage.setItem('nt-prod-nav', JSON.stringify({ q, cat, sub, allIn, brand, quick })); } catch {} router.push(`/admin/products/${id}`); };

  const tree = useMemo(() => {
    const m = new Map<string, { n: number; out: number; subs: Map<string, number> }>();
    // every real category and sub-category shows, even before it has products
    for (const [c, ss] of Object.entries(GROUPS)) m.set(c, { n: 0, out: 0, subs: new Map(ss.map((s) => [s, 0] as [string, number])) });
    for (const p of products) { const e = m.get(p.cat) ?? { n: 0, out: 0, subs: new Map() }; e.n++; if (stockTotal(p) === 0) e.out++; if (p.sub) e.subs.set(p.sub, (e.subs.get(p.sub) ?? 0) + 1); m.set(p.cat, e); }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [products]);
  const inCat = useMemo(() => (cat ? products.filter((p) => p.cat === cat) : []), [products, cat]);
  const subCards = useMemo(() => {
    const e = tree.find(([c]) => c === cat)?.[1]; if (!e) return [];
    const list = Array.from(e.subs.keys()).sort().map((s) => { const ps = inCat.filter((p) => p.sub === s); return { key: s, label: s, n: ps.length, out: ps.filter((p) => stockTotal(p) === 0).length }; });
    const none = inCat.filter((p) => !p.sub);
    if (list.length && none.length) list.push({ key: NONE, label: 'No sub-category', n: none.length, out: none.filter((p) => stockTotal(p) === 0).length });
    return list;
  }, [tree, cat, inCat]);
  const hasSubs = subCards.length > 0;
  const view: 'cats' | 'subs' | 'table' = q.trim() ? 'table' : !cat ? 'cats' : hasSubs && !sub && !allIn ? 'subs' : 'table';
  const subLabel = sub === NONE ? 'No sub-category' : sub;

  const inScope = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return products.filter((p) => (!cat || p.cat === cat) && (!sub || (sub === NONE ? !p.sub : p.sub === sub)) && (!brand || (p.brand || 'Unbranded') === brand)
      && (!words.length || words.every((w) => (p.name + ' ' + p.sku + ' ' + (p.alias ?? '') + ' ' + (p.brand ?? '') + ' ' + p.cat + ' ' + (p.sub ?? '')).toLowerCase().includes(w))));
  }, [products, q, cat, sub, brand]);
  const counts = useMemo(() => ({ all: inScope.length, out: inScope.filter((p) => stockTotal(p) === 0).length, noprice: inScope.filter(noPrice).length }), [inScope]);
  const rows = useMemo(() => inScope.filter((p) => quick === 'all' || (quick === 'out' && stockTotal(p) === 0) || (quick === 'noprice' && noPrice(p))), [inScope, quick]);
  const brands = useMemo(() => Array.from(new Set(inScope.length || !q ? (cat ? inCat : products).map((p) => p.brand || 'Unbranded') : [])).sort(), [products, inCat, cat, inScope.length, q]);
  const totalOut = useMemo(() => tree.reduce((a, [, e]) => a + e.out, 0), [tree]);

  const reset = () => { setSub(''); setAllIn(false); setBrand(''); setQuick('all'); setQ(''); };
  const open = (c: string) => { reset(); setCat(c); };
  const openSub = (s: string) => { setSub(s); setAllIn(false); setBrand(''); setQuick('all'); setQ(''); };
  /** One step back: products -> sub-categories (or categories when there are none) -> categories. */
  const goUp = () => { if (q) { setQ(''); return; } if ((sub || allIn) && hasSubs) { setSub(''); setAllIn(false); setBrand(''); setQuick('all'); return; } reset(); setCat(''); };
  const add = () => { try { sessionStorage.setItem('nt-prod-nav', JSON.stringify({ q, cat, sub, allIn, brand, quick })); } catch {} router.push('/admin/products/new' + (cat ? `?cat=${encodeURIComponent(cat)}${sub && sub !== NONE ? `&sub=${encodeURIComponent(sub)}` : ''}` : ''));  };
  useScreenKeys([
    { key: 'N', label: 'New item', run: add }, { key: '/', label: 'Search', run: () => { qRef.current?.focus(); qRef.current?.select(); } },
    { key: 'B', label: '', run: () => bRef.current?.focus(), hidden: true },
    { key: 'O', label: view === 'table' ? 'Out of stock' : '', run: () => { if (view === 'table') setQuick(quick === 'out' ? 'all' : 'out'); }, hidden: view !== 'table' },
    { key: 'A', label: view === 'subs' ? 'All items' : '', run: () => { if (view === 'subs') setAllIn(true); else setQuick('all'); }, hidden: view !== 'subs' },
    { key: 'Esc', label: view === 'cats' ? '' : 'Back', run: () => { const a = document.activeElement as HTMLElement | null; if (a && ['INPUT', 'SELECT'].includes(a.tagName)) a.blur(); else goUp(); }, hidden: view === 'cats', typing: true },
  ]);
  const tile = (k: Quick, label: string, n: number, tone: string) => (
    <button key={k} onClick={() => setQuick(quick === k ? 'all' : k)} aria-pressed={quick === k}
      className={`min-w-[120px] rounded-md border px-3 py-1.5 text-left transition ${quick === k ? 'border-gold bg-sage-bg/60' : 'border-line bg-white hover:bg-paper'}`}>
      <div className={`text-[20px] font-semibold leading-tight tabular-nums ${tone}`}>{fmtN(n)}</div><div className="text-[11.5px] text-steel">{label}</div>
    </button>);
  const search = <input ref={qRef} className="!w-64 !rounded-md !px-2.5 !py-1.5 text-[13px]" placeholder={cat && view === 'subs' ? `Search in ${cat}   ( / )` : 'Search name, alias, code   ( / )'} value={q} onChange={(e) => setQ(e.target.value)} />;

  if (view === 'cats') return (
    <div>
      <ScreenHead title="Items" hint={`${fmtN(tree.length)} item groups · ${fmtN(products.length)} items${totalOut ? ` · ${fmtN(totalOut)} out of stock` : ''}. Pick a group with the arrow keys and Enter, or search for an item.`}>
        {search}<KBtn primary k="N" onClick={add}><Plus className="h-4 w-4" />New item</KBtn>
      </ScreenHead>
      <DataGrid csvName="item-groups" rows={tree} rowKey={([c]) => c} onOpen={([c]) => open(c)} openOnClick maxH="calc(100vh - 150px)" empty="No items yet. Press N to add the first one."
        rowClass={([, e]) => (e.n === 0 ? 'text-steel' : '')}
        cols={[
          { h: 'Item group', v: ([c]) => <span className="font-medium">{c}</span>, csv: ([c]) => c, sort: ([c]) => c },
          { h: 'Sub-groups', right: true, v: ([, e]) => (e.subs.size ? fmtN(e.subs.size) : '—'), csv: ([, e]) => e.subs.size, sort: ([, e]) => e.subs.size },
          { h: 'Items', right: true, v: ([, e]) => fmtN(e.n), csv: ([, e]) => e.n, sort: ([, e]) => e.n },
          { h: 'Out of stock', right: true, v: ([, e]) => (e.out ? <span className="font-semibold text-blush-fg">{fmtN(e.out)}</span> : e.n ? <span className="text-steel">0</span> : '—'), csv: ([, e]) => e.out, sort: ([, e]) => e.out },
        ]} />
    </div>
  );

  if (view === 'subs') return (
    <div>
      <ScreenHead title={cat} hint={`${fmtN(subCards.filter((c) => c.key !== NONE).length)} sub-groups · ${fmtN(inCat.length)} items. Pick a sub-group, or press A for every item in ${cat}.`}>
        {search}<KBtn onClick={goUp} k="Esc"><ChevronLeft className="h-4 w-4" />All groups</KBtn><KBtn onClick={() => setAllIn(true)} k="A">All {fmtN(inCat.length)} items</KBtn><KBtn primary k="N" onClick={add}><Plus className="h-4 w-4" />New item</KBtn>
      </ScreenHead>
      <DataGrid csvName={cat + '-sub-groups'} rows={subCards} rowKey={(c) => c.key} onOpen={(c) => openSub(c.key)} openOnClick maxH="calc(100vh - 150px)" empty="No sub-groups"
        rowClass={(c) => (c.n === 0 ? 'text-steel' : '')}
        cols={[
          { h: 'Sub-group', v: (c) => <span className="font-medium">{c.label}</span>, csv: (c) => c.label, sort: (c) => c.label },
          { h: 'Items', right: true, v: (c) => fmtN(c.n), csv: (c) => c.n, sort: (c) => c.n },
          { h: 'Out of stock', right: true, v: (c) => (c.out ? <span className="font-semibold text-blush-fg">{fmtN(c.out)}</span> : c.n ? <span className="text-steel">0</span> : '—'), csv: (c) => c.out, sort: (c) => c.out },
        ]} />
    </div>
  );

  return (
    <div>
      <ScreenHead title={cat ? (sub ? `${cat}  ›  ${subLabel}` : cat) : 'Search results'} hint={cat ? `${fmtN(inScope.length)} items${sub ? '' : allIn ? ` across all of ${cat}` : ''}. Click a row or press Enter to open it.` : 'Searching all categories. Press Esc to clear.'}>
        {search}<KBtn onClick={goUp} k="Esc"><ChevronLeft className="h-4 w-4" />{q ? 'Clear search' : hasSubs && (sub || allIn) ? cat : 'All groups'}</KBtn><KBtn primary k="N" onClick={add}><Plus className="h-4 w-4" />New item</KBtn>
      </ScreenHead>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {tile('all', 'Items here', counts.all, '')}{tile('out', 'Out of stock', counts.out, counts.out ? 'text-blush-fg' : '')}{tile('noprice', 'Price not set', counts.noprice, counts.noprice ? 'text-butter-fg' : '')}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select ref={bRef} aria-label="Company" className={cls} value={brand} onChange={(e) => setBrand(e.target.value)}><option value="">All companies</option>{brands.map((b) => <option key={b}>{b}</option>)}</select></div>
      </div>
      <DataGrid csvName="products" rows={rows} rowKey={(p) => p.id} onOpen={(p) => openProduct(p.id)} openOnClick maxH="calc(100vh - 250px)" empty="No products match these filters"
        cols={[
          { h: 'Code', w: '96px', v: (p) => <span className="font-mono text-[12px] text-steel">{p.sku}</span>, csv: (p) => p.sku, sort: (p) => p.sku },
          { h: 'Item', v: (p) => <span className="font-medium">{p.name}{!cat ? <span className="ml-2 text-[11.5px] font-normal text-steel">{p.cat}{p.sub ? ' › ' + p.sub : ''}</span> : !sub && p.sub ? <span className="ml-2 text-[11.5px] font-normal text-steel">{p.sub}</span> : null}</span>, csv: (p) => p.name, sort: (p) => p.name },
          { h: 'Company', v: (p) => p.brand || <span className="text-steel">—</span>, csv: (p) => p.brand ?? '', sort: (p) => p.brand ?? '' },
          { h: 'Unit', v: (p) => p.unit, csv: (p) => p.unit, sort: (p) => p.unit },
          { h: 'In stock', right: true, v: (p) => { const t = stockTotal(p); return t === 0 ? <span className="font-semibold text-blush-fg">Out</span> : packBreakdown(t, p.unit, p.packs); }, csv: stockTotal, sort: stockTotal },
          { h: 'MRP', right: true, v: (p) => (p.mrp ? fmtPrice(p.mrp) : <span className="text-butter-fg">Not set</span>), csv: (p) => p.mrp ?? 0, sort: (p) => p.mrp ?? 0 },
          { h: 'Retail price', right: true, v: (p) => (noPrice(p) ? <span className="text-butter-fg">Not set</span> : <span className="font-medium">₹{fmtPrice(p.prices[0])}</span>), csv: (p) => p.prices[0], sort: (p) => p.prices[0] },
        ]} />
    </div>
  );
}