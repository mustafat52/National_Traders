'use client';
import { useMemo, useState } from 'react';
import { CheckCircle2, Hammer, MessageCircle, Pencil, Phone, Plus, Search, Trash2, UserPlus, Wallet, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { carpRows, CarpRow, commissionOn } from '@/lib/carpenters';
import { dk, fmtDate, money } from '@/lib/rules';
import { Banner, Seg, Title, card, errText } from '@/components/StaffBits';
import { Kpi, Panel, Pill, Table, BarList } from '@/components/ReportBits';
import { Bill, Carpenter } from '@/lib/types';

type Tab = 'people' | 'jobs' | 'money';
type Msg = { ok: boolean; text: string } | null;

export default function Carpenters() {
  const d = useStore(); const [tab, setTab] = useState<Tab>('people'); const [msg, setMsg] = useState<Msg>(null);
  const [form, setForm] = useState<Carpenter | 'new' | null>(null); const [assign, setAssign] = useState<Bill | null>(null); const [pay, setPay] = useState<CarpRow | null>(null);
  const rows = useMemo(() => carpRows(d), [d.carpenters, d.bills, d.returns, d.carpPayouts]); // eslint-disable-line react-hooks/exhaustive-deps
  const done = (text: string) => { setMsg({ ok: true, text }); setTimeout(() => setMsg(null), 4000); };
  const active = rows.filter((r) => r.c.active);
  const needs = d.bills.filter((b) => b.needsCarpenter && !b.job);
  const openJobs = d.bills.filter((b) => b.job?.status === 'booked');
  return (
    <div className="mx-auto max-w-[1200px]">
      <Title title="Carpenters" sub="Carpenters who bring customers earn a commission on the bill. You can also send one of them to a customer's site; the labour fee is paid to the carpenter once the job is done.">
        <button onClick={() => setForm('new')} className="flex items-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-gold-light"><UserPlus className="h-4 w-4" />Add carpenter</button>
      </Title>
      <Banner msg={msg} onClose={() => setMsg(null)} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Sales brought this month" value={rows.reduce((a, r) => a + r.monthSales, 0)} tone="sage" sub={`${rows.reduce((a, r) => a + r.monthBills, 0)} bills from ${active.length} carpenters`} />
        <Kpi label="Owed to carpenters" value={rows.reduce((a, r) => a + Math.max(0, r.balance), 0)} tone="butter" sub="commission and job fees not yet paid" />
        <Kpi label="Waiting for a carpenter" value={needs.length} kind="num" tone={needs.length ? 'blush' : 'paper'} sub="customers who asked for one" />
        <Kpi label="Jobs in progress" value={openJobs.length} kind="num" tone="sky" sub="booked, not finished" />
      </div>
      <div className="mb-4 mt-5"><Seg value={tab} onChange={setTab} options={[['people', 'Carpenters'], ['jobs', needs.length ? `Jobs and assigning (${needs.length})` : 'Jobs and assigning'], ['money', 'Commission and payouts']]} /></div>
      {tab === 'people' && <People rows={rows} onEdit={(c) => setForm(c)} onPay={setPay} />}
      {tab === 'jobs' && <Jobs needs={needs} onAssign={setAssign} done={done} />}
      {tab === 'money' && <Money rows={rows} onPay={setPay} />}
      {form && <CarpForm carp={form === 'new' ? null : form} onClose={() => setForm(null)} done={done} />}
      {assign && <AssignModal bill={assign} onClose={() => setAssign(null)} done={done} />}
      {pay && <PayModal row={pay} onClose={() => setPay(null)} done={done} />}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onClick={onClose}>
      <div role="dialog" aria-label={title} className="fade-up max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[24px] bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><h2 className="font-display text-2xl font-semibold">{title}</h2><button onClick={onClose} aria-label="Close" className="rounded-xl p-2 hover:bg-paper"><X className="h-5 w-5" /></button></div>
        {children}
      </div>
    </div>
  );
}
const lab = 'block text-sm text-steel';
const Err = ({ t }: { t: string }) => (t ? <p role="alert" className="rounded-xl bg-blush-bg px-3 py-2 text-sm text-blush-fg">{t}</p> : null);

/* ---------------- people ---------------- */
function People({ rows, onEdit, onPay }: { rows: CarpRow[]; onEdit: (c: Carpenter) => void; onPay: (r: CarpRow) => void }) {
  const [sel, setSel] = useState<string | null>(null); const d = useStore();
  const sorted = [...rows].sort((a, b) => b.monthSales - a.monthSales || b.base - a.base); const chosen = rows.find((r) => r.c.id === sel);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sorted.map((r, i) => (
          <div key={r.c.id} className={`${card} p-5 ${!r.c.active ? 'opacity-60' : ''} ${sel === r.c.id ? 'ring-2 ring-gold' : ''}`}>
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black font-display text-xl text-gold-light">{r.c.name[0]}</span>
              <div className="min-w-0 flex-1 leading-tight"><div className="font-display text-lg font-semibold">{r.c.name}</div><div className="truncate text-xs text-steel">{r.c.area} · {r.c.skill}</div></div>
              {i === 0 && r.monthSales > 0 && <span className="shrink-0"><Pill tone="butter">Top</Pill></span>}{!r.c.active && <Pill tone="paper">inactive</Pill>}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-sage-bg py-2 text-sage-fg"><div className="font-display text-lg font-semibold">{money(r.monthSales)}</div><div className="text-[11px]">this month</div></div>
              <div className="rounded-xl bg-paper py-2"><div className="font-display text-lg font-semibold">{r.bills.filter((b) => b.kind === 'quotation').length}</div><div className="text-[11px] text-steel">bills in all</div></div>
              <div className={`rounded-xl py-2 ${r.balance > 0 ? 'bg-butter-bg text-butter-fg' : 'bg-paper text-steel'}`}><div className="font-display text-lg font-semibold">{money(Math.max(0, r.balance))}</div><div className="text-[11px]">owed</div></div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-steel"><span>Commission {r.c.ratePct}%</span><span>{r.customers} customers</span><span>{r.openJobs} open job{r.openJobs === 1 ? '' : 's'}</span>{r.pending > 0 && <span>{money(r.pending)} in estimates</span>}</div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => setSel(sel === r.c.id ? null : r.c.id)} className="rounded-xl bg-black px-3 py-2 text-sm font-semibold text-gold-light">{sel === r.c.id ? 'Hide bills' : 'See bills'}</button>
              <button onClick={() => onPay(r)} disabled={r.balance <= 0} className="flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-sm font-medium disabled:opacity-40"><Wallet className="h-4 w-4" />Pay</button>
              <button onClick={() => onEdit(r.c)} aria-label={`Edit ${r.c.name}`} className="rounded-xl border border-line p-2"><Pencil className="h-4 w-4" /></button>
              <a href={`tel:${r.c.phone}`} aria-label={`Call ${r.c.name}`} className="rounded-xl border border-line p-2"><Phone className="h-4 w-4" /></a>
            </div>
          </div>))}
      </div>
      {chosen && (
        <Panel title={`Bills brought by ${chosen.c.name}`} sub={`Commission ${chosen.c.ratePct}% on paid bills, after returns. Estimates earn nothing until you convert them.`}>
          <Table csv={`carpenter-${chosen.c.name}`} rows={[...chosen.bills].sort((a, b) => b.date.localeCompare(a.date))} search={(b, q) => b.no.toLowerCase().includes(q) || (d.customers.find((c) => c.id === b.customerId)?.phone ?? '').includes(q)}
            cols={[
              { h: 'Date', v: (b) => fmtDate(b.date), csv: (b) => b.date.slice(0, 10) }, { h: 'Bill', v: (b) => b.no },
              { h: 'Customer', v: (b) => d.customers.find((c) => c.id === b.customerId)?.phone ?? '', csv: (b) => d.customers.find((c) => c.id === b.customerId)?.phone ?? '' },
              { h: 'Type', v: (b) => <Pill tone={b.kind === 'quotation' ? 'sage' : 'butter'}>{b.kind === 'quotation' ? 'sale' : b.status === 'converted' ? 'converted' : 'estimate'}</Pill>, csv: (b) => b.kind },
              { h: 'Amount', right: true, v: (b) => money(b.total), csv: (b) => b.total },
              { h: 'Commission', right: true, v: (b) => (b.kind === 'quotation' ? money(commissionOn(chosen.c, b.total)) : '-'), csv: (b) => (b.kind === 'quotation' ? commissionOn(chosen.c, b.total) : 0) },
            ]} />
        </Panel>)}
    </div>
  );
}

