'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useStore } from '@/lib/store';
import { fmtDate, money } from '@/lib/rules';
import { vendorAging, vendorBalance } from '@/lib/selectors';
import { useScreenKeys } from '@/lib/hotkeys';
import { DataGrid } from '@/components/grid/DataGrid';
import { KBtn, ScreenHead } from '@/components/grid/Screen';
import { toast } from '@/components/grid/Toast';
import { VendorForm } from '@/components/VendorForm';

type Filter = 'all' | 'owing' | 'overdue' | 'settled';

/** Vendor: everyone the shop buys from, with what is owed to each and how old it is. */
export default function Vendors() {
  const d = useStore(); const router = useRouter(); const [open, setOpen] = useState(false); const [q, setQ] = useState(''); const [flt, setFlt] = useState<Filter>('all');
  const rows = useMemo(() => d.vendors.map((v) => {
    const bills = d.purchases.filter((p) => p.vendorId === v.id); const last = bills.reduce<typeof bills[number] | null>((a, p) => (!a || p.date > a.date ? p : a), null);
    return { v, bal: vendorBalance(d, v.id), ag: vendorAging(d, v.id), last };
  }), [d.vendors, d.purchases, d.payments]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = rows.reduce((a, r) => a + Math.max(0, r.bal), 0); const overdue = rows.filter((r) => r.ag[2] > 0).length;
  const paid30 = d.payments.filter((p) => Date.now() - new Date(p.date).getTime() < 30 * 86400000).reduce((a, p) => a + p.amount, 0);
  const shown = rows.filter((r) => (!q.trim() || `${r.v.name} ${r.v.phone}`.toLowerCase().includes(q.trim().toLowerCase()))
    && (flt === 'all' || (flt === 'owing' && r.bal > 0) || (flt === 'overdue' && r.ag[2] > 0) || (flt === 'settled' && r.bal <= 0)));
  useScreenKeys([{ key: 'N', label: 'New vendor', run: () => setOpen(true) }, { key: '/', label: 'Search', run: () => document.getElementById('v-q')?.focus() }, { key: 'Esc', label: open ? 'Close' : '', run: () => setOpen(false), hidden: !open, typing: true }]);
  const tile = (k: Filter, label: string, n: number, sub = '', tone = '') => (
    <button key={k} onClick={() => setFlt(k)} aria-pressed={flt === k} className={`min-w-[130px] rounded-md border px-3 py-1.5 text-left transition ${flt === k ? 'border-gold bg-sage-bg/60' : 'border-line bg-white hover:bg-paper'}`}>
      <div className={`text-[20px] font-semibold leading-tight tabular-nums ${tone}`}>{n}</div><div className="text-[11.5px] text-steel">{label}{sub ? ` · ${sub}` : ''}</div></button>);

  return (
    <div>
      <ScreenHead title="Vendor" hint={`${d.vendors.length} vendors · you owe ${money(total)} · paid ${money(paid30)} in the last 30 days. Bills come in through Stock In.`}>
        <input id="v-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search a vendor   ( / )" className="!w-56 !rounded-md !px-2.5 !py-1.5 text-[13px]" />
        <KBtn primary k="N" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />New vendor</KBtn>
      </ScreenHead>
      {open && <div className="mb-3"><VendorForm title="Vendor: Add" saveLabel="Save vendor" onCancel={() => setOpen(false)} onSave={(v) => { d.addVendor(v); setOpen(false); toast(`${v.name} added`); }} /></div>}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {tile('all', 'All vendors', rows.length)}{tile('owing', 'Owe money', rows.filter((r) => r.bal > 0).length, money(total))}{tile('overdue', 'Over 60 days', overdue, '', overdue ? 'text-blush-fg' : '')}{tile('settled', 'Settled', rows.filter((r) => r.bal <= 0).length)}
      </div>
      <DataGrid csvName="vendors" rows={shown} rowKey={(r) => r.v.id} onOpen={(r) => router.push(`/admin/vendors/${r.v.id}`)} openOnClick maxH="calc(100vh - 250px)" empty={d.vendors.length ? 'No vendor matches' : 'No vendors yet. Press N to add the first one.'}
        cols={[
          { h: 'Vendor', v: (r) => <span className="font-medium">{r.v.name}</span>, csv: (r) => r.v.name, sort: (r) => r.v.name },
          { h: 'Phone', v: (r) => r.v.phone || <span className="text-steel">—</span>, csv: (r) => r.v.phone, sort: (r) => r.v.phone },
          { h: 'Terms', v: (r) => r.v.terms, csv: (r) => r.v.terms, sort: (r) => r.v.terms },
          { h: 'Balance', right: true, v: (r) => (r.bal < 0 ? <span className="text-good">{money(-r.bal)} advance</span> : <span className="font-semibold">{money(r.bal)}</span>), csv: (r) => r.bal, sort: (r) => r.bal },
          { h: 'Under 30 days', right: true, v: (r) => (r.ag[0] ? money(r.ag[0]) : '—'), csv: (r) => Math.round(r.ag[0]), sort: (r) => r.ag[0] },
          { h: '30 to 60 days', right: true, v: (r) => (r.ag[1] ? money(r.ag[1]) : '—'), csv: (r) => Math.round(r.ag[1]), sort: (r) => r.ag[1] },
          { h: 'Over 60 days', right: true, v: (r) => (r.ag[2] ? <span className="font-medium text-blush-fg">{money(r.ag[2])}</span> : '—'), csv: (r) => Math.round(r.ag[2]), sort: (r) => r.ag[2] },
          { h: 'Last bill', v: (r) => (r.last ? `${fmtDate(r.last.date)} · ${r.last.billNo}` : <span className="text-steel">none yet</span>), csv: (r) => (r.last ? r.last.date : ''), sort: (r) => r.last?.date ?? '' },
        ]} />
    </div>
  );
}