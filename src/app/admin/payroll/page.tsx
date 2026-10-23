'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Download, FileText, Plus, Trash2, Undo2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { dk, download, fmtDate, money, toCsv } from '@/lib/rules';
import { PayCalc, computePay, hm, monthLabel, shiftMonth } from '@/lib/payroll';
import { AdjustKind, Staff } from '@/lib/types';
import { Rupee } from '@/components/Rupee';
import { Avatar, Banner, Title, card, errText } from '@/components/StaffBits';

export default function PayrollPage() {
  const d = useStore(); const cur = dk(new Date()).slice(0, 7); const [month, setMonth] = useState(cur);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const people = d.staff.filter((s) => s.role === 'salesman');
  const rows = people.map((s) => ({ s, c: computePay(d, s, month) }));
  const total = rows.reduce((a, r) => a + r.c.net, 0); const paid = rows.filter((r) => r.c.payslip).reduce((a, r) => a + r.c.net, 0);
  const cuts = rows.reduce((a, r) => a + r.c.leaveCut + r.c.absentCut + r.c.joinCut, 0);
  const exportCsv = () => download(`payroll-${month}.csv`, toCsv([['Staff', 'Monthly salary', 'Working days', 'Present', 'Paid leave', 'Unpaid leave', 'Absent', 'Leave cut', 'Absent cut', 'Bonus', 'Advance', 'Other deduction', 'Net pay', 'Status'],
    ...rows.map(({ s, c }) => [s.name, c.base, c.workingDays, c.present, c.paidLeave, c.unpaidLeave, c.absent, c.leaveCut, c.absentCut, c.bonus, c.advance, c.other, c.net, c.payslip ? `Paid ${fmtDate(c.payslip.paidOn)} (${c.payslip.mode})` : 'Not paid'])]));
  return (
    <div className="mx-auto max-w-[1100px]">
      <Title title="Payroll" sub="Salary for the month after paid and unpaid leave, absences, bonus and advances. Once you mark a salary paid, its figures are frozen.">
        <button onClick={exportCsv} className="flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium hover:bg-paper"><Download className="h-4 w-4" />Export month</button>
      </Title>
      <div className="mb-4 flex items-center gap-2">
        <button onClick={() => setMonth(shiftMonth(month, -1))} className="rounded-xl border border-line bg-white p-2.5 hover:bg-paper" aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
        <div className="min-w-44 text-center font-display text-xl font-semibold">{monthLabel(month)}</div>
        <button onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= cur} className="rounded-xl border border-line bg-white p-2.5 hover:bg-paper disabled:opacity-40" aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
        {month === cur && <span className="ml-2 rounded-full bg-butter-bg px-3 py-1 text-xs font-medium text-butter-fg">Month in progress: figures change daily</span>}
      </div>
      <Banner msg={msg} onClose={() => setMsg(null)} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[['Net payroll', total, 'bg-sage-bg text-sage-fg'], ['Paid out', paid, 'bg-sky-bg text-sky-fg'], ['Still to pay', total - paid, 'bg-butter-bg text-butter-fg'], ['Cut for leave & absence', cuts, 'bg-lilac-bg text-lilac-fg']].map(([k, v, c]) => (
          <div key={k as string} className={`rounded-[20px] p-4 ${c}`}><div className="text-sm font-medium opacity-80">{k}</div><div className="font-display text-[34px] font-semibold leading-none"><Rupee v={v as number} animate /></div></div>
        ))}
      </div>
      <div className="mt-5 space-y-4">{rows.map(({ s, c }) => <Slip key={s.id + month} s={s} c={c} month={month} onMsg={setMsg} />)}</div>
    </div>
  );
}

