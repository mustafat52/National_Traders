'use client';
import { useMemo, useState } from 'react';
import { useStore } from '@/lib/store';
import { carpRows, CarpRow, commissionOn } from '@/lib/carpenters';
import { dk, fmtDate, money } from '@/lib/rules';
import { Bill, Carpenter } from '@/lib/types';
import { useScreenKeys } from '@/lib/hotkeys';
import { DataGrid } from '@/components/grid/DataGrid';
import { KBtn, ScreenHead } from '@/components/grid/Screen';
import { Field, Panel } from '@/components/grid/Panel';
import { toast } from '@/components/grid/Toast';
import { errText } from '@/components/StaffBits';

type Tab = 'people' | 'jobs' | 'money';
const inp = '!rounded-md !px-2.5 !py-1 text-[13px]';
const selc = 'rounded-md border border-line bg-white px-2 py-1 text-[13px]';
const tab = (on: boolean) => `border-b-2 px-3 py-1.5 text-[13px] font-medium ${on ? 'border-gold text-ink' : 'border-transparent text-steel hover:text-ink'}`;
const Err = ({ t }: { t: string }) => (t ? <p role="alert" className="my-1.5 rounded bg-blush-bg px-3 py-1.5 text-[12.5px] text-blush-fg">{t}</p> : null);

/** Carpenter: the master list, the jobs the shop sends them on, and what is owed and paid to them. */
export default function Carpenters() {
  const d = useStore(); const [t, setT] = useState<Tab>('people'); const [sel, setSel] = useState<string | null>(null); const [assign, setAssign] = useState<Bill | null>(null);
  const rows = useMemo(() => carpRows(d), [d.carpenters, d.bills, d.returns, d.carpPayouts]); // eslint-disable-line react-hooks/exhaustive-deps
  const needs = d.bills.filter((b) => b.needsCarpenter && !b.job);
  const owed = rows.reduce((a, r) => a + Math.max(0, r.balance), 0);
  useScreenKeys([{ key: 'N', label: 'New carpenter', run: () => { setT('people'); setSel('new'); } }]);
  return (
    <div className="max-w-6xl">
      <ScreenHead title="Carpenter" hint={`${rows.length} carpenters · ${money(owed)} owed to them · ${needs.length} customers waiting for one · ${d.bills.filter((b) => b.job?.status === 'booked').length} jobs in progress`}>
        <KBtn primary k="N" onClick={() => { setT('people'); setSel('new'); }}>New carpenter</KBtn>
      </ScreenHead>
      <div className="mb-3 flex gap-1 border-b border-line">{([['people', 'Carpenters'], ['jobs', needs.length ? `Jobs and assigning (${needs.length})` : 'Jobs and assigning'], ['money', 'Commission and payouts']] as const).map(([k, l]) => <button key={k} onClick={() => setT(k)} className={tab(t === k)}>{l}</button>)}</div>
      {t === 'people' && <People rows={rows} sel={sel} setSel={setSel} />}
      {t === 'jobs' && <Jobs needs={needs} assign={assign} setAssign={setAssign} />}
      {t === 'money' && <Money rows={rows} onPay={(r) => { setT('people'); setSel(r.c.id); }} />}
    </div>
  );
}

function People({ rows, sel, setSel }: { rows: CarpRow[]; sel: string | null; setSel: (s: string | null) => void }) {
  const chosen = rows.find((r) => r.c.id === sel);
  return (
    <>
      <DataGrid csvName="carpenters" rows={rows} rowKey={(r) => r.c.id} onOpen={(r) => setSel(r.c.id)} openOnClick primary={!sel} empty="No carpenters yet. Press N to add one." maxH="320px"
        rowClass={(r) => (r.c.active ? '' : 'opacity-50')}
        cols={[
          { h: 'Name', v: (r) => <span className="font-medium">{r.c.name}{!r.c.active && <span className="ml-2 text-[11px] text-steel">inactive</span>}</span>, csv: (r) => r.c.name, sort: (r) => r.c.name },
          { h: 'Phone', v: (r) => <span className="font-mono text-[12.5px]">{r.c.phone}</span>, csv: (r) => r.c.phone }, { h: 'Area', v: (r) => r.c.area, csv: (r) => r.c.area, sort: (r) => r.c.area }, { h: 'Skill', v: (r) => r.c.skill, csv: (r) => r.c.skill },
          { h: 'Rate', right: true, v: (r) => r.c.ratePct + '%', csv: (r) => r.c.ratePct, sort: (r) => r.c.ratePct },
          { h: 'Sales this month', right: true, v: (r) => (r.monthSales ? money(r.monthSales) : '-'), csv: (r) => r.monthSales, sort: (r) => r.monthSales },
          { h: 'Bills', right: true, v: (r) => r.bills.filter((b) => b.kind === 'quotation').length, csv: (r) => r.bills.filter((b) => b.kind === 'quotation').length },
          { h: 'Open jobs', right: true, v: (r) => r.openJobs || '-', csv: (r) => r.openJobs },
          { h: 'Owed', right: true, v: (r) => (r.balance > 0 ? <b className="text-butter-fg">{money(r.balance)}</b> : '-'), csv: (r) => r.balance, sort: (r) => r.balance },
        ]} />
      {sel && <Detail key={sel} row={chosen} onDone={() => setSel(null)} />}
    </>
  );
}

