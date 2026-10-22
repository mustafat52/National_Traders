'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { Printer } from 'lucide-react';
import { useStore } from '@/lib/store';
import { CATEGORIES } from '@/lib/seed';
import { emojiFor, slug } from '@/lib/categories';
import { useCatalog } from '@/lib/catalog';
import { LOCS, Product, TIER_NAMES } from '@/lib/types';
import { fmtDate, money, uid } from '@/lib/rules';
import { Btn, Card, DataTable, Field, PageTitle } from '@/components/ui';
import { Crumbs } from '@/components/Crumbs';

const blank = (): Product => ({ id: uid('NT-'), sku: '', name: '', cat: CATEGORIES[0], unit: 'pcs', pp: 0, prices: [0, 0, 0, 0], stock: [0, 0, 0], min: 10, brand: '', model: '', variant: '' });

export default function ProductPage() {
  const { id } = useParams<{ id: string }>(); const router = useRouter(); const catalog = useCatalog();
  const { products, saveProduct, adjustStock, purchases, adjustments } = useStore();
  const isNew = id === 'new';
  const existing = products.find((p) => p.id === id);
  const [p, setP] = useState<Product>(() => existing ?? blank());
  const [adj, setAdj] = useState({ loc: 0, qty: 0, reason: '' });
  useEffect(() => { if (existing) setP(existing); }, [existing?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // "Add product here" links pre-fill category, company and product
  useEffect(() => {
    if (!isNew) return;
    const q = new URLSearchParams(window.location.search);
    setP((x) => ({ ...x, cat: q.get('cat') ?? x.cat, brand: q.get('brand') ?? x.brand, model: q.get('model') ?? x.model }));
  }, [isNew]);
  const brands = useMemo(() => catalog.get(p.cat)?.brands ?? [], [catalog, p.cat]);
  const models = useMemo(() => brands.find((b) => b.name === p.brand)?.models ?? [], [brands, p.brand]);
  if (!isNew && !existing) return <p>Product not found. <Link href="/admin/products" className="text-brand underline">Back</Link></p>;
  const set = <K extends keyof Product>(k: K, v: Product[K]) => setP({ ...p, [k]: v });
  const composed = [p.brand, p.model, p.variant].filter(Boolean).join(' ');
  const margin = (i: number) => (p.pp ? Math.round(((p.prices[i] - p.pp) / p.pp) * 100) : 0);
  const history = purchases.flatMap((pu) => pu.lines.filter((l) => l.pid === p.id).map((l) => ({ no: pu.no, date: pu.date, price: l.price, qty: l.qty.reduce((a, b) => a + b, 0) })));
  const home = p.cat && p.brand ? `/admin/products/category/${slug(p.cat)}/${slug(p.brand)}` : '/admin/products';
  const save = () => {
    const name = p.name || composed;
    if (!name || !p.sku) return alert('A SKU and a name (or company, product and variant) are required');
    saveProduct({ ...p, name }); router.push(home);
  };
  return (
    <>
      {!isNew && <Crumbs items={[{ label: 'Products', href: '/admin/products' }, { label: <>{emojiFor(p.cat)} {p.cat}</>, href: `/admin/products/category/${slug(p.cat)}` }, ...(p.brand ? [{ label: p.brand, href: home }] : []), { label: [p.model, p.variant].filter(Boolean).join(' / ') || p.name }]} />}
      <PageTitle title={isNew ? 'New product' : p.name} sub={isNew ? 'Choose where it belongs: category, company, product, variant' : p.sku}>
        <Btn variant="outline" onClick={() => router.back()}>Back</Btn>
        <Btn onClick={save}>Save product</Btn>
      </PageTitle>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-4 lg:col-span-2">
          <div className="text-sm font-semibold">Where it belongs</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Category"><select className="w-full" value={p.cat} onChange={(e) => set('cat', e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Company"><input className="w-full" list="brands" value={p.brand ?? ''} onChange={(e) => set('brand', e.target.value)} placeholder="e.g. Prime" /><datalist id="brands">{brands.map((b) => <option key={b.name} value={b.name} />)}</datalist></Field>
            <Field label="Product (size or model)"><input className="w-full" list="models" value={p.model ?? ''} onChange={(e) => set('model', e.target.value)} placeholder="e.g. Door 7 x 3 ft" /><datalist id="models">{models.map((m) => <option key={m.name} value={m.name} />)}</datalist></Field>
            <Field label="Variant"><input className="w-full" value={p.variant ?? ''} onChange={(e) => set('variant', e.target.value)} placeholder="e.g. Walnut finish" /></Field>
          </div>
          <div className="text-sm font-semibold">Details</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name shown on bills"><input className="w-full" value={p.name} onChange={(e) => set('name', e.target.value)} placeholder={composed || 'Filled from company, product and variant'} /></Field>
            <Field label="SKU / QR code value"><input className="w-full" value={p.sku} onChange={(e) => set('sku', e.target.value)} /></Field>
            <Field label="Unit"><input className="w-full" value={p.unit} onChange={(e) => set('unit', e.target.value)} /></Field>
            <Field label="Purchase price (admin only)"><input type="number" className="w-full" value={p.pp} onChange={(e) => set('pp', +e.target.value)} /></Field>
            <Field label="Low-stock alert at (total qty)"><input type="number" className="w-full" value={p.min} onChange={(e) => set('min', +e.target.value)} /></Field>
            <div className="sm:col-span-2"><label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><input type="checkbox" className="h-4 w-4 !p-0" checked={!!p.shopOnly} onChange={(e) => set('shopOnly', e.target.checked)} />Comes directly to the shop (incoming stock always goes to Main Shop, no location asked)</label></div>
          </div>
          <div className="text-sm font-semibold">Selling price per customer category</div>
          <div className="grid gap-3 sm:grid-cols-4">{TIER_NAMES.map((t, i) => <Field key={t} label={`${t}, margin ${margin(i)}%`}><input type="number" className="w-full" value={p.prices[i]} onChange={(e) => set('prices', p.prices.map((x, j) => (j === i ? +e.target.value : x)))} /></Field>)}</div>
        </Card>
        <div className="space-y-4">
          <Card className="text-center"><div className="mb-2 text-sm font-semibold">QR label</div>
            <div className="flex justify-center"><QRCodeSVG value={p.sku || 'NEW'} size={140} /></div><div className="mt-1 text-xs">{p.sku}</div><div className="text-xs text-slate-500">{p.name || composed}</div>
            <Btn variant="outline" className="no-print mt-3" onClick={() => window.print()}><Printer className="h-4 w-4" />Print label</Btn></Card>
          {!isNew && <Card><div className="mb-2 text-sm font-semibold">Stock by location</div>
            {LOCS.map((l, i) => <div key={l} className="flex justify-between border-b border-slate-100 py-1 text-sm"><span>{l}</span><b>{p.stock[i]}</b></div>)}
            <Link href={`/admin/stockin?product=${p.id}`}><Btn className="mt-3 w-full">+ Add incoming stock</Btn></Link>
            {p.shopOnly && <div className="mt-1 text-xs text-slate-500">Direct-to-shop product: stock-in goes to Main Shop automatically.</div>}
            <div className="mt-3 text-xs font-medium text-slate-500">Adjust after physical count</div>
            <div className="mt-1 grid grid-cols-2 gap-2"><select value={adj.loc} onChange={(e) => setAdj({ ...adj, loc: +e.target.value })}>{LOCS.map((l, i) => <option key={l} value={i}>{l}</option>)}</select><input type="number" placeholder="New qty" onChange={(e) => setAdj({ ...adj, qty: +e.target.value })} /></div>
            <input className="mt-2 w-full" placeholder="Reason (required)" value={adj.reason} onChange={(e) => setAdj({ ...adj, reason: e.target.value })} />
            <Btn className="mt-2 w-full" onClick={() => { if (!adj.reason) return alert('Reason is required'); adjustStock(p.id, adj.loc, adj.qty, adj.reason); setAdj({ ...adj, reason: '' }); }}>Apply adjustment</Btn></Card>}
        </div>
      </div>
      {!isNew && <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div><div className="mb-2 text-sm font-semibold">Purchase price history</div><DataTable pageSize={6} rows={history} cols={[{ h: 'Purchase', v: (r) => r.no }, { h: 'Date', v: (r) => fmtDate(r.date) }, { h: 'Qty', v: (r) => r.qty, right: true }, { h: 'Price', v: (r) => money(r.price), right: true }]} /></div>
        <div><div className="mb-2 text-sm font-semibold">Stock adjustments</div><DataTable pageSize={6} rows={adjustments.filter((a) => a.pid === p.id)} cols={[{ h: 'Date', v: (r) => fmtDate(r.date) }, { h: 'Location', v: (r) => LOCS[r.loc] }, { h: 'From, To', v: (r) => `${r.from} to ${r.to}` }, { h: 'Reason', v: (r) => r.reason }]} /></div>
      </div>}
    </>
  );
}