/* ---------------- jobs ---------------- */
function Jobs({ needs, onAssign, done }: { needs: Bill[]; onAssign: (b: Bill) => void; done: (t: string) => void }) {
  const d = useStore(); const [q, setQ] = useState(''); const [f, setF] = useState<'booked' | 'done' | 'all'>('booked');
  const cust = (b: Bill) => d.customers.find((c) => c.id === b.customerId)?.phone ?? '';
  const found = q.length >= 3 ? d.bills.filter((b) => b.no.toLowerCase().includes(q.toLowerCase()) || cust(b).includes(q)).slice(0, 8) : [];
  const jobs = d.bills.filter((b) => b.job && (f === 'all' || b.job.status === f)).sort((a, b) => b.job!.date.localeCompare(a.job!.date));
  const kn = (id: string) => d.carpenters.find((c) => c.id === id);
  const BillRow = ({ b, action }: { b: Bill; action: React.ReactNode }) => (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line p-3">
      <div className="min-w-0 flex-1"><div className="font-semibold">{b.no} · {cust(b)}</div><div className="text-xs text-steel">{fmtDate(b.date)} · {money(b.total)} · {d.staff.find((s) => s.id === b.staffId)?.name}{b.referredBy && ` · brought by ${kn(b.referredBy)?.name}`}</div></div>{action}
    </div>
  );
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-5">
        <Panel title="Customers waiting for a carpenter" sub="The salesman ticked “customer needs a carpenter” on these bills.">
          <div className="space-y-2">{needs.slice(0, 12).map((b) => <BillRow key={b.id} b={b} action={<button onClick={() => onAssign(b)} className="rounded-xl bg-black px-3 py-2 text-sm font-semibold text-gold-light">Assign</button>} />)}
            {!needs.length && <p className="py-6 text-center text-sm text-steel">Nobody is waiting. Well done.</p>}</div>
        </Panel>
        <Panel title="Assign a carpenter to any bill" sub="Type a bill number or the customer's phone (at least 3 characters).">
          <div className="relative mb-3"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="QUO-0123 or 98765…" className="w-full !rounded-xl !pl-10" /></div>
          <div className="space-y-2">{found.map((b) => <BillRow key={b.id} b={b} action={<button onClick={() => onAssign(b)} className="rounded-xl border border-line px-3 py-2 text-sm font-medium">{b.job ? 'Change' : 'Assign'}</button>} />)}
            {q.length >= 3 && !found.length && <p className="py-4 text-center text-sm text-steel">No bill found.</p>}</div>
        </Panel>
      </div>
      <Panel title="Job board" sub="Carpenters the shop has sent to customers." action={<Seg value={f} onChange={setF} options={[['booked', 'Booked'], ['done', 'Done'], ['all', 'All']]} />}>
        <div className="space-y-2.5">{jobs.slice(0, 20).map((b) => { const j = b.job!; const c = kn(j.carpenterId);
          const wa = c ? `https://wa.me/91${c.phone}?text=${encodeURIComponent(`Hello ${c.name}, National Traders job on ${fmtDate(j.date)}. Customer: ${cust(b)}. Bill ${b.no}. ${j.note}`)}` : '#';
          return (
            <div key={b.id} className="rounded-2xl border border-line p-3">
              <div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="font-semibold">{c?.name} <span className="font-normal text-steel">· {fmtDate(j.date)}</span></div><div className="text-sm">{j.note || 'No note'}</div><div className="text-xs text-steel">{b.no} · customer {cust(b)} · fee {money(j.fee)}</div></div><Pill tone={j.status === 'done' ? 'sage' : 'butter'}>{j.status === 'done' ? 'done' : 'booked'}</Pill></div>
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                <button onClick={() => { useStore.getState().setJobDone(b.id, j.status !== 'done'); done(j.status === 'done' ? 'Job set back to booked' : `Job marked done. ${money(j.fee)} added to ${c?.name}'s balance.`); }} className="flex items-center gap-1.5 rounded-xl bg-black px-3 py-1.5 font-semibold text-gold-light"><CheckCircle2 className="h-4 w-4" />{j.status === 'done' ? 'Reopen' : 'Mark done'}</button>
                <button onClick={() => onAssign(b)} className="rounded-xl border border-line px-3 py-1.5">Edit</button>
                <a href={wa} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-xl border border-line px-3 py-1.5"><MessageCircle className="h-4 w-4" />Message</a>
                <button onClick={() => { if (confirm('Remove this job?')) { useStore.getState().removeJob(b.id); done('Job removed'); } }} aria-label="Remove job" className="rounded-xl border border-line p-1.5 text-steel hover:text-blush-fg"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>); })}
          {!jobs.length && <p className="py-8 text-center text-sm text-steel">No jobs here yet.</p>}</div>
      </Panel>
    </div>
  );
}

