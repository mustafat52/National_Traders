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
import { LabelCard, useLabelSizes } from '@/components/grid/LabelCard';
import { CONTENT_FIELDS, DEFAULT_CONTENT, contentOf, sameContent, toggleContent } from '@/lib/label';
import type { LabelContent } from '@/lib/types';

const blank = (): Product => ({ id: uid('NT-'), sku: '', name: '', cat: '', unit: 'pcs', pp: 0, prices: [0, 0, 0, 0], stock: LOCS.map(() => 0), min: 10, brand: '', model: '', variant: '' });
const inp = 'w-full !rounded-md !px-2.5 !py-1.5 text-[13px]';
const Panel = ({ title, hint, children, className }: { title: string; hint?: string; children: React.ReactNode; className?: string }) => (
  <section className={`rounded-md border border-line bg-white ${className ?? ''}`}>
    <header className="flex items-baseline justify-between border-b border-line bg-paper px-3 py-1.5"><h2 className="text-[12px] font-semibold uppercase tracking-wide text-steel">{title}</h2>{hint && <span className="text-[11.5px] text-steel">{hint}</span>}</header>
    <div className="px-3 py-1.5">{children}</div>
  </section>
);
/** One field, label on the left like the item screen the shop already uses. */
const F = ({ label, error, hint, children }: { label: string; error?: string; hint?: string; className?: string; children: React.ReactNode }) => (
  <label className="grid items-start gap-x-3 border-b border-line/50 py-1.5 last:border-0 sm:grid-cols-[150px_1fr]"><span className="pt-1.5 text-[12.5px] font-medium">{label}</span>
    <span className="block">{children}{hint && !error && <span className="mt-0.5 block text-[11.5px] text-steel">{hint}</span>}{error && <span className="mt-0.5 block text-[11.5px] font-medium text-blush-fg">{error}</span>}</span></label>
);

