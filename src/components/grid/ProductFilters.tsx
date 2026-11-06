'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { isLow } from '@/lib/rules';
import { useScreenKeys } from '@/lib/hotkeys';
import { Product } from '@/lib/types';

/** Search + Category + Company + "low stock only", shared by Products, Price List, Stock Position, Stock Count and Labels. */
export function useProductFilters(opts: { lowKey?: boolean; extra?: (p: Product) => boolean } = {}) {
  const products = useStore((s) => s.products);
  const [q, setQ] = useState(''); const [cat, setCat] = useState(''); const [brand, setBrand] = useState(''); const [low, setLow] = useState(false);
  const qRef = useRef<HTMLInputElement>(null); const cRef = useRef<HTMLSelectElement>(null); const bRef = useRef<HTMLSelectElement>(null);
  useEffect(() => { const u = new URLSearchParams(window.location.search); setCat(u.get('cat') ?? ''); setBrand(u.get('brand') ?? ''); }, []);
  const cats = useMemo(() => Array.from(new Set(products.map((p) => p.cat))).sort(), [products]);
  const brands = useMemo(() => Array.from(new Set(products.filter((p) => !cat || p.cat === cat).map((p) => p.brand || 'Unbranded'))).sort(), [products, cat]);
  const list = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return products.filter((p) => (!cat || p.cat === cat) && (!brand || (p.brand || 'Unbranded') === brand) && (!low || isLow(p)) && (!opts.extra || opts.extra(p))
      && (!words.length || words.every((w) => (p.name + ' ' + p.sku + ' ' + (p.brand ?? '') + ' ' + p.cat).toLowerCase().includes(w))));
  }, [products, q, cat, brand, low]); // eslint-disable-line react-hooks/exhaustive-deps
  useScreenKeys([
    { key: '/', label: 'Search', run: () => { qRef.current?.focus(); qRef.current?.select(); } },
    { key: 'C', label: 'Category', run: () => cRef.current?.focus(), hidden: true },
    { key: 'B', label: 'Company', run: () => bRef.current?.focus(), hidden: true },
    { key: 'L', label: low ? 'All stock' : 'Low only', run: () => setLow((x) => !x) },
    { key: 'Esc', label: '', run: () => { const a = document.activeElement as HTMLElement | null; if (a && ['INPUT', 'SELECT'].includes(a.tagName)) a.blur(); else if (q) setQ(''); }, hidden: true, typing: true },
  ]);
  const sel = 'rounded-md border border-line bg-white px-2 py-1.5 text-[13px]';
  const bar = (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <input ref={qRef} className="!w-64 !rounded-md !px-2.5 !py-1.5 text-[13px]" placeholder="Search name, SKU, company   ( / )" value={q} onChange={(e) => setQ(e.target.value)} />
      <select ref={cRef} aria-label="Category" className={sel} value={cat} onChange={(e) => { setCat(e.target.value); setBrand(''); }}><option value="">All categories</option>{cats.map((c) => <option key={c}>{c}</option>)}</select>
      <select ref={bRef} aria-label="Company" className={sel} value={brand} onChange={(e) => setBrand(e.target.value)}><option value="">All companies</option>{brands.map((b) => <option key={b}>{b}</option>)}</select>
      <label className="flex items-center gap-1.5 text-[13px]"><input type="checkbox" className="!h-4 !w-4 !p-0" checked={low} onChange={(e) => setLow(e.target.checked)} />Low stock only</label>
      <span className="text-[12px] text-steel">{list.length.toLocaleString('en-IN')} of {products.length.toLocaleString('en-IN')}</span>
    </div>
  );
  return { list, bar, q, cat, brand };
}
