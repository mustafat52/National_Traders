'use client';
import { useParams } from 'next/navigation';
import { Printer } from 'lucide-react';
import { useStore, useProductMap } from '@/lib/store';
import { TIER_NAMES } from '@/lib/types';
import { fmtDate, isExpiredEstimate, isLinkExpired, money } from '@/lib/rules';

/** Public customer page. In production this is served from the secure random code; no PDF is stored, it is built from data. */
export default function PublicBill() {
  const { code } = useParams<{ code: string }>(); const { bills, customers, settings } = useStore(); const pm = useProductMap();
  const b = bills.find((x) => x.code === code);
  if (!b) return <div className="p-10 text-center text-slate-500">Bill not found.</div>;
  if (isLinkExpired(b, settings) || isExpiredEstimate(b)) return <div className="p-10 text-center text-slate-500">This link has expired. Please contact National Traders.</div>;
  const cu = customers.find((c) => c.id === b.customerId);
  return (
    <div className="mx-auto my-6 max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm print:border-0 print:shadow-none">
      <div className="-mx-6 -mt-6 mb-4 flex items-center justify-between rounded-t-xl bg-black px-6 py-4 print:rounded-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-header.png" alt="National Traders" className="h-20" />
        <div className="text-right text-white"><div className="font-display text-2xl font-semibold tracking-wide text-gold-light">{b.kind === 'estimate' ? 'ESTIMATE' : 'QUOTATION'}</div><div className="text-sm">{b.no}</div><div className="text-xs text-white/60">{fmtDate(b.date)}</div></div>
      </div>
      <div className="text-xs text-slate-500">Wholesale Plywood &amp; Hardware · Hyderabad, Telangana</div>
      <div className="my-3 text-sm">Customer: <b>{cu?.name || cu?.phone}</b>{cu?.name && <span className="text-slate-500"> · {cu.phone}</span>}</div>
      <table className="w-full text-sm"><thead><tr className="bg-brand-soft text-left text-xs uppercase"><th className="px-2 py-2">Item</th><th className="px-2 text-right">Qty</th><th className="px-2 text-right">Rate</th><th className="px-2 text-right">Amount</th></tr></thead>
        <tbody>{b.lines.map((l) => <tr key={l.pid} className="border-b border-slate-100"><td className="px-2 py-2">{pm.get(l.pid)?.name}</td><td className="px-2 text-right">{l.qty}</td><td className="px-2 text-right">{money(l.price)}</td><td className="px-2 text-right">{money(l.qty * l.price)}</td></tr>)}</tbody></table>
      <div className="mt-3 flex justify-end border-t-2 border-gold pt-2 font-display text-xl font-semibold">Total {money(b.total)}</div>
      {b.kind === 'quotation' && <div className="text-right text-xs text-slate-500">Paid: cash {money(b.cash)}, online {money(b.online)}</div>}
      {b.kind === 'estimate' && <p className="mt-4 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">Valid until {fmtDate(b.validUntil!)}. Prices and availability are subject to change.</p>}
      <button onClick={() => window.print()} className="no-print mt-5 inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-gold-light"><Printer className="h-4 w-4" />Download PDF</button>
      <span className="hidden">{TIER_NAMES.length}</span>
    </div>
  );
}