/** Product: one product in three short cards: what it is, how it is priced, how it is counted. Stock, prices in bulk and labels have their own screens. */
export default function ProductPage() {
  const { id } = useParams<{ id: string }>(); const router = useRouter(); const goBack = () => { if (window.history.length > 1) router.back(); else router.push('/admin/products'); };
  const products = useStore((s) => s.products); const saveProduct = useStore((s) => s.saveProduct);
  const isNew = id === 'new'; const existing = products.find((p) => p.id === id);
  const [p, setP] = useState<Product>(() => existing ?? blank());
  const [mrp, setMrp] = useState(''); const [cost, setCost] = useState(''); const [disc, setDisc] = useState<string[]>(DEFAULT_DISC.map(String));
  const { size: lsize } = useLabelSizes(); const [lc, setLc] = useState<LabelContent>(DEFAULT_CONTENT); const vendors = useStore((s) => s.vendors); const [minSale, setMinSale] = useState(''); const [stk, setStk] = useState<string[]>(() => LOCS.map(() => ''));
  const [base, setBase] = useState(''); const [size, setSize] = useState(''); const [color, setColor] = useState(''); const [errs, setErrs] = useState<Record<string, string>>({});
  const load = (x: Product) => { setP(x); setBase(x.model || x.name); setSize(x.size ?? ''); setColor(x.color ?? (x.size ? '' : x.variant ?? '')); setMrp(x.mrp ? String(x.mrp) : ''); setMinSale(x.minSale ? String(x.minSale) : ''); setLc(contentOf(x)); setStk(LOCS.map((_, i) => (x.stock[i] ? String(x.stock[i]) : ''))); setCost(x.pp ? String(x.pp) : ''); setDisc((x.disc ?? DEFAULT_DISC).map(String)); };
  useEffect(() => { if (existing) load(existing); }, [existing?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!isNew) return; const u = new URLSearchParams(window.location.search); setP((x) => ({ ...x, cat: u.get('cat') ?? x.cat, sub: u.get('sub') ?? x.sub, brand: u.get('brand') ?? x.brand })); }, [isNew]);
  const cats = useMemo(() => Array.from(new Set([...Object.keys(GROUPS), ...products.map((x) => x.cat)])).sort(), [products]);
  const subs = useMemo(() => GROUPS[p.cat] ?? Array.from(new Set(products.filter((x) => x.cat === p.cat && x.sub).map((x) => x.sub as string))).sort(), [p.cat, products]);
  const brands = useMemo(() => Array.from(new Set(products.map((x) => x.brand).filter(Boolean))).sort() as string[], [products]);
  const code = existing?.sku || (p.cat ? nextCode(p.cat, products.map((x) => x.sku)) : '');
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP((x) => ({ ...x, [k]: v }));
  if (!isNew && !existing) return <p className="text-[13px]">Product not found. <Link href="/admin/products" className="underline">Back to Products</Link></p>;

  const minN = parseFloat(minSale) || 0; const mrpN = parseFloat(mrp); const costN = parseFloat(cost) || 0; const hasMrp = Number.isFinite(mrpN) && mrpN > 0;
  const price = (i: number) => (hasMrp ? priceFrom(mrpN, parseFloat(disc[i]) || 0) : p.prices[i] ?? 0);

  const save = (again: boolean) => {
    const e: Record<string, string> = {};
    if (!p.cat.trim()) e.cat = 'Choose or type a category';
    if (!base.trim()) e.base = 'Type the product name';
    if (mrp && !(mrpN >= 0)) e.mrp = 'Numbers only';
    if (cost && !(costN >= 0)) e.cost = 'Numbers only';
    if (minSale && !(minN >= 0)) e.minSale = 'Numbers only';
    if (isNew && stk.some((x) => x !== '' && !(/^\d+$/.test(x)))) e.stk = 'Opening stock must be whole numbers';
    if (disc.some((d) => d !== '' && !(parseFloat(d) >= 0 && parseFloat(d) <= 100))) e.disc = 'Discounts must be between 0 and 100';
    const packs = (p.packs ?? []).filter((k) => k.name.trim() || k.per);
    if (packs.some((k) => !k.name.trim() || !Number.isInteger(k.per) || k.per < 2)) e.packs = `Each pack needs a name and a whole number above 1 ${p.unit} inside it`;
    else if (new Set(packs.map((k) => k.name.trim().toLowerCase())).size !== packs.length) e.packs = 'Two packs have the same name';
    setErrs(e);
    if (Object.keys(e).length) { document.getElementById('f-' + Object.keys(e)[0])?.focus(); return; }
    const variant = [size.trim(), color.trim()].filter(Boolean).join(' '); const name = [base.trim(), size.trim(), color.trim() ? `(${color.trim()})` : ''].filter(Boolean).join(' ');
    const d = disc.map((x) => parseFloat(x) || 0);
    saveProduct({ ...p, sku: code, size: size.trim() || undefined, color: color.trim() || undefined, cat: p.cat.trim(), sub: (p.sub ?? '').trim() || undefined, brand: (p.brand ?? '').trim() || undefined, model: base.trim(), variant, name, alias: (p.alias ?? '').trim() || undefined, printName: (p.printName ?? '').trim() || undefined, desc: (p.desc ?? '').trim() || undefined, vendorId: p.vendorId || undefined, minSale: minN > 0 ? minN : undefined, label: sameContent(lc, DEFAULT_CONTENT) ? undefined : lc,
      stock: isNew ? LOCS.map((_, i) => parseInt(stk[i] || '0', 10) || 0) : p.stock,
      pp: costN, mrp: hasMrp ? mrpN : undefined, disc: d, prices: hasMrp ? d.map((x) => priceFrom(mrpN, x)) : p.prices, packs: packs.length ? packs.map((k) => ({ name: k.name.trim(), per: k.per })) : undefined });
    toast(`${name} saved${isNew ? ' as ' + code : ''}`);
    if (again) { load({ ...blank(), cat: p.cat, sub: p.sub, brand: p.brand }); setErrs({}); setTimeout(() => document.getElementById('f-cat')?.focus(), 30); } else router.push('/admin/products');
  };
  useScreenKeys([
    { key: 'F2', label: 'Save', run: () => save(false) }, { key: 'F9', label: '', run: () => save(false), hidden: true }, { key: 'Ctrl+S', label: '', run: () => save(false), hidden: true },
    { key: 'Ctrl+Enter', label: 'Save & new', run: () => save(true) }, { key: 'Esc', label: 'Back', run: () => goBack(), typing: true },
  ]);
  const setPack = (i: number, patch: Partial<{ name: string; per: number }>) => set('packs', (p.packs ?? []).map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div className="max-w-6xl">
      <ScreenHead title={isNew ? 'Item: Add' : `Item: ${p.name}`} hint={isNew ? 'Fill the item details, then press F2 to save. Esc to quit.' : `Code ${p.sku}`}>
        <KBtn onClick={goBack} k="Esc">Back</KBtn><KBtn primary onClick={() => save(false)} k="F2">Save</KBtn>
      </ScreenHead>
      <EnterForm className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-3">
          <Panel title="Item">
            <F label="Item group" error={errs.cat}><input id="f-cat" autoFocus className={inp} list="cats" value={p.cat} onChange={(e) => set('cat', e.target.value)} /><datalist id="cats">{cats.map((c) => <option key={c} value={c} />)}</datalist></F>
            <F label="Sub-group"><input id="f-sub" className={inp} list="subs" value={p.sub ?? ''} onChange={(e) => set('sub', e.target.value)} /><datalist id="subs">{subs.map((c) => <option key={c} value={c} />)}</datalist></F>
            <F label="Name" error={errs.base}><input id="f-base" className={inp} value={base} onChange={(e) => setBase(e.target.value)} placeholder="e.g. Key Stand Bike" /></F>
            <F label="Alias" hint="Another name people search by."><input id="f-alias" className={inp} value={p.alias ?? ''} onChange={(e) => set('alias', e.target.value)} /></F>
            <F label="Print name" hint={`Printed on bills. Left empty it prints the full name.`}><input id="f-print" className={inp} value={p.printName ?? ''} onChange={(e) => set('printName', e.target.value)} /></F>
            <F label="Size"><input id="f-size" className={inp} value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. 18mm, 4 inch" /></F>
            <F label="Colour / finish"><input id="f-color" className={inp} value={color} onChange={(e) => setColor(e.target.value)} placeholder="e.g. Black + R/G" /></F>
            <F label="Company"><input id="f-brand" className={inp} list="brands" value={p.brand ?? ''} onChange={(e) => set('brand', e.target.value)} /><datalist id="brands">{brands.map((b) => <option key={b} value={b} />)}</datalist></F>
            <F label="Item code"><span className="inline-block pt-1.5 font-mono text-[13px] font-semibold">{code || '—'}<span className="ml-2 font-sans text-[11.5px] font-normal text-steel">{existing ? '' : code ? 'given automatically when you save' : 'choose a group first'}</span></span></F>
          </Panel>

          <Panel title="Main unit details">
            <F label="Unit" hint="Stock and prices are per this unit."><input id="f-unit" className={inp + ' !max-w-[140px]'} value={p.unit} onChange={(e) => set('unit', e.target.value)} /></F>
            <F label={isNew ? 'Opening stock (qty)' : 'Stock now (qty)'} error={errs.stk} hint={isNew ? undefined : 'Change it from Stock In, Stock Transfer or Physical Stock.'}>
              <div className="space-y-1">{LOCS.map((l, i) => (
                <div key={l} className="flex items-center gap-2 text-[13px]"><span className="w-28 text-steel">{l}</span>
                  {isNew ? <input id={i === 0 ? 'f-stk' : undefined} inputMode="numeric" aria-label={`Opening stock ${l}`} className="!w-24 !rounded-md !px-2 !py-1 text-right tabular-nums" value={stk[i] ?? ''} onFocus={(e) => e.target.select()} onChange={(e) => { if (/^\d*$/.test(e.target.value)) setStk(stk.map((x, j) => (j === i ? e.target.value : x))); }} /> : <b className="tabular-nums">{p.stock[i] ?? 0}</b>}
                </div>))}</div>
            </F>
            <F label="Low-stock alert at" hint="Shown on Low Stock when the total falls to this."><input id="f-min" type="number" min={0} className={inp + ' !max-w-[140px]'} value={p.min} onChange={(e) => set('min', Math.max(0, +e.target.value))} /></F>
            <label className="flex items-start gap-2 border-t border-line/50 py-2 text-[13px]"><input id="f-shop" type="checkbox" className="!mt-0.5 !h-4 !w-4 !p-0" checked={!!p.shopOnly} onChange={(e) => set('shopOnly', e.target.checked)} /><span>Comes directly to the shop<span className="block text-[11.5px] text-steel">Incoming stock always goes to Main Shop.</span></span></label>
          </Panel>

          <Panel title="Packing" hint="Sold by the piece or by the pack">
            <div className="space-y-1.5 py-1">{(p.packs ?? []).map((k, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[13px]"><span className="text-steel">1</span><input id={i === 0 ? 'f-packs' : undefined} className="!w-28 !rounded-md !px-2 !py-1" placeholder="Box" value={k.name} onChange={(e) => setPack(i, { name: e.target.value })} /><span className="text-steel">=</span>
                <input type="number" min={2} className="!w-20 !rounded-md !px-2 !py-1" value={k.per || ''} onChange={(e) => setPack(i, { per: Math.round(+e.target.value) })} /><span className="text-steel">{p.unit}</span>
                <button type="button" aria-label="Remove pack" className="ml-auto text-steel underline" onClick={() => set('packs', (p.packs ?? []).filter((_, j) => j !== i))}>remove</button></div>))}
              <div className="flex gap-3 text-[13px]"><button type="button" className="underline underline-offset-2" onClick={() => set('packs', [...(p.packs ?? []), { name: (p.packs ?? []).length ? '' : 'Box', per: 0 }])}>+ Add a pack</button>{!(p.packs ?? []).some((k) => k.name === 'Dozen') && <button type="button" className="underline underline-offset-2" onClick={() => set('packs', [...(p.packs ?? []), { name: 'Dozen', per: 12 }])}>+ Dozen</button>}</div>
              {errs.packs && <span className="block text-[11.5px] font-medium text-blush-fg">{errs.packs}</span>}
            </div>
          </Panel>
        </div>

        <div className="space-y-3">
          <Panel title="Item price info" hint="Price = MRP minus the discount. Bill totals round to the whole rupee.">
            <F label="M.R.P. (per unit)" error={errs.mrp}><input id="f-mrp" inputMode="decimal" className={inp + ' !max-w-[140px]'} value={mrp} onChange={(e) => { if (/^\d*\.?\d{0,2}$/.test(e.target.value)) setMrp(e.target.value); }} /></F>
            <F label="Purc. price (cost)" error={errs.cost} hint="Owners only. Salesmen never see it."><input id="f-cost" inputMode="decimal" className={inp + ' !max-w-[140px]'} value={cost} onChange={(e) => { if (/^\d*\.?\d{0,2}$/.test(e.target.value)) setCost(e.target.value); }} /></F>
            <F label="Min. sales price" error={errs.minSale} hint="Lowest price this item may be sold at."><input id="f-minsale" inputMode="decimal" className={inp + ' !max-w-[140px]'} value={minSale} onChange={(e) => { if (/^\d*\.?\d{0,2}$/.test(e.target.value)) setMinSale(e.target.value); }} /></F>
            <div className="pt-1.5">
              <table className="w-full text-[13px]"><thead className="text-[11px] uppercase tracking-wide text-steel"><tr><th className="py-1 text-left">Customer category</th><th className="py-1 text-right">Sale discount %</th><th className="py-1 text-right">Sale price</th></tr></thead>
                <tbody>{TIER_NAMES.map((n, i) => { const pr = price(i); return (
                  <tr key={n} className="border-t border-line/70"><td className="py-1">{n}{i === 3 && <span className="ml-2 text-[11.5px] text-steel">no category chosen</span>}</td>
                    <td className="py-1 text-right"><input id={i === 0 ? 'f-disc' : undefined} aria-label={`${n} discount`} inputMode="decimal" className="!w-20 !rounded !px-2 !py-1 text-right tabular-nums" value={disc[i]} onFocus={(e) => e.target.select()} onChange={(e) => { if (/^\d{0,3}\.?\d{0,2}$/.test(e.target.value)) setDisc(disc.map((x, j) => (j === i ? e.target.value : x))); }} /></td>
                    <td className="py-1 text-right text-[15px] font-semibold tabular-nums">{pr > 0 ? '₹' + fmtPrice(pr) : '—'}</td></tr>); })}</tbody></table>
              {errs.disc && <span className="mt-1 block text-[11.5px] font-medium text-blush-fg">{errs.disc}</span>}
              {!hasMrp && <p className="mt-1.5 text-[12px] text-steel">{p.prices.some((x) => x > 0) ? 'Prices were entered directly. Enter the MRP to price by discount.' : 'No MRP yet: prices stay at zero until you enter one.'}</p>}
              {hasMrp && costN > 0 && [0, 1, 2, 3].some((i) => price(i) < costN) && <p className="mt-2 rounded bg-blush-bg px-3 py-1.5 text-[12.5px] text-blush-fg">A price is below the cost price. Check the MRP, cost or discount.</p>}
              {hasMrp && minN > 0 && [0, 1, 2, 3].some((i) => price(i) < minN) && <p className="mt-2 rounded bg-butter-bg px-3 py-1.5 text-[12.5px] text-butter-fg">A price is below the minimum sales price of ₹{fmtPrice(minN)}.</p>}
              {hasMrp && (p.packs ?? []).filter((k) => k.name.trim() && k.per >= 2).map((k) => (
                <div key={k.name} className="mt-2 rounded bg-paper px-3 py-1.5 text-[12.5px]"><b>1 {k.name}</b> = {k.per} {p.unit}: {TIER_NAMES.map((n, i) => `${n.split(' ')[0]} ₹${fmtPrice(Math.round(price(i) * k.per * 100) / 100)}`).join(' · ')}</div>))}
            </div>
          </Panel>

          <Panel title="More details">
            <F label="Default vendor"><select id="f-vendor" className={inp} value={p.vendorId ?? ''} onChange={(e) => set('vendorId', e.target.value)}><option value="">None</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></F>
            <F label="Item description"><textarea id="f-desc" rows={3} className={inp} value={p.desc ?? ''} onChange={(e) => set('desc', e.target.value)} /></F>
          </Panel>

          <Panel title="Label" hint={`${lsize.w} × ${lsize.h} mm`}>
            <div className="flex justify-center rounded-md bg-paper p-3"><LabelCard code={code} name={[base.trim(), size.trim(), color.trim() ? `(${color.trim()})` : ''].filter(Boolean).join(' ')} mrp={hasMrp ? mrpN : undefined} content={lc} size={lsize} scale={Math.min(1.5, 330 / (Math.max(lsize.w, 1) * 3.78))} border /></div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="What to print on this item's label"><span className="mr-1 text-[12px] text-steel">Print on label</span>
              {CONTENT_FIELDS.map(({ k, label }) => <button key={k} type="button" aria-pressed={lc[k]} onClick={() => setLc(toggleContent(lc, k))} className={`rounded border px-2 py-0.5 text-[12px] font-medium ${lc[k] ? 'border-ink bg-ink text-white' : 'border-line bg-white text-steel hover:bg-paper'}`}>{label}</button>)}</div>
            <div className="mt-2 text-[12px] text-steel">Remembered for this item. {isNew ? 'Save the item to print it.' : <Link className="underline" href={`/admin/labels?p=${p.id}`}>Print this label</Link>}</div>
          </Panel>
        </div>
      </EnterForm>
      <p className="mt-3 text-[12.5px] text-steel">Add stock: <Link className="underline" href="/admin/stockin">Stock In</Link> · Correct a count: <Link className="underline" href="/admin/stockcount">Stock Count</Link> · Change many prices: <Link className="underline" href="/admin/prices">Price List</Link> · Labels: <Link className="underline" href="/admin/labels">Print Labels</Link></p>
    </div>
  );
}