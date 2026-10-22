'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useStore } from '@/lib/store';
import { money } from '@/lib/rules';
import { vendorAging, vendorBalance } from '@/lib/selectors';
import { Btn, Card, DataTable, Field, PageTitle, Stat } from '@/components/ui';

export default function Vendors() {
  const d = useStore(); const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', phone: '', gst: '', terms: 'Net 30', opening: 0 });
  const total = d.vendors.reduce((a, v) => a + vendorBalance(d, v.id), 0);
  return (
    <>
      <PageTitle title="Vendors & Payables" sub="What National Traders owes to each vendor"><Btn onClick={() => setOpen(!open)}><Plus className="h-4 w-4" />Add vendor</Btn></PageTitle>
      <div className="mb-4 grid max-w-xl grid-cols-2 gap-3"><Stat label="Total payable" value={money(total)} /><Stat label="Vendors" value={d.vendors.length} /></div>
      {open && <Card className="mb-4 grid gap-3 sm:grid-cols-5">
        <Field label="Name"><input className="w-full" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Phone"><input className="w-full" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="GST no. (optional)"><input className="w-full" value={f.gst} onChange={(e) => setF({ ...f, gst: e.target.value })} /></Field>
        <Field label="Credit terms"><input className="w-full" value={f.terms} onChange={(e) => setF({ ...f, terms: e.target.value })} /></Field>
        <Field label="Opening balance"><input type="number" className="w-full" value={f.opening} onChange={(e) => setF({ ...f, opening: +e.target.value })} /></Field>
        <div className="sm:col-span-5"><Btn onClick={() => { if (!f.name) return; d.addVendor(f); setOpen(false); setF({ name: '', phone: '', gst: '', terms: 'Net 30', opening: 0 }); }}>Save vendor</Btn></div>
      </Card>}
      <DataTable csv="vendor-payables" rows={d.vendors} cols={[
        { h: 'Vendor', v: (v) => <Link className="font-medium text-brand hover:underline" href={`/admin/vendors/${v.id}`}>{v.name}</Link>, csv: (v) => v.name },
        { h: 'Phone', v: (v) => v.phone }, { h: 'Terms', v: (v) => v.terms },
        { h: 'Owed', v: (v) => <b>{money(vendorBalance(d, v.id))}</b>, csv: (v) => vendorBalance(d, v.id), right: true },
        { h: '0–30 d', v: (v) => money(vendorAging(d, v.id)[0]), csv: (v) => vendorAging(d, v.id)[0], right: true },
        { h: '30–60 d', v: (v) => money(vendorAging(d, v.id)[1]), csv: (v) => vendorAging(d, v.id)[1], right: true },
        { h: '60+ d', v: (v) => <span className="text-red-600">{money(vendorAging(d, v.id)[2])}</span>, csv: (v) => vendorAging(d, v.id)[2], right: true },
      ]} />
    </>
  );
}
