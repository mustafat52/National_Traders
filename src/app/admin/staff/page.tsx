'use client';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '@/lib/store';
import { dk, download, fmtDate, fmtTime, money, toCsv } from '@/lib/rules';
import { DAY_NAMES, DayState, breakMinutes, dayOfWeek, dayState, hm, isLate, monthKeys, monthLabel, shiftMonth, workedMinutes } from '@/lib/payroll';
import { Staff } from '@/lib/types';
import { useScreenKeys } from '@/lib/hotkeys';
import { DataGrid } from '@/components/grid/DataGrid';
import { KBtn, ScreenHead } from '@/components/grid/Screen';
import { Field, Panel } from '@/components/grid/Panel';
import { toast } from '@/components/grid/Toast';
import { errText } from '@/components/StaffBits';

type View = 'day' | 'month' | 'team';
const STATE: Record<DayState, { label: string; code: string; cls: string }> = {
  present: { label: 'Present', code: 'P', cls: 'text-good' }, late: { label: 'Late', code: 'P', cls: 'bg-butter-bg text-butter-fg' },
  'paid-leave': { label: 'Paid leave', code: 'PL', cls: 'text-steel' }, 'unpaid-leave': { label: 'Unpaid leave', code: 'UL', cls: 'text-steel' },
  'pending-leave': { label: 'Leave awaiting decision', code: '?', cls: 'text-butter-fg' }, absent: { label: 'Absent', code: 'A', cls: 'bg-blush-bg font-semibold text-blush-fg' },
  off: { label: 'Weekly off', code: '-', cls: 'text-steel/50' }, future: { label: 'Not in yet', code: '', cls: '' }, 'before-joining': { label: 'Not joined yet', code: '', cls: '' },
};
const th = 'px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-steel';
const tab = (on: boolean) => `border-b-2 px-3 py-1.5 text-[13px] font-medium ${on ? 'border-gold text-ink' : 'border-transparent text-steel hover:text-ink'}`;

/** Staff and Attendance: today's attendance, the month at a glance, and the salesman list with salaries. */
export default function StaffAdmin() {
  const d = useStore(); const { staff, attendance, settings } = d; const today = dk(new Date());
  const [view, setView] = useState<View>('day'); const [day, setDay] = useState(today); const [month, setMonth] = useState(today.slice(0, 7));
  const people = useMemo(() => staff.filter((s) => s.role === 'salesman'), [staff]);
  const stepDay = (by: number) => { const x = new Date(day + 'T12:00:00'); x.setDate(x.getDate() + by); const k = dk(x); if (k <= today) setDay(k); };
  return (
    <div className="max-w-6xl">
      <ScreenHead title="Staff and Attendance" hint="Who is in the shop, the month at a glance, and the salesman list. Salaries and leave decisions have their own screens." />
      <div className="mb-3 flex gap-1 border-b border-line">{([['day', 'Day'], ['month', 'Month'], ['team', 'Staff list']] as const).map(([k, l]) => <button key={k} onClick={() => setView(k)} className={tab(view === k)}>{l}</button>)}</div>
      {view === 'day' && <Day d={d} people={people} day={day} today={today} setDay={setDay} stepDay={stepDay} settings={settings} attendance={attendance} />}
      {view === 'month' && <Month people={people} month={month} setMonth={setMonth} today={today} open={(k) => { setDay(k); setView('day'); }} />}
      {view === 'team' && <Team />}
    </div>
  );
}

