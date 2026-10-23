'use client';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Pencil, UserPlus } from 'lucide-react';
import { useStore } from '@/lib/store';
import { dk, download, fmtDate, fmtTime, money, toCsv } from '@/lib/rules';
import { DAY_NAMES, DayState, breakMinutes, dayOfWeek, dayState, hm, isLate, monthKeys, monthLabel, shiftMonth, workedMinutes } from '@/lib/payroll';
import { Staff } from '@/lib/types';
import { CountUp } from '@/components/CountUp';
import { Rupee } from '@/components/Rupee';
import { Avatar, Banner, Seg, Title, card, errText } from '@/components/StaffBits';

type View = 'day' | 'month' | 'team';
const STATE: Record<DayState, { label: string; cell: string; chip: string; code: string }> = {
  present: { label: 'Present', cell: 'bg-sage-bg text-sage-fg', chip: 'bg-sage-bg text-sage-fg', code: 'P' },
  late: { label: 'Late', cell: 'bg-butter-bg text-butter-fg', chip: 'bg-butter-bg text-butter-fg', code: 'P' },
  'paid-leave': { label: 'Paid leave', cell: 'bg-sky-bg text-sky-fg', chip: 'bg-sky-bg text-sky-fg', code: 'PL' },
  'unpaid-leave': { label: 'Unpaid leave', cell: 'bg-lilac-bg text-lilac-fg', chip: 'bg-lilac-bg text-lilac-fg', code: 'UL' },
  'pending-leave': { label: 'Leave awaiting decision', cell: 'border border-dashed border-butter-fg/40 bg-white text-butter-fg', chip: 'bg-butter-bg text-butter-fg', code: '?' },
  absent: { label: 'Absent', cell: 'bg-blush-bg text-blush-fg', chip: 'bg-blush-bg text-blush-fg', code: 'A' },
  off: { label: 'Weekly off', cell: 'bg-paper text-steel/60', chip: 'bg-paper text-steel', code: '–' },
  future: { label: 'Not in yet', cell: 'text-steel/40', chip: 'bg-butter-bg text-butter-fg', code: '' },
  'before-joining': { label: 'Not joined yet', cell: 'text-steel/30', chip: 'bg-paper text-steel', code: '' },
};
const T0 = 8, T1 = 21; // timeline runs 8:00 to 21:00
const pct = (iso: string, day: string) => { const x = new Date(iso); const h = x.getHours() + x.getMinutes() / 60 + (dk(x) > day ? 24 : 0); return Math.max(0, Math.min(100, ((h - T0) / (T1 - T0)) * 100)); };