function Detail({ row, onDone }: { row?: CarpRow; onDone: () => void }) {
  const d = useStore(); const c = row?.c;
  const [v, setV] = useState({ name: c?.name ?? '', phone: c?.phone ?? '', area: c?.area ?? '', skill: c?.skill ?? '', ratePct: c?.ratePct ?? 2.5, active: c?.active ?? true }); const [err, setErr] = useState('');
  const [amt, setAmt] = useState(row ? Math.max(0, row.balance) : 0); const [mode, setMode] = useState('Cash'); const [note, setNote] = useState(''); const [perr, setPerr] = useState('');
  const set = (p: Partial<typeof v>) => { setV({ ...v, ...p }); setErr(''); };
  const save = () => { try { if (c) { d.updateCarpenter(c.id, v); toast('Carpenter saved'); } else { d.addCarpenter(v); toast(`${v.name} added`); onDone(); } setErr(''); } catch (e) { setErr(errText(e)); } };
  const pay = () => { if (!row) return; try { d.payCarpenter(row.c.id, amt, mode, note); toast(`${money(amt)} paid to ${row.c.name}`); setAmt(0); setNote(''); setPerr(''); } catch (e) { setPerr(errText(e)); } };
  useScreenKeys([{ key: 'F2', label: 'Save', run: save }, { key: 'Esc', label: 'Close', run: onDone, typing: true }]);
  return (
    <>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Panel title={c ? `Carpenter: ${c.name}` : 'New carpenter'}>
          <Field label="Name"><input autoFocus aria-label="Name" className={`w-full ${inp}`} value={v.name} onChange={(e) => set({ name: e.target.value })} /></Field>
          <Field label="Phone"><input aria-label="Phone" inputMode="numeric" maxLength={10} className={`!w-40 ${inp}`} value={v.phone} onChange={(e) => set({ phone: e.target.value.replace(/\D/g, '') })} /></Field>
          <Field label="Area"><input aria-label="Area" className={`w-full ${inp}`} value={v.area} onChange={(e) => set({ area: e.target.value })} /></Field>
          <Field label="Skill"><input aria-label="Skill" placeholder="Doors, kitchens..." className={`w-full ${inp}`} value={v.skill} onChange={(e) => set({ skill: e.target.value })} /></Field>
          <Field label="Commission %"><span className="flex items-center gap-2"><input aria-label="Commission" type="number" step="0.5" min={0} max={20} className={`!w-24 ${inp}`} value={v.ratePct} onChange={(e) => set({ ratePct: +e.target.value })} /><span className="text-[12px] text-steel">on bills they bring. Changing it changes old bills too.</span></span></Field>
          {c && <Field label="Active"><label className="flex items-center gap-2"><input type="checkbox" className="!h-4 !w-4" checked={v.active} onChange={(e) => set({ active: e.target.checked })} />Shown to salesmen at the counter</label></Field>}
          <Err t={err} />
          <div className="flex gap-2 py-2"><KBtn primary k="F2" onClick={save}>{c ? 'Save' : 'Add carpenter'}</KBtn><KBtn k="Esc" onClick={onDone}>Close</KBtn></div>
        </Panel>
        {row && (
          <Panel title="Pay" hint="Commission on paid bills plus fees of finished jobs, less what has been paid">
            <Field label="Owed now"><b className="text-[16px] tabular-nums">{money(row.balance)}</b><span className="ml-2 text-[12px] text-steel">{money(row.commission)} commission + {money(row.doneFees)} job fees - {money(row.paid)} paid</span></Field>
            <Field label="Amount"><input aria-label="Pay amount" type="number" min={1} className={`!w-32 ${inp}`} value={amt || ''} onChange={(e) => { setAmt(+e.target.value); setPerr(''); }} /></Field>
            <Field label="Mode"><span className="flex gap-1.5">{['Cash', 'Online'].map((m) => <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={`rounded border px-2.5 py-0.5 text-[12.5px] font-medium ${mode === m ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:bg-paper'}`}>{m}</button>)}</span></Field>
            <Field label="Note"><input aria-label="Pay note" className={`w-full ${inp}`} placeholder="Part payment, Diwali settlement..." value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            <Err t={perr} />
            <div className="py-2"><KBtn disabled={row.balance <= 0} onClick={pay}>Record payment</KBtn></div>
          </Panel>
        )}
      </div>
      {row && (
        <>
          <h2 className="mb-1.5 mt-4 text-[13px] font-semibold uppercase tracking-wide text-steel">Bills brought by {row.c.name}</h2>
          <DataGrid csvName={`carpenter-${row.c.name}`} rows={[...row.bills].sort((a, b) => b.date.localeCompare(a.date))} rowKey={(b) => b.id} primary={false} pageSize={10} empty="No bills yet"
            cols={[
              { h: 'Date', v: (b) => fmtDate(b.date), csv: (b) => b.date.slice(0, 10), sort: (b) => b.date }, { h: 'Bill', v: (b) => <span className="font-mono text-[12.5px] font-semibold">{b.no}</span>, csv: (b) => b.no },
              { h: 'Customer', v: (b) => d.customers.find((x) => x.id === b.customerId)?.phone ?? '', csv: (b) => d.customers.find((x) => x.id === b.customerId)?.phone ?? '' },
              { h: 'Type', v: (b) => (b.kind === 'quotation' ? 'Sale' : b.status === 'converted' ? 'Converted' : 'Estimate'), csv: (b) => b.kind },
              { h: 'Amount', right: true, v: (b) => money(b.total), csv: (b) => b.total, sort: (b) => b.total },
              { h: 'Commission', right: true, v: (b) => (b.kind === 'quotation' ? money(commissionOn(row.c, b.total - (b.transport ?? 0))) : '-'), csv: (b) => (b.kind === 'quotation' ? commissionOn(row.c, b.total - (b.transport ?? 0)) : 0) },
            ]} />
          <p className="mt-1 text-[12px] text-steel">Commission is on paid bills after returns, and not on transport. Estimates earn nothing until converted.</p>
        </>
      )}
    </>
  );
}

