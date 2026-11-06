'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { LOCS, Product, TIER_NAMES } from '@/lib/types';
import { uid } from '@/lib/rules';
import { DEFAULT_DISC, fmtPrice, priceFrom } from '@/lib/pricing';
import { GROUPS, nextCode } from '@/lib/groups';
import { useScreenKeys } from '@/lib/hotkeys';
import { EnterForm } from '@/components/grid/FormRow';
import { KBtn, ScreenHead } from '@/components/grid/Screen';
import { toast } from '@/components/grid/Toast';
import { LabelCard } from '@/components/grid/LabelCard';
import { LABEL } from '@/lib/label';

const blank = (): Product => ({ id: uid('NT-'), sku: '', name: '', cat: '', unit: 'pcs', pp: 0, prices: [0, 0, 0, 0], stock: LOCS.map(() => 0), min: 10, brand: '', model: '', variant: '' });
const inp = 'w-full !rounded-md !px-2.5 !py-1.5 text-[13px]';
const Card = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <section className="rounded-lg border border-line bg-white">
    <header className="flex items-baseline justify-between border-b border-line px-4 py-2"><h2 className="text-[12px] font-semibold uppercase tracking-wide text-steel">{title}</h2>{hint && <span className="text-[12px] text-steel">{hint}</span>}</header>
    <div className="p-4">{children}</div>
  </section>
);
const F = ({ label, error, hint, className, children }: { label: string; error?: string; hint?: string; className?: string; children: React.ReactNode }) => (
  <label className={`block ${className ?? ''}`}><span className="mb-1 block text-[12.5px] font-medium">{label}</span>{children}{hint && !error && <span className="mt-0.5 block text-[11.5px] text-steel">{hint}</span>}{error && <span className="mt-0.5 block text-[11.5px] font-medium text-blush-fg">{error}</span>}</label>
);