export default function StaffAdmin() {
  const d = useStore(); const { staff, attendance, settings } = d;
  const [view, setView] = useState<View>('day'); const today = dk(new Date());
  const [day, setDay] = useState(today); const [month, setMonth] = useState(today.slice(0, 7));
  const people = useMemo(() => staff.filter((s) => s.role === 'salesman'), [staff]);
  const now = new Date();

  const rows = people.map((s) => {
    const a = attendance.find((x) => x.staffId === s.id && x.date === day);
    const state = dayState(d, s, day, now);
    const openGap = !!a?.gaps.some((g) => !g.back); const onBreak = !!a?.breaks.some((b) => !b.e);
    const status = a ? (a.out ? { t: 'Day ended', c: 'bg-paper text-steel' } : openGap ? { t: 'Stepped out of the shop', c: 'bg-blush-bg text-blush-fg' } : onBreak ? { t: 'On break', c: 'bg-butter-bg text-butter-fg' } : { t: day === today ? 'In the shop' : 'Present', c: 'bg-sage-bg text-sage-fg' }) : { t: STATE[state].label, c: STATE[state].chip };
    return { s, a, state, status, live: !!a && !a.out && !openGap };
  });
  const count = (f: (r: (typeof rows)[number]) => boolean) => rows.filter(f).length;
  const summary = [
    { k: 'In the shop now', n: count((r) => r.live && day === today), c: 'bg-sage-bg text-sage-fg' },
    { k: day === today ? 'Not in yet' : 'Absent', n: count((r) => (r.state === 'future' || r.state === 'absent') && !r.a), c: 'bg-butter-bg text-butter-fg' },
    { k: 'On leave', n: count((r) => r.state === 'paid-leave' || r.state === 'unpaid-leave'), c: 'bg-sky-bg text-sky-fg' },
    { k: 'Came late', n: count((r) => !!r.a && isLate(r.a, settings.lateAfter)), c: 'bg-blush-bg text-blush-fg' },
  ];
  const stepDay = (by: number) => { const x = new Date(day + 'T12:00:00'); x.setDate(x.getDate() + by); const k = dk(x); if (k <= today) setDay(k); };

  return (
    <div className="mx-auto max-w-[1380px]">
      <Title title="Staff & Attendance" sub="Who is in the shop, who is on leave, and how each person's month is going. Salaries and leave decisions have their own pages.">
        <Seg value={view} onChange={setView} options={[['day', 'Day'], ['month', 'Month'], ['team', 'Team & salary']]} />
      </Title>

      {view === 'day' && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button onClick={() => stepDay(-1)} className="rounded-xl border border-line bg-white p-2.5 hover:bg-paper" aria-label="Previous day"><ChevronLeft className="h-4 w-4" /></button>
            <input type="date" max={today} value={day} onChange={(e) => e.target.value && setDay(e.target.value)} className="!rounded-xl" />
            <button onClick={() => stepDay(1)} disabled={day >= today} className="rounded-xl border border-line bg-white p-2.5 hover:bg-paper disabled:opacity-40" aria-label="Next day"><ChevronRight className="h-4 w-4" /></button>
            {day !== today && <button onClick={() => setDay(today)} className="rounded-xl bg-sage-bg px-3 py-2 text-sm font-medium text-sage-fg">Back to today</button>}
            <span className="ml-1 text-sm text-steel">{DAY_NAMES[dayOfWeek(day)]}, {fmtDate(day)}{dayOfWeek(day) === settings.weeklyOff && ' · weekly off'}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {summary.map((c) => <div key={c.k} className={`rounded-[20px] p-4 ${c.c}`}><div className="text-sm font-medium opacity-80">{c.k}</div><div className="font-display text-[40px] font-semibold leading-none"><CountUp value={c.n} duration={700} /></div></div>)}
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {rows.map(({ s, a, status }, n) => {
              const end = a ? (a.out ? new Date(a.out).toISOString() : new Date().toISOString()) : '';
              return (
                <div key={s.id} className={`${card} fade-up p-4`} style={{ animationDelay: `${n * 40}ms` }}>
                  <div className="flex items-center gap-3">
                    <Avatar staff={staff} id={s.id} />
                    <div className="min-w-0 flex-1"><div className="font-display text-lg font-semibold leading-5">{s.name}</div><div className="text-xs text-steel">{s.phone}</div></div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${status.c}`}>{status.t}</span>
                  </div>
                  {a ? (
                    <>
                      <div className="mt-4 grid grid-cols-4 gap-2 text-sm">
                        <Fact k="In" v={fmtTime(a.in)} warn={isLate(a, settings.lateAfter)} />
                        <Fact k="Out" v={a.out ? fmtTime(a.out) : '–'} />
                        <Fact k="Worked" v={hm(workedMinutes(a))} />
                        <Fact k="Breaks" v={`${breakMinutes(a)} min`} />
                      </div>
                      <div className="relative mt-4 h-3 rounded-full bg-paper" aria-label="Day timeline">
                        <div className="absolute inset-y-0 rounded-full bg-sage-mid" style={{ left: `${pct(a.in, day)}%`, width: `${Math.max(1, pct(end, day) - pct(a.in, day))}%` }} />
                        {a.breaks.map((b, i) => <div key={i} className="absolute inset-y-0 bg-butter-fg/50" style={{ left: `${pct(b.s, day)}%`, width: `${Math.max(1, pct(b.e ?? end, day) - pct(b.s, day))}%` }} title="Break" />)}
                        {a.gaps.map((g, i) => <div key={i} className="absolute inset-y-0 bg-blush-fg/60" style={{ left: `${pct(g.out, day)}%`, width: `${Math.max(1, pct(g.back ?? end, day) - pct(g.out, day))}%` }} title="Left the shop" />)}
                      </div>
                      <div className="mt-1 flex justify-between text-[11px] text-steel"><span>8 am</span><span>12</span><span>4 pm</span><span>9 pm</span></div>
                      {isLate(a, settings.lateAfter) && <p className="mt-2 text-xs text-butter-fg">Came after {settings.lateAfter}.</p>}
                      {a.gaps.length > 0 && <p className="mt-1 text-xs text-blush-fg">Left the shop {a.gaps.length} time{a.gaps.length > 1 ? 's' : ''}: {a.gaps.map((g) => `${fmtTime(g.out)}${g.back ? ' to ' + fmtTime(g.back) : ' (not back)'}`).join(', ')}.</p>}
                    </>
                  ) : <p className="mt-3 text-sm text-steel">{leaveLine(d, s.id, day) ?? 'No clock-in recorded for this day.'}</p>}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 px-1 text-xs text-steel"><Key c="bg-sage-mid" t="At work" /><Key c="bg-butter-fg/50" t="Break" /><Key c="bg-blush-fg/60" t="Left the shop" /></div>
        </>
      )}

      {view === 'month' && <MonthGrid people={people} month={month} setMonth={setMonth} today={today} open={(k) => { setDay(k); setView('day'); }} />}
      {view === 'team' && <Team />}
    </div>
  );
}

const Fact = ({ k, v, warn }: { k: string; v: string; warn?: boolean }) => <div className="rounded-xl bg-paper px-3 py-2"><div className="text-[11px] text-steel">{k}</div><div className={`font-medium ${warn ? 'text-butter-fg' : ''}`}>{v}</div></div>;
const Key = ({ c, t }: { c: string; t: string }) => <span className="flex items-center gap-1.5"><span className={`h-2.5 w-5 rounded-full ${c}`} />{t}</span>;
function leaveLine(d: ReturnType<typeof useStore.getState>, sid: string, day: string) {
  const l = d.leaves.find((x) => x.staffId === sid && x.status !== 'rejected' && day >= x.from && day <= x.to);
  if (!l) return null;
  return l.status === 'pending' ? `Asked for leave (${l.type}): "${l.reason}". Waiting for your decision.` : `${l.pay === 'unpaid' ? 'Unpaid' : 'Paid'} ${l.type.toLowerCase()} leave: "${l.reason}".`;
}

function MonthGrid({ people, month, setMonth, today, open }: { people: Staff[]; month: string; setMonth: (m: string) => void; today: string; open: (k: string) => void }) {
  const d = useStore(); const keys = monthKeys(month); const cur = today.slice(0, 7);
  const data = people.map((s) => {
    const cells = keys.map((k) => ({ k, st: dayState(d, s, k) }));
    const att = d.attendance.filter((a) => a.staffId === s.id && a.date.startsWith(month));
    const n = (f: (x: DayState) => boolean) => cells.filter((c) => f(c.st)).length;
    return { s, cells, present: att.length, late: n((x) => x === 'late'), absent: n((x) => x === 'absent'), leave: n((x) => x === 'paid-leave' || x === 'unpaid-leave'), mins: att.reduce((t, a) => t + workedMinutes(a), 0) };
  });
  const exportCsv = () => download(`attendance-${month}.csv`, toCsv([['Staff', 'Present', 'Late', 'Absent', 'Leave days', 'Hours worked'], ...data.map((r) => [r.s.name, r.present, r.late, r.absent, r.leave, (r.mins / 60).toFixed(1)])]));
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button onClick={() => setMonth(shiftMonth(month, -1))} className="rounded-xl border border-line bg-white p-2.5 hover:bg-paper" aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
        <div className="min-w-40 text-center font-display text-xl font-semibold">{monthLabel(month)}</div>
        <button onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= cur} className="rounded-xl border border-line bg-white p-2.5 hover:bg-paper disabled:opacity-40" aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
        <button onClick={exportCsv} className="ml-auto flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium hover:bg-paper"><Download className="h-4 w-4" />Export CSV</button>
      </div>
      <div className={`${card} overflow-x-auto p-4`}>
        <table className="w-full min-w-[960px] border-separate border-spacing-y-1.5 text-center text-xs">
          <thead><tr className="text-steel"><th className="w-36 text-left font-medium">Staff</th>{keys.map((k) => <th key={k} className="font-medium"><div>{k.slice(8)}</div><div className="text-[10px] opacity-60">{DAY_NAMES[dayOfWeek(k)][0]}</div></th>)}
            {['Present', 'Late', 'Absent', 'Leave', 'Hours'].map((h) => <th key={h} className="pl-2 text-right font-medium">{h}</th>)}</tr></thead>
          <tbody>{data.map((r) => (
            <tr key={r.s.id}>
              <td className="text-left"><div className="flex items-center gap-2"><Avatar staff={d.staff} id={r.s.id} size="sm" /><span className="text-sm font-medium">{r.s.name}</span></div></td>
              {r.cells.map(({ k, st }) => <td key={k} className="p-0.5"><button onClick={() => open(k)} title={`${fmtDate(k)}: ${STATE[st].label}`} className={`h-7 w-full min-w-6 rounded-lg text-[11px] font-semibold ${STATE[st].cell}`}>{STATE[st].code}</button></td>)}
              <td className="pl-2 text-right text-sm font-medium">{r.present}</td><td className="text-right text-sm text-butter-fg">{r.late || '–'}</td><td className="text-right text-sm text-blush-fg">{r.absent || '–'}</td><td className="text-right text-sm text-sky-fg">{r.leave || '–'}</td><td className="text-right text-sm">{Math.round(r.mins / 60)}h</td>
            </tr>))}</tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 px-1 text-xs">
        {(['present', 'late', 'paid-leave', 'unpaid-leave', 'pending-leave', 'absent', 'off'] as DayState[]).map((k) => <span key={k} className={`rounded-full px-2.5 py-1 ${STATE[k].chip}`}>{k === 'late' ? 'P = present (amber if late)' : `${STATE[k].code} = ${STATE[k].label}`}</span>)}
      </div>
      <p className="mt-2 px-1 text-xs text-steel">Tap any day to open it. A working day with no clock-in and no approved leave counts as absent and is deducted in payroll.</p>
    </>
  );
}

function Team() {
  const { staff, addStaff, updateStaff } = useStore(); const people = staff.filter((s) => s.role === 'salesman');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null); const [edit, setEdit] = useState<string | null>(null);
  const [f, setF] = useState({ name: '', phone: '', salary: '' }); const [e, setE] = useState({ name: '', phone: '', salary: '' });
  const run = (fn: () => void, ok: string) => { try { fn(); setMsg({ ok: true, text: ok }); return true; } catch (x) { setMsg({ ok: false, text: errText(x) }); return false; } };
  const total = people.reduce((a, s) => a + s.salary, 0);
  return (
    <>
      <Banner msg={msg} onClose={() => setMsg(null)} />
      <div className="mb-4 flex flex-wrap items-center gap-6 rounded-[22px] bg-sage-bg px-6 py-5 text-sage-fg">
        <div><div className="text-sm opacity-80">Monthly salary bill</div><div className="font-display text-4xl font-semibold"><Rupee v={total} animate /></div></div>
        <div><div className="text-sm opacity-80">People</div><div className="font-display text-4xl font-semibold"><CountUp value={people.length} duration={600} /></div></div>
        <p className="max-w-sm text-sm opacity-80">This is the full monthly salary before leave and absence deductions. Open Payroll to see what each person actually earns this month.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {people.map((s) => edit === s.id ? (
          <div key={s.id} className={`${card} space-y-2 p-4`}>
            <input className="w-full" aria-label="Name" value={e.name} onChange={(x) => setE({ ...e, name: x.target.value })} />
            <input className="w-full" aria-label="Phone" value={e.phone} onChange={(x) => setE({ ...e, phone: x.target.value })} />
            <input className="w-full" aria-label="Monthly salary" type="number" value={e.salary} onChange={(x) => setE({ ...e, salary: x.target.value })} />
            <p className="text-xs text-steel">A new salary applies to months not yet paid. Paid months keep their old figures.</p>
            <div className="flex gap-2"><button className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white" onClick={() => run(() => updateStaff(s.id, { name: e.name, phone: e.phone, salary: +e.salary }), 'Saved') && setEdit(null)}>Save</button><button className="rounded-xl border border-line px-4 py-2 text-sm" onClick={() => setEdit(null)}>Cancel</button></div>
          </div>
        ) : (
          <div key={s.id} className={`${card} flex items-center gap-3 p-4`}>
            <Avatar staff={staff} id={s.id} size="lg" />
            <div className="min-w-0 flex-1"><div className="font-display text-lg font-semibold leading-5">{s.name}</div><div className="text-xs text-steel">{s.phone}{s.joined && ` · joined ${fmtDate(s.joined)}`}</div><div className="mt-1 font-display text-xl font-semibold text-brand">{money(s.salary)}<span className="font-sans text-xs font-normal text-steel"> / month</span></div></div>
            <button aria-label={`Edit ${s.name}`} onClick={() => { setEdit(s.id); setE({ name: s.name, phone: s.phone, salary: String(s.salary) }); }} className="rounded-xl p-2 text-steel hover:bg-paper"><Pencil className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
      <div className={`${card} mt-5 max-w-3xl p-5`}>
        <div className="mb-3 flex items-center gap-2 font-display text-lg font-semibold"><UserPlus className="h-5 w-5 text-brand" />Add a salesman</div>
        <div className="grid gap-2 sm:grid-cols-4">
          <input placeholder="Name" value={f.name} onChange={(x) => setF({ ...f, name: x.target.value })} /><input placeholder="Phone" value={f.phone} onChange={(x) => setF({ ...f, phone: x.target.value })} />
          <input placeholder="Monthly salary" type="number" value={f.salary} onChange={(x) => setF({ ...f, salary: x.target.value })} />
          <button className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white" onClick={() => run(() => addStaff(f.name, f.phone, +f.salary), `${f.name} added`) && setF({ name: '', phone: '', salary: '' })}>Add</button>
        </div>
      </div>
    </>
  );
}