function Jobs({ needs, assign, setAssign }: { needs: Bill[]; assign: Bill | null; setAssign: (b: Bill | null) => void }) {
  const d = useStore(); const [q, setQ] = useState(''); const [f, setF] = useState<'booked' | 'done' | 'all'>('booked');
  const cust = (b: Bill) => d.customers.find((c) => c.id === b.customerId)?.phone ?? ''; const kn = (id: string) => d.carpenters.find((c) => c.id === id);
  const found = q.trim().length >= 3 ? d.bills.filter((b) => b.no.toLowerCase().includes(q.trim().toLowerCase()) || cust(b).includes(q.trim())).slice(0, 8) : [];
  const jobs = d.bills.filter((b) => b.job && (f === 'all' || b.job.status === f)).sort((a, b) => b.job!.date.localeCompare(a.job!.date));
  const billCols = (label: string) => [
    { h: 'Bill', v: (b: Bill) => <span className="font-mono text-[12.5px] font-semibold">{b.no}</span>, csv: (b: Bill) => b.no }, { h: 'Customer', v: (b: Bill) => cust(b), csv: cust },
    { h: 'Date', v: (b: Bill) => fmtDate(b.date), csv: (b: Bill) => b.date.slice(0, 10) }, { h: 'Amount', right: true, v: (b: Bill) => money(b.total), csv: (b: Bill) => b.total },
    { h: 'Salesman', v: (b: Bill) => d.staff.find((s) => s.id === b.staffId)?.name ?? '', csv: (b: Bill) => b.staffId },
    { h: '', v: (b: Bill) => <KBtn onClick={() => setAssign(b)}>{label === 'Assign' && b.job ? 'Change' : label}</KBtn> },
  ];
  return (
    <>
      {assign && <AssignPanel key={assign.id} bill={assign} onClose={() => setAssign(null)} />}
      <h2 className="mb-1.5 mt-1 text-[13px] font-semibold uppercase tracking-wide text-steel">Customers waiting for a carpenter</h2>
      <DataGrid csvName="waiting-for-carpenter" rows={needs} rowKey={(b) => b.id} primary={false} pageSize={8} empty="Nobody is waiting" cols={billCols('Assign')} />
      <h2 className="mb-1.5 mt-4 text-[13px] font-semibold uppercase tracking-wide text-steel">Assign a carpenter to any bill</h2>
      <div className="mb-2"><input aria-label="Find bill" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Bill number or customer phone (3+ characters)" className="!w-80 !rounded-md !px-2.5 !py-1.5 text-[13px]" /></div>
      {found.length > 0 && <DataGrid csvName="bill-search" rows={found} rowKey={(b) => b.id} primary={false} cols={billCols('Assign')} />}
      {q.trim().length >= 3 && !found.length && <p className="text-[13px] text-steel">No bill found.</p>}
      <div className="mb-1.5 mt-4 flex items-center gap-2"><h2 className="text-[13px] font-semibold uppercase tracking-wide text-steel">Job board</h2>
        <select aria-label="Job status" className={selc} value={f} onChange={(e) => setF(e.target.value as typeof f)}><option value="booked">Booked</option><option value="done">Done</option><option value="all">All</option></select></div>
      <DataGrid csvName="carpenter-jobs" rows={jobs} rowKey={(b) => b.id} primary={false} pageSize={12} empty="No jobs here yet"
        cols={[
          { h: 'Date', v: (b) => fmtDate(b.job!.date), csv: (b) => b.job!.date, sort: (b) => b.job!.date }, { h: 'Carpenter', v: (b) => kn(b.job!.carpenterId)?.name ?? '', csv: (b) => kn(b.job!.carpenterId)?.name ?? '' },
          { h: 'Bill', v: (b) => <span className="font-mono text-[12.5px]">{b.no}</span>, csv: (b) => b.no }, { h: 'Customer', v: cust, csv: cust }, { h: 'Work', v: (b) => <span className="text-[12.5px]">{b.job!.note || '-'}</span>, csv: (b) => b.job!.note },
          { h: 'Fee', right: true, v: (b) => money(b.job!.fee), csv: (b) => b.job!.fee }, { h: 'Status', v: (b) => (b.job!.status === 'done' ? 'Done' : <span className="text-butter-fg">Booked</span>), csv: (b) => b.job!.status },
          { h: '', v: (b) => { const j = b.job!; const c = kn(j.carpenterId); const wa = c ? `https://wa.me/91${c.phone}?text=${encodeURIComponent(`Hello ${c.name}, National Traders job on ${fmtDate(j.date)}. Customer: ${cust(b)}. Bill ${b.no}. ${j.note}`)}` : '';
            return <span className="flex gap-1.5 whitespace-nowrap">
              <KBtn onClick={() => { d.setJobDone(b.id, j.status !== 'done'); toast(j.status === 'done' ? 'Job set back to booked' : `Job done. ${money(j.fee)} added to ${c?.name}'s balance`); }}>{j.status === 'done' ? 'Reopen' : 'Mark done'}</KBtn>
              <KBtn onClick={() => setAssign(b)}>Edit</KBtn>{wa && <a href={wa} target="_blank" rel="noreferrer" className="rounded-md border border-line bg-white px-3 py-1.5 text-[13px] font-medium hover:bg-paper">Message</a>}
              <KBtn onClick={() => { if (confirm('Remove this job?')) { d.removeJob(b.id); toast('Job removed'); } }}>Remove</KBtn></span>; } },
        ]} />
    </>
  );
}