function Day({ d, people, day, today, setDay, stepDay, settings, attendance }: { d: ReturnType<typeof useStore.getState>; people: Staff[]; day: string; today: string; setDay: (k: string) => void; stepDay: (n: number) => void; settings: ReturnType<typeof useStore.getState>['settings']; attendance: ReturnType<typeof useStore.getState>['attendance'] }) {
  const now = new Date();
  const rows = people.map((s) => {
    const a = attendance.find((x) => x.staffId === s.id && x.date === day); const state = dayState(d, s, day, now);
    const gapOpen = !!a?.gaps.some((g) => !g.back); const brk = !!a?.breaks.some((b) => !b.e);
    const status = a ? (a.out ? 'Day ended' : gapOpen ? 'Stepped out' : brk ? 'On break' : day === today ? 'In the shop' : 'Present') : STATE[state].label;
    const l = d.leaves.find((x) => x.staffId === s.id && x.status !== 'rejected' && day >= x.from && day <= x.to);
    return { s, a, status, note: a ? [isLate(a, settings.lateAfter) ? `Came after ${settings.lateAfter}` : '', a.gaps.length ? `Left the shop ${a.gaps.length}×: ${a.gaps.map((g) => `${fmtTime(g.out)}${g.back ? ' to ' + fmtTime(g.back) : ' (not back)'}`).join(', ')}` : ''].filter(Boolean).join('. ') : l ? `${l.status === 'pending' ? 'Asked for leave' : l.pay === 'unpaid' ? 'Unpaid leave' : 'Paid leave'}: ${l.reason}` : '' };
  });
  const n = (f: (r: (typeof rows)[number]) => boolean) => rows.filter(f).length;
  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[13px]">
        <button onClick={() => stepDay(-1)} aria-label="Previous day" className="rounded-md border border-line bg-white p-1.5 hover:bg-paper"><ChevronLeft className="h-4 w-4" /></button>
        <input type="date" aria-label="Date" max={today} value={day} onChange={(e) => e.target.value && setDay(e.target.value)} className="!w-40 !rounded-md !px-2 !py-1" />
        <button onClick={() => stepDay(1)} disabled={day >= today} aria-label="Next day" className="rounded-md border border-line bg-white p-1.5 hover:bg-paper disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        {day !== today && <button onClick={() => setDay(today)} className="underline">Today</button>}
        <span className="text-steel">{DAY_NAMES[dayOfWeek(day)]}, {fmtDate(day)}{dayOfWeek(day) === settings.weeklyOff && ' · weekly off'}</span>
        <span className="ml-auto text-steel">{n((r) => !!r.a && !r.a.out)} in the shop · {n((r) => !r.a && r.status !== 'Weekly off' && r.status !== 'Paid leave' && r.status !== 'Unpaid leave')} not in · {n((r) => /leave/i.test(r.status))} on leave · {n((r) => !!r.a && isLate(r.a, settings.lateAfter))} late</span>
      </div>
      <DataGrid csvName={`attendance-${day}`} rows={rows} rowKey={(r) => r.s.id} primary={false} empty="No salesmen yet"
        cols={[
          { h: 'Staff', v: (r) => <span className="font-medium">{r.s.name}</span>, csv: (r) => r.s.name, sort: (r) => r.s.name },
          { h: 'Status', v: (r) => r.status, csv: (r) => r.status, sort: (r) => r.status },
          { h: 'In', v: (r) => (r.a ? <span className={isLate(r.a, settings.lateAfter) ? 'font-semibold text-butter-fg' : ''}>{fmtTime(r.a.in)}</span> : ''), csv: (r) => (r.a ? fmtTime(r.a.in) : '') },
          { h: 'Out', v: (r) => (r.a?.out ? fmtTime(r.a.out) : ''), csv: (r) => (r.a?.out ? fmtTime(r.a.out) : '') },
          { h: 'Worked', right: true, v: (r) => (r.a ? hm(workedMinutes(r.a)) : ''), csv: (r) => (r.a ? workedMinutes(r.a) : ''), sort: (r) => (r.a ? workedMinutes(r.a) : 0) },
          { h: 'Breaks', right: true, v: (r) => (r.a ? `${breakMinutes(r.a)} min` : ''), csv: (r) => (r.a ? breakMinutes(r.a) : '') },
          { h: 'Note', v: (r) => <span className="text-[12.5px] text-steel">{r.note}</span>, csv: (r) => r.note },
        ]} />
    </>
  );
}

function Month({ people, month, setMonth, today, open }: { people: Staff[]; month: string; setMonth: (m: string) => void; today: string; open: (k: string) => void }) {
  const d = useStore(); const keys = monthKeys(month); const cur = today.slice(0, 7);
  const data = people.map((s) => {
    const cells = keys.map((k) => ({ k, st: dayState(d, s, k) })); const att = d.attendance.filter((a) => a.staffId === s.id && a.date.startsWith(month));
    const c = (f: (x: DayState) => boolean) => cells.filter((x) => f(x.st)).length;
    return { s, cells, present: att.length, late: c((x) => x === 'late'), absent: c((x) => x === 'absent'), leave: c((x) => x === 'paid-leave' || x === 'unpaid-leave'), mins: att.reduce((t, a) => t + workedMinutes(a), 0) };
  });
  const exp = () => download(`attendance-${month}.csv`, toCsv([['Staff', 'Present', 'Late', 'Absent', 'Leave days', 'Hours worked'], ...data.map((r) => [r.s.name, r.present, r.late, r.absent, r.leave, (r.mins / 60).toFixed(1)])]));
  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[13px]">
        <button onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month" className="rounded-md border border-line bg-white p-1.5 hover:bg-paper"><ChevronLeft className="h-4 w-4" /></button>
        <b className="min-w-36 text-center">{monthLabel(month)}</b>
        <button onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= cur} aria-label="Next month" className="rounded-md border border-line bg-white p-1.5 hover:bg-paper disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
        <KBtn onClick={exp} className="ml-auto">Export CSV</KBtn>
      </div>
      <div className="overflow-x-auto rounded-md border border-line bg-white">
        <table className="w-full min-w-[900px] border-collapse text-center text-[12px]">
          <thead className="bg-paper"><tr className="border-b border-line"><th className={th + ' w-36 text-left'}>Staff</th>{keys.map((k) => <th key={k} className="px-0 py-1 font-medium text-steel"><div>{k.slice(8)}</div><div className="text-[10px] opacity-60">{DAY_NAMES[dayOfWeek(k)][0]}</div></th>)}{['Present', 'Late', 'Absent', 'Leave', 'Hours'].map((h) => <th key={h} className={th + ' text-right'}>{h}</th>)}</tr></thead>
          <tbody>{data.map((r) => (
            <tr key={r.s.id} className="border-b border-line/70">
              <td className="px-2.5 py-1 text-left text-[13px] font-medium">{r.s.name}</td>
              {r.cells.map(({ k, st }) => <td key={k} className="p-0"><button onClick={() => open(k)} title={`${fmtDate(k)}: ${STATE[st].label}`} className={`h-6 w-full min-w-5 text-[11px] ${STATE[st].cls}`}>{STATE[st].code}</button></td>)}
              <td className="px-2.5 text-right tabular-nums">{r.present}</td><td className="px-2.5 text-right tabular-nums">{r.late || '-'}</td><td className="px-2.5 text-right tabular-nums">{r.absent || '-'}</td><td className="px-2.5 text-right tabular-nums">{r.leave || '-'}</td><td className="px-2.5 text-right tabular-nums">{Math.round(r.mins / 60)}h</td>
            </tr>))}</tbody>
        </table>
      </div>
      <p className="mt-2 text-[12px] text-steel">P present (shaded if late) · A absent · PL paid leave · UL unpaid leave · ? leave awaiting decision · - weekly off. Click a day to open it. A working day with no clock-in and no approved leave counts as absent and is deducted in payroll.</p>
    </>
  );
}

