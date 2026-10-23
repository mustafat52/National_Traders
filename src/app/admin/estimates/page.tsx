'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useStore, useProductMap } from '@/lib/store';
import { fmtDate, isExpiredEstimate, money } from '@/lib/rules';
import { TIER_NAMES } from '@/lib/types';
import { timeAgo } from '@/lib/time';
import { Avatar, Seg, Title } from '@/components/StaffBits';
import { Kpi, Pill } from '@/components/ReportBits';

type F = 'open' | 'soon' | 'expired' | 'converted' | 'all';
export default function Estimates() {
  const d = useStore(); const pm = useProductMap(); const [f, setF] = useState<F>('open'); const [who, setWho] = useState('all'); const [q, setQ] = useState('');
  const now = Date.now(); const thisMonth = new Date().toISOString().slice(0, 7);
  const all = useMemo(() => d.bills.filter((b) => b.kind === 'estimate').map((b) => {
    const changed = b.lines.filter((l) => (pm.get(l.pid)?.prices[b.tier] ?? l.price) !== l.price).length;
    const exp = isExpiredEstimate(b); const left = b.validUntil ? new Date(b.validUntil).getTime() - now : 0;
    return { b, changed, exp, soon: b.status === 'open' && !exp && left < 2 * 86400000, phone: d.customers.find((c) => c.id === b.customerId)?.phone ?? '' };
  }), [d.bills, d.customers, pm]); // eslint-disable-line react-hooks/exhaustive-deps
  const open = all.filter((x) => x.b.status === 'open'); const conv = all.filter((x) => x.b.status === 'converted');
  const list = all.filter((x) => (f === 'all' || (f === 'open' ? x.b.status === 'open' : f === 'soon' ? x.soon : f === 'expired' ? x.exp : x.b.status === 'converted'))
    && (who === 'all' || x.b.staffId === who) && (!q || x.b.no.toLowerCase().includes(q.toLowerCase()) || x.phone.includes(q)));
  const convMonth = d.bills.filter((b) => b.kind === 'quotation' && b.fromEstimate && b.date.startsWith(thisMonth));
  return (
    <div className="mx-auto max-w-[1100px]">
      <Title title="Estimates" sub="Salesmen make estimates; only you turn them into sales. Open one to see when it was made, which prices have changed since, and what price to keep." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Waiting for you" value={open.length} kind="num" tone="butter" sub={money(open.reduce((t, x) => t + x.b.total, 0)) + ' quoted'} />
        <Kpi label="With changed prices" value={open.filter((x) => x.changed).length} kind="num" tone="blush" sub="check before converting" />
        <Kpi label="Expiring in 2 days" value={all.filter((x) => x.soon).length} kind="num" tone="lilac" />
        <Kpi label="Converted this month" value={convMonth.length} kind="num" tone="sage" sub={money(convMonth.reduce((t, b) => t + b.total, 0)) + ' sold'} />
      </div>
      <div className="mb-4 mt-5 flex flex-wrap items-center gap-2">
        <Seg value={f} onChange={setF} options={[['open', 'Open'], ['soon', 'Expiring'], ['expired', 'Expired'], ['converted', 'Converted'], ['all', 'All']]} />
        <select value={who} onChange={(e) => setWho(e.target.value)} className="!rounded-xl" aria-label="Salesman"><option value="all">Every salesman</option>{d.staff.filter((s) => s.role === 'salesman').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Estimate number or phone" className="!rounded-xl" />
      </div>
      <div className="space-y-3">
        {list.slice(0, 40).map(({ b, changed, exp, soon, phone }) => (
          <div key={b.id} className="flex flex-wrap items-center gap-4 rounded-[22px] border border-line bg-white p-4">
            <Avatar staff={d.staff} id={b.staffId} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><span className="font-display text-lg font-semibold">{b.no}</span>
                {b.status === 'converted' ? <Pill tone="sky">Converted</Pill> : exp ? <Pill tone="blush">Expired {fmtDate(b.validUntil!)}</Pill> : soon ? <Pill tone="butter">Expires soon</Pill> : <Pill tone="sage">Open</Pill>}
                {b.status === 'open' && changed > 0 && <Pill tone="butter">{changed} price{changed > 1 ? 's' : ''} changed</Pill>}</div>
              <div className="text-sm text-steel">By {d.staff.find((s) => s.id === b.staffId)?.name} · made {timeAgo(b.date)} ({fmtDate(b.date)}) · {phone} · {TIER_NAMES[b.tier]} · {b.lines.length} item{b.lines.length > 1 ? 's' : ''}</div>
            </div>
            <div className="text-right"><div className="font-display text-xl font-semibold">{money(b.total)}</div><div className="text-xs text-steel">as quoted</div></div>
            {b.status === 'open' ? <Link href={`/admin/estimates/${b.id}`} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-light">Review & convert</Link>
              : <span className="w-36 text-center text-xs text-steel">{b.status === 'converted' ? 'Became a sale' : ''}</span>}
          </div>))}
        {!list.length && <div className="rounded-[22px] border-2 border-dashed border-line px-6 py-14 text-center"><div className="mb-2 text-4xl">🗂️</div><div className="font-display text-lg font-semibold">No estimates here</div><p className="text-sm text-steel">Try another filter.</p></div>}
        {list.length > 40 && <p className="px-1 text-xs text-steel">Showing the first 40 of {list.length}. Use search to narrow down.</p>}
      </div>
    </div>
  );
}