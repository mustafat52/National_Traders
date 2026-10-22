'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Banknote, CheckCircle2, ChevronDown, Download, PackagePlus, Pencil, Receipt, X } from 'lucide-react';
import { useStore, useProductMap } from '@/lib/store';
import { download, fmtDate, money, toCsv } from '@/lib/rules';
import { vendorAging, vendorLedger } from '@/lib/selectors';
import { AGE, AgeBar } from '@/components/AgeBar';
import { Crumbs } from '@/components/Crumbs';
import { Rupee } from '@/components/Rupee';
import { VendorForm } from '@/components/VendorForm';

const card = 'rounded-[22px] border border-line bg-panel';
const MODES = ['Cash', 'Online', 'Cheque', 'Advance'];

export default function VendorPage() {
  const { id } = useParams<{ id: string }>(); const d = useStore(); const pm = useProductMap();
  const v = d.vendors.find((x) => x.id === id);
  const [amt, setAmt] = useState(0); const [mode, setMode] = useState('Cash'); const [msg, setMsg] = useState(''); const [err, setErr] = useState('');
  const [edit, setEdit] = useState(false); const [shown, setShown] = useState(12); const [openBill, setOpenBill] = useState('');
  const led = useMemo(() => (v ? vendorLedger(d, id) : null), [d.purchases, d.payments, d.vendors, id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!v || !led) return <div className="p-6"><Link href="/admin/vendors" className="text-brand underline">Vendor not found. Back to vendors</Link></div>;
  const { rows, balance } = led; const ag = vendorAging(d, id);
  const timeline = [...rows].reverse(); const advance = balance < 0;

  const pay = () => {
    setMsg(''); if (!(amt > 0)) return setErr('Enter the amount paid');
    d.addPayment(id, amt, mode); setMsg(`${money(amt)} paid by ${mode.toLowerCase()} recorded.`); setErr(''); setAmt(0);
  };
  const exportCsv = () => download(`ledger-${v.name}.csv`, toCsv([['Date', 'Entry', 'Ref', 'Bill amount', 'Paid', 'Balance'], ...rows.map((r) => [fmtDate(r.date), r.type, r.ref, r.debit || '', r.credit || '', r.bal])]));

  return (
    <div className="mx-auto max-w-[1280px]">
      <Crumbs items={[{ label: 'Vendors', href: '/admin/vendors' }, { label: v.name }]} />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-[40px] font-semibold leading-none tracking-tight">{v.name}</h1>
          <p className="mt-1 text-steel">{v.phone || 'No phone'}, {v.terms}{v.gst ? `, GST ${v.gst}` : ''}</p></div>
        <div className="flex gap-2">
          <button onClick={() => setEdit(!edit)} className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium hover:bg-paper"><Pencil className="h-4 w-4" />Edit details</button>
          <Link href={`/admin/stockin?vendor=${v.id}`} className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-light"><PackagePlus className="h-4 w-4" />Record a delivery</Link>
        </div>
      </div>

      {edit && <div className="mb-6"><VendorForm initial={{ name: v.name, phone: v.phone, gst: v.gst, terms: v.terms, opening: v.opening }} saveLabel="Save changes" openingHint="Changing the amount owed before you started changes the balance shown here." onCancel={() => setEdit(false)} onSave={(x) => { d.updateVendor(id, x); setEdit(false); }} /></div>}

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="rounded-[28px] bg-sage-bg p-6 text-sage-fg md:p-8 lg:col-span-7">
          <div className="text-sm font-medium">{advance ? 'Advance paid to this vendor' : 'You owe this vendor'}</div>
          <Rupee v={Math.abs(balance)} animate className="font-display text-[56px] font-semibold leading-none text-ink md:text-[72px]" />
          <div className="mt-6"><AgeBar ag={ag} tall /></div>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
            {AGE.map((a, k) => <li key={a.label} className="rounded-2xl bg-white/60 px-3 py-2"><div className="flex items-center gap-2 text-xs"><i className="h-2.5 w-2.5 rounded-full" style={{ background: a.color }} />{a.label}</div><Rupee v={ag[k]} className="font-display text-xl font-semibold text-ink" /></li>)}
          </ul>
          <p className="mt-3 text-xs">Payments are counted against the oldest bills first.</p>
        </section>

        <section className={`${card} p-5 lg:col-span-5`}>
          <div className="font-display text-[22px] font-semibold tracking-tight">Record a payment</div>
          {msg && <div className="fade-up mt-3 flex items-center gap-2 rounded-xl bg-sage-bg px-3 py-2 text-sm text-sage-fg"><CheckCircle2 className="h-4 w-4 shrink-0" /><span className="flex-1">{msg}</span><button aria-label="Dismiss" onClick={() => setMsg('')}><X className="h-4 w-4" /></button></div>}
          <label className="mt-3 block text-sm"><span className="mb-1 block text-xs font-medium text-steel">Amount paid</span>
            <span className="relative block"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl text-steel">₹</span>
              <input type="number" min={0} inputMode="decimal" className="w-full !rounded-2xl !py-3 !pl-9 !text-2xl font-display font-semibold" value={amt || ''} placeholder="0" onChange={(e) => { setAmt(+e.target.value); setErr(''); }} onKeyDown={(e) => e.key === 'Enter' && pay()} /></span></label>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            {balance > 0 && <button onClick={() => setAmt(Math.round(balance))} className="rounded-full border border-line bg-white px-3 py-1 hover:bg-paper">Pay everything {money(balance)}</button>}
            {ag[2] > 0 && <button onClick={() => setAmt(Math.round(ag[2]))} className="rounded-full bg-blush-bg px-3 py-1 text-blush-fg hover:brightness-95">Clear over 60 days {money(ag[2])}</button>}
          </div>
          <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Payment mode">
            {MODES.map((m) => <button key={m} role="radio" aria-checked={mode === m} onClick={() => setMode(m)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${mode === m ? 'bg-sage-bg text-sage-fg' : 'bg-paper text-steel hover:text-ink'}`}>{m}</button>)}
          </div>
          {err && <div className="mt-3 rounded-xl bg-blush-bg px-3 py-2 text-sm text-blush-fg">{err}</div>}
          <button onClick={pay} className="mt-4 w-full rounded-2xl bg-brand py-3 font-semibold text-white hover:bg-brand-light">Save payment</button>
        </section>
      </div>

      <div className="mb-3 mt-10 flex items-center justify-between">
        <h2 className="font-display text-[22px] font-semibold tracking-tight">Bills and payments</h2>
        <button onClick={exportCsv} className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-sm font-medium hover:bg-paper"><Download className="h-4 w-4" />Export CSV</button>
      </div>
      {timeline.length === 0 && <div className={`${card} p-6 text-steel`}>Nothing yet. Bills appear here when you record a delivery from this vendor.</div>}
      <ol className="space-y-3">
        {timeline.slice(0, shown).map((r, i) => {
          const bill = r.kind === 'bill' ? d.purchases.find((p) => p.no === r.ref) : undefined; const isOpen = !!bill && openBill === bill.id;
          const units = bill ? bill.lines.reduce((a, l) => a + l.qty.reduce((x, y) => x + y, 0), 0) : 0;
          return (
            <li key={i} className={`${card} overflow-hidden`}>
              <button disabled={!bill} onClick={() => bill && setOpenBill(isOpen ? '' : bill.id)} className="flex w-full items-center gap-4 p-4 text-left">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${r.kind === 'bill' ? 'bg-butter-bg text-butter-fg' : 'bg-sky-bg text-sky-fg'}`}>{r.kind === 'bill' ? <Receipt className="h-5 w-5" /> : <Banknote className="h-5 w-5" />}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{r.type}</div>
                  <div className="text-xs text-steel">{fmtDate(r.date)}{bill && `, ${bill.lines.length} ${bill.lines.length === 1 ? 'product' : 'products'}, ${units.toLocaleString('en-IN')} units`}</div>
                </div>
                <div className="text-right"><div className={`font-display text-lg font-semibold ${r.kind === 'bill' ? 'text-butter-fg' : 'text-sage-fg'}`}>{r.kind === 'bill' ? '+' : '\u2212'}<Rupee v={r.debit || r.credit} /></div><div className="text-xs text-steel">Balance <Rupee v={r.bal} /></div></div>
                {bill && <ChevronDown className={`h-5 w-5 shrink-0 text-steel transition ${isOpen ? 'rotate-180' : ''}`} />}
              </button>
              {isOpen && bill && (
                <ul className="divide-y divide-line border-t border-line bg-paper/40 px-4">
                  {bill.lines.map((l) => { const p = pm.get(l.pid); const q = l.qty.reduce((a, b) => a + b, 0); return (
                    <li key={l.pid} className="flex flex-wrap items-center gap-3 py-2.5 text-sm"><span className="min-w-0 flex-1 truncate font-medium">{p?.name ?? l.pid}</span><span className="text-xs text-steel">{q} x {money(l.price)}</span><span className="w-24 text-right font-medium"><Rupee v={q * l.price} /></span></li>); })}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
      {timeline.length > shown && <button onClick={() => setShown(shown + 20)} className="mt-4 rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium hover:bg-paper">Show older entries ({timeline.length - shown} more)</button>}
    </div>
  );
}