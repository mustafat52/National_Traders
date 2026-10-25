'use client';
import { useMemo, useState } from 'react';
import { LOCS } from '@/lib/types';
import Link from 'next/link';
import { Download, Plus, Search } from 'lucide-react';
import { useStore } from '@/lib/store';
import { CATEGORIES } from '@/lib/seed';
import { emojiFor, SECTIONS, TINTS } from '@/lib/categories';
import { useCatalog } from '@/lib/catalog';
import { download, isLow, stockTotal, toCsv } from '@/lib/rules';
import { Btn } from '@/components/ui';
import { slug } from '@/lib/categories';

export default function Products() {
  const products = useStore((s) => s.products); const catalog = useCatalog();
  const [q, setQ] = useState(''); const [lowOnly, setLowOnly] = useState(false);
  const hits = useMemo(() => { const t = q.trim().toLowerCase(); if (t.length < 2) return []; const out = []; for (const p of products) { if (p.name.toLowerCase().includes(t) || p.sku.toLowerCase().includes(t)) { out.push(p); if (out.length >= 8) break; } } return out; }, [q, products]);
  const known = new Set(SECTIONS.flatMap((s) => s.cats));
  const extra = [...catalog.keys()].filter((c) => !known.has(c));
  const sections = [...SECTIONS, ...(extra.length ? [{ title: 'Other', cats: extra }] : [])];
  const totalBrands = new Set(products.map((p) => p.brand)).size;
  const exportAll = () => download('price-list.csv', toCsv([
    ['Category', 'Company', 'Product', 'Variant', 'SKU', ...LOCS, 'Total', 'Purchase price', 'Price A', 'Price B', 'Price C', 'Price D'],
    ...products.map((p) => [p.cat, p.brand ?? '', p.model ?? '', p.variant ?? '', p.sku, ...LOCS.map((_, i) => p.stock[i] ?? 0), stockTotal(p), p.pp, ...p.prices]),
  ]));

  return (
    <div className="mx-auto max-w-[1380px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[40px] font-semibold leading-none tracking-tight">Products</h1>
          <p className="mt-2 text-steel">{CATEGORIES.length} categories, {totalBrands} companies, {products.length.toLocaleString('en-IN')} variants</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="outline" onClick={exportAll}><Download className="h-4 w-4" />Export price list</Btn>
          <Link href="/admin/products/new"><Btn><Plus className="h-4 w-4" />Add product</Btn></Link>
        </div>
      </div>

      <div className="mb-8 flex flex-wrap items-start gap-3">
        <div className="relative w-full max-w-xl">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-steel" />
          <input className="!w-full !rounded-xl !py-3 !pl-11 text-[15px]" placeholder="Find any variant by name or SKU" value={q} onChange={(e) => setQ(e.target.value)} />
          {hits.length > 0 && (
            <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-line bg-white shadow-lg">
              {hits.map((p) => (
                <Link key={p.id} href={`/admin/products/${p.id}`} className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-0 hover:bg-paper">
                  <span className="text-xl">{emojiFor(p.cat)}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium">{p.name}</span><span className="block truncate text-xs text-steel">{p.cat} / {p.brand} / {p.model} / {p.variant}</span></span>
                  <span className="text-xs text-steel">{p.sku}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => setLowOnly(!lowOnly)} className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${lowOnly ? 'border-blush-fg/30 bg-blush-bg text-blush-fg' : 'border-line bg-white text-steel hover:text-ink'}`}>Only categories with low stock</button>
      </div>

      <div className="space-y-9">
        {sections.map((sec) => {
          const cats = sec.cats.filter((c) => catalog.has(c) && (!lowOnly || (catalog.get(c)?.low ?? 0) > 0));
          if (!cats.length) return null;
          return (
            <section key={sec.title}>
              <h2 className="mb-3 font-display text-xl font-semibold tracking-tight text-steel">{sec.title}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {cats.map((c) => {
                  const n = catalog.get(c)!; const t = TINTS[Math.max(0, CATEGORIES.indexOf(c)) % TINTS.length];
                  return (
                    <Link key={c} href={`/admin/products/category/${slug(c)}`} className="group flex flex-col rounded-[22px] border border-line bg-panel p-5 transition duration-200 hover:-translate-y-0.5 hover:border-brand/40">
                      <div className="flex items-start justify-between">
                        <span className="flex h-14 w-14 items-center justify-center rounded-2xl text-[28px]" style={{ background: t.bg }}>{emojiFor(c)}</span>
                        {n.low > 0 && <span className="rounded-full bg-blush-bg px-2.5 py-0.5 text-xs font-medium text-blush-fg">{n.low} low</span>}
                      </div>
                      <div className="mt-4 font-display text-xl font-semibold leading-tight">{c}</div>
                      <div className="mt-1 text-sm text-steel">{n.brands.length} {n.brands.length === 1 ? 'company' : 'companies'}, {n.variants} variants</div>
                      <div className="mt-4 border-t border-line pt-3 text-sm text-steel"><b className="font-display text-lg text-ink">{n.units.toLocaleString('en-IN')}</b> units in stock</div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      {products.filter(isLow).length === 0 && lowOnly && <p className="mt-6 text-steel">No category has low stock right now.</p>}
    </div>
  );
}