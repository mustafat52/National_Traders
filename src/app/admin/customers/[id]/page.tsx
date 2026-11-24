'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useStore } from '@/lib/store';
import { fmtDate, money } from '@/lib/rules';
import { TIER_NAMES } from '@/lib/types';
import { useScreenKeys } from '@/lib/hotkeys';
import { DataGrid } from '@/components/grid/DataGrid';
import { KBtn, ScreenHead } from '@/components/grid/Screen';
import { Field, Panel } from '@/components/grid/Panel';
import { toast } from '@/components/grid/Toast';
import { errText } from '@/components/StaffBits';

/** One customer: name and price list can be changed here; below are all their sales and estimates. */
export default function CustomerPage() {
  const { id } = useParams<{ id: string }>(); const router = useRouter(); const d = useStore(); const c = d.customers.find((x) => x.id === id);
  const [name, setName] = useState(''); const [tier, setTier] = useState(0); const [err, setErr] = useState('');
  useEffect(() => { if (c) { setName(c.name); setTier(c.tier); } }, [c?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const bills = useMemo(() => d.bills.filter((b) => b.customerId === id).sort((a, b) => b.date.localeCompare(a.date)), [d.bills, id]);
  const save = () => { try { d.updateCustomer(id, { name, tier }); toast('Customer saved'); setErr(''); } catch (e) { setErr(errText(e)); } };
  useScreenKeys([{ key: 'F2', label: 'Save', run: save }, { key: 'Esc', label: 'Back', run: () => router.push('/admin/customers'), typing: true }]);
  if (!c) return <div><Link href="/admin/customers" className="text-[13px] underline">Customer not found. Back to customers</Link></div>;
  const sales = bills.filter((b) => b.kind === 'quotation'); const total = sales.reduce((a, b) => a + b.total, 0); const dirty = name.trim() !== c.name || tier !== c.tier;
  return (
    <div className="max-w-6xl">
      <ScreenHead title={`Customer: ${c.name || c.phone}`} hint={`${c.phone} · ${sales.length} sales · ${money(total)} sold in all`}>
        <KBtn onClick={() => router.push('/admin/customers')} k="Esc"><ChevronLeft className="h-4 w-4" />Back</KBtn><KBtn primary k="F2" onClick={save} disabled={!dirty}>Save</KBtn>
      </ScreenHead>
      <div className="mb-3 grid gap-3 lg:grid-cols-2">
        <Panel title="Details">
          <Field label="Phone"><span className="font-mono">{c.phone}</span></Field>
          <Field label="Name"><input id="cu-name" autoFocus className="w-full !rounded-md !px-2.5 !py-1 text-[13px]" aria-label="Customer name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Add the name" /></Field>
          <Field label="Price list"><select aria-label="Price list" className="rounded-md border border-line bg-white px-2 py-1 text-[13px]" value={tier} onChange={(e) => setTier(+e.target.value)}>{TIER_NAMES.map((n, i) => <option key={n} value={i}>{n}</option>)}</select></Field>
          {err && <p className="my-1.5 rounded bg-blush-bg px-3 py-1.5 text-[12.5px] text-blush-fg">{err}</p>}
        </Panel>
        <Panel title="Summary">
          <Field label="Sales">{sales.length}</Field><Field label="Total sold"><b className="tabular-nums">{money(total)}</b></Field>
          <Field label="First sale">{sales.length ? fmtDate(sales[sales.length - 1].date) : '—'}</Field><Field label="Last sale">{sales.length ? fmtDate(sales[0].date) : '—'}</Field>
        </Panel>
      </div>
      <h2 className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-steel">Sales and estimates</h2>
      <DataGrid csvName={`customer-${c.phone}`} rows={bills} rowKey={(b) => b.id} onOpen={(b) => { if (b.kind === 'estimate') router.push(`/admin/estimates/${b.id}`); else window.open(`/bill/${b.code}`, '_blank'); }} openOnClick empty="No sales or estimates yet"
        cols={[
          { h: 'Date', v: (b) => fmtDate(b.date), csv: (b) => b.date, sort: (b) => b.date },
          { h: 'Number', v: (b) => <span className="font-mono text-[12.5px] font-semibold">{b.no}</span>, csv: (b) => b.no, sort: (b) => b.no },
          { h: 'Type', v: (b) => (b.kind === 'estimate' ? 'Estimate' : 'Sale'), csv: (b) => b.kind, sort: (b) => b.kind },
          { h: 'Salesman', v: (b) => d.staff.find((s) => s.id === b.staffId)?.name ?? '', csv: (b) => b.staffId, sort: (b) => b.staffId },
          { h: 'Price list', v: (b) => TIER_NAMES[b.tier], csv: (b) => TIER_NAMES[b.tier], sort: (b) => b.tier },
          { h: 'Amount', right: true, v: (b) => <span className="font-medium">{money(b.total)}</span>, csv: (b) => b.total, sort: (b) => b.total },
          { h: 'Status', v: (b) => (b.status === 'converted' ? 'Converted to sale' : b.status === 'paid' ? 'Paid' : 'Open'), csv: (b) => b.status, sort: (b) => b.status },
        ]} />
    </div>
  );
}