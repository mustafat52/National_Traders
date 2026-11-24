'use client';
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, PackagePlus, Pencil } from 'lucide-react';
import { useStore, useProductMap } from '@/lib/store';
import { fmtDate, money } from '@/lib/rules';
import { vendorAging, vendorLedger } from '@/lib/selectors';
import { AGE } from '@/components/AgeBar';
import { useScreenKeys } from '@/lib/hotkeys';
import { KBtn, ScreenHead } from '@/components/grid/Screen';
import { Field, Panel } from '@/components/grid/Panel';
import { toast } from '@/components/grid/Toast';
import { VendorForm } from '@/components/VendorForm';

const MODES = ['Cash', 'Online', 'Cheque', 'Advance'];
const th = 'px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-steel';

/** One vendor: their details, what is owed, a place to record a payment, and the full ledger of bills and payments. */
export default function VendorPage() {
  const { id } = useParams<{ id: string }>(); const router = useRouter(); const d = useStore(); const pm = useProductMap();
  const v = d.vendors.find((x) => x.id === id);
  const [amt, setAmt] = useState(0); const [mode, setMode] = useState('Cash'); const [err, setErr] = useState('');
  const [edit, setEdit] = useState(false); const [shown, setShown] = useState(25); const [openBill, setOpenBill] = useState('');
  const led = useMemo(() => (v ? vendorLedger(d, id) : null), [d.purchases, d.payments, d.vendors, id]); // eslint-disable-line react-hooks/exhaustive-deps
  const pay = () => {
    if (!v) return; if (!(amt > 0)) { setErr('Enter the amount paid'); return; }
    d.addPayment(id, amt, mode); toast(`${money(amt)} paid by ${mode.toLowerCase()} recorded`); setErr(''); setAmt(0);
  };
  useScreenKeys([{ key: 'F2', label: 'Save payment', run: pay }, { key: 'Esc', label: 'Back', run: () => { if (edit) setEdit(false); else router.push('/admin/vendors'); }, typing: true }]);
  if (!v || !led) return <div><Link href="/admin/vendors" className="text-[13px] underline">Vendor not found. Back to vendors</Link></div>;
  const { rows, balance } = led; const ag = vendorAging(d, id); const timeline = [...rows].reverse(); const advance = balance < 0;

  return (
    <div className="max-w-6xl">
      <ScreenHead title={`Vendor: ${v.name}`} hint={`${v.phone || 'No phone'} · ${v.terms}${v.gst ? ` · GST ${v.gst}` : ''}`}>
        <KBtn onClick={() => router.push('/admin/vendors')} k="Esc"><ChevronLeft className="h-4 w-4" />Back</KBtn>
        <KBtn onClick={() => setEdit(!edit)}><Pencil className="h-4 w-4" />Edit details</KBtn>
        <Link href={`/admin/stockin?vendor=${v.id}`} className="inline-flex items-center gap-1.5 rounded-md border border-ink bg-ink px-3 py-1.5 text-[13px] font-medium text-white"><PackagePlus className="h-4 w-4" />Record a delivery</Link>
      </ScreenHead>
      {edit && <div className="mb-3"><VendorForm initial={{ name: v.name, phone: v.phone, gst: v.gst, terms: v.terms, opening: v.opening }} saveLabel="Save changes" onCancel={() => setEdit(false)} onSave={(x) => { d.updateVendor(id, x); setEdit(false); toast('Vendor details saved'); }} openingHint="Changing the amount owed before you started changes the balance shown here." /></div>}

      <div className="mb-3 grid gap-3 lg:grid-cols-2">
        <Panel title="Balance" hint="Payments are counted against the oldest bills first">
          <Field label={advance ? 'Advance paid' : 'You owe'}><b className={`text-[18px] tabular-nums ${advance ? 'text-good' : ''}`}>{money(Math.abs(balance))}</b></Field>
          {AGE.map((a, k) => <Field key={a.label} label={a.label}><span className={`tabular-nums ${k === 2 && ag[2] > 0 ? 'font-semibold text-blush-fg' : ''}`}>{ag[k] > 0 ? money(ag[k]) : '—'}</span></Field>)}
        </Panel>
        <Panel title="Record a payment">
          <Field label="Amount paid"><span className="flex flex-wrap items-center gap-2"><input id="vp-amt" type="number" min={0} inputMode="decimal" aria-label="Amount paid" className="!w-36 !rounded-md !px-2.5 !py-1 text-[14px] font-semibold" value={amt || ''} placeholder="0" onChange={(e) => { setAmt(+e.target.value); setErr(''); }} onKeyDown={(e) => e.key === 'Enter' && pay()} />
            {balance > 0 && <button type="button" onClick={() => setAmt(Math.round(balance))} className="text-[12px] underline">Pay everything ({money(balance)})</button>}
            {ag[2] > 0 && <button type="button" onClick={() => setAmt(Math.round(ag[2]))} className="text-[12px] text-blush-fg underline">Clear over 60 days ({money(ag[2])})</button>}</span></Field>
          <Field label="Mode"><span className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Payment mode">{MODES.map((m) => <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={`rounded border px-2.5 py-0.5 text-[12.5px] font-medium ${mode === m ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:bg-paper'}`}>{m}</button>)}</span></Field>
          {err && <p className="my-1.5 rounded bg-blush-bg px-3 py-1.5 text-[12.5px] text-blush-fg">{err}</p>}
          <div className="py-2"><KBtn primary k="F2" onClick={pay}>Save payment</KBtn></div>
        </Panel>
      </div>

      <h2 className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-steel">Ledger: bills and payments</h2>
      <div className="overflow-x-auto rounded-md border border-line bg-white">
        <table className="w-full min-w-[720px] border-collapse text-[13px]">
          <thead className="bg-paper"><tr className="border-b border-line text-left"><th className={th + ' w-8'} /><th className={th}>Date</th><th className={th}>Entry</th><th className={th}>Ref</th><th className={th + ' text-right'}>Bill amount</th><th className={th + ' text-right'}>Paid</th><th className={th + ' text-right'}>Balance</th></tr></thead>
          <tbody>
            {v.opening ? <tr className="border-b border-line/70 text-steel"><td /><td className="px-2.5 py-1.5">—</td><td className="px-2.5 py-1.5">Opening balance</td><td /><td className="px-2.5 py-1.5 text-right tabular-nums">{money(v.opening)}</td><td /><td className="px-2.5 py-1.5 text-right font-medium tabular-nums">{money(v.opening)}</td></tr> : null}
            {timeline.length === 0 && !v.opening && <tr><td colSpan={7} className="px-3 py-8 text-center text-steel">Nothing yet. Bills appear here when you record a delivery from this vendor.</td></tr>}
            {timeline.slice(0, shown).map((r, i) => {
              const bill = r.kind === 'bill' ? d.purchases.find((p) => p.no === r.ref) : undefined; const isOpen = !!bill && openBill === bill.id;
              return (
                <React.Fragment key={i}>
                  <tr onClick={() => bill && setOpenBill(isOpen ? '' : bill.id)} className={`border-b border-line/70 ${bill ? 'cursor-pointer hover:bg-paper/70' : ''}`}>
                    <td className="px-2 py-1.5 text-steel">{bill && <ChevronRight className={`h-4 w-4 transition ${isOpen ? 'rotate-90' : ''}`} />}</td>
                    <td className="px-2.5 py-1.5">{fmtDate(r.date)}</td><td className="px-2.5 py-1.5">{r.type}</td><td className="px-2.5 py-1.5 font-mono text-[12px] text-steel">{r.ref === '-' ? '' : r.ref}</td>
                    <td className="px-2.5 py-1.5 text-right tabular-nums">{r.debit ? money(r.debit) : ''}</td><td className="px-2.5 py-1.5 text-right tabular-nums text-good">{r.credit ? money(r.credit) : ''}</td><td className="px-2.5 py-1.5 text-right font-medium tabular-nums">{money(r.bal)}</td>
                  </tr>
                  {isOpen && bill && bill.lines.map((l) => { const p = pm.get(l.pid); const q = l.qty.reduce((a, b) => a + b, 0); return (
                    <tr key={bill.id + l.pid} className="border-b border-line/50 bg-paper/50 text-[12.5px]"><td /><td /><td className="px-2.5 py-1" colSpan={2}>{p?.name ?? l.pid}</td><td className="px-2.5 py-1 text-right tabular-nums text-steel">{q} × {money(l.price)}</td><td /><td className="px-2.5 py-1 text-right tabular-nums">{money(q * l.price)}</td></tr>); })}
                </React.Fragment>);
            })}
          </tbody>
        </table>
      </div>
      {timeline.length > shown && <button onClick={() => setShown(shown + 25)} className="mt-2 text-[13px] underline">Show older entries ({timeline.length - shown} more)</button>}
    </div>
  );
}