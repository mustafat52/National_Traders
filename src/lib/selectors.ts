import { Data } from './types';
import { dk, mk } from './rules';

export const returnedQty = (d: Data, billId: string, pid: string) =>
  d.returns.filter((r) => r.billId === billId).flatMap((r) => r.lines).filter((l) => l.pid === pid).reduce((a, l) => a + l.qty, 0);

export function staffPoints(d: Data, staffId: string, month: string) {
  const earned = d.bills.filter((b) => b.kind === 'quotation' && b.staffId === staffId && mk(b.date) === month).reduce((a, b) => a + b.points, 0);
  const lost = d.returns.filter((r) => mk(r.date) === month && d.bills.find((b) => b.id === r.billId)?.staffId === staffId).reduce((a, r) => a + r.pointsReversed, 0);
  return earned - lost;
}
export function vendorLedger(d: Data, vid: string) {
  const v = d.vendors.find((x) => x.id === vid)!;
  const rows: { date: string; kind: 'bill' | 'payment'; type: string; ref: string; debit: number; credit: number }[] = [];
  d.purchases.filter((p) => p.vendorId === vid).forEach((p) => rows.push({ date: p.date, kind: 'bill', type: 'Bill ' + p.billNo, ref: p.no, debit: p.total, credit: 0 }));
  d.payments.filter((p) => p.vendorId === vid).forEach((p) => rows.push({ date: p.date, kind: 'payment', type: 'Payment (' + p.mode + ')', ref: '-', debit: 0, credit: p.amount }));
  rows.sort((a, b) => a.date.localeCompare(b.date));
  let bal = v?.opening ?? 0;
  const out = rows.map((r) => ({ ...r, bal: (bal += r.debit - r.credit) }));
  return { rows: out, balance: bal };
}
export const vendorBalance = (d: Data, vid: string) => vendorLedger(d, vid).balance;
/** Ageing: credits (payments) are applied to the oldest charges first. */
export function vendorAging(d: Data, vid: string) {
  const v = d.vendors.find((x) => x.id === vid)!;
  const charges = [{ date: new Date(Date.now() - 100 * 86400000).toISOString(), amt: v.opening },
    ...d.purchases.filter((p) => p.vendorId === vid).map((p) => ({ date: p.date, amt: p.total }))].sort((a, b) => a.date.localeCompare(b.date));
  let credit = d.payments.filter((p) => p.vendorId === vid).reduce((a, p) => a + p.amount, 0);
  const b = [0, 0, 0];
  for (const c of charges) {
    const use = Math.min(credit, c.amt); credit -= use;
    const left = c.amt - use; if (left <= 0) continue;
    const age = (Date.now() - new Date(c.date).getTime()) / 86400000;
    b[age <= 30 ? 0 : age <= 60 ? 1 : 2] += left;
  }
  return b;
}
export const salesOn = (d: Data, day: string) =>
  d.bills.filter((b) => b.kind === 'quotation' && dk(b.date) === day).reduce((a, b) => a + b.total, 0) -
  d.returns.filter((r) => dk(r.date) === day).reduce((a, r) => a + r.refundCash + r.refundOnline, 0);