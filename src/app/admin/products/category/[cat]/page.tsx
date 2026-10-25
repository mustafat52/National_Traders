'use client';
import { useMemo, useState } from 'react';
import { LOCS } from '@/lib/types';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Download, Plus, Search } from 'lucide-react';
import { CATEGORIES } from '@/lib/seed';
import { emojiFor, slug, TINTS } from '@/lib/categories';
import { useCatalog } from '@/lib/catalog';
import { download, stockTotal, toCsv } from '@/lib/rules';
import { Btn } from '@/components/ui';
import { Crumbs } from '@/components/Crumbs';

export default function CategoryPage() {
  const { cat } = useParams<{ cat: string }>(); const catalog = useCatalog();
  const name = CATEGORIES.find((c) => slug(c) === cat) ?? [...catalog.keys()].find((c) => slug(c) === cat);
  const node = name ? catalog.get(name) : undefined; const [q, setQ] = useState('');
  const hits = useMemo(() => {
    const t = q.trim().toLowerCase(); if (!node || t.length < 2) return [];
    return node.brands.flatMap((b) => b.models.flatMap((m) => m.variants.filter((p) => p.name.toLowerCase().includes(t) || p.sku.toLowerCase().includes(t)))).slice(0, 12);
  }, [q, node]);
  if (!name || !node) return <div><Crumbs items={[{ label: 'Products', href: '/admin/products' }, { label: 'Not found' }]} /><p>This category has no products yet.</p></div>;
  const exportCat = () => download(`${slug(name)}.csv`, toCsv([
    ['Company', 'Product', 'Variant', 'SKU', ...LOCS, 'Total', 'Purchase price', 'Price A', 'Price B', 'Price C', 'Price D'],
    ...node.brands.flatMap((b) => b.models.flatMap((m) => m.variants.map((p) => [b.name, m.name, p.variant ?? '', p.sku, ...LOCS.map((_, i) => p.stock[i] ?? 0), stockTotal(p), p.pp, ...p.prices]))),
  ]));
  const tint = TINTS[Math.max(0, CATEGORIES.indexOf(name)) % TINTS.length];
  return (
    <div className="mx-auto max-w-[1380px]">
      <Crumbs items={[{ label: 'Products', href: '/admin/products' }, { label: <>{emojiFor(name)} {name}</> }]} />
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-[72px] w-[72px] items-center justify-center rounded-3xl text-[40px]" style={{ background: tint.bg }}>{emojiFor(name)}</span>
          <div>
            <h1 className="font-display text-[38px] font-semibold leading-none tracking-tight">{name}</h1>
            <p className="mt-2 text-steel">{node.brands.length} companies, {node.models} products, {node.variants} variants, {node.units.toLocaleString('en-IN')} units in stock{node.low > 0 && <span className="ml-2 rounded-full bg-blush-bg px-2.5 py-0.5 text-xs font-medium text-blush-fg">{node.low} low</span>}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Btn variant="outline" onClick={exportCat}><Download className="h-4 w-4" />Export</Btn>
          <Link href={`/admin/products/new?cat=${encodeURIComponent(name)}`}><Btn><Plus className="h-4 w-4" />Add product here</Btn></Link>
        </div>
      </div>

      <div className="relative mb-7 w-full max-w-xl">
        <Search className="absolute left-4 top-3.5 h-4 w-4 text-steel" />
        <input className="!w-full !rounded-xl !py-3 !pl-11 text-[15px]" placeholder={`Search inside ${name}`} value={q} onChange={(e) => setQ(e.target.value)} />
        {hits.length > 0 && (
          <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-line bg-white shadow-lg">
            {hits.map((p) => (
              <Link key={p.id} href={`/admin/products/${p.id}`} className="block border-b border-line px-4 py-2.5 last:border-0 hover:bg-paper">
                <span className="block font-medium">{p.name}</span><span className="block text-xs text-steel">{p.brand} / {p.model} / {p.variant}, {p.sku}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <h2 className="mb-3 font-display text-xl font-semibold tracking-tight text-steel">Companies</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {node.brands.map((b, i) => {
          const t = TINTS[(i + 2) % TINTS.length];
          return (
            <Link key={b.name} href={`/admin/products/category/${node.slug}/${b.slug}`} className="flex flex-col rounded-[22px] border border-line bg-panel p-5 transition duration-200 hover:-translate-y-0.5 hover:border-brand/40">
              <div className="flex items-start justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl font-display text-2xl font-bold" style={{ background: t.bg, color: t.fg }}>{b.name[0]}</span>
                {b.low > 0 && <span className="rounded-full bg-blush-bg px-2.5 py-0.5 text-xs font-medium text-blush-fg">{b.low} low</span>}
              </div>
              <div className="mt-4 font-display text-2xl font-semibold leading-tight">{b.name}</div>
              <div className="mt-1 text-sm text-steel">{b.models.length} products, {b.variants} variants</div>
              <div className="mt-3 flex flex-wrap gap-1.5">{b.models.map((m) => <span key={m.name} className="rounded-full bg-paper px-2.5 py-0.5 text-xs text-steel">{m.name.replace(/^.*\s/, '')}</span>)}</div>
              <div className="mt-4 border-t border-line pt-3 text-sm text-steel"><b className="font-display text-lg text-ink">{b.units.toLocaleString('en-IN')}</b> units in stock</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}