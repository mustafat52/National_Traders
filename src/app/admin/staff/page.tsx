'use client';
import { useState } from 'react';
import { useStore } from '@/lib/store';
import { dk, fmtDate, fmtTime } from '@/lib/rules';
import { Badge, Btn, Card, DataTable, PageTitle } from '@/components/ui';

export default function StaffAdmin() {
  const { staff, attendance, leaves, setLeave, addStaff } = useStore();
  const [day, setDay] = useState(dk(new Date())); const [name, setName] = useState(''); const [phone, setPhone] = useState('');
  const sm = (id: string) => staff.find((s) => s.id === id)?.name;
  const mins = (a: { s: string; e?: string }[]) => Math.round(a.reduce((t, b) => t + ((b.e ? new Date(b.e).getTime() : Date.now()) - new Date(b.s).getTime()), 0) / 60000);
  return (
    <>
      <PageTitle title="Staff & Attendance" />
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">Attendance on <input type="date" value={day} onChange={(e) => setDay(e.target.value)} /></div>
      <DataTable csv="attendance-day" rows={attendance.filter((a) => a.date === day)} cols={[
        { h: 'Staff', v: (a) => sm(a.staffId) }, { h: 'In', v: (a) => fmtTime(a.in) }, { h: 'Out', v: (a) => (a.out ? fmtTime(a.out) : <Badge tone="green">In shop</Badge>), csv: (a) => fmtTime(a.out) },
        { h: 'Break (min)', v: (a) => mins(a.breaks), right: true }, { h: 'Left shop', v: (a) => (a.gaps.length ? <Badge tone="amber">{a.gaps.length}× out</Badge> : '-'), csv: (a) => a.gaps.length },
      ]} />
      <div className="mb-2 mt-6 text-sm font-semibold">Leave requests</div>
      <DataTable rows={leaves} empty="No leave requests" cols={[
        { h: 'Staff', v: (l) => sm(l.staffId) }, { h: 'From', v: (l) => fmtDate(l.from) }, { h: 'To', v: (l) => fmtDate(l.to) }, { h: 'Type', v: (l) => l.type }, { h: 'Reason', v: (l) => l.reason },
        { h: 'Status', v: (l) => <Badge tone={l.status === 'approved' ? 'green' : l.status === 'rejected' ? 'red' : 'amber'}>{l.status}</Badge> },
        { h: 'Action', v: (l) => l.status === 'pending' && <span className="flex gap-1"><Btn className="!px-2 !py-1 text-xs" onClick={() => setLeave(l.id, 'approved')}>Approve</Btn><Btn variant="danger" className="!px-2 !py-1 text-xs" onClick={() => setLeave(l.id, 'rejected')}>Reject</Btn></span> },
      ]} />
      <Card className="mt-6 flex max-w-xl flex-wrap items-end gap-2"><div className="w-full text-sm font-semibold">Add salesman</div>
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} /><input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Btn onClick={() => { if (name) { addStaff(name, phone); setName(''); setPhone(''); } }}>Add</Btn></Card>
    </>
  );
}
