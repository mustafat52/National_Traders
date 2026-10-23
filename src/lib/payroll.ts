import { Attendance, Data, Leave, PayAdjust, PayFigures, Payslip, Staff } from './types';
import { dk, mk, pad } from './rules';

/** ---------- Payroll & attendance rules (kept apart from screens; port as-is to the backend) ----------
 * Salary is monthly. Per-day pay = monthly salary / working days of that month (weekly off days are not working days).
 * Deducted: approved UNPAID leave days + absent days (a working day with no attendance and no approved leave).
 * Not deducted: approved PAID leave days. The owner chooses paid or unpaid for every leave when approving it.
 */
const keyOf = (y: number, m: number, d: number) => `${y}-${pad(m, 2)}-${pad(d, 2)}`;
export const dayOfWeek = (key: string) => new Date(key + 'T12:00:00').getDay();
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** All date keys (YYYY-MM-DD) of a month "YYYY-MM". */
export function monthKeys(month: string): string[] {
  const [y, m] = month.split('-').map(Number); const n = new Date(y, m, 0).getDate();
  return Array.from({ length: n }, (_, i) => keyOf(y, m, i + 1));
}
export const workingKeys = (month: string, off: number) => monthKeys(month).filter((k) => dayOfWeek(k) !== off);
/** Working days between two dates (inclusive), skipping the weekly off. */
export function rangeKeys(from: string, to: string, off: number): string[] {
  const out: string[] = []; if (to < from) return out;
  const d = new Date(from + 'T12:00:00'); const end = new Date(to + 'T12:00:00');
  for (let i = 0; d <= end && i < 400; i++, d.setDate(d.getDate() + 1)) { const k = dk(d); if (dayOfWeek(k) !== off) out.push(k); }
  return out;
}
export const leaveDays = (from: string, to: string, off: number) => rangeKeys(from, to, off).length;
export const monthLabel = (month: string) => new Date(month + '-01T12:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
export const shiftMonth = (month: string, by: number) => { const [y, m] = month.split('-').map(Number); return mk(new Date(y, m - 1 + by, 1, 12)); };
export const monthsInRange = (from: string, to: string) => { const out: string[] = []; for (let m = from.slice(0, 7); m <= to.slice(0, 7); m = shiftMonth(m, 1)) out.push(m); return out; };

export const workedMinutes = (a: Attendance, now = Date.now()) => {
  const end = a.out ? new Date(a.out).getTime() : now;
  const br = a.breaks.reduce((t, b) => t + ((b.e ? new Date(b.e).getTime() : now) - new Date(b.s).getTime()), 0);
  return Math.max(0, Math.round((end - new Date(a.in).getTime() - br) / 60000));
};
export const breakMinutes = (a: Attendance, now = Date.now()) => Math.round(a.breaks.reduce((t, b) => t + ((b.e ? new Date(b.e).getTime() : now) - new Date(b.s).getTime()), 0) / 60000);
export const hm = (min: number) => `${Math.floor(min / 60)}h ${pad(min % 60, 2)}m`;
export const isLate = (a: Attendance, lateAfter: string) => { const t = new Date(a.in); return pad(t.getHours(), 2) + ':' + pad(t.getMinutes(), 2) > lateAfter; };

export type DayState = 'present' | 'late' | 'paid-leave' | 'unpaid-leave' | 'pending-leave' | 'absent' | 'off' | 'future' | 'before-joining';
/** What a person's day was. `today` is treated as open: no attendance yet is not "absent" until the day is over. */
export function dayState(d: Data, staff: Staff, key: string, now = new Date()): DayState {
  const today = dk(now);
  if (staff.joined && key < staff.joined) return 'before-joining';
  const att = d.attendance.find((a) => a.staffId === staff.id && a.date === key);
  if (att) return isLate(att, d.settings.lateAfter) ? 'late' : 'present';
  if (dayOfWeek(key) === d.settings.weeklyOff) return 'off';
  const lv = d.leaves.find((l) => l.staffId === staff.id && l.status !== 'rejected' && key >= l.from && key <= l.to);
  if (lv) return lv.status === 'pending' ? 'pending-leave' : lv.pay === 'unpaid' ? 'unpaid-leave' : 'paid-leave';
  if (key > today) return 'future';
  if (key === today) return 'future';
  return 'absent';
}

export interface PayCalc extends PayFigures { late: number; minutes: number; adjusts: PayAdjust[]; payslip?: Payslip; paidDays: string[]; unpaidDays: string[]; absentDays: string[]; }
/** Live figures for one person and month. If the salary was already paid, the frozen payslip figures are returned instead. */
export function computePay(d: Data, staff: Staff, month: string, now = new Date()): PayCalc {
  const off = d.settings.weeklyOff; const work = workingKeys(month, off); const perDayRaw = work.length ? staff.salary / work.length : 0;
  const eligible = work.filter((k) => !staff.joined || k >= staff.joined);
  const att = d.attendance.filter((a) => a.staffId === staff.id && mk(a.date) === month);
  const attDays = new Set(att.map((a) => a.date));
  const paidDays: string[] = []; const unpaidDays: string[] = []; const absentDays: string[] = [];
  const today = dk(now);
  for (const k of eligible) {
    if (attDays.has(k)) continue;
    const lv = d.leaves.find((l) => l.staffId === staff.id && l.status === 'approved' && k >= l.from && k <= l.to);
    if (lv) (lv.pay === 'unpaid' ? unpaidDays : paidDays).push(k);
    else if (k < today) absentDays.push(k);
  }
  const adjusts = d.payAdjusts.filter((a) => a.staffId === staff.id && a.month === month);
  const sum = (kind: PayAdjust['kind']) => adjusts.filter((a) => a.kind === kind).reduce((t, a) => t + a.amount, 0);
  const joinCut = Math.round(perDayRaw * (work.length - eligible.length));
  const leaveCut = Math.round(perDayRaw * unpaidDays.length); const absentCut = Math.round(perDayRaw * absentDays.length);
  const bonus = sum('bonus'); const advance = sum('advance'); const other = sum('deduction');
  const live: PayCalc = {
    base: staff.salary, workingDays: work.length, perDay: Math.round(perDayRaw), present: att.length, paidLeave: paidDays.length, unpaidLeave: unpaidDays.length, absent: absentDays.length,
    joinCut, leaveCut, absentCut, bonus, advance, other, net: staff.salary - joinCut - leaveCut - absentCut + bonus - advance - other,
    late: att.filter((a) => isLate(a, d.settings.lateAfter)).length, minutes: att.reduce((t, a) => t + workedMinutes(a, now.getTime()), 0), adjusts, paidDays, unpaidDays, absentDays,
  };
  const payslip = d.payslips.find((p) => p.staffId === staff.id && p.month === month);
  if (!payslip) return live;
  const { id, no, staffId, month: m, paidOn, mode, ...frozen } = payslip; void id; void no; void staffId; void m; void paidOn; void mode;
  return { ...live, ...frozen, payslip };
}
export const figuresOf = (c: PayCalc): PayFigures => ({
  base: c.base, workingDays: c.workingDays, perDay: c.perDay, present: c.present, paidLeave: c.paidLeave, unpaidLeave: c.unpaidLeave, absent: c.absent,
  joinCut: c.joinCut, leaveCut: c.leaveCut, absentCut: c.absentCut, bonus: c.bonus, advance: c.advance, other: c.other, net: c.net,
});

/** What an UNPAID approval would cost, split by month (a leave can span two months, each month has its own per-day pay). */
export function leaveCost(d: Data, l: Pick<Leave, 'from' | 'to'>, staff: Staff) {
  const off = d.settings.weeklyOff; const keys = rangeKeys(l.from, l.to, off);
  const per = monthsInRange(l.from, l.to).map((m) => {
    const wd = workingKeys(m, off).length; const days = keys.filter((k) => mk(k) === m).length; const perDay = wd ? staff.salary / wd : 0;
    return { month: m, days, perDay: Math.round(perDay), amount: Math.round(perDay * days) };
  }).filter((x) => x.days > 0);
  return { days: keys.length, amount: per.reduce((t, x) => t + x.amount, 0), per };
}
/** Is any month touched by this leave already paid out? Then its pay type can no longer change. */
export const leaveLocked = (d: Data, l: Pick<Leave, 'from' | 'to' | 'staffId'>) =>
  monthsInRange(l.from, l.to).some((m) => d.payslips.some((p) => p.staffId === l.staffId && p.month === m));