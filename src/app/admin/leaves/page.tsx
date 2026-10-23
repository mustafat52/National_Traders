'use client';
import { useMemo, useState } from 'react';
import { CalendarDays, Lock } from 'lucide-react';
import { useStore } from '@/lib/store';
import { fmtDate, money } from '@/lib/rules';
import { leaveCost, leaveLocked, monthLabel, workingKeys } from '@/lib/payroll';
import { Leave, LeavePay, Staff } from '@/lib/types';
import { timeAgo } from '@/lib/time';
import { CountUp } from '@/components/CountUp';
import { Avatar, Banner, Title, card, errText } from '@/components/StaffBits';

type Filter = 'all' | 'pending' | 'paid' | 'unpaid' | 'rejected';
const when = (l: Leave) => (l.from === l.to ? fmtDate(l.from) : `${fmtDate(l.from)} to ${fmtDate(l.to)}`);

export default function LeavesPage() {
  const d = useStore(); const { leaves, staff } = d;
  const [filter, setFilter] = useState<Filter>('all'); const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const pending = leaves.filter((l) => l.status === 'pending');
  const history = useMemo(() => leaves.filter((l) => l.status !== 'pending').sort((a, b) => (b.decidedAt ?? '').localeCompare(a.decidedAt ?? '')), [leaves]);
  const shown = history.filter((l) => filter === 'all' || (filter === 'paid' ? l.status === 'approved' && l.pay === 'paid' : filter === 'unpaid' ? l.status === 'approved' && l.pay === 'unpaid' : filter === 'rejected' ? l.status === 'rejected' : filter === 'pending' ? false : true));
  const st = (id: string) => staff.find((s) => s.id === id)!;
  const counts = { paid: history.filter((l) => l.status === 'approved' && l.pay === 'paid').length, unpaid: history.filter((l) => l.status === 'approved' && l.pay === 'unpaid').length, rejected: history.filter((l) => l.status === 'rejected').length };

  return (
    <div className="mx-auto max-w-[1100px]">
      <Title title="Leave Requests" sub="Read the reason, then decide. For every approved leave you choose whether the salary is kept (paid) or cut for those days (unpaid)." />
      <Banner msg={msg} onClose={() => setMsg(null)} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[['Waiting for you', pending.length, 'bg-butter-bg text-butter-fg'], ['Approved, paid', counts.paid, 'bg-sage-bg text-sage-fg'], ['Approved, unpaid', counts.unpaid, 'bg-lilac-bg text-lilac-fg'], ['Rejected', counts.rejected, 'bg-blush-bg text-blush-fg']].map(([k, n, c]) => (
          <div key={k as string} className={`rounded-[20px] p-4 ${c}`}><div className="text-sm font-medium opacity-80">{k}</div><div className="font-display text-[40px] font-semibold leading-none"><CountUp value={n as number} duration={600} /></div></div>
        ))}
      </div>

      <h2 className="mb-3 mt-8 font-display text-2xl font-semibold">Waiting for your decision</h2>
      {pending.length === 0 && <div className="rounded-[22px] border-2 border-dashed border-line px-6 py-12 text-center"><div className="mb-2 text-4xl">🌿</div><div className="font-display text-lg font-semibold">No requests waiting</div><p className="text-sm text-steel">New requests from the salesman app appear here.</p></div>}
      <div className="space-y-4">{pending.map((l) => <Decide key={l.id} l={l} s={st(l.staffId)} onDone={setMsg} />)}</div>

      <div className="mb-3 mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold">Past decisions</h2>
        <div className="flex flex-wrap gap-1.5 text-sm">
          {([['all', 'All'], ['paid', 'Paid'], ['unpaid', 'Unpaid'], ['rejected', 'Rejected']] as [Filter, string][]).map(([k, l]) => <button key={k} onClick={() => setFilter(k)} className={`rounded-full px-3.5 py-1.5 font-medium ${filter === k ? 'bg-brand text-white' : 'border border-line bg-white text-steel'}`}>{l}</button>)}
        </div>
      </div>
      <div className="space-y-3">
        {shown.map((l) => <HistoryCard key={l.id} l={l} s={st(l.staffId)} />)}
        {shown.length === 0 && <p className="px-1 text-sm text-steel">Nothing here yet.</p>}
      </div>
    </div>
  );
}