function Team() {
  const { staff, addStaff, updateStaff } = useStore(); const people = staff.filter((s) => s.role === 'salesman');
  const [editId, setEditId] = useState<string | null>(null); const [f, setF] = useState({ name: '', phone: '', salary: '' }); const [err, setErr] = useState('');
  const open = (s?: Staff) => { setEditId(s ? s.id : 'new'); setF(s ? { name: s.name, phone: s.phone, salary: String(s.salary) } : { name: '', phone: '', salary: '' }); setErr(''); };
  const save = () => {
    try { if (editId === 'new') { addStaff(f.name, f.phone, +f.salary); toast(`${f.name} added`); } else if (editId) { updateStaff(editId, { name: f.name, phone: f.phone, salary: +f.salary }); toast('Saved'); } setEditId(null); setErr(''); }
    catch (e) { setErr(errText(e)); }
  };
  useScreenKeys(editId ? [{ key: 'F2', label: 'Save', run: save }, { key: 'Esc', label: 'Cancel', run: () => setEditId(null), typing: true }] : [{ key: 'N', label: 'New salesman', run: () => open() }]);
  const total = people.reduce((a, s) => a + s.salary, 0);
  return (
    <>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-[13px]"><span className="text-steel">{people.length} salesmen · monthly salary bill {money(total)} before leave and absence deductions</span><KBtn className="ml-auto" onClick={() => open()} k="N">New salesman</KBtn></div>
      {editId && (
        <div className="mb-3 max-w-xl"><Panel title={editId === 'new' ? 'New salesman' : 'Edit salesman'} hint="A new salary applies to months not yet paid">
          <Field label="Name"><input autoFocus aria-label="Name" className="w-full !rounded-md !px-2.5 !py-1 text-[13px]" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Phone"><input aria-label="Phone" className="w-full !rounded-md !px-2.5 !py-1 text-[13px]" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Monthly salary"><input aria-label="Monthly salary" type="number" min={0} className="!w-40 !rounded-md !px-2.5 !py-1 text-[13px]" value={f.salary} onChange={(e) => setF({ ...f, salary: e.target.value })} /></Field>
          {err && <p className="my-1.5 rounded bg-blush-bg px-3 py-1.5 text-[12.5px] text-blush-fg">{err}</p>}
          <div className="flex gap-2 py-2"><KBtn primary k="F2" onClick={save}>Save</KBtn><KBtn onClick={() => setEditId(null)} k="Esc">Cancel</KBtn></div>
        </Panel></div>
      )}
      <DataGrid csvName="salesmen" rows={people} rowKey={(s) => s.id} onOpen={(s) => open(s)} openOnClick primary={!editId} empty="No salesmen yet. Press N to add one."
        cols={[
          { h: 'Name', v: (s) => <span className="font-medium">{s.name}</span>, csv: (s) => s.name, sort: (s) => s.name },
          { h: 'Phone', v: (s) => <span className="font-mono text-[12.5px]">{s.phone}</span>, csv: (s) => s.phone },
          { h: 'Joined', v: (s) => (s.joined ? fmtDate(s.joined) : ''), csv: (s) => s.joined ?? '', sort: (s) => s.joined ?? '' },
          { h: 'Monthly salary', right: true, v: (s) => money(s.salary), csv: (s) => s.salary, sort: (s) => s.salary },
        ]} />
    </>
  );
}