function Slip({ s, c, month, onMsg }: { s: Staff; c: PayCalc; month: string; onMsg: (m: { ok: boolean; text: string }) => void }) {
  const d = useStore(); const [adding, setAdding] = useState(false); const [paying, setPaying] = useState(false);
  const [f, setF] = useState<{ kind: AdjustKind; amount: string; note: string }>({ kind: 'bonus', amount: '', note: '' }); const [mode, setMode] = useState('Cash'); const [err, setErr] = useState('');
  const locked = !!c.payslip;
  const run = (fn: () => void, ok?: string) => { try { fn(); setErr(''); if (ok) onMsg({ ok: true, text: ok }); return true; } catch (e) { setErr(errText(e)); return false; } };
  const Line = ({ k, v, sub, tone }: { k: string; v: number; sub?: string; tone?: 'minus' | 'plus' }) => (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm"><div>{k}{sub && <span className="ml-2 text-xs text-steel">{sub}</span>}</div><div className={`tabular-nums ${tone === 'minus' ? 'text-blush-fg' : tone === 'plus' ? 'text-sage-fg' : ''}`}>{tone === 'minus' ? '−' : tone === 'plus' ? '+' : ''}{money(v)}</div></div>
  );
  return (
    <div className={`${card} p-5`}>
      <div className="flex flex-wrap items-center gap-3">
        <Avatar staff={d.staff} id={s.id} size="lg" />
        <div className="min-w-0 flex-1"><div className="font-display text-xl font-semibold">{s.name}</div><div className="text-sm text-steel">Monthly salary {money(s.salary)}</div></div>
        <div className="text-right"><div className="text-xs text-steel">{locked ? 'Paid' : 'Net pay'}</div><div className="font-display text-3xl font-semibold text-brand"><Rupee v={c.net} /></div></div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-sage-bg px-3 py-1 text-sage-fg">Present {c.present} of {c.workingDays} days</span>
        {c.late > 0 && <span className="rounded-full bg-butter-bg px-3 py-1 text-butter-fg">Late {c.late}×</span>}
        {c.paidLeave > 0 && <span className="rounded-full bg-sky-bg px-3 py-1 text-sky-fg">Paid leave {c.paidLeave}</span>}
        {c.unpaidLeave > 0 && <span className="rounded-full bg-lilac-bg px-3 py-1 text-lilac-fg">Unpaid leave {c.unpaidLeave}</span>}
        {c.absent > 0 && <span className="rounded-full bg-blush-bg px-3 py-1 text-blush-fg">Absent {c.absent}</span>}
        <span className="rounded-full bg-paper px-3 py-1 text-steel">{hm(c.minutes)} worked</span>
      </div>
      <div className="mt-3 divide-y divide-line rounded-2xl bg-paper px-4 py-2">
        <Line k="Monthly salary" v={c.base} sub={`${c.workingDays} working days, ${money(c.perDay)} a day`} />
        {c.joinCut > 0 && <Line k="Before joining" v={c.joinCut} tone="minus" />}
        {c.unpaidLeave > 0 && <Line k="Unpaid leave" v={c.leaveCut} tone="minus" sub={`${c.unpaidLeave} day${c.unpaidLeave > 1 ? 's' : ''}`} />}
        {c.absent > 0 && <Line k="Absent without leave" v={c.absentCut} tone="minus" sub={`${c.absent} day${c.absent > 1 ? 's' : ''}`} />}
        {c.paidLeave > 0 && <div className="flex justify-between py-1.5 text-sm text-steel"><span>Paid leave ({c.paidLeave} day{c.paidLeave > 1 ? 's' : ''})</span><span>no deduction</span></div>}
        {c.adjusts.map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
            <div>{a.kind === 'bonus' ? 'Bonus' : a.kind === 'advance' ? 'Advance recovered' : 'Deduction'}<span className="ml-2 text-xs text-steel">{a.note}</span></div>
            <div className="flex items-center gap-2"><span className={`tabular-nums ${a.kind === 'bonus' ? 'text-sage-fg' : 'text-blush-fg'}`}>{a.kind === 'bonus' ? '+' : '−'}{money(a.amount)}</span>
              {!locked && <button aria-label="Remove" className="text-steel hover:text-blush-fg" onClick={() => run(() => d.removePayAdjust(a.id))}><Trash2 className="h-3.5 w-3.5" /></button>}</div>
          </div>))}
        <div className="flex justify-between py-2 font-display text-lg font-semibold"><span>Net pay</span><span>{money(c.net)}</span></div>
      </div>
      {err && <p role="alert" className="mt-2 text-sm text-blush-fg">{err}</p>}

      {adding && !locked && (
        <div className="fade-up mt-3 grid gap-2 rounded-2xl border border-line p-3 sm:grid-cols-[9rem_8rem_1fr_auto]">
          <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as AdjustKind })}><option value="bonus">Bonus (add)</option><option value="advance">Advance (recover)</option><option value="deduction">Deduction</option></select>
          <input type="number" placeholder="Amount" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
          <input placeholder="Note, e.g. Diwali bonus" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          <button className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white" onClick={() => run(() => d.addPayAdjust(s.id, month, f.kind, +f.amount, f.note)) && (setF({ kind: 'bonus', amount: '', note: '' }), setAdding(false))}>Add</button>
        </div>)}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {locked ? (
          <>
            <span className="rounded-full bg-sage-bg px-3 py-1.5 text-sm font-medium text-sage-fg">Paid {fmtDate(c.payslip!.paidOn)} by {c.payslip!.mode.toLowerCase()} · {c.payslip!.no}</span>
            <Link href={`/admin/payroll/${s.id}/${month}`} className="flex items-center gap-1.5 rounded-xl border border-line px-3.5 py-2 text-sm font-medium hover:bg-paper"><FileText className="h-4 w-4" />Payslip</Link>
            <button className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-steel hover:bg-paper" onClick={() => confirm('Reopen this payslip? Leaves and adjustments for the month become editable again and the payment record is removed.') && d.reopenPayslip(c.payslip!.id)}><Undo2 className="h-4 w-4" />Reopen</button>
          </>
        ) : paying ? (
          <div className="fade-up flex flex-wrap items-center gap-2 rounded-2xl bg-sage-bg px-3 py-2 text-sm text-sage-fg">
            Pay {money(c.net)} by
            <select value={mode} onChange={(e) => setMode(e.target.value)}><option>Cash</option><option>Online</option><option>Bank transfer</option></select>
            <button className="rounded-xl bg-brand px-4 py-2 font-medium text-white" onClick={() => run(() => d.payStaff(s.id, month, mode), `${s.name}'s salary for ${monthLabel(month)} marked as paid.`) && setPaying(false)}>Confirm paid</button>
            <button className="px-2 underline" onClick={() => setPaying(false)}>Cancel</button>
          </div>
        ) : (
          <>
            <button className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-light" onClick={() => setPaying(true)}>Mark as paid</button>
            <button className="flex items-center gap-1.5 rounded-xl border border-line px-3.5 py-2 text-sm font-medium hover:bg-paper" onClick={() => setAdding(!adding)}><Plus className="h-4 w-4" />Bonus, advance or deduction</button>
            <Link href={`/admin/payroll/${s.id}/${month}`} className="px-2 text-sm text-steel underline">Preview payslip</Link>
          </>
        )}
      </div>
    </div>
  );
}