import { Bill, Data, Product } from './types';
import { dk } from './rules';
import { dayOfWeek } from './payroll';

/** ---------- Business & profit rules (kept apart from screens; port as-is to the backend) ----------
 * COST of anything sold = quantity x the product's LATEST purchase price (Product.pp), also for old sales.
 * Net sales   = paid sale bills - money refunded to customers.
 * Gross profit = net sales - cost of goods. A sales return puts the goods back, so its cost is taken back out.
 *               A damage return refunds the money but the goods are lost, so their cost stays (it shows as a loss).
 * Staff salary is shown separately, spread evenly over the days of each month (monthly salary / days in month).
 * Estimates are never sales: they count only as a pipeline (how much is quoted but not yet bought).
 */
export interface LineEx { pid: string; name: string; cat: string; qty: number; price: number; cost: number; revenue: number; profit: number; below: boolean; estPrice?: number; unitCost: number }
export interface BillEx { b: Bill; day: string; lines: LineEx[]; revenue: number; cost: number; profit: number; below: number }

export function enrich(bills: Bill[], pm: Map<string, Product>): BillEx[] {
  return bills.map((b) => {
    const lines = b.lines.map((l) => {
      const p = pm.get(l.pid); const unitCost = p?.pp ?? 0; const revenue = l.qty * l.price; const cost = l.qty * unitCost;
      return { pid: l.pid, name: p?.name ?? l.pid, cat: p?.cat ?? '', qty: l.qty, price: l.price, cost, revenue, profit: revenue - cost, below: l.price < unitCost, estPrice: l.estPrice, unitCost };
    });
    const cost = lines.reduce((t, l) => t + l.cost, 0);
    return { b, day: dk(b.date), lines, revenue: b.total, cost, profit: b.total - cost, below: lines.filter((l) => l.below).length };
  });
}

export interface Row { key: string; label: string; from: string; to: string; bills: number; gross: number; refunds: number; returns: number; net: number; cost: number; profit: number; cash: number; online: number; estimates: number; estValue: number; salary: number; points: number }
const blank = (key: string, label: string, from: string, to: string): Row => ({ key, label, from, to, bills: 0, gross: 0, refunds: 0, returns: 0, net: 0, cost: 0, profit: 0, cash: 0, online: 0, estimates: 0, estValue: 0, salary: 0, points: 0 });
export const margin = (r: { net: number; profit: number }) => (r.net > 0 ? (r.profit / r.net) * 100 : 0);
const shift = (k: string, n: number) => { const x = new Date(k + 'T12:00:00'); x.setDate(x.getDate() + n); return dk(x); };
export const daysBetween = (a: string, b: string) => Math.round((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 86400000);
const dim = (k: string) => new Date(+k.slice(0, 4), +k.slice(5, 7), 0).getDate();
export const shortDay = (k: string) => new Date(k + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
export const longDay = (k: string) => new Date(k + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

/** One row for every day from..to (days with no business included). */
export function dailyRows(d: Data, en: BillEx[], pm: Map<string, Product>, from: string, to: string): Row[] {
  const n = Math.min(900, Math.max(0, daysBetween(from, to) + 1)); const m = new Map<string, Row>();
  const people = d.staff.filter((s) => s.role === 'salesman');
  for (let i = 0; i < n; i++) {
    const k = shift(from, i); const r = blank(k, longDay(k), k, k);
    r.salary = people.reduce((t, s) => t + (s.joined && k < s.joined ? 0 : s.salary / dim(k)), 0); m.set(k, r);
  }
  for (const e of en) {
    const r = m.get(e.day); if (!r) continue;
    if (e.b.kind === 'quotation') { r.bills++; r.gross += e.b.total; r.cost += e.cost; r.cash += e.b.cash; r.online += e.b.online; r.points += e.b.points; }
    else { r.estimates++; r.estValue += e.b.total; }
  }
  for (const x of d.returns) {
    const r = m.get(dk(x.date)); if (!r) continue;
    r.refunds += x.refundCash + x.refundOnline; r.returns++;
    if (x.kind === 'sales') r.cost -= x.lines.reduce((t, l) => t + l.qty * (pm.get(l.pid)?.pp ?? l.pp), 0);
  }
  return [...m.values()].map((r) => { r.net = r.gross - r.refunds; r.profit = r.net - r.cost; return r; });
}
export type Gran = 'day' | 'week' | 'month';
const weekStart = (k: string) => shift(k, -((dayOfWeek(k) + 6) % 7)); // Monday
export function rollup(rows: Row[], gran: Gran): Row[] {
  if (gran === 'day') return rows;
  const m = new Map<string, Row>();
  for (const r of rows) {
    const key = gran === 'week' ? weekStart(r.from) : r.from.slice(0, 7);
    const o = m.get(key) ?? blank(key, '', r.from, r.to);
    if (r.from < o.from) o.from = r.from; if (r.to > o.to) o.to = r.to;
    (['bills', 'gross', 'refunds', 'returns', 'net', 'cost', 'profit', 'cash', 'online', 'estimates', 'estValue', 'salary', 'points'] as const).forEach((f) => { o[f] += r[f]; });
    m.set(key, o);
  }
  return [...m.values()].map((o) => ({ ...o, label: gran === 'week' ? `${shortDay(o.from)} to ${shortDay(o.to)}` : new Date(o.from + 'T12:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) }));
}
export const sumRows = (rows: Row[]): Row => rollup(rows.map((r) => ({ ...r, from: '0', to: '0' })), 'month')[0] ?? blank('', '', '', '');

export const hourly = (en: BillEx[], from: string, to: string) => { const h: number[] = Array(24).fill(0); en.forEach((e) => { if (e.b.kind === 'quotation' && e.day >= from && e.day <= to) h[new Date(e.b.date).getHours()] += e.b.total; }); return h; };