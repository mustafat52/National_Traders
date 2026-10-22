'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { dk, fmtDate, fmtTime, mk } from '@/lib/rules';
import { staffPoints } from '@/lib/selectors';
import { Badge, Btn, Card, Field } from '@/components/ui';

export default function StaffHome() {
  const d = useStore(); const router = useRouter(); const me = d.session!.staffId;
  const att = d.attendance.find((a) => a.staffId === me && a.date === dk(new Date()));
  const onBreak = !!att?.breaks.some((b) => !b.e);
  const [l, setL] = useState({ from: dk(new Date()), to: dk(new Date()), type: 'Casual', reason: '' });
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
        <div className="grid grid-cols-2 gap-2"><Field label="From"><input type="date" className="w-full" value={l.from} onChange={(e) => setL({ ...l, from: e.target.value })} /></Field><Field label="To"><input type="date" className="w-full" value={l.to} onChange={(e) => setL({ ...l, to: e.target.value })} /></Field></div>
        <select className="w-full" value={l.type} onChange={(e) => setL({ ...l, type: e.target.value })}><option>Casual</option><option>Sick</option><option>Emergency</option></select>
        <input className="w-full" placeholder="Reason" value={l.reason} onChange={(e) => setL({ ...l, reason: e.target.value })} />
        <Btn className="w-full" onClick={() => { d.requestLeave(l.from, l.to, l.type, l.reason); setL({ ...l, reason: '' }); }}>Submit request</Btn></Card>
      <div className="space-y-2">{d.leaves.filter((x) => x.staffId === me).map((x) => <Card key={x.id} className="flex items-center justify-between !p-3 text-sm"><span>{fmtDate(x.from)} – {fmtDate(x.to)} · {x.type}</span><Badge tone={x.status === 'approved' ? 'green' : x.status === 'rejected' ? 'red' : 'amber'}>{x.status}</Badge></Card>)}</div>
    </div>
  );
}
