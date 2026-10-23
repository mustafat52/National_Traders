'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { dk, fmtDate, fmtTime, mk, money } from '@/lib/rules';
import { computePay, leaveDays, monthLabel } from '@/lib/payroll';
import { staffPoints } from '@/lib/selectors';
import { Badge, Btn, Card, Field } from '@/components/ui';

export default function StaffHome() {
  const d = useStore(); const router = useRouter(); const me = d.session!.staffId;
  const att = d.attendance.find((a) => a.staffId === me && a.date === dk(new Date()));
  const onBreak = !!att?.breaks.some((b) => !b.e);
  const [err, setErr] = useState(''); const [ok, setOk] = useState(false);
  const [l, setL] = useState({ from: dk(new Date()), to: dk(new Date()), type: 'Casual', reason: '' });
  const days = leaveDays(l.from, l.to, d.settings.weeklyOff);
  const meSt = d.staff.find((x) => x.id === me)!; const pay = computePay(d, meSt, mk(new Date()));
  const lastSlip = d.payslips.filter((p) => p.staffId === me).sort((a, b) => b.month.localeCompare(a.month))[0];
  return (
    <div className="space-y-4">
      <Card>
        <div className="text-xs text-slate-500">Today</div>
        <div className="mt-1 flex items-center gap-2 text-lg font-semibold">{att ? <>Clocked in {fmtTime(att.in)}</> : 'Not clocked in'}{onBreak && <Badge tone="amber">on break</Badge>}</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {onBreak ? <Btn onClick={d.endBreak}>End break</Btn> : <Btn variant="outline" onClick={d.startBreak}>Start break</Btn>}
          <Btn variant="danger" onClick={() => { if (confirm('End your day and log out?')) { d.endDay(); router.push('/login'); } }}>End day</Btn>
        </div>
        <p className="mt-2 text-xs text-slate-400">Clock-in happened automatically when you logged in inside the shop.</p>
      </Card>
      <Card><div className="text-xs text-slate-500">My points this month</div><div className="text-3xl font-bold text-brand">{staffPoints(d, me, mk(new Date()))}</div></Card>
      <Card className="space-y-2"><div className="text-sm font-semibold">Request leave</div>
        <div className="grid grid-cols-2 gap-2"><Field label="From"><input type="date" className="w-full" value={l.from} onChange={(e) => setL({ ...l, from: e.target.value, to: e.target.value > l.to ? e.target.value : l.to })} /></Field><Field label="To"><input type="date" className="w-full" min={l.from} value={l.to} onChange={(e) => setL({ ...l, to: e.target.value })} /></Field></div>
        <select className="w-full" value={l.type} onChange={(e) => setL({ ...l, type: e.target.value })}><option>Casual</option><option>Sick</option><option>Emergency</option><option>Other</option></select>
        <textarea rows={2} className="w-full" placeholder="Why do you need leave? (required)" value={l.reason} onChange={(e) => { setL({ ...l, reason: e.target.value }); setErr(''); }} />
        <p className="text-xs text-slate-500">{days} working day{days === 1 ? '' : 's'}. The owner decides whether it is paid or unpaid.</p>
        {err && <p role="alert" className="rounded-lg bg-blush-bg px-3 py-2 text-sm text-blush-fg">{err}</p>}
        {ok && <p className="rounded-lg bg-sage-bg px-3 py-2 text-sm text-sage-fg">Request sent to the owner.</p>}
        <Btn className="w-full" onClick={() => { try { d.requestLeave(l.from, l.to, l.type, l.reason); setL({ ...l, reason: '' }); setErr(''); setOk(true); } catch (e) { setOk(false); setErr(e instanceof Error ? e.message : 'Could not send'); } }}>Submit request</Btn></Card>
      <Card className="!p-3 text-sm"><div className="mb-1 font-semibold">This month</div><div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-lg bg-sage-bg py-2 text-sage-fg"><div className="text-xl font-bold">{pay.present}</div><div className="text-xs">present</div></div><div className="rounded-lg bg-sky-bg py-2 text-sky-fg"><div className="text-xl font-bold">{pay.paidLeave}</div><div className="text-xs">paid leave</div></div><div className="rounded-lg bg-lilac-bg py-2 text-lilac-fg"><div className="text-xl font-bold">{pay.unpaidLeave + pay.absent}</div><div className="text-xs">unpaid days</div></div></div>
        {lastSlip && <p className="mt-2 text-xs text-slate-500">Last salary paid: {money(lastSlip.net)} for {monthLabel(lastSlip.month)} on {fmtDate(lastSlip.paidOn)}.</p>}</Card>
      <div className="space-y-2">{d.leaves.filter((x) => x.staffId === me).map((x) => (
        <Card key={x.id} className="!p-3 text-sm">
          <div className="flex items-center justify-between gap-2"><span>{fmtDate(x.from)}{x.from !== x.to && ` – ${fmtDate(x.to)}`} · {x.type} · {x.days}d</span>
            <Badge tone={x.status === 'approved' ? (x.pay === 'unpaid' ? 'blue' : 'green') : x.status === 'rejected' ? 'red' : 'amber'}>{x.status === 'approved' ? `approved · ${x.pay}` : x.status}</Badge></div>
          <div className="mt-1 text-xs text-slate-500">“{x.reason}”</div>
          {x.note && <div className="mt-1 text-xs"><b>Owner:</b> {x.note}</div>}
        </Card>))}</div>
    </div>
  );
}