'use client';
import { useStore } from '@/lib/store';
import { fmtDate, isExpiredEstimate, mk } from '@/lib/rules';
import { staffPoints } from '@/lib/selectors';
import { Badge, Card } from '@/components/ui';

/** Salesmen see POINTS, never the bill value, once a bill is created. */
export default function History() {
  const { bills, customers, session, settings } = useStore(); const me = session!.staffId;
  const d = useStore();
  const mine = bills.filter((b) => b.staffId === me).slice(0, 80);
  return (
    <div className="space-y-3">
      <Card><div className="text-xs text-slate-500">Points this month</div><div className="text-3xl font-bold text-brand">{staffPoints(d, me, mk(new Date()))}</div></Card>
      {mine.map((b) => {
        const exp = isExpiredEstimate(b); const phone = customers.find((c) => c.id === b.customerId)?.phone;
        return (
          <Card key={b.id} className="!p-3">
            <div className="flex items-center justify-between"><div className="text-sm font-semibold">{b.no}</div>
              {b.kind === 'quotation' ? <Badge tone="green">+{b.points} pts</Badge> : <Badge tone={b.status === 'converted' ? 'blue' : exp ? 'red' : 'amber'}>{b.status === 'converted' ? 'estimate · converted' : exp ? 'estimate · expired' : 'estimate · open'}</Badge>}</div>
            <div className="text-xs text-slate-500">{fmtDate(b.date)} · {phone}</div>
            {b.kind === 'estimate' && b.status === 'open' && !exp && <div className="mt-1 text-xs text-slate-400">Waiting for the owner to convert it to a sale. Points are added to you then.</div>}
          </Card>
        );
      })}
      <p className="text-center text-xs text-slate-400">Only the owner converts estimates to sales. Estimates stay for {settings.estimateDays} days. Bill values are hidden after creation.</p>
    </div>
  );
}