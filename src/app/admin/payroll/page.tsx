'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { dk, fmtDate, money } from '@/lib/rules';
import { PayCalc, computePay, hm, monthLabel, shiftMonth } from '@/lib/payroll';
import { AdjustKind, Staff } from '@/lib/types';
import { useScreenKeys } from '@/lib/hotkeys';
import { DataGrid } from '@/components/grid/DataGrid';
import { KBtn, ScreenHead } from '@/components/grid/Screen';
import { Field, Panel } from '@/components/grid/Panel';
import { toast } from '@/components/grid/Toast';
import { errText } from '@/components/StaffBits';

const sel = 'rounded-md border border-line bg-white px-2 py-1 text-[13px]';
/** Salaries and Payroll: one month's salary statement. Click a person to see the working, add a bonus or advance, and mark it paid. */
export default function PayrollPage() {
  const d = useStore(); const cur = dk(new Date()).slice(0, 7); const [month, setMonth] = useState(cur); const [pick, setPick] = useState('');
  const people = d.staff.filter((s) => s.role === 'salesman');
  const rows = people.map((s) => ({ s, c: computePay(d, s, month) }));
  const total = rows.reduce((a, r) => a + r.c.net, 0); const paid = rows.filter((r) => r.c.payslip).reduce((a, r) => a + r.c.net, 0);
  const chosen = rows.find((r) => r.s.id === pick) ?? rows[0];
  const cut = (c: PayCalc) => c.leaveCut + c.absentCut + c.joinCut;
  return (
    <div className="max-w-6xl">
      <ScreenHead title="Salaries and Payroll" hint="Salary after unpaid leave, absences, bonus and advances. Once a salary is marked paid its figures are frozen.">
        <button onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month" className="rounded-md border border-line bg-white p-1.5 hover:bg-paper"><ChevronLeft className="h-4 w-4" /></button>
        <b className="min-w-36 text-center text-[13px]">{monthLabel(month)}</b>
        <button onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= cur} aria-label="Next month" className="rounded-md border border-line bg-white p-1.5 hover:bg-paper disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
      </ScreenHead>
      <p className="mb-2 text-[13px] text-steel">Net payroll <b className="text-ink">{money(total)}</b> · paid <b className="text-ink">{money(paid)}</b> · still to pay <b className="text-ink">{money(total - paid)}</b>{month === cur && ' · month in progress, figures change daily'}</p>
      <DataGrid csvName={`payroll-${month}`} rows={rows} rowKey={(r) => r.s.id} onOpen={(r) => setPick(r.s.id)} onActive={(r) => setPick(r.s.id)} openOnClick empty="No salesmen yet"
        cols={[
          { h: 'Staff', v: (r) => <span className="font-medium">{r.s.name}</span>, csv: (r) => r.s.name, sort: (r) => r.s.name },
          { h: 'Salary', right: true, v: (r) => money(r.c.base), csv: (r) => r.c.base, sort: (r) => r.c.base },
          { h: 'Working days', right: true, v: (r) => r.c.workingDays, csv: (r) => r.c.workingDays }, { h: 'Present', right: true, v: (r) => r.c.present, csv: (r) => r.c.present },
          { h: 'Paid leave', right: true, v: (r) => r.c.paidLeave || '-', csv: (r) => r.c.paidLeave }, { h: 'Unpaid leave', right: true, v: (r) => r.c.unpaidLeave || '-', csv: (r) => r.c.unpaidLeave }, { h: 'Absent', right: true, v: (r) => r.c.absent || '-', csv: (r) => r.c.absent },
          { h: 'Cut', right: true, v: (r) => (cut(r.c) ? money(cut(r.c)) : '-'), csv: (r) => cut(r.c) }, { h: 'Bonus', right: true, v: (r) => (r.c.bonus ? money(r.c.bonus) : '-'), csv: (r) => r.c.bonus },
          { h: 'Advance and other', right: true, v: (r) => (r.c.advance + r.c.other ? money(r.c.advance + r.c.other) : '-'), csv: (r) => r.c.advance + r.c.other },
          { h: 'Net pay', right: true, v: (r) => <b>{money(r.c.net)}</b>, csv: (r) => r.c.net, sort: (r) => r.c.net },
          { h: 'Status', v: (r) => (r.c.payslip ? `Paid ${fmtDate(r.c.payslip.paidOn)}` : <span className="text-butter-fg">Not paid</span>), csv: (r) => (r.c.payslip ? `Paid ${r.c.payslip.mode}` : 'Not paid') },
        ]} />
      {chosen && <Slip key={chosen.s.id + month} s={chosen.s} c={chosen.c} month={month} />}
    </div>
  );
}

