'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { fmtDate, money } from '@/lib/rules';
import { TIER_NAMES } from '@/lib/types';
import { useScreenKeys } from '@/lib/hotkeys';
import { DataGrid } from '@/components/grid/DataGrid';
import { ScreenHead } from '@/components/grid/Screen';

/** Customer: everyone who has been billed or given an estimate. Customers are created by the salesman at the counter from the phone number. */
export default function Customers() {
  const d = useStore(); const router = useRouter(); const [q, setQ] = useState(''); const [tier, setTier] = useState('all');
  const rows = useMemo(() => d.customers.map((c) => {
    const sales = d.bills.filter((b) => b.customerId === c.id && b.kind === 'quotation'); const ests = d.bills.filter((b) => b.customerId === c.id && b.kind === 'estimate' && b.status === 'open');
    const last = sales.reduce<string>((a, b) => (b.date > a ? b.date : a), '');
    return { c, n: sales.length, total: sales.reduce((a, b) => a + b.total, 0), open: ests.length, last };
  }), [d.customers, d.bills]);
  const shown = rows.filter((r) => (tier === 'all' || String(r.c.tier) === tier) && (!q.trim() || `${r.c.name} ${r.c.phone}`.toLowerCase().includes(q.trim().toLowerCase())));
  useScreenKeys([{ key: '/', label: 'Search', run: () => document.getElementById('c-q')?.focus() }]);
  const sold = rows.reduce((a, r) => a + r.total, 0);
  return (
    <div>
      <ScreenHead title="Customer" hint={`${rows.length} customers · ${money(sold)} sold in all. Customers are added automatically when a salesman starts a bill with their phone number.`}>
        <select aria-label="Price list" value={tier} onChange={(e) => setTier(e.target.value)} className="rounded-md border border-line bg-white px-2 py-1.5 text-[13px]"><option value="all">Every price list</option>{TIER_NAMES.map((n, i) => <option key={n} value={i}>{n}</option>)}</select>
        <input id="c-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or phone   ( / )" className="!w-56 !rounded-md !px-2.5 !py-1.5 text-[13px]" />
      </ScreenHead>
      <DataGrid csvName="customers" rows={shown} rowKey={(r) => r.c.id} onOpen={(r) => router.push(`/admin/customers/${r.c.id}`)} openOnClick maxH="calc(100vh - 150px)" empty={d.customers.length ? 'No customer matches' : 'No customers yet. They appear after the first bill or estimate.'}
        cols={[
          { h: 'Name', v: (r) => (r.c.name ? <span className="font-medium">{r.c.name}</span> : <span className="text-steel">Not named</span>), csv: (r) => r.c.name, sort: (r) => r.c.name },
          { h: 'Phone', v: (r) => <span className="font-mono text-[12.5px]">{r.c.phone}</span>, csv: (r) => r.c.phone, sort: (r) => r.c.phone },
          { h: 'Price list', v: (r) => TIER_NAMES[r.c.tier], csv: (r) => TIER_NAMES[r.c.tier], sort: (r) => r.c.tier },
          { h: 'Sales', right: true, v: (r) => r.n, csv: (r) => r.n, sort: (r) => r.n },
          { h: 'Total sold', right: true, v: (r) => (r.total ? <span className="font-medium">{money(r.total)}</span> : '—'), csv: (r) => r.total, sort: (r) => r.total },
          { h: 'Open estimates', right: true, v: (r) => (r.open ? <span className="text-butter-fg">{r.open}</span> : '—'), csv: (r) => r.open, sort: (r) => r.open },
          { h: 'Last sale', v: (r) => (r.last ? fmtDate(r.last) : <span className="text-steel">none yet</span>), csv: (r) => r.last, sort: (r) => r.last },
        ]} />
    </div>
  );
}