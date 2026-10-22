'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Download, PackagePlus, Plus, Search } from 'lucide-react';
import { useStore } from '@/lib/store';
import { download, fmtDate, toCsv } from '@/lib/rules';
import { vendorAging, vendorBalance } from '@/lib/selectors';
import { AGE, AgeBar } from '@/components/AgeBar';
import { Rupee } from '@/components/Rupee';
import { VendorForm } from '@/components/VendorForm';

const TINTS = ['bg-sage-bg text-sage-fg', 'bg-sky-bg text-sky-fg', 'bg-butter-bg text-butter-fg', 'bg-lilac-bg text-lilac-fg', 'bg-blush-bg text-blush-fg'];
const card = 'rounded-[22px] border border-line bg-panel';
type Filter = 'all' | 'owing' | 'overdue' | 'settled';

export default function Vendors() {
  const d = useStore(); const [open, setOpen] = useState(false); const [q, setQ] = useState(''); const [flt, setFlt] = useState<Filter>('all');
  const rows = useMemo(() => d.vendors.map((v, i) => {
    const bills = d.purchases.filter((p) => p.vendorId === v.id); const last = bills.reduce<typeof bills[number] | null>((a, p) => (!a || p.date > a.date ? p : a), null);
    return { v, i, bal: vendorBalance(d, v.id), ag: vendorAging(d, v.id), last };
  }), [d.vendors, d.purchases, d.payments]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = rows.reduce((a, r) => a + Math.max(0, r.bal), 0);
  const ageTotals = [0, 1, 2].map((k) => rows.reduce((a, r) => a + r.ag[k], 0));
  const overdueCount = rows.filter((r) => r.ag[2] > 0).length;
  const paid30 = d.payments.filter((p) => Date.now() - new Date(p.date).getTime() < 30 * 86400000).reduce((a, p) => a + p.amount, 0);
  const shown = rows.filter((r) => {
    if (q.trim() && !`${r.v.name} ${r.v.phone}`.toLowerCase().includes(q.trim().toLowerCase())) return false;
    return flt === 'all' || (flt === 'owing' && r.bal > 0) || (flt === 'overdue' && r.ag[2] > 0) || (flt === 'settled' && r.bal <= 0);
  }).sort((a, b) => b.bal - a.bal);
  const exportCsv = () => download('vendor-payables.csv', toCsv([['Vendor', 'Phone', 'Terms', 'Owed', 'Under 30 days', '30 to 60 days', 'Over 60 days'], ...rows.map((r) => [r.v.name, r.v.phone, r.v.terms, r.bal, ...r.ag.map(Math.round)])]));
  const chip = (k: Filter, label: string, n: number) => (
    <button key={k} onClick={() => setFlt(k)} aria-pressed={flt === k} className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${flt === k ? 'bg-sage-bg text-sage-fg' : 'bg-white text-steel hover:text-ink'}`}>{label} <span className="opacity-60">{n}</span></button>
  );

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="font-display text-[40px] font-semibold leading-none tracking-tight">Vendors</h1><p className="mt-1 text-steel">Who you buy from, and what you owe them. Bills come in through Stock In.</p></div>
        <div className="flex gap-2">
          <Link href="/admin/stockin" className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium hover:bg-paper"><PackagePlus className="h-4 w-4" />Record a delivery</Link>
          <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-light"><Plus className="h-4 w-4" />Add vendor</button>
        </div>
      </div>

      {open && <div className="mb-6"><VendorForm saveLabel="Save vendor" onCancel={() => setOpen(false)} onSave={(v) => { d.addVendor(v); setOpen(false); }} /></div>}

      <section className="mb-6 rounded-[28px] bg-sage-bg p-6 text-sage-fg md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <div>
            <div className="text-sm font-medium">You owe vendors</div>
            <Rupee v={total} animate className="font-display text-[56px] font-semibold leading-none text-ink md:text-[72px]" />
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-white/60 px-3 py-1 font-medium">{d.vendors.length} vendors</span>
            <span className={`rounded-full px-3 py-1 font-medium ${overdueCount ? 'bg-blush-bg text-blush-fg' : 'bg-white/60'}`}>{overdueCount ? `${overdueCount} with bills over 60 days old` : 'Nothing over 60 days'}</span>
            <span className="rounded-full bg-white/60 px-3 py-1">Paid in the last 30 days <Rupee v={paid30} className="font-medium" /></span>
          </div>
        </div>
        <div className="mt-6"><AgeBar ag={ageTotals} tall /></div>
        <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {AGE.map((a, k) => <li key={a.label} className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ background: a.color }} />{a.label} <Rupee v={ageTotals[k]} className="font-semibold text-ink" /></li>)}
        </ul>
      </section>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1 sm:max-w-sm"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" /><input className="w-full !rounded-2xl !py-2.5 !pl-10" placeholder="Search a vendor" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        {chip('all', 'All', rows.length)}{chip('owing', 'Owe money', rows.filter((r) => r.bal > 0).length)}{chip('overdue', 'Over 60 days', overdueCount)}{chip('settled', 'Settled', rows.filter((r) => r.bal <= 0).length)}
        <button onClick={exportCsv} className="ml-auto flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-sm font-medium hover:bg-paper"><Download className="h-4 w-4" />Export CSV</button>
      </div>

      {shown.length === 0 && <div className={`${card} p-8 text-center text-steel`}>{d.vendors.length === 0 ? 'No vendors yet. Add the first one above.' : 'No vendor matches this search.'}</div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map(({ v, i, bal, ag, last }) => (
          <Link key={v.id} href={`/admin/vendors/${v.id}`} className={`${card} block p-5 transition hover:border-sage-mid`}>
            <div className="flex items-start gap-3">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-display text-lg font-bold ${TINTS[i % TINTS.length]}`}>{v.name[0]}</span>
              <div className="min-w-0 flex-1"><div className="truncate font-display text-lg font-semibold leading-tight">{v.name}</div><div className="truncate text-xs text-steel">{v.phone || 'No phone'}, {v.terms}</div></div>
            </div>
            <div className="mt-4 flex items-end justify-between gap-2">
              <div><div className="text-xs text-steel">{bal < 0 ? 'Advance with vendor' : 'You owe'}</div><Rupee v={Math.abs(bal)} className="font-display text-[30px] font-semibold leading-none" /></div>
              {ag[2] > 0 && <span className="rounded-full bg-blush-bg px-2.5 py-1 text-xs font-medium text-blush-fg">{Math.round(ag[2]).toLocaleString('en-IN')} over 60 days</span>}
            </div>
            <div className="mt-3"><AgeBar ag={ag} /></div>
            <div className="mt-3 text-xs text-steel">{last ? <>Last bill {fmtDate(last.date)}, {last.billNo}</> : 'No bills recorded yet'}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}