function Slip({ s, c, month }: { s: Staff; c: PayCalc; month: string }) {
  const d = useStore(); const locked = !!c.payslip;
  const [kind, setKind] = useState<AdjustKind>('bonus'); const [amt, setAmt] = useState(''); const [note, setNote] = useState(''); const [mode, setMode] = useState('Cash'); const [err, setErr] = useState('');
  useEffect(() => setErr(''), [month, s.id]);
  const run = (fn: () => void, ok?: string) => { try { fn(); setErr(''); if (ok) toast(ok); return true; } catch (e) { setErr(errText(e)); return false; } };
  const addAdj = () => { if (run(() => d.addPayAdjust(s.id, month, kind, +amt, note))) { setAmt(''); setNote(''); } };
  const pay = () => run(() => d.payStaff(s.id, month, mode), `${s.name}'s salary for ${monthLabel(month)} marked as paid`);
  useScreenKeys(locked ? [] : [{ key: 'F2', label: 'Mark paid', run: pay }]);
  const L = ({ k, v, sub, minus }: { k: string; v: number; sub?: string; minus?: boolean }) => <Field label={k}><span className="tabular-nums">{minus ? '- ' : ''}{money(v)}{sub && <span className="ml-2 text-[12px] text-steel">{sub}</span>}</span></Field>;
  return (
    <div className="mt-3 grid gap-3 lg:grid-cols-2">
      <Panel title={`${s.name}: ${monthLabel(month)}`} hint={`${hm(c.minutes)} worked${c.late ? ` · late ${c.late}×` : ''}`}>
        <L k="Monthly salary" v={c.base} sub={`${c.workingDays} working days, ${money(c.perDay)} a day`} />
        {c.joinCut > 0 && <L k="Before joining" v={c.joinCut} minus />}
        {c.unpaidLeave > 0 && <L k="Unpaid leave" v={c.leaveCut} minus sub={`${c.unpaidLeave} day${c.unpaidLeave > 1 ? 's' : ''}`} />}
        {c.absent > 0 && <L k="Absent without leave" v={c.absentCut} minus sub={`${c.absent} day${c.absent > 1 ? 's' : ''}`} />}
        {c.paidLeave > 0 && <Field label="Paid leave"><span className="text-steel">{c.paidLeave} day{c.paidLeave > 1 ? 's' : ''}, no deduction</span></Field>}
        {c.adjusts.map((a) => (
          <Field key={a.id} label={a.kind === 'bonus' ? 'Bonus' : a.kind === 'advance' ? 'Advance recovered' : 'Deduction'}>
            <span className="tabular-nums">{a.kind === 'bonus' ? '+ ' : '- '}{money(a.amount)}{a.note && <span className="ml-2 text-[12px] text-steel">{a.note}</span>}
              {!locked && <button aria-label="Remove" className="ml-2 align-middle text-steel hover:text-blush-fg" onClick={() => run(() => d.removePayAdjust(a.id))}><Trash2 className="inline h-3.5 w-3.5" /></button>}</span>
          </Field>))}
        <Field label="Net pay"><b className="text-[18px] tabular-nums">{money(c.net)}</b></Field>
      </Panel>
      <Panel title={locked ? 'Paid' : 'Add and pay'}>
        {locked ? (
          <>
            <Field label="Paid on">{fmtDate(c.payslip!.paidOn)} by {c.payslip!.mode.toLowerCase()}</Field><Field label="Payslip no.">{c.payslip!.no}</Field>
            <div className="flex gap-2 py-2"><Link href={`/admin/payroll/${s.id}/${month}`} className="rounded-md border border-line bg-white px-3 py-1.5 text-[13px] font-medium hover:bg-paper">Open payslip</Link>
              <KBtn onClick={() => confirm('Reopen this payslip? Leaves and adjustments for the month become editable again and the payment record is removed.') && d.reopenPayslip(c.payslip!.id)}>Reopen</KBtn></div>
          </>
        ) : (
          <>
            <Field label="Add"><span className="flex flex-wrap items-center gap-2">
              <select aria-label="Type" className={sel} value={kind} onChange={(e) => setKind(e.target.value as AdjustKind)}><option value="bonus">Bonus (add)</option><option value="advance">Advance (recover)</option><option value="deduction">Deduction</option></select>
              <input aria-label="Amount" type="number" min={0} placeholder="Amount" className="!w-28 !rounded-md !px-2 !py-1 text-[13px]" value={amt} onChange={(e) => setAmt(e.target.value)} />
              <input aria-label="Note" placeholder="Note, e.g. Diwali bonus" className="!w-48 !rounded-md !px-2 !py-1 text-[13px]" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addAdj()} />
              <KBtn onClick={addAdj}>Add</KBtn></span></Field>
            <Field label="Pay by"><span className="flex items-center gap-2"><select aria-label="Payment mode" className={sel} value={mode} onChange={(e) => setMode(e.target.value)}><option>Cash</option><option>Online</option><option>Bank transfer</option></select>
              <KBtn primary k="F2" onClick={pay}>Mark {money(c.net)} as paid</KBtn><Link href={`/admin/payroll/${s.id}/${month}`} className="text-[12.5px] text-steel underline">Preview payslip</Link></span></Field>
          </>
        )}
        {err && <p role="alert" className="my-1.5 rounded bg-blush-bg px-3 py-1.5 text-[12.5px] text-blush-fg">{err}</p>}
      </Panel>
    </div>
  );
}