'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { CATEGORIES } from '@/lib/seed';
import { emojiFor, slug } from '@/lib/categories';
import { useCatalog } from '@/lib/catalog';
import { isLow, money, stockTotal } from '@/lib/rules';
import { Btn } from '@/components/ui';
import { Crumbs } from '@/components/Crumbs';

const LOCC = ['#B8892B', '#8FA05E', '#EAD9A3'];
const PRICE_TINT = ['bg-sage-bg text-sage-fg', 'bg-sky-bg text-sky-fg', 'bg-butter-bg text-butter-fg', 'bg-lilac-bg text-lilac-fg'];

export default function BrandPage() {
  const { cat, brand } = useParams<{ cat: string; brand: string }>(); const catalog = useCatalog();
  const name = CATEGORIES.find((c) => slug(c) === cat) ?? [...catalog.keys()].find((c) => slug(c) === cat);
  const node = name ? catalog.get(name) : undefined; const b = node?.brands.find((x) => x.slug === brand);
  if (!name || !node || !b) return <div><Crumbs items={[{ label: 'Products', href: '/admin/products' }, { label: 'Not found' }]} /><p>This company has no products here yet.</p></div>;
  return (
    <div className="mx-auto max-w-[1380px]">
      <Crumbs items={[{ label: 'Products', href: '/admin/products' }, { label: <>{emojiFor(name)} {name}</>, href: `/admin/products/category/${node.slug}` }, { label: b.name }]} />
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-[38px] font-semibold leading-none tracking-tight">{b.name} <span className="text-steel">in {name}</span></h1>
          <p className="mt-2 text-steel">{b.models.length} products, {b.variants} variants, {b.units.toLocaleString('en-IN')} units in stock{b.low > 0 && <span className="ml-2 rounded-full bg-blush-bg px-2.5 py-0.5 text-xs font-medium text-blush-fg">{b.low} low</span>}</p>
        </div>
        <Link href={`/admin/products/new?cat=${encodeURIComponent(name)}&brand=${encodeURIComponent(b.name)}`}><Btn><Plus className="h-4 w-4" />Add product for {b.name}</Btn></Link>
      </div>

      <div className="space-y-6">
        {b.models.map((m) => {
          const a = m.variants.map((v) => v.prices[0]);
          return (
            <section key={m.name} className="rounded-[26px] bg-paper/0">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-2 px-1">
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <h2 className="font-display text-2xl font-semibold tracking-tight">{m.name}</h2>
                  <span className="text-sm text-steel">{m.variants.length} variants, {m.units.toLocaleString('en-IN')} units in stock</span>
                  <span className="rounded-full bg-sage-bg px-2.5 py-0.5 text-xs font-medium text-sage-fg">Price A {money(Math.min(...a))} to {money(Math.max(...a))}</span>
                </div>
                <Link href={`/admin/products/new?cat=${encodeURIComponent(name)}&brand=${encodeURIComponent(b.name)}&model=${encodeURIComponent(m.name)}`} className="text-sm font-medium text-brand underline underline-offset-4">Add variant</Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {m.variants.map((p, vi) => {
                  const total = stockTotal(p); const low = isLow(p);
                  return (
                    <article key={p.id} className="fade-up flex flex-col rounded-[22px] border border-line bg-panel p-5 transition duration-200 hover:-translate-y-0.5 hover:border-brand/40" style={{ animationDelay: `${vi * 60}ms` }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link href={`/admin/products/${p.id}`} className="font-display text-[26px] font-semibold leading-none tracking-tight underline-offset-4 hover:underline">{p.variant ?? p.name}</Link>
                          <div className="mt-1 text-xs text-steel">{p.sku}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {low && <span className="rounded-full bg-blush-bg px-2.5 py-0.5 text-xs font-medium text-blush-fg">low stock</span>}
                          {p.shopOnly && <span className="rounded-full bg-sky-bg px-2.5 py-0.5 text-xs font-medium text-sky-fg">shop only</span>}
                        </div>
                      </div>

                      <div className="mt-4 flex items-baseline gap-1.5"><span className="font-display text-[34px] font-semibold leading-none">{total.toLocaleString('en-IN')}</span><span className="text-sm text-steel">{p.unit} in stock</span></div>
                      <div className="mt-2 flex h-2 gap-0.5 overflow-hidden rounded-full bg-paper">{p.stock.map((q, i) => (q > 0 ? <div key={i} className="rounded-full" style={{ width: `${(q / total) * 100}%`, background: LOCC[i] }} /> : null))}</div>
                      <div className="mt-2 grid grid-cols-3 gap-1 text-xs text-steel">
                        {['Shop', 'G1', 'G2'].map((l, i) => <div key={l} title={['Main Shop', 'Godown 1', 'Godown 2'][i]} className="whitespace-nowrap"><span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: LOCC[i] }} />{l}<div className={`font-display text-base font-semibold ${p.stock[i] ? 'text-ink' : 'text-steel/40'}`}>{p.stock[i]}</div></div>)}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {p.prices.map((x, i) => <div key={i} className={`rounded-xl px-3 py-2 ${PRICE_TINT[i]}`}><div className="text-[11px] opacity-75">Price {'ABCD'[i]}</div><div className="font-display text-lg font-semibold leading-tight">{money(x)}</div></div>)}
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-sm">
                        <span className="text-steel">Cost <b className="font-medium text-ink">{money(p.pp)}</b></span>
                        <span className="flex gap-3 font-medium">
                          <Link href={`/admin/products/${p.id}`} className="text-brand underline underline-offset-4">Edit</Link>
                          <Link href={`/admin/stockin?product=${p.id}`} className="text-brand underline underline-offset-4">Add stock</Link>
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}