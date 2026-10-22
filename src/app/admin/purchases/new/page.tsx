'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { useStore, useProductMap } from '@/lib/store';
import { LOCS, Product, PurchaseLine, TIER_NAMES } from '@/lib/types';
import { money } from '@/lib/rules';
import { Btn, Card, Field, PageTitle, ProductPicker } from '@/components/ui';

export default function NewPurchase() {
  const { vendors, addPurchase } = useStore(); const pm = useProductMap(); const router = useRouter();
  const [vendorId, setVendorId] = useState(vendors[0]?.id ?? ''); const [billNo, setBillNo] = useState('');
  const [lines, setLines] = useState<PurchaseLine[]>([]);
  const add = (p: Product) => setLines((l) => (l.some((x) => x.pid === p.id) ? l : [...l, { pid: p.id, qty: [0, 0, 0], price: p.pp }]));
  const upd = (i: number, f: (l: PurchaseLine) => PurchaseLine) => setLines(lines.map((l, j) => (j === i ? f(l) : l)));
  const total = lines.reduce((a, l) => a + l.price * l.qty.reduce((x, y) => x + y, 0), 0);
  return (
    <>
      <PageTitle title="New Purchase Entry" sub="Each line can be received in the shop, a godown, or split across locations" />
      <Card className="mb-4 grid max-w-3xl gap-3 sm:grid-cols-2">
        <Field label="Vendor"><select className="w-full" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></Field>
        <Field label="Vendor bill number"><input className="w-full" value={billNo} onChange={(e) => setBillNo(e.target.value)} /></Field>
      </Card>
      <div className="mb-3 max-w-3xl"><ProductPicker onPick={add} /></div>
      <div className="space-y-3">
        {lines.map((l, i) => { const p = pm.get(l.pid)!; const diff = l.price - p.pp; const qty = l.qty.reduce((a, b) => a + b, 0);
          return <Card key={l.pid}>
            <div className="flex items-start justify-between"><div><b>{p.name}</b><div className="text-xs text-slate-500">{p.sku} · last purchase price {money(p.pp)}</div></div><button onClick={() => setLines(lines.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4 text-red-500" /></button></div>
            <div className="mt-2 grid gap-2 sm:grid-cols-5">
              {p.shopOnly
                ? <><Field label="Qty (direct to Main Shop)"><input type="number" min={0} className="w-full" value={l.qty[0] || ''} onChange={(e) => upd(i, (x) => ({ ...x, qty: [+e.target.value, 0, 0] }))} /></Field><span className="hidden sm:col-span-2 sm:block" /></>
                : LOCS.map((loc, k) => <Field key={loc} label={`Qty → ${loc}`}><input type="number" min={0} className="w-full" value={l.qty[k] || ''} onChange={(e) => upd(i, (x) => ({ ...x, qty: x.qty.map((q, j) => (j === k ? +e.target.value : q)) }))} /></Field>)}
              <Field label="Purchase price"><input type="number" className="w-full" value={l.price} onChange={(e) => upd(i, (x) => ({ ...x, price: +e.target.value }))} /></Field>
              <div className="self-end text-right text-sm font-semibold">{money(qty * l.price)}</div>
            </div>
            {diff !== 0 && <div className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">Price changed {diff > 0 ? '+' : ''}{money(diff)} vs last purchase. Margins at new price: {TIER_NAMES.map((t, k) => `${t.slice(-1)} ${Math.round(((p.prices[k] - l.price) / l.price) * 100)}%`).join(' · ')}. Review selling prices on the product page if needed.</div>}
          </Card>; })}
      </div>
      <div className="mt-4 flex items-center gap-4"><div className="text-lg font-bold text-brand">Total {money(total)}</div>
        <Btn disabled={!lines.length || !billNo || total <= 0} onClick={() => { addPurchase(vendorId, billNo, lines); router.push('/admin/purchases'); }}>Save purchase & add stock</Btn></div>
    </>
  );
}