/** Product: one product in three short cards: what it is, how it is priced, how it is counted. Stock, prices in bulk and labels have their own screens. */
export default function ProductPage() {
  const { id } = useParams<{ id: string }>(); const router = useRouter(); const goBack = () => { if (window.history.length > 1) router.back(); else router.push('/admin/products'); };
  const products = useStore((s) => s.products); const saveProduct = useStore((s) => s.saveProduct);
  const isNew = id === 'new'; const existing = products.find((p) => p.id === id);
  const [p, setP] = useState<Product>(() => existing ?? blank());
  const [mrp, setMrp] = useState(''); const [cost, setCost] = useState(''); const [disc, setDisc] = useState<string[]>(DEFAULT_DISC.map(String));
  const [base, setBase] = useState(''); const [size, setSize] = useState(''); const [color, setColor] = useState(''); const [errs, setErrs] = useState<Record<string, string>>({});
  const load = (x: Product) => { setP(x); setBase(x.model || x.name); setSize(x.size ?? ''); setColor(x.color ?? (x.size ? '' : x.variant ?? '')); setMrp(x.mrp ? String(x.mrp) : ''); setCost(x.pp ? String(x.pp) : ''); setDisc((x.disc ?? DEFAULT_DISC).map(String)); };
  useEffect(() => { if (existing) load(existing); }, [existing?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!isNew) return; const u = new URLSearchParams(window.location.search); setP((x) => ({ ...x, cat: u.get('cat') ?? x.cat, sub: u.get('sub') ?? x.sub, brand: u.get('brand') ?? x.brand })); }, [isNew]);
  const cats = useMemo(() => Array.from(new Set([...Object.keys(GROUPS), ...products.map((x) => x.cat)])).sort(), [products]);
  const subs = useMemo(() => GROUPS[p.cat] ?? Array.from(new Set(products.filter((x) => x.cat === p.cat && x.sub).map((x) => x.sub as string))).sort(), [p.cat, products]);
  const brands = useMemo(() => Array.from(new Set(products.map((x) => x.brand).filter(Boolean))).sort() as string[], [products]);
  const code = existing?.sku || (p.cat ? nextCode(p.cat, products.map((x) => x.sku)) : '');
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP((x) => ({ ...x, [k]: v }));
  if (!isNew && !existing) return <p className="text-[13px]">Product not found. <Link href="/admin/products" className="underline">Back to Products</Link></p>;

  const mrpN = parseFloat(mrp); const costN = parseFloat(cost) || 0; const hasMrp = Number.isFinite(mrpN) && mrpN > 0;
  const price = (i: number) => (hasMrp ? priceFrom(mrpN, parseFloat(disc[i]) || 0) : p.prices[i] ?? 0);

  const save = (again: boolean) => {
    const e: Record<string, string> = {};
    if (!p.cat.trim()) e.cat = 'Choose or type a category';
    if (!base.trim()) e.base = 'Type the product name';
    if (mrp && !(mrpN >= 0)) e.mrp = 'Numbers only';
    if (cost && !(costN >= 0)) e.cost = 'Numbers only';
    if (disc.some((d) => d !== '' && !(parseFloat(d) >= 0 && parseFloat(d) <= 100))) e.disc = 'Discounts must be between 0 and 100';
    const packs = (p.packs ?? []).filter((k) => k.name.trim() || k.per);
    if (packs.some((k) => !k.name.trim() || !Number.isInteger(k.per) || k.per < 2)) e.packs = `Each pack needs a name and a whole number above 1 ${p.unit} inside it`;
    else if (new Set(packs.map((k) => k.name.trim().toLowerCase())).size !== packs.length) e.packs = 'Two packs have the same name';
    setErrs(e);
    if (Object.keys(e).length) { document.getElementById('f-' + Object.keys(e)[0])?.focus(); return; }
    const variant = [size.trim(), color.trim()].filter(Boolean).join(' '); const name = [base.trim(), size.trim(), color.trim() ? `(${color.trim()})` : ''].filter(Boolean).join(' ');
    const d = disc.map((x) => parseFloat(x) || 0);
    saveProduct({ ...p, sku: code, size: size.trim() || undefined, color: color.trim() || undefined, cat: p.cat.trim(), sub: (p.sub ?? '').trim() || undefined, brand: (p.brand ?? '').trim() || undefined, model: base.trim(), variant, name,
      pp: costN, mrp: hasMrp ? mrpN : undefined, disc: d, prices: hasMrp ? d.map((x) => priceFrom(mrpN, x)) : p.prices, packs: packs.length ? packs.map((k) => ({ name: k.name.trim(), per: k.per })) : undefined });
    toast(`${name} saved${isNew ? ' as ' + code : ''}`);
    if (again) { load({ ...blank(), cat: p.cat, sub: p.sub, brand: p.brand }); setErrs({}); setTimeout(() => document.getElementById('f-cat')?.focus(), 30); } else router.push('/admin/products');
  };
  useScreenKeys([
    { key: 'F9', label: 'Save', run: () => save(false) }, { key: 'Ctrl+S', label: '', run: () => save(false), hidden: true },
    { key: 'Ctrl+Enter', label: 'Save & new', run: () => save(true) }, { key: 'Esc', label: 'Back', run: () => goBack(), typing: true },
  ]);
  const setPack = (i: number, patch: Partial<{ name: string; per: number }>) => set('packs', (p.packs ?? []).map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div className="max-w-5xl">
      <ScreenHead title={isNew ? 'New product' : p.name} hint={isNew ? 'Fill the three cards, then press F9.' : `Code ${p.sku}`}>
        <KBtn onClick={goBack} k="Esc">Back</KBtn><KBtn primary onClick={() => save(false)} k="F9">Save</KBtn>
      </ScreenHead>
      <EnterForm className="space-y-3">
        <div className="grid gap-3 lg:grid-cols-5">
          <div className="lg:col-span-3"><Card title="Product">
            <div className="grid gap-3 sm:grid-cols-2">
              <F label="Category" error={errs.cat}><input id="f-cat" autoFocus className={inp} list="cats" value={p.cat} onChange={(e) => set('cat', e.target.value)} /><datalist id="cats">{cats.map((c) => <option key={c} value={c} />)}</datalist></F>
              <F label="Sub-category"><input id="f-sub" className={inp} list="subs" value={p.sub ?? ''} onChange={(e) => set('sub', e.target.value)} /><datalist id="subs">{subs.map((c) => <option key={c} value={c} />)}</datalist></F>
              <F label="Product name" error={errs.base} className="sm:col-span-2"><input id="f-base" className={inp} value={base} onChange={(e) => setBase(e.target.value)} placeholder="e.g. Key Stand Bike" /></F>
              <F label="Size" hint="Optional. Size or thickness, e.g. 18mm, 4 inch."><input id="f-size" className={inp} value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. 18mm" /></F>
              <F label="Colour / finish" hint="Optional. e.g. Black, Antik, Gold."><input id="f-color" className={inp} value={color} onChange={(e) => setColor(e.target.value)} placeholder="e.g. Black + R/G" /></F>
              <F label="Company" hint="Optional. Each size or colour is its own product with its own code."><input id="f-brand" className={inp} list="brands" value={p.brand ?? ''} onChange={(e) => set('brand', e.target.value)} /><datalist id="brands">{brands.map((b) => <option key={b} value={b} />)}</datalist></F>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-md bg-paper px-3 py-2 text-[13px]"><span className="text-steel">Product code</span><b className="font-mono">{code || '—'}</b><span className="text-[12px] text-steel">{existing ? '' : code ? 'given automatically when you save' : 'choose a category first'}</span></div>
          </Card></div>
          <div className="space-y-3 lg:col-span-2"><Card title="Counting and stock">
            <div className="grid gap-3 sm:grid-cols-2">
              <F label="Smallest unit" hint="Stock and prices are per this"><input id="f-unit" className={inp} value={p.unit} onChange={(e) => set('unit', e.target.value)} /></F>
              <F label="Low-stock alert at"><input id="f-min" type="number" min={0} className={inp} value={p.min} onChange={(e) => set('min', Math.max(0, +e.target.value))} /></F>
            </div>
            <div className="mt-3"><span className="mb-1 block text-[12.5px] font-medium">Packs (Box, Dozen)</span>
              <div className="space-y-1.5">{(p.packs ?? []).map((k, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[13px]"><input id={i === 0 ? 'f-packs' : undefined} className="!w-24 !rounded-md !px-2 !py-1" placeholder="Box" value={k.name} onChange={(e) => setPack(i, { name: e.target.value })} /><span className="text-steel">=</span>
                  <input type="number" min={2} className="!w-20 !rounded-md !px-2 !py-1" value={k.per || ''} onChange={(e) => setPack(i, { per: Math.round(+e.target.value) })} /><span className="text-steel">{p.unit}</span>
                  <button type="button" aria-label="Remove pack" className="ml-auto text-steel underline" onClick={() => set('packs', (p.packs ?? []).filter((_, j) => j !== i))}>remove</button></div>))}
                <div className="flex gap-3 text-[13px]"><button type="button" className="underline underline-offset-2" onClick={() => set('packs', [...(p.packs ?? []), { name: '', per: 0 }])}>+ Add a pack</button>{!(p.packs ?? []).some((k) => k.name === 'Dozen') && <button type="button" className="underline underline-offset-2" onClick={() => set('packs', [...(p.packs ?? []), { name: 'Dozen', per: 12 }])}>+ Dozen (12)</button>}</div>
              </div>{errs.packs && <span className="mt-1 block text-[11.5px] font-medium text-blush-fg">{errs.packs}</span>}</div>
            <label className="mt-3 flex items-start gap-2 text-[13px]"><input id="f-shop" type="checkbox" className="!mt-0.5 !h-4 !w-4 !p-0" checked={!!p.shopOnly} onChange={(e) => set('shopOnly', e.target.checked)} /><span>Comes directly to the shop<span className="block text-[11.5px] text-steel">Incoming stock always goes to Main Shop.</span></span></label>
          </Card>
          <Card title="Label" hint={`${LABEL.w} × ${LABEL.h} mm`}>
            <div className="flex justify-center rounded-md bg-paper p-3"><LabelCard code={code} mrp={hasMrp ? mrpN : undefined} scale={1.5} border /></div>
            <div className="mt-2 text-[12px] text-steel">QR code, product code, MRP. {isNew ? 'Save the product to print it.' : <Link className="underline" href={`/admin/labels?p=${p.id}`}>Print this label</Link>}</div>
          </Card></div>
        </div>
        <Card title="Price" hint="Price = MRP minus the discount. Each bill total is rounded to the whole rupee at the end.">
          <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
            <div className="space-y-3">
              <F label="MRP (per unit)" error={errs.mrp}><input id="f-mrp" inputMode="decimal" className={inp} value={mrp} onChange={(e) => { if (/^\d*\.?\d{0,2}$/.test(e.target.value)) setMrp(e.target.value); }} /></F>
              <F label="Cost price (owners only)" error={errs.cost}><input id="f-cost" inputMode="decimal" className={inp} value={cost} onChange={(e) => { if (/^\d*\.?\d{0,2}$/.test(e.target.value)) setCost(e.target.value); }} /></F>
              {!hasMrp && <p className="text-[12px] text-steel">{p.prices.some((x) => x > 0) ? 'Prices were entered directly. Enter the MRP to price by discount.' : 'No MRP yet: prices stay at zero until you enter one.'}</p>}
            </div>
            <div>
              <table className="w-full text-[13px]"><thead className="text-[11px] uppercase tracking-wide text-steel"><tr><th className="py-1 text-left">Customer category</th><th className="py-1 text-right">Discount %</th><th className="py-1 text-right">Price</th></tr></thead>
                <tbody>{TIER_NAMES.map((n, i) => { const pr = price(i); return (
                  <tr key={n} className="border-t border-line/70"><td className="py-1">{n}{i === 3 && <span className="ml-2 text-[11.5px] text-steel">when no category is chosen</span>}</td>
                    <td className="py-1 text-right"><input id={i === 0 ? 'f-disc' : undefined} aria-label={`${n} discount`} inputMode="decimal" className="!w-20 !rounded !px-2 !py-1 text-right tabular-nums" value={disc[i]} onFocus={(e) => e.target.select()} onChange={(e) => { if (/^\d{0,3}\.?\d{0,2}$/.test(e.target.value)) setDisc(disc.map((x, j) => (j === i ? e.target.value : x))); }} /></td>
                    <td className="py-1 text-right text-[15px] font-semibold tabular-nums">{pr > 0 ? '₹' + fmtPrice(pr) : '—'}</td>
                    </tr>); })}</tbody></table>
              {errs.disc && <span className="mt-1 block text-[11.5px] font-medium text-blush-fg">{errs.disc}</span>}
              {hasMrp && costN > 0 && [0, 1, 2, 3].some((i) => price(i) < costN) && <p className="mt-2 rounded bg-blush-bg px-3 py-1.5 text-[12.5px] text-blush-fg">A price is below the cost price. Check the MRP, cost or discount.</p>}
            </div>
          </div>
        </Card>
      </EnterForm>
      <p className="mt-3 text-[12.5px] text-steel">Add stock: <Link className="underline" href="/admin/stockin">Stock In</Link> · Correct a count: <Link className="underline" href="/admin/stockcount">Stock Count</Link> · Change many prices: <Link className="underline" href="/admin/prices">Price List</Link> · Labels: <Link className="underline" href="/admin/labels">Print Labels</Link></p>
    </div>
  );
}