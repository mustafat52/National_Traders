import { Bill, Product, Settings } from './types';

/** ---------- Business rules (kept separate from screens; port as-is to the backend) ---------- */
export const money = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
export const pad = (n: number, w = 4) => String(n).padStart(w, '0');
export const uid = (p = '') => p + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
export const dk = (d: Date | string) => {
  const x = typeof d === 'string' ? new Date(d) : d;
  return `${x.getFullYear()}-${pad(x.getMonth() + 1, 2)}-${pad(x.getDate(), 2)}`;
};
export const mk = (d: Date | string) => dk(d).slice(0, 7);
export const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
export const fmtTime = (d?: string) => (d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-');

export const stockTotal = (p: Product) => p.stock.reduce((a, b) => a + b, 0);
export const isLow = (p: Product) => stockTotal(p) <= p.min;
export const locsWithStock = (p: Product) => p.stock.map((q, i) => (q > 0 ? i : -1)).filter((i) => i >= 0);
/** Picker is shown only when the product has stock in MORE THAN ONE location. */
export const needsPicker = (p: Product) => locsWithStock(p).length > 1;

/** Default allocation: single-location items auto-allocate; multi-location items fill Main Shop first. */
export function autoAlloc(p: Product, qty: number): number[] {
  const alloc = [0, 0, 0];
  let left = qty;
  for (const i of [0, 1, 2]) {
    const take = Math.min(left, p.stock[i]);
    alloc[i] = take; left -= take;
  }
  return alloc;
}
export const calcPoints = (total: number, per1000: number) => Math.floor((total * per1000) / 1000);

export const isExpiredEstimate = (b: Bill, now = new Date()) =>
  b.kind === 'estimate' && b.status === 'open' && !!b.validUntil && new Date(b.validUntil) < now;
export const isLinkExpired = (b: Bill, s: Settings, now = new Date()) =>
  (now.getTime() - new Date(b.date).getTime()) / 86400000 > s.linkDays;

/** Repeat purchase alert: same customer, same product, PAID sale within N days. */
export function repeatHit(bills: Bill[], customerId: string, pid: string, days: number, now = new Date()) {
  let best: { date: string; price: number; qty: number } | null = null;
  for (const b of bills) {
    if (b.kind !== 'quotation' || b.customerId !== customerId) continue;
    const age = (now.getTime() - new Date(b.date).getTime()) / 86400000;
    if (age > days || age < 0) continue;
    const l = b.lines.find((x) => x.pid === pid);
    if (l && (!best || b.date > best.date)) best = { date: b.date, price: l.price, qty: l.qty };
  }
  return best;
}
export function toCsv(rows: (string | number)[][]) {
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
}
export function download(name: string, text: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  a.download = name; a.click();
}
