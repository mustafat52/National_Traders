'use client';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer } from 'lucide-react';
import { useStore } from '@/lib/store';
import { fmtDate, money } from '@/lib/rules';
import { computePay, monthLabel } from '@/lib/payroll';

/** Printable payslip. Uses frozen figures once the salary is paid, live figures otherwise. */
export default function PayslipPage() {
  const { staffId, month } = useParams<{ staffId: string; month: string }>(); const router = useRouter(); const d = useStore();
  const s = d.staff.find((x) => x.id === staffId);
  if (!s) return <p className="text-steel">Staff member not found.</p>;
  const c = computePay(d, s, month); const p = c.payslip;
  const rows: [string, number, '+' | '-' | ''][] = [['Monthly salary', c.base, ''], ['Before joining', c.joinCut, '-'], ['Unpaid leave (' + c.unpaidLeave + ' days)', c.leaveCut, '-'], ['Absent (' + c.absent + ' days)', c.absentCut, '-'], ...c.adjusts.map((a): [string, number, '+' | '-'] => [(a.kind === 'bonus' ? 'Bonus: ' : a.kind === 'advance' ? 'Advance recovered: ' : 'Deduction: ') + a.note, a.amount, a.kind === 'bonus' ? '+' : '-'])];
  return (
    <div className="mx-auto max-w-2xl">
      <div className="no-print mb-4 flex justify-between"><button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-steel"><ArrowLeft className="h-4 w-4" />Back</button><button onClick={() => window.print()} className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white"><Printer className="h-4 w-4" />Print or save as PDF</button></div>
      <div className="rounded-[22px] border border-line bg-white p-8">
        <div className="flex items-start justify-between border-b border-line pb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-header.png" alt="National Traders" className="h-20 rounded-lg" />
          <div className="text-right"><div className="font-display text-xl font-semibold">PAYSLIP</div><div className="text-sm text-steel">{monthLabel(month)}</div>{p ? <div className="text-xs text-steel">{p.no}</div> : <div className="text-xs text-butter-fg">Not paid yet (preview)</div>}</div>
        </div>
        <div className="grid grid-cols-2 gap-3 py-4 text-sm"><div><div className="text-xs text-steel">Employee</div>{s.name}</div><div><div className="text-xs text-steel">Phone</div>{s.phone}</div>
          <div><div className="text-xs text-steel">Days present / working days</div>{c.present} / {c.workingDays}</div><div><div className="text-xs text-steel">Paid leave</div>{c.paidLeave} days (no deduction)</div></div>
        <table className="w-full text-sm"><tbody>
          {rows.filter(([, v]) => v > 0).map(([k, v, sign], i) => <tr key={i} className="border-t border-line"><td className="py-2">{k}</td><td className="py-2 text-right tabular-nums">{sign === '-' ? '−' : sign}{money(v)}</td></tr>)}
          <tr className="border-t-2 border-ink font-display text-lg font-semibold"><td className="py-3">Net pay</td><td className="py-3 text-right">{money(c.net)}</td></tr>
        </tbody></table>
        {p && <p className="mt-4 text-sm text-steel">Paid on {fmtDate(p.paidOn)} by {p.mode.toLowerCase()}.</p>}
        <p className="mt-8 text-xs text-steel">Per-day pay is the monthly salary divided by the working days of the month ({c.workingDays}). Computer generated; no signature required.</p>
      </div>
    </div>
  );
}