function Decide({ l, s, onDone }: { l: Leave; s: Staff; onDone: (m: { ok: boolean; text: string }) => void }) {
  const d = useStore(); const [pay, setPay] = useState<LeavePay | null>(null); const [note, setNote] = useState(''); const [err, setErr] = useState('');
  const cost = leaveCost(d, l, s); const locked = leaveLocked(d, l);
  const month = l.from.slice(0, 7);
  // context: leave already taken this month by this person
  const taken = d.leaves.filter((x) => x.staffId === s.id && x.status === 'approved' && x.from.slice(0, 7) === month);
  const takenPaid = taken.filter((x) => x.pay === 'paid').reduce((a, x) => a + x.days, 0); const takenUnpaid = taken.filter((x) => x.pay === 'unpaid').reduce((a, x) => a + x.days, 0);
  const go = (status: 'approved' | 'rejected') => {
    try { d.decideLeave(l.id, status, pay ?? undefined, note); onDone({ ok: true, text: status === 'approved' ? `${s.name}'s leave approved as ${pay} leave.` : `${s.name}'s leave rejected. They will see your reason.` }); }
    catch (e) { setErr(errText(e)); }
  };
  return (
    <div className={`${card} fade-up p-5`}>
      <div className="flex flex-wrap items-start gap-4">
        <Avatar staff={d.staff} id={s.id} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><span className="font-display text-xl font-semibold">{s.name}</span><span className="rounded-full bg-sky-bg px-2.5 py-0.5 text-xs font-medium text-sky-fg">{l.type}</span><span className="text-xs text-steel">asked {timeAgo(l.requestedAt)}</span></div>
          <div className="mt-1 flex items-center gap-2 text-steel"><CalendarDays className="h-4 w-4" />{when(l)} · <b className="text-ink">{l.days} working day{l.days > 1 ? 's' : ''}</b></div>
          <blockquote className="mt-3 rounded-2xl bg-paper px-4 py-3 text-[15px]"><span className="text-xs text-steel">Reason given</span><div>{l.reason}</div></blockquote>
          <p className="mt-2 text-xs text-steel">In {monthLabel(month)} so far: {takenPaid} paid and {takenUnpaid} unpaid leave day{takenPaid + takenUnpaid === 1 ? '' : 's'} already approved.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {([['paid', 'Paid leave', 'Salary stays the same. No deduction.', 'sage'], ['unpaid', 'Unpaid leave', `Salary is cut for these days: about ${money(cost.amount)}.`, 'lilac']] as const).map(([k, t, sub, tone]) => (
          <button key={k} onClick={() => { setPay(k); setErr(''); }} disabled={locked} className={`rounded-2xl border-2 p-4 text-left transition disabled:opacity-50 ${pay === k ? (tone === 'sage' ? 'border-sage-fg bg-sage-bg' : 'border-lilac-fg bg-lilac-bg') : 'border-line bg-white hover:bg-paper'}`}>
            <div className="flex items-center justify-between font-display text-lg font-semibold">{t}<span className={`h-5 w-5 rounded-full border-2 ${pay === k ? 'border-brand bg-brand shadow-[inset_0_0_0_3px_white]' : 'border-line'}`} /></div>
            <div className="mt-0.5 text-sm text-steel">{sub}</div>
          </button>
        ))}
      </div>
      {pay === 'unpaid' && (
        <div className="fade-up mt-3 rounded-2xl bg-lilac-bg px-4 py-3 text-sm text-lilac-fg">
          {cost.per.map((p) => <div key={p.month}>{monthLabel(p.month)}: {p.days} day{p.days > 1 ? 's' : ''} × {money(p.perDay)} a day = <b>{money(p.amount)}</b> deducted{p.perDay ? ` (${money(s.salary)} ÷ ${workingKeys(p.month, d.settings.weeklyOff).length} working days)` : ''}</div>)}
        </div>
      )}
      {locked && <p className="mt-3 flex items-center gap-2 text-sm text-blush-fg"><Lock className="h-4 w-4" />Salary for part of this period is already paid. Reopen that payslip in Payroll before deciding.</p>}

      <textarea value={note} onChange={(e) => { setNote(e.target.value); setErr(''); }} rows={2} className="mt-3 w-full" placeholder="Your remark for the staff member (needed if you reject, optional otherwise)" />
      {err && <p role="alert" className="mt-2 text-sm text-blush-fg">{err}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button disabled={locked} onClick={() => go('approved')} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-light disabled:opacity-50">{pay ? `Approve as ${pay} leave` : 'Approve'}</button>
        <button disabled={locked} onClick={() => go('rejected')} className="rounded-xl border border-blush-fg/30 bg-blush-bg px-5 py-2.5 text-sm font-semibold text-blush-fg disabled:opacity-50">Reject</button>
      </div>
    </div>
  );
}

function HistoryCard({ l, s }: { l: Leave; s: Staff }) {
  const d = useStore(); const cost = l.status === 'approved' && l.pay === 'unpaid' ? leaveCost(d, l, s) : null; const locked = leaveLocked(d, l);
  const [open, setOpen] = useState(false); const [err, setErr] = useState('');
  const badge = l.status === 'rejected' ? { t: 'Rejected', c: 'bg-blush-bg text-blush-fg' } : l.pay === 'unpaid' ? { t: 'Approved · unpaid', c: 'bg-lilac-bg text-lilac-fg' } : { t: 'Approved · paid', c: 'bg-sage-bg text-sage-fg' };
  const change = (pay: LeavePay) => { try { d.decideLeave(l.id, 'approved', pay, l.note); setOpen(false); } catch (e) { setErr(errText(e)); } };
  return (
    <div className={`${card} flex flex-wrap items-start gap-3 p-4`}>
      <Avatar staff={d.staff} id={s.id} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{s.name}</span><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.c}`}>{badge.t}</span><span className="text-xs text-steel">{l.type} · {when(l)} · {l.days} day{l.days > 1 ? 's' : ''}</span></div>
        <p className="mt-1 text-sm text-steel">“{l.reason}”</p>
        {l.note && <p className="mt-1 text-sm"><span className="text-steel">Your remark:</span> {l.note}</p>}
        {cost && <p className="mt-1 text-sm text-lilac-fg">Deducted from salary: {money(cost.amount)}</p>}
        {err && <p role="alert" className="mt-1 text-sm text-blush-fg">{err}</p>}
        {open && l.status === 'approved' && <div className="fade-up mt-2 flex gap-2 text-sm"><button className="rounded-lg bg-sage-bg px-3 py-1.5 font-medium text-sage-fg" onClick={() => change('paid')}>Make it paid</button><button className="rounded-lg bg-lilac-bg px-3 py-1.5 font-medium text-lilac-fg" onClick={() => change('unpaid')}>Make it unpaid</button></div>}
      </div>
      <div className="flex items-center gap-2 text-xs text-steel">
        {locked ? <span className="flex items-center gap-1"><Lock className="h-3.5 w-3.5" />Salary paid</span> : l.status === 'approved' && <button onClick={() => setOpen(!open)} className="rounded-lg px-2 py-1 underline">Change pay type</button>}
      </div>
    </div>
  );
}