/* ---------------- money ---------------- */
function Money({ rows, onPay }: { rows: CarpRow[]; onPay: (r: CarpRow) => void }) {
  const d = useStore();
  return (
    <div className="space-y-5">
      <Panel title="What each carpenter has earned" sub="Commission on paid bills they brought (after returns) plus fees for finished jobs, less what you have paid.">
        <Table csv="carpenter-ledger" rows={rows} cols={[
          { h: 'Carpenter', v: (r) => <b>{r.c.name}</b>, csv: (r) => r.c.name }, { h: 'Sales brought', right: true, v: (r) => money(r.base), csv: (r) => r.base },
          { h: 'Rate', right: true, v: (r) => r.c.ratePct + '%', csv: (r) => r.c.ratePct }, { h: 'Commission', right: true, v: (r) => money(r.commission), csv: (r) => r.commission },
          { h: 'Job fees', right: true, v: (r) => money(r.doneFees), csv: (r) => r.doneFees }, { h: 'Paid', right: true, v: (r) => money(r.paid), csv: (r) => r.paid },
          { h: 'Balance', right: true, v: (r) => <b className={r.balance > 0 ? 'text-butter-fg' : ''}>{money(r.balance)}</b>, csv: (r) => r.balance },
          { h: '', v: (r) => <button disabled={r.balance <= 0} onClick={() => onPay(r)} className="rounded-lg bg-black px-3 py-1 text-xs font-semibold text-gold-light disabled:opacity-30">Pay</button> },
        ]} />
      </Panel>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Sales brought, all time"><BarList rows={rows.map((r) => ({ label: r.c.name, value: r.base, sub: r.c.area })).sort((a, b) => b.value - a.value)} /></Panel>
        <Panel title="Payout history">
          <Table csv="carpenter-payouts" rows={d.carpPayouts} pageSize={8} empty="Nothing paid yet" cols={[
            { h: 'Date', v: (p) => fmtDate(p.date), csv: (p) => p.date.slice(0, 10) }, { h: 'Slip', v: (p) => p.no },
            { h: 'Carpenter', v: (p) => d.carpenters.find((c) => c.id === p.carpenterId)?.name, csv: (p) => d.carpenters.find((c) => c.id === p.carpenterId)?.name ?? '' },
            { h: 'Mode', v: (p) => p.mode }, { h: 'Amount', right: true, v: (p) => money(p.amount), csv: (p) => p.amount },
          ]} />
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- modals ---------------- */
function CarpForm({ carp, onClose, done }: { carp: Carpenter | null; onClose: () => void; done: (t: string) => void }) {
  const [v, setV] = useState({ name: carp?.name ?? '', phone: carp?.phone ?? '', area: carp?.area ?? '', skill: carp?.skill ?? '', ratePct: carp?.ratePct ?? 2.5, active: carp?.active ?? true }); const [err, setErr] = useState('');
  const set = (p: Partial<typeof v>) => { setV({ ...v, ...p }); setErr(''); };
  return (
    <Modal title={carp ? 'Edit carpenter' : 'Add a carpenter'} onClose={onClose}>
      <div className="space-y-3">
        <label className={lab}>Name<input autoFocus className="mt-1 w-full" value={v.name} onChange={(e) => set({ name: e.target.value })} /></label>
        <label className={lab}>Phone<input inputMode="numeric" maxLength={10} className="mt-1 w-full" value={v.phone} onChange={(e) => set({ phone: e.target.value.replace(/\D/g, '') })} /></label>
        <div className="grid grid-cols-2 gap-3"><label className={lab}>Area<input className="mt-1 w-full" value={v.area} onChange={(e) => set({ area: e.target.value })} /></label><label className={lab}>Skill<input className="mt-1 w-full" placeholder="Doors, kitchens…" value={v.skill} onChange={(e) => set({ skill: e.target.value })} /></label></div>
        <label className={lab}>Commission on bills they bring (%)<input type="number" step="0.5" min={0} max={20} className="mt-1 w-full" value={v.ratePct} onChange={(e) => set({ ratePct: +e.target.value })} /></label>
        <p className="text-xs text-steel">Changing the rate changes the commission on all of this carpenter's bills, old ones too.</p>
        {carp && <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-black" checked={v.active} onChange={(e) => set({ active: e.target.checked })} />Active (shown to salesmen at the counter)</label>}
        <Err t={err} />
        <button onClick={() => { try { if (carp) useStore.getState().updateCarpenter(carp.id, v); else useStore.getState().addCarpenter(v); done(carp ? 'Carpenter updated' : `${v.name} added`); onClose(); } catch (e) { setErr(errText(e)); } }} className="w-full rounded-xl bg-black py-3 font-semibold text-gold-light">{carp ? 'Save changes' : 'Add carpenter'}</button>
      </div>
    </Modal>
  );
}

function AssignModal({ bill, onClose, done }: { bill: Bill; onClose: () => void; done: (t: string) => void }) {
  const d = useStore(); const j = bill.job; const tomorrow = dk(new Date(Date.now() + 86400000));
  const [v, setV] = useState({ cid: j?.carpenterId ?? '', date: j?.date ?? tomorrow, fee: j?.fee ?? 0, note: j?.note ?? '', ref: bill.referredBy ?? '' }); const [err, setErr] = useState('');
  const set = (p: Partial<typeof v>) => { setV({ ...v, ...p }); setErr(''); };
  const load = (id: string) => d.bills.filter((b) => b.job?.carpenterId === id && b.job.status === 'booked' && b.job.date === v.date && b.id !== bill.id).length;
  return (
    <Modal title={j ? 'Change the carpenter' : 'Assign a carpenter'} onClose={onClose}>
      <div className="mb-3 rounded-xl bg-paper px-3 py-2 text-sm"><b>{bill.no}</b> · {d.customers.find((c) => c.id === bill.customerId)?.phone} · {money(bill.total)}</div>
      <div className="space-y-3">
        <label className={lab}>Carpenter to send
          <select className="mt-1 w-full" value={v.cid} onChange={(e) => set({ cid: e.target.value })}><option value="">Choose…</option>{d.carpenters.filter((c) => c.active || c.id === v.cid).map((c) => <option key={c.id} value={c.id}>{c.name} · {c.skill}{load(c.id) ? ` (${load(c.id)} job${load(c.id) > 1 ? 's' : ''} that day)` : ''}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-3"><label className={lab}>Date of job<input type="date" className="mt-1 w-full" value={v.date} onChange={(e) => set({ date: e.target.value })} /></label>
          <label className={lab}>Fee paid to carpenter (₹)<input type="number" min={0} className="mt-1 w-full" value={v.fee || ''} onChange={(e) => set({ fee: +e.target.value })} /></label></div>
        <label className={lab}>What needs doing<textarea rows={2} className="mt-1 w-full" placeholder="Site address, work to be done…" value={v.note} onChange={(e) => set({ note: e.target.value })} /></label>
        <label className={lab}>Also, who brought this customer? <span className="text-xs">(optional)</span>
          <select className="mt-1 w-full" value={v.ref} onChange={(e) => set({ ref: e.target.value })}><option value="">Nobody</option>{d.carpenters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <Err t={err} />
        <button onClick={() => { try { const s = useStore.getState(); s.assignCarpenter(bill.id, v.cid, v.date, v.fee, v.note); if ((bill.referredBy ?? '') !== v.ref) s.setReferrer(bill.id, v.ref || null); done(`${d.carpenters.find((c) => c.id === v.cid)?.name} assigned to ${bill.no}`); onClose(); } catch (e) { setErr(errText(e)); } }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-black py-3 font-semibold text-gold-light"><Hammer className="h-4 w-4" />{j ? 'Save job' : 'Assign carpenter'}</button>
      </div>
    </Modal>
  );
}

function PayModal({ row, onClose, done }: { row: CarpRow; onClose: () => void; done: (t: string) => void }) {
  const [amount, setAmount] = useState(Math.max(0, row.balance)); const [mode, setMode] = useState('Cash'); const [note, setNote] = useState(''); const [err, setErr] = useState('');
  return (
    <Modal title={`Pay ${row.c.name}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="rounded-xl bg-butter-bg px-3 py-2 text-sm text-butter-fg">Owed now: <b>{money(row.balance)}</b> <span className="text-xs">({money(row.commission)} commission + {money(row.doneFees)} job fees − {money(row.paid)} paid)</span></div>
        <label className={lab}>Amount (₹)<input type="number" min={1} max={row.balance} className="mt-1 w-full" value={amount || ''} onChange={(e) => { setAmount(+e.target.value); setErr(''); }} /></label>
        <div className="grid grid-cols-2 gap-2">{['Cash', 'Online'].map((m) => <button key={m} onClick={() => setMode(m)} className={`rounded-xl border py-2.5 text-sm font-semibold ${mode === m ? 'border-black bg-black text-gold-light' : 'border-line'}`}>{m}</button>)}</div>
        <label className={lab}>Note (optional)<input className="mt-1 w-full" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Part payment, Diwali settlement…" /></label>
        <Err t={err} />
        <button onClick={() => { try { useStore.getState().payCarpenter(row.c.id, amount, mode, note); done(`${money(amount)} paid to ${row.c.name}`); onClose(); } catch (e) { setErr(errText(e)); } }} className="w-full rounded-xl bg-black py-3 font-semibold text-gold-light">Record payment</button>
      </div>
    </Modal>
  );
}