function AssignPanel({ bill, onClose }: { bill: Bill; onClose: () => void }) {
  const d = useStore(); const j = bill.job; const tomorrow = dk(new Date(Date.now() + 86400000));
  const [v, setV] = useState({ cid: j?.carpenterId ?? '', date: j?.date ?? tomorrow, fee: j?.fee ?? 0, note: j?.note ?? '', ref: bill.referredBy ?? '' }); const [err, setErr] = useState('');
  const set = (p: Partial<typeof v>) => { setV({ ...v, ...p }); setErr(''); };
  const load = (id: string) => d.bills.filter((b) => b.job?.carpenterId === id && b.job.status === 'booked' && b.job.date === v.date && b.id !== bill.id).length;
  const save = () => { try { d.assignCarpenter(bill.id, v.cid, v.date, v.fee, v.note); if ((bill.referredBy ?? '') !== v.ref) d.setReferrer(bill.id, v.ref || null); toast(`${d.carpenters.find((c) => c.id === v.cid)?.name} assigned to ${bill.no}`); onClose(); } catch (e) { setErr(errText(e)); } };
  useScreenKeys([{ key: 'F2', label: 'Save job', run: save }, { key: 'Esc', label: 'Close', run: onClose, typing: true }]);
  return (
    <div className="mb-3 max-w-2xl"><Panel title={`${j ? 'Change the carpenter' : 'Assign a carpenter'}: ${bill.no}`} hint={`${d.customers.find((c) => c.id === bill.customerId)?.phone ?? ''} · ${money(bill.total)}`}>
      <Field label="Carpenter"><select aria-label="Carpenter" className={selc} value={v.cid} onChange={(e) => set({ cid: e.target.value })}><option value="">Choose...</option>{d.carpenters.filter((c) => c.active || c.id === v.cid).map((c) => <option key={c.id} value={c.id}>{c.name} · {c.skill}{load(c.id) ? ` (${load(c.id)} job${load(c.id) > 1 ? 's' : ''} that day)` : ''}</option>)}</select></Field>
      <Field label="Date of job"><input aria-label="Job date" type="date" className={`!w-44 ${inp}`} value={v.date} onChange={(e) => set({ date: e.target.value })} /></Field>
      <Field label="Fee paid to carpenter"><input aria-label="Job fee" type="number" min={0} className={`!w-32 ${inp}`} value={v.fee || ''} onChange={(e) => set({ fee: +e.target.value })} /></Field>
      <Field label="What needs doing"><input aria-label="Job note" className={`w-full ${inp}`} placeholder="Site address, work to be done..." value={v.note} onChange={(e) => set({ note: e.target.value })} /></Field>
      <Field label="Brought by"><select aria-label="Brought by" className={selc} value={v.ref} onChange={(e) => set({ ref: e.target.value })}><option value="">Nobody</option>{d.carpenters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
      <Err t={err} />
      <div className="flex gap-2 py-2"><KBtn primary k="F2" onClick={save}>Save job</KBtn><KBtn k="Esc" onClick={onClose}>Close</KBtn></div>
    </Panel></div>
  );
}

function Money({ rows, onPay }: { rows: CarpRow[]; onPay: (r: CarpRow) => void }) {
  const d = useStore();
  return (
    <>
      <h2 className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-steel">What each carpenter has earned</h2>
      <DataGrid csvName="carpenter-ledger" rows={rows} rowKey={(r) => r.c.id} primary={false} onOpen={onPay} openOnClick
        foot={<span>Owed to carpenters <b className="text-ink">{money(rows.reduce((a, r) => a + Math.max(0, r.balance), 0))}</b>. Click a row to pay.</span>}
        cols={[
          { h: 'Carpenter', v: (r) => <span className="font-medium">{r.c.name}</span>, csv: (r) => r.c.name, sort: (r) => r.c.name }, { h: 'Sales brought', right: true, v: (r) => money(r.base), csv: (r) => r.base, sort: (r) => r.base },
          { h: 'Rate', right: true, v: (r) => r.c.ratePct + '%', csv: (r) => r.c.ratePct }, { h: 'Commission', right: true, v: (r) => money(r.commission), csv: (r) => r.commission },
          { h: 'Job fees', right: true, v: (r) => money(r.doneFees), csv: (r) => r.doneFees }, { h: 'Paid', right: true, v: (r) => money(r.paid), csv: (r) => r.paid },
          { h: 'Balance', right: true, v: (r) => <b className={r.balance > 0 ? 'text-butter-fg' : ''}>{money(r.balance)}</b>, csv: (r) => r.balance, sort: (r) => r.balance },
        ]} />
      <h2 className="mb-1.5 mt-4 text-[13px] font-semibold uppercase tracking-wide text-steel">Payout history</h2>
      <DataGrid csvName="carpenter-payouts" rows={d.carpPayouts} rowKey={(p) => p.id} primary={false} pageSize={10} empty="Nothing paid yet"
        cols={[
          { h: 'Date', v: (p) => fmtDate(p.date), csv: (p) => p.date.slice(0, 10), sort: (p) => p.date }, { h: 'Slip', v: (p) => <span className="font-mono text-[12.5px]">{p.no}</span>, csv: (p) => p.no },
          { h: 'Carpenter', v: (p) => d.carpenters.find((c) => c.id === p.carpenterId)?.name ?? '', csv: (p) => d.carpenters.find((c) => c.id === p.carpenterId)?.name ?? '' },
          { h: 'Mode', v: (p) => p.mode, csv: (p) => p.mode }, { h: 'Note', v: (p) => p.note, csv: (p) => p.note }, { h: 'Amount', right: true, v: (p) => money(p.amount), csv: (p) => p.amount, sort: (p) => p.amount },
        ]} />
    </>
  );
}