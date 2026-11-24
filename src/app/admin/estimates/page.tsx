'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore, useProductMap } from '@/lib/store';
import { fmtDate, isExpiredEstimate, money } from '@/lib/rules';
import { TIER_NAMES } from '@/lib/types';
import { timeAgo } from '@/lib/time';
import { useScreenKeys } from '@/lib/hotkeys';
import { DataGrid } from '@/components/grid/DataGrid';
import { ScreenHead } from '@/components/grid/Screen';

type F = 'open' | 'soon' | 'expired' | 'converted' | 'all';
const cls = 'rounded-md border border-line bg-white px-2 py-1.5 text-[13px]';

/** Estimate / Quotation: every estimate the salesmen have made. Open one to review it and turn it into a sale. */
export default function Estimates() {
  const d = useStore(); const pm = useProductMap(); const router = useRouter(); const [f, setF] = useState<F>('open'); const [who, setWho] = useState('all'); const [q, setQ] = useState('');
  const now = Date.now(); const thisMonth = new Date().toISOString().slice(0, 7);
  const all = useMemo(() => d.bills.filter((b) => b.kind === 'estimate').map((b) => {
    const changed = b.lines.filter((l) => (pm.get(l.pid)?.prices[b.tier] ?? l.price) !== l.price).length;
    const exp = isExpiredEstimate(b); const left = b.validUntil ? new Date(b.validUntil).getTime() - now : 0; const cu = d.customers.find((c) => c.id === b.customerId);
    const state = b.status === 'converted' ? 'Converted' : exp ? 'Expired' : b.status === 'open' && left < 2 * 86400000 ? 'Expires soon' : 'Open';
    return { b, changed, exp, soon: b.status === 'open' && !exp && left < 2 * 86400000, phone: cu?.phone ?? '', cname: cu?.name ?? '', state, by: d.staff.find((s) => s.id === b.staffId)?.name ?? '' };
  }), [d.bills, d.customers, d.staff, pm]); // eslint-disable-line react-hooks/exhaustive-deps
  const open = all.filter((x) => x.b.status === 'open'); const convMonth = d.bills.filter((b) => b.kind === 'quotation' && b.fromEstimate && b.date.startsWith(thisMonth));
  const list = all.filter((x) => (f === 'all' || (f === 'open' ? x.b.status === 'open' : f === 'soon' ? x.soon : f === 'expired' ? x.exp : x.b.status === 'converted'))
    && (who === 'all' || x.b.staffId === who) && (!q || x.b.no.toLowerCase().includes(q.toLowerCase()) || x.phone.includes(q) || x.cname.toLowerCase().includes(q.toLowerCase())));
  useScreenKeys([{ key: '/', label: 'Search', run: () => document.getElementById('est-q')?.focus() }]);
  const tile = (k: F, label: string, n: number, sub: string, tone = '') => (
    <button key={k} onClick={() => setF(k)} aria-pressed={f === k} className={`min-w-[130px] rounded-md border px-3 py-1.5 text-left transition ${f === k ? 'border-gold bg-sage-bg/60' : 'border-line bg-white hover:bg-paper'}`}>
      <div className={`text-[20px] font-semibold leading-tight tabular-nums ${tone}`}>{n}</div><div className="text-[11.5px] text-steel">{label}{sub ? ` · ${sub}` : ''}</div></button>);

  return (
    <div>
      <ScreenHead title="Estimate / Quotation" hint="Salesmen make estimates; only you turn them into sales. Click a row, or press Enter, to review it.">
        <input id="est-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Number, phone or name   ( / )" className="!w-60 !rounded-md !px-2.5 !py-1.5 text-[13px]" />
      </ScreenHead>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {tile('open', 'Waiting for you', open.length, money(open.reduce((t, x) => t + x.b.total, 0)))}
        {tile('soon', 'Expiring in 2 days', all.filter((x) => x.soon).length, '', all.some((x) => x.soon) ? 'text-butter-fg' : '')}
        {tile('expired', 'Expired', all.filter((x) => x.exp).length, '')}
        {tile('converted', 'Converted', all.filter((x) => x.b.status === 'converted').length, `${convMonth.length} this month`)}
        {tile('all', 'All', all.length, '')}
        <div className="ml-auto"><select value={who} onChange={(e) => setWho(e.target.value)} className={cls} aria-label="Salesman"><option value="all">Every salesman</option>{d.staff.filter((s) => s.role === 'salesman').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
      </div>
      <DataGrid csvName="estimates" rows={list} rowKey={(x) => x.b.id} onOpen={(x) => router.push(`/admin/estimates/${x.b.id}`)} openOnClick maxH="calc(100vh - 250px)" empty="No estimates here. Try another tab."
        cols={[
          { h: 'Date', w: '110px', v: (x) => <span title={fmtDate(x.b.date)}>{timeAgo(x.b.date)}</span>, csv: (x) => fmtDate(x.b.date), sort: (x) => x.b.date },
          { h: 'Estimate no', w: '130px', v: (x) => <span className="font-mono text-[12.5px] font-semibold">{x.b.no}</span>, csv: (x) => x.b.no, sort: (x) => x.b.no },
          { h: 'Customer', v: (x) => <span>{x.cname || x.phone || '—'}{x.cname && x.phone ? <span className="ml-2 text-[12px] text-steel">{x.phone}</span> : null}</span>, csv: (x) => x.cname + ' ' + x.phone, sort: (x) => x.cname || x.phone },
          { h: 'Salesman', v: (x) => x.by, csv: (x) => x.by, sort: (x) => x.by },
          { h: 'Price list', v: (x) => TIER_NAMES[x.b.tier], csv: (x) => TIER_NAMES[x.b.tier], sort: (x) => x.b.tier },
          { h: 'Items', right: true, v: (x) => x.b.lines.length, csv: (x) => x.b.lines.length, sort: (x) => x.b.lines.length },
          { h: 'Amount', right: true, v: (x) => <span className="font-medium">{money(x.b.total)}</span>, csv: (x) => x.b.total, sort: (x) => x.b.total },
          { h: 'Valid until', v: (x) => (x.b.validUntil ? fmtDate(x.b.validUntil) : '—'), csv: (x) => (x.b.validUntil ? fmtDate(x.b.validUntil) : ''), sort: (x) => x.b.validUntil ?? '' },
          { h: 'Status', v: (x) => <span className={x.state === 'Open' ? 'text-good' : x.state === 'Converted' ? 'text-steel' : x.state === 'Expired' ? 'text-blush-fg' : 'text-butter-fg'}>{x.state}{x.b.status === 'open' && x.changed > 0 ? <span className="ml-2 rounded bg-butter-bg px-1.5 py-0.5 text-[11px] font-medium text-butter-fg">{x.changed} price{x.changed > 1 ? 's' : ''} changed</span> : null}</span>, csv: (x) => x.state, sort: (x) => x.state },
        ]} />
    </div>
  );
}