'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Plus } from 'lucide-react';
import { useStore } from '@/lib/store';
import { Product } from '@/lib/types';
import { packBreakdown, stockTotal } from '@/lib/rules';
import { fmtPrice } from '@/lib/pricing';
import { GROUPS, PREFIX } from '@/lib/groups';
import { useScreenKeys } from '@/lib/hotkeys';
import { DataGrid } from '@/components/grid/DataGrid';
import { KBtn, ScreenHead } from '@/components/grid/Screen';

type Quick = 'all' | 'out' | 'noprice';
/** Stands for "products of this category that have no sub-category". */
const NONE = '\u0000none';
const noPrice = (p: Product) => !p.prices.some((x) => x > 0);
const cls = 'rounded-md border border-line bg-white px-2 py-1.5 text-[13px]';
const code2 = (c: string) => PREFIX[c] ?? (c.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || '··');
/** Two-letter badge for a sub-category: initials of the first two words, or the first two letters. */
const subCode = (s: string) => { const w = s.replace(/[^A-Za-z ]/g, '').trim().split(/\s+/).filter(Boolean); return ((w.length > 1 ? w[0][0] + w[1][0] : (w[0] ?? '').slice(0, 2)) || '··').toUpperCase(); };
const fmtN = (n: number) => n.toLocaleString('en-IN');

/** One tile on a board: a category, or a sub-category inside a category. */
function BoardCard({ badge, title, note, n, out, onClick }: { badge: string; title: string; note: string; n: number; out: number; onClick: () => void }) {
  return (
    <button role="listitem" onClick={onClick} className="group relative overflow-hidden rounded-lg border border-line bg-white p-3.5 text-left outline-none transition hover:border-gold hover:shadow-sm focus:border-gold focus:ring-2 focus:ring-gold-light">
      <span className="absolute inset-y-0 left-0 w-1 bg-transparent transition group-hover:bg-gold group-focus:bg-gold" />
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sage-bg/70 font-mono text-[12px] font-semibold tracking-wide text-ink">{badge}</span>
        <div className="min-w-0 flex-1"><div className="truncate text-[14px] font-semibold leading-tight">{title}</div><div className="mt-0.5 text-[12px] text-steel">{note}</div></div>
      </div>
      <div className="mt-3 flex items-end justify-between border-t border-line/70 pt-2">
        <div><span className="text-[20px] font-semibold leading-none tabular-nums">{fmtN(n)}</span><span className="ml-1 text-[12px] text-steel">products</span></div>
        {n === 0 ? <span className="text-[11.5px] text-steel">None added yet</span> : out > 0 ? <span className="rounded-full bg-blush-bg px-2 py-0.5 text-[11.5px] font-medium text-blush-fg">{fmtN(out)} out</span> : <span className="text-[11.5px] text-good">All in stock</span>}
      </div>
    </button>
  );
}

/**
 * Products, in three steps: the categories, then the sub-categories of the chosen category, then the products of the chosen sub-category.
 * A category with no sub-categories goes straight to its products. Searching jumps to the table. Esc steps back one level.
 */
