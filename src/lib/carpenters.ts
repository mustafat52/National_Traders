import { Bill, Carpenter, Data } from './types';
import { mk } from './rules';

/** Everything the owner needs to know about one carpenter, worked out from bills, returns, jobs and payouts. */
export interface CarpRow {
  c: Carpenter; bills: Bill[]; base: number; commission: number; jobs: Bill[]; openJobs: number; doneFees: number;
  paid: number; balance: number; monthSales: number; monthBills: number; pending: number; customers: number;
}
/** Money a carpenter has earned = commission on paid bills they brought (after returns) + fees of finished jobs. Balance = earned minus paid out. */
export function carpRows(d: Pick<Data, 'carpenters' | 'bills' | 'returns' | 'carpPayouts'>): CarpRow[] {
  const returned = new Map<string, number>();
  d.returns.forEach((r) => returned.set(r.billId, (returned.get(r.billId) ?? 0) + r.lines.reduce((a, l) => a + l.amount, 0)));
  const month = mk(new Date());
  return d.carpenters.map((c) => {
    const mine = d.bills.filter((b) => b.referredBy === c.id);
    const paidBills = mine.filter((b) => b.kind === 'quotation');
    const base = paidBills.reduce((a, b) => a + Math.max(0, b.total - (returned.get(b.id) ?? 0)), 0);
    const jobs = d.bills.filter((b) => b.job?.carpenterId === c.id);
    const doneFees = jobs.filter((b) => b.job!.status === 'done').reduce((a, b) => a + b.job!.fee, 0);
    const paid = d.carpPayouts.filter((p) => p.carpenterId === c.id).reduce((a, p) => a + p.amount, 0);
    const commission = Math.round((base * c.ratePct) / 100);
    const m = paidBills.filter((b) => mk(b.date) === month);
    return {
      c, bills: mine, base, commission, jobs, openJobs: jobs.filter((b) => b.job!.status === 'booked').length, doneFees, paid, balance: commission + doneFees - paid,
      monthSales: m.reduce((a, b) => a + b.total, 0), monthBills: m.length,
      pending: mine.filter((b) => b.kind === 'estimate' && b.status === 'open').reduce((a, b) => a + b.total, 0), customers: new Set(mine.map((b) => b.customerId)).size,
    };
  });
}
export const commissionOn = (c: Carpenter, total: number) => Math.round((total * c.ratePct) / 100);