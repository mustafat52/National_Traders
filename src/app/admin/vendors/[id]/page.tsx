'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useStore } from '@/lib/store';
import { LOCS, Product } from '@/lib/types';
import { fmtDate, money } from '@/lib/rules';
import { vendorAging, vendorLedger } from '@/lib/selectors';
import { Btn, Card, DataTable, Field, PageTitle, ProductPicker, Stat } from '@/components/ui';

export default function VendorPage() {
  const { id } = useParams<{ id: string }>(); const d = useStore();
  const v = d.vendors.find((x) => x.id === id);
  const [amt, setAmt] = useState(0); const [mode, setMode] = useState('Cash');
  const [rp, setRp] = useState<Product | null>(null); const [rq, setRq] = useState(1); const [rl, setRl] = useState(0);
  if (!v) return <Link href="/admin/vendors">Vendor not found</Link>;
  const { rows, balance } = vendorLedger(d, id); const ag = vendorAging(d, id);
  return (
    <>
      <PageTitle title={v.name} sub={`${v.phone} · ${v.terms}${v.gst ? ' · GST ' + v.gst : ''}`}><Link href="/admin/vendors"><Btn variant="outline">Back</Btn></Link></PageTitle>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Owed now" value={money(balance)} /><Stat label="0–30 days" value={money(ag[0])} /><Stat label="30–60 days" value={money(ag[1])} /><Stat label="60+ days" value={money(ag[2])} /></div>
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3"><div className="text-sm font-semibold">Record payment to vendor</div>
          <div className="grid grid-cols-3 gap-2"><Field label="Amount"><input type="number" className="w-full" value={amt || ''} onChange={(e) => setAmt(+e.target.value)} /></Field>
            <Field label="Mode"><select className="w-full" value={mode} onChange={(e) => setMode(e.target.value)}><option>Cash</option><option>Online</option><option>Cheque</option><option>Advance</option></select></Field>
            <div className="flex items-end"><Btn className="w-full" onClick={() => { if (amt > 0) { d.addPayment(id, amt, mode); setAmt(0); } }}>Save</Btn></div></div></Card>
        <Card className="space-y-3"><div className="text-sm font-semibold">Purchase return (goods back to vendor)</div>
          <ProductPicker onPick={setRp} />{rp && <div className="text-xs text-slate-600">{rp.name} · stock: {d.products.find((p) => p.id === rp.id)!.stock.join(' / ')}</div>}
          <div className="grid grid-cols-3 gap-2"><Field label="Qty"><input type="number" min={1} className="w-full" value={rq} onChange={(e) => setRq(+e.target.value)} /></Field>
            <Field label="From location"><select className="w-full" value={rl} onChange={(e) => setRl(+e.target.value)}>{LOCS.map((l, i) => <option key={l} value={i}>{l}</option>)}</select></Field>
            <div className="flex items-end"><Btn className="w-full" disabled={!rp} onClick={() => { try { d.purchaseReturn(id, rp!.id, rq, rl); setRp(null); alert('Return recorded; vendor balance reduced'); } catch (e) { alert((e as Error).message); } }}>Return</Btn></div></div></Card>
      </div>
      <div className="mb-2 text-sm font-semibold">Ledger</div>
      <DataTable csv={`ledger-${v.name}`} rows={[...rows].reverse()} cols={[
        { h: 'Date', v: (r) => fmtDate(r.date) }, { h: 'Type', v: (r) => r.type }, { h: 'Ref', v: (r) => r.ref },
        { h: 'Purchase (+)', v: (r) => (r.debit ? money(r.debit) : ''), csv: (r) => r.debit, right: true }, { h: 'Paid/Returned (−)', v: (r) => (r.credit ? money(r.credit) : ''), csv: (r) => r.credit, right: true }, { h: 'Balance', v: (r) => money(r.bal), csv: (r) => r.bal, right: true },
      ]} />
    </>
  );
}