export default function Products() {
  const router = useRouter(); const products = useStore((s) => s.products);
  // when a product is opened, remember where we were so Back returns to this exact list
  const saved = useMemo(() => { try { return JSON.parse(sessionStorage.getItem('nt-prod-nav') || 'null') as { q: string; cat: string; sub: string; allIn: boolean; brand: string; quick: Quick } | null; } catch { return null; } }, []);
  const [q, setQ] = useState(saved?.q ?? ''); const [cat, setCat] = useState(saved?.cat ?? ''); const [sub, setSub] = useState(saved?.sub ?? ''); const [allIn, setAllIn] = useState(saved?.allIn ?? false); const [brand, setBrand] = useState(saved?.brand ?? ''); const [quick, setQuick] = useState<Quick>(saved?.quick ?? 'all');
  const qRef = useRef<HTMLInputElement>(null); const bRef = useRef<HTMLSelectElement>(null); const boardRef = useRef<HTMLDivElement>(null);
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
      && (!words.length || words.every((w) => (p.name + ' ' + p.sku + ' ' + (p.brand ?? '') + ' ' + p.cat + ' ' + (p.sub ?? '')).toLowerCase().includes(w))));
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
  // focus the first card when a board shows, so arrows and Enter work straight away
  useEffect(() => { if (view !== 'table') setTimeout(() => { if (!(document.activeElement as HTMLElement | null)?.closest('input,select,textarea')) boardRef.current?.querySelector<HTMLElement>('button')?.focus(); }, 30); }, [view, cat]);

  useScreenKeys([
    { key: 'N', label: 'New product', run: add }, { key: '/', label: 'Search', run: () => { qRef.current?.focus(); qRef.current?.select(); } },
    { key: 'B', label: '', run: () => bRef.current?.focus(), hidden: true },
    { key: 'O', label: view === 'table' ? 'Out of stock' : '', run: () => { if (view === 'table') setQuick(quick === 'out' ? 'all' : 'out'); }, hidden: view !== 'table' },
    { key: 'A', label: view === 'subs' ? 'All products' : '', run: () => { if (view === 'subs') setAllIn(true); else setQuick('all'); }, hidden: view !== 'subs' },
    { key: 'Esc', label: view === 'cats' ? '' : 'Back', run: () => { const a = document.activeElement as HTMLElement | null; if (a && ['INPUT', 'SELECT'].includes(a.tagName)) a.blur(); else goUp(); }, hidden: view === 'cats', typing: true },
  ]);
  const onBoardKey = (e: React.KeyboardEvent) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    const bs = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button')); const i = bs.indexOf(document.activeElement as HTMLElement); if (i < 0) return;
    const cols = bs.filter((b) => b.offsetTop === bs[0].offsetTop).length || 1;
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowDown' ? cols : -cols;
    e.preventDefault(); e.stopPropagation(); bs[Math.max(0, Math.min(bs.length - 1, i + d))].focus();
  };

  const tile = (k: Quick, label: string, n: number, tone: string) => (
    <button key={k} onClick={() => setQuick(quick === k ? 'all' : k)} aria-pressed={quick === k}
      className={`min-w-[120px] rounded-md border px-3 py-1.5 text-left transition ${quick === k ? 'border-gold bg-sage-bg/60' : 'border-line bg-white hover:bg-paper'}`}>
      <div className={`text-[20px] font-semibold leading-tight tabular-nums ${tone}`}>{fmtN(n)}</div><div className="text-[11.5px] text-steel">{label}</div>
    </button>);
  const search = <input ref={qRef} className="!w-64 !rounded-md !px-2.5 !py-1.5 text-[13px]" placeholder={cat && view === 'subs' ? `Search in ${cat}   ( / )` : 'Search name, code, company   ( / )'} value={q} onChange={(e) => setQ(e.target.value)} />;
  const grid = 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

  if (view === 'cats') return (
    <div>
      <ScreenHead title="Products" hint={`${fmtN(tree.length)} categories · ${fmtN(products.length)} products${totalOut ? ` · ${fmtN(totalOut)} out of stock` : ''}. Pick a category, or search for a product.`}>
        {search}<KBtn primary k="N" onClick={add}><Plus className="h-4 w-4" />New product</KBtn>
      </ScreenHead>
      <div ref={boardRef} onKeyDown={onBoardKey} role="list" aria-label="Categories" className={grid}>
        {tree.map(([c, e]) => <BoardCard key={c} badge={code2(c)} title={c} note={e.subs.size ? `${e.subs.size} sub-categor${e.subs.size === 1 ? 'y' : 'ies'}` : 'No sub-categories'} n={e.n} out={e.out} onClick={() => open(c)} />)}
        {!tree.length && <p className="col-span-full rounded-md border border-dashed border-line p-6 text-center text-[13px] text-steel">No products yet. Press N to add the first one.</p>}
      </div>
    </div>
  );

  if (view === 'subs') return (
    <div>
      <ScreenHead title={cat} hint={`${fmtN(subCards.filter((c) => c.key !== NONE).length)} sub-categories · ${fmtN(inCat.length)} products. Pick a sub-category.`}>
        {search}<KBtn onClick={goUp} k="Esc"><ChevronLeft className="h-4 w-4" />All categories</KBtn><KBtn onClick={() => setAllIn(true)} k="A">All {fmtN(inCat.length)} products</KBtn><KBtn primary k="N" onClick={add}><Plus className="h-4 w-4" />New product</KBtn>
      </ScreenHead>
      <div ref={boardRef} onKeyDown={onBoardKey} role="list" aria-label="Sub-categories" className={grid}>
        {subCards.map((c) => <BoardCard key={c.key} badge={c.key === NONE ? '··' : subCode(c.label)} title={c.label} note={cat} n={c.n} out={c.out} onClick={() => openSub(c.key)} />)}
      </div>
    </div>
  );

  return (
    <div>
      <ScreenHead title={cat ? (sub ? `${cat}  ›  ${subLabel}` : cat) : 'Search results'} hint={cat ? `${fmtN(inScope.length)} products${sub ? '' : allIn ? ` across all of ${cat}` : ''}. Press Enter on a row to open it.` : 'Searching all categories. Press Esc to clear.'}>
        {search}<KBtn onClick={goUp} k="Esc"><ChevronLeft className="h-4 w-4" />{q ? 'Clear search' : hasSubs && (sub || allIn) ? cat : 'All categories'}</KBtn><KBtn primary k="N" onClick={add}><Plus className="h-4 w-4" />New product</KBtn>
      </ScreenHead>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {tile('all', 'Products here', counts.all, '')}{tile('out', 'Out of stock', counts.out, counts.out ? 'text-blush-fg' : '')}{tile('noprice', 'Price not set', counts.noprice, counts.noprice ? 'text-butter-fg' : '')}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <select ref={bRef} aria-label="Company" className={cls} value={brand} onChange={(e) => setBrand(e.target.value)}><option value="">All companies</option>{brands.map((b) => <option key={b}>{b}</option>)}</select></div>
      </div>
      <DataGrid csvName="products" rows={rows} rowKey={(p) => p.id} onOpen={(p) => openProduct(p.id)} openOnClick maxH="calc(100vh - 250px)" empty="No products match these filters"
        cols={[
          { h: 'Product', v: (p) => <div className="py-1.5"><div className="font-medium">{p.name}</div><div className="mt-0.5 text-[11.5px] text-steel"><span className="font-mono">{p.sku}</span>{!cat ? ` · ${p.cat}${p.sub ? ' › ' + p.sub : ''}` : !sub && p.sub ? ` · ${p.sub}` : ''}</div></div>, csv: (p) => p.name, sort: (p) => p.name },
          { h: 'Company', v: (p) => p.brand || <span className="text-steel">—</span>, csv: (p) => p.brand ?? '', sort: (p) => p.brand ?? '' },
          { h: 'In stock', right: true, v: (p) => { const t = stockTotal(p); return t === 0 ? <span className="font-semibold text-blush-fg">Out</span> : packBreakdown(t, p.unit, p.packs); }, csv: stockTotal, sort: stockTotal },
          { h: 'Retail price', right: true, v: (p) => (noPrice(p) ? <span className="text-butter-fg">Not set</span> : <div><div className="font-medium tabular-nums">₹{fmtPrice(p.prices[0])}</div>{p.mrp ? <div className="text-[11.5px] text-steel">MRP {fmtPrice(p.mrp)}</div> : null}</div>), csv: (p) => p.prices[0], sort: (p) => p.prices[0] },
        ]} />
    </div>
  );
}