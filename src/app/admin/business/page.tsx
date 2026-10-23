'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';
import { useStore, useProductMap } from '@/lib/store';
import { dk, download, fmtDate, fmtTime, isExpiredEstimate, money, toCsv } from '@/lib/rules';
import { TIER_NAMES } from '@/lib/types';
import { Gran, Row, BillEx, daysBetween, dailyRows, enrich, hourly, longDay, margin, rollup, shortDay, sumRows } from '@/lib/business';
import { dayOfWeek, DAY_NAMES } from '@/lib/payroll';
import { emojiFor } from '@/lib/categories';
import { CountUp, GrowBar } from '@/components/CountUp';
import { Rupee } from '@/components/Rupee';
import { Avatar, Seg, Title } from '@/components/StaffBits';
import { BarList, Kpi, Panel, Pill, RangeBar, Table, Trend, pctDelta } from '@/components/ReportBits';

type Tab = 'overview' | 'daybook' | 'bills' | 'pnl' | 'people';
const TABS: [Tab, string][] = [['overview', 'Overview'], ['daybook', 'Day book'], ['bills', 'All bills'], ['pnl', 'Profit & loss'], ['people', 'Salesmen']];
const shift = (k: string, n: number) => { const x = new Date(k + 'T12:00:00'); x.setDate(x.getDate() + n); return dk(x); };
const pc = (n: number) => `${n.toFixed(1)}%`;
const PL = ({ v, className = '' }: { v: number; className?: string }) => <span className={`tabular-nums ${v < 0 ? 'text-blush-fg' : 'text-good'} ${className}`}>{v < 0 ? '−' : ''}{money(Math.abs(v))}</span>;

export default function Business() {
  const d = useStore(); const pm = useProductMap(); const today = dk(new Date());
  const en = useMemo(() => enrich(d.bills, pm), [d.bills, pm]);
  const [tab, setTab] = useState<Tab>('overview'); const [from, setFrom] = useState(shift(today, -29)); const [to, setTo] = useState(today);
  const [who, setWho] = useState('all');
  const n = daysBetween(from, to) + 1; const pFrom = shift(from, -n); const pTo = shift(from, -1);
  const rows = useMemo(() => dailyRows(d, en, pm, from, to), [d, en, pm, from, to]);
  const prevRows = useMemo(() => dailyRows(d, en, pm, pFrom, pTo), [d, en, pm, pFrom, pTo]);
  const tot = useMemo(() => sumRows(rows), [rows]); const ptot = useMemo(() => sumRows(prevRows), [prevRows]);
  const tRow = useMemo(() => dailyRows(d, en, pm, today, today)[0], [d, en, pm, today]); const yRow = useMemo(() => dailyRows(d, en, pm, shift(today, -1), shift(today, -1))[0], [d, en, pm, today]);
  const inR = (e: BillEx) => e.day >= from && e.day <= to;
  const ctx = { d, pm, en, rows, tot, ptot, from, to, inR, today, who, setWho, go: setTab };

  return (
    <div className="mx-auto max-w-[1380px]">
      <Title title="Business" sub="Everything the shop sold, who sold it, and what it earned. Profit is worked out from each product's latest purchase price.">
        <Link href="/admin/estimates" className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-medium hover:bg-paper">Estimates waiting</Link>
      </Title>

      {/* today strip: always live, whatever period is chosen below */}
      <section className="mb-5 rounded-[28px] bg-sage-bg p-6 text-sage-fg">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div><div className="text-sm opacity-80">Today so far · {longDay(today)}</div><div className="font-display text-[56px] font-semibold leading-none"><Rupee v={tRow.net} animate /></div>
            <div className="mt-1 text-sm opacity-80">{yRow.net > 0 ? `${Math.abs(pctDelta(tRow.net, yRow.net) ?? 0)}% ${tRow.net >= yRow.net ? 'ahead of' : 'behind'} yesterday's ${money(yRow.net)}` : 'net sales after refunds'}</div></div>
          <div className="flex flex-wrap gap-3">
            {[['Profit today', <Rupee key="p" v={tRow.profit} animate />], ['Bills', <CountUp key="b" value={tRow.bills} duration={700} />], ['Estimates made', <CountUp key="e" value={tRow.estimates} duration={700} />]].map(([k, v]) => (
              <div key={k as string} className="rounded-2xl bg-white/60 px-5 py-3"><div className="text-xs opacity-80">{k}</div><div className="font-display text-2xl font-semibold">{v}</div></div>))}
          </div>
        </div>
      </section>

      <div className="mb-4 flex flex-wrap gap-1.5">{TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-2xl px-4 py-2.5 text-[15px] font-medium transition ${tab === k ? 'bg-sage-bg text-sage-fg ring-2 ring-brand' : 'border border-line bg-white text-steel hover:text-ink'}`}>{l}</button>)}</div>
      <div className="mb-5"><RangeBar from={from} to={to} set={(a, b) => { setFrom(a); setTo(b); }} /></div>

      {tab === 'overview' && <Overview {...ctx} />}
      {tab === 'daybook' && <DayBook {...ctx} />}
      {tab === 'bills' && <Bills {...ctx} />}
      {tab === 'pnl' && <Pnl {...ctx} />}
      {tab === 'people' && <People {...ctx} />}
    </div>
  );
}
type Ctx = { d: ReturnType<typeof useStore.getState>; pm: Map<string, import('@/lib/types').Product>; en: BillEx[]; rows: Row[]; tot: Row; ptot: Row; from: string; to: string; inR: (e: BillEx) => boolean; today: string; who: string; setWho: (s: string) => void; go: (t: Tab) => void };

/* ---------------- Overview ---------------- */
function Overview({ d, en, rows, tot, ptot, from, to, inR, go }: Ctx) {
  const sales = en.filter((e) => e.b.kind === 'quotation' && inR(e)); const lines = sales.flatMap((e) => e.lines.map((l) => ({ ...l, e })));
  const long = rows.length > 92; const series = (long ? rollup(rows, 'month') : rows).map((r) => ({ label: long ? r.label.slice(0, 3) + ' ' + r.label.slice(-2) : shortDay(r.from), v: Math.round(r.net), v2: Math.round(r.profit) }));
  const h = hourly(en, from, to); const hmax = Math.max(...h, 1); const hours = Array.from({ length: 13 }, (_, i) => i + 8);
  const wd = Array.from({ length: 7 }, (_, i) => ({ label: DAY_NAMES[(i + 1) % 7], value: rows.filter((r) => dayOfWeek(r.from) === (i + 1) % 7).reduce((t, r) => t + r.net, 0) }));
  const below = lines.filter((l) => l.below); const loss = below.reduce((t, l) => t - l.profit, 0);
  const openEst = d.bills.filter((b) => b.kind === 'estimate' && b.status === 'open' && !isExpiredEstimate(b));
  const cust = new Map<string, { v: number; n: number }>(); sales.forEach((e) => { const k = d.customers.find((c) => c.id === e.b.customerId)?.phone ?? ''; const o = cust.get(k) ?? { v: 0, n: 0 }; o.v += e.b.total; o.n++; cust.set(k, o); });
  const prodProfit = new Map<string, number>(); lines.forEach((l) => prodProfit.set(l.name, (prodProfit.get(l.name) ?? 0) + l.profit));
  const alerts = [
    below.length > 0 && { t: `${below.length} items sold below today's purchase price`, s: `Lost about ${money(loss)}. Costs have gone up since prices were set.`, c: 'bg-blush-bg text-blush-fg', act: 'See them', on: () => go('pnl') },
    openEst.length > 0 && { t: `${openEst.length} estimates are waiting for you`, s: `${money(openEst.reduce((t, b) => t + b.total, 0))} quoted and not yet bought`, c: 'bg-butter-bg text-butter-fg', href: '/admin/estimates', act: 'Convert' },
    tot.refunds > 0 && { t: `${money(tot.refunds)} refunded to customers`, s: `${tot.returns} return${tot.returns === 1 ? '' : 's'} in this period`, c: 'bg-lilac-bg text-lilac-fg', on: () => go('daybook'), act: 'Day book' },
  ].filter(Boolean) as { t: string; s: string; c: string; act: string; on?: () => void; href?: string }[];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Net sales" value={tot.net} tone="sage" delta={pctDelta(tot.net, ptot.net)} sub={`${money(tot.gross)} billed, ${money(tot.refunds)} refunded`} />
        <Kpi label="Gross profit" value={tot.profit} tone={tot.profit < 0 ? 'blush' : 'butter'} delta={pctDelta(tot.profit, ptot.profit)} sub={`${pc(margin(tot))} of net sales`} />
        <Kpi label="Bills" value={tot.bills} kind="num" tone="sky" delta={pctDelta(tot.bills, ptot.bills)} sub={tot.bills ? `average ${money(tot.gross / tot.bills)}` : ''} />
        <Kpi label="Profit after staff salaries" value={tot.profit - tot.salary} tone={tot.profit - tot.salary < 0 ? 'blush' : 'lilac'} sub={`salaries for these days ${money(tot.salary)}`} />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Cost of goods sold" value={tot.cost} tone="paper" sub="at latest purchase price" />
        <Kpi label="Cash received" value={tot.cash} tone="paper" />
        <Kpi label="Online received" value={tot.online} tone="paper" />
        <Kpi label="Estimates made" value={tot.estimates} kind="num" tone="paper" sub={money(tot.estValue) + ' quoted'} />
      </div>
      {alerts.length > 0 && <div className="grid gap-3 lg:grid-cols-3">{alerts.map((a) => (
        <div key={a.t} className={`rounded-[20px] p-4 ${a.c}`}><div className="font-medium">{a.t}</div><div className="mt-0.5 text-sm opacity-80">{a.s}</div>
          {a.href ? <Link href={a.href} className="mt-3 inline-block rounded-full bg-white/70 px-4 py-1.5 text-sm font-medium">{a.act}</Link> : <button onClick={a.on} className="mt-3 rounded-full bg-white/70 px-4 py-1.5 text-sm font-medium">{a.act}</button>}</div>))}</div>}
      <Panel title="Sales and profit over time" sub={long ? 'By month' : 'By day'}><Trend data={series} name="Net sales" name2="Gross profit" /></Panel>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="When customers buy" sub="Sales by hour of the day"><div className="flex h-44 items-end gap-1.5" role="img" aria-label="Sales by hour">{hours.map((x) => <div key={x} className="flex h-full flex-1 flex-col justify-end" title={`${x % 12 || 12} ${x < 12 ? 'am' : 'pm'}: ${money(h[x])}`}><div className="rise rounded-t-md bg-sage-mid" style={{ height: `${Math.max(2, (h[x] / hmax) * 100)}%`, background: h[x] === hmax ? '#5B430E' : undefined }} /></div>)}</div>
          <div className="mt-1 flex gap-1.5 text-[11px] text-steel">{hours.map((x) => <span key={x} className="flex-1 text-center">{x % 12 || 12}</span>)}</div></Panel>
        <Panel title="Busiest days of the week" sub="Net sales"><BarList rows={wd} limit={7} /></Panel>
        <Panel title="Most profitable products"><BarList rows={[...prodProfit].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)} limit={8} /></Panel>
        <Panel title="Best customers" sub="By amount bought"><BarList rows={[...cust].map(([label, o]) => ({ label, value: o.v, sub: `${o.n} bills` })).sort((a, b) => b.value - a.value)} limit={8} /></Panel>
      </div>
    </div>
  );
}

/* ---------------- Day book ---------------- */
function DayBook({ en, rows, tot, d, from, to }: Ctx) {
  const [g, setG] = useState<Gran>('day'); const [open, setOpen] = useState<string | null>(null);
  const list = useMemo(() => [...rollup(rows, g)].reverse(), [rows, g]);
  const exp = () => download(`day-book-${g}-${from}-to-${to}.csv`, toCsv([['Period', 'Bills', 'Billed', 'Refunded', 'Net sales', 'Cost of goods', 'Gross profit', 'Margin %', 'Cash', 'Online', 'Estimates made', 'Estimates value', 'Salary share'], ...list.map((r) => [r.label, r.bills, Math.round(r.gross), Math.round(r.refunds), Math.round(r.net), Math.round(r.cost), Math.round(r.profit), margin(r).toFixed(1), r.cash, r.online, r.estimates, r.estValue, Math.round(r.salary)])]));
  return (
    <Panel title="Day book" sub="Every day's business. Open a row to see the bills behind it." action={<div className="flex items-center gap-2"><Seg value={g} onChange={setG} options={[['day', 'Daily'], ['week', 'Weekly'], ['month', 'Monthly']]} /><button onClick={exp} className="flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2 text-sm font-medium hover:bg-paper"><Download className="h-4 w-4" />Export</button></div>}>
      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-paper text-left text-xs text-steel"><tr><th className="w-8" />{['Period', 'Bills', 'Net sales', 'Cost', 'Profit', 'Margin', 'Cash', 'Online', 'Refunds', 'Estimates'].map((h, i) => <th key={h} className={`px-3 py-2.5 font-medium ${i > 0 ? 'text-right' : ''}`}>{h}</th>)}</tr></thead>
          <tbody>
            <tr className="bg-sage-bg/60 font-semibold text-sage-fg"><td /><td className="px-3 py-2.5">Whole period</td><td className="px-3 text-right">{tot.bills}</td><td className="px-3 text-right">{money(tot.net)}</td><td className="px-3 text-right">{money(tot.cost)}</td><td className="px-3 text-right"><PL v={tot.profit} /></td><td className="px-3 text-right">{pc(margin(tot))}</td><td className="px-3 text-right">{money(tot.cash)}</td><td className="px-3 text-right">{money(tot.online)}</td><td className="px-3 text-right">{money(tot.refunds)}</td><td className="px-3 text-right">{tot.estimates}</td></tr>
            {list.map((r) => (
              <FragmentRows key={r.key} r={r} g={g} isOpen={open === r.key} toggle={() => setOpen(open === r.key ? null : r.key)} rows={rows} d={d} />))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
function FragmentRows({ r, g, isOpen, toggle, rows, d }: { r: Row; g: Gran; isOpen: boolean; toggle: () => void; rows: Row[]; d: Ctx['d'] }) {
  const pm = useProductMap(); const en = useMemo(() => enrich(d.bills.filter((b) => dk(b.date) >= r.from && dk(b.date) <= r.to), pm), [d.bills, pm, r.from, r.to]);
  const idle = r.bills === 0 && r.estimates === 0 && r.returns === 0;
  return (
    <>
      <tr onClick={toggle} className={`cursor-pointer border-t border-line hover:bg-paper/60 ${idle ? 'text-steel/70' : ''}`}>
        <td className="pl-3">{isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
        <td className="px-3 py-2.5 font-medium">{r.label}</td><td className="px-3 text-right tabular-nums">{r.bills}</td><td className="px-3 text-right tabular-nums">{money(r.net)}</td><td className="px-3 text-right tabular-nums">{money(r.cost)}</td>
        <td className="px-3 text-right"><PL v={r.profit} /></td><td className="px-3 text-right tabular-nums">{r.net > 0 ? pc(margin(r)) : '-'}</td><td className="px-3 text-right tabular-nums">{money(r.cash)}</td><td className="px-3 text-right tabular-nums">{money(r.online)}</td><td className="px-3 text-right tabular-nums">{r.refunds ? money(r.refunds) : '-'}</td><td className="px-3 text-right tabular-nums">{r.estimates || '-'}</td>
      </tr>
      {isOpen && <tr className="border-t border-line bg-paper/40"><td /><td colSpan={10} className="px-3 py-3">
        {g === 'day' ? (en.length ? <div className="space-y-2">{[...en].sort((a, b) => b.b.date.localeCompare(a.b.date)).map((e) => <BillRow key={e.b.id} e={e} d={d} />)}</div> : <p className="text-sm text-steel">No bills on this day.</p>)
          : <table className="w-full text-sm"><tbody>{rows.filter((x) => x.from >= r.from && x.from <= r.to).reverse().map((x) => <tr key={x.key} className="border-t border-line first:border-0"><td className="py-1.5">{x.label}</td><td className="text-right">{x.bills} bills</td><td className="text-right">{money(x.net)}</td><td className="text-right"><PL v={x.profit} /></td></tr>)}</tbody></table>}
      </td></tr>}
    </>
  );
}

/* ---------------- one bill, expandable ---------------- */
function BillRow({ e, d }: { e: BillEx; d: Ctx['d'] }) {
  const [open, setOpen] = useState(false); const b = e.b; const sale = b.kind === 'quotation';
  const cu = d.customers.find((c) => c.id === b.customerId)?.phone; const st = d.staff.find((s) => s.id === b.staffId); const est = b.fromEstimate ? d.bills.find((x) => x.id === b.fromEstimate) : null;
  const mode = !sale ? '-' : b.cash && b.online ? 'Split' : b.online ? 'Online' : 'Cash';
  const status = sale ? { t: est ? 'Sale from estimate' : 'Sale', tone: 'sage' as const } : b.status === 'converted' ? { t: 'Estimate · converted', tone: 'sky' as const } : isExpiredEstimate(b) ? { t: 'Estimate · expired', tone: 'blush' as const } : { t: 'Estimate · open', tone: 'butter' as const };
  return (
    <div className="rounded-2xl border border-line bg-white">
      <button onClick={() => setOpen(!open)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left text-sm">
        {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        <span className="w-24 font-semibold">{b.no}</span><Pill tone={status.tone}>{status.t}</Pill>
        <span className="text-steel">{fmtDate(b.date)} {fmtTime(b.date)}</span>
        <span className="flex items-center gap-1.5">{st && <Avatar staff={d.staff} id={st.id} size="sm" />}{st?.name}</span>
        <span className="text-steel">{cu} · {TIER_NAMES[b.tier]}</span><span className="text-steel">{e.lines.length} item{e.lines.length > 1 ? 's' : ''}</span>
        <span className="ml-auto flex items-center gap-4"><span className="text-steel">{mode}</span><b className="tabular-nums">{money(b.total)}</b>{sale ? <PL v={e.profit} className="w-24 text-right" /> : <span className="w-24 text-right text-xs text-steel">would earn {money(e.profit)}</span>}</span>
      </button>
      {open && (
        <div className="border-t border-line px-4 pb-4 pt-2">
          {est && <p className="mb-2 rounded-xl bg-sky-bg px-3 py-2 text-sm text-sky-fg">Converted from <b>{est.no}</b> (made {fmtDate(est.date)}) by the owner{b.convertedAt ? ` on ${fmtDate(b.convertedAt)}` : ''}. {b.points} points went to {st?.name}.</p>}
          <table className="w-full text-sm"><thead className="text-left text-xs text-steel"><tr><th className="py-1.5 font-medium">Product</th><th className="text-right font-medium">Qty</th><th className="text-right font-medium">Sold at</th><th className="text-right font-medium">Latest cost</th><th className="text-right font-medium">Profit</th></tr></thead>
            <tbody>{e.lines.map((l) => (
              <tr key={l.pid} className="border-t border-line"><td className="py-2">{emojiFor(l.cat)} {l.name}{l.below && <span className="ml-2"><Pill tone="blush">below cost</Pill></span>}</td><td className="text-right">{l.qty}</td>
                <td className="text-right tabular-nums">{money(l.price)}{l.estPrice != null && l.estPrice !== l.price && <div className="text-xs text-steel">estimate said {money(l.estPrice)}</div>}</td>
                <td className="text-right tabular-nums">{money(l.unitCost)}</td><td className="text-right"><PL v={l.profit} /></td></tr>))}</tbody></table>
        </div>)}
    </div>
  );
}

/* ---------------- All bills ---------------- */
function Bills({ en, d, inR, who, setWho }: Ctx) {
  const [kind, setKind] = useState<'all' | 'sale' | 'estimate'>('all'); const [q, setQ] = useState(''); const [n, setN] = useState(25);
  const list = useMemo(() => en.filter((e) => inR(e) && (who === 'all' || e.b.staffId === who) && (kind === 'all' || (kind === 'sale') === (e.b.kind === 'quotation'))
    && (!q || e.b.no.toLowerCase().includes(q.toLowerCase()) || (d.customers.find((c) => c.id === e.b.customerId)?.phone ?? '').includes(q))), [en, inR, who, kind, q, d.customers]);
  const sales = list.filter((e) => e.b.kind === 'quotation'); const name = (id: string) => d.staff.find((s) => s.id === id)?.name ?? '';
  const exp = () => download('bills.csv', toCsv([['Bill', 'Type', 'Date', 'Time', 'Salesman', 'Customer', 'Category', 'Items', 'Total', 'Cost at latest purchase price', 'Profit', 'Cash', 'Online', 'Points', 'Status'],
    ...list.map((e) => [e.b.no, e.b.kind === 'quotation' ? 'Sale' : 'Estimate', fmtDate(e.b.date), fmtTime(e.b.date), name(e.b.staffId), d.customers.find((c) => c.id === e.b.customerId)?.phone ?? '', TIER_NAMES[e.b.tier], e.lines.length, e.b.total, Math.round(e.cost), Math.round(e.profit), e.b.cash, e.b.online, e.b.points, e.b.status])]));
  const expItems = () => download('bill-items.csv', toCsv([['Bill', 'Date', 'Salesman', 'Product', 'Category', 'Qty', 'Sold at', 'Latest cost', 'Revenue', 'Cost', 'Profit'], ...list.flatMap((e) => e.lines.map((l) => [e.b.no, fmtDate(e.b.date), name(e.b.staffId), l.name, l.cat, l.qty, l.price, l.unitCost, l.revenue, Math.round(l.cost), Math.round(l.profit)]))]));
  return (
    <Panel title="All bills" sub={`${list.length} bills · ${sales.length} sales worth ${money(sales.reduce((t, e) => t + e.b.total, 0))}, profit ${money(sales.reduce((t, e) => t + e.profit, 0))}`}
      action={<div className="flex flex-wrap gap-2"><button onClick={exp} className="flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2 text-sm font-medium hover:bg-paper"><Download className="h-4 w-4" />Bills</button><button onClick={expItems} className="flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2 text-sm font-medium hover:bg-paper"><Download className="h-4 w-4" />Items</button></div>}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Seg value={kind} onChange={(v) => { setKind(v); setN(25); }} options={[['all', 'All'], ['sale', 'Sales'], ['estimate', 'Estimates']]} />
        <select value={who} onChange={(e) => setWho(e.target.value)} className="!rounded-xl" aria-label="Salesman"><option value="all">Every salesman</option>{d.staff.filter((s) => s.role === 'salesman').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Bill number or customer phone" className="!rounded-xl" />
      </div>
      <div className="space-y-2">{list.slice(0, n).map((e) => <BillRow key={e.b.id} e={e} d={d} />)}{!list.length && <p className="py-10 text-center text-sm text-steel">No bills match.</p>}</div>
      {list.length > n && <button onClick={() => setN(n + 25)} className="mt-3 w-full rounded-2xl border border-line bg-white py-3 text-sm font-medium hover:bg-paper">Show 25 more ({list.length - n} left)</button>}
    </Panel>
  );
}

/* ---------------- Profit & loss ---------------- */
function Pnl({ en, d, tot, inR, from, to, pm }: Ctx) {
  const sales = en.filter((e) => e.b.kind === 'quotation' && inR(e)); const lines = sales.flatMap((e) => e.lines.map((l) => ({ ...l, e })));
  const grp = (key: (l: (typeof lines)[number]) => string) => { const m = new Map<string, { rev: number; cost: number }>(); lines.forEach((l) => { const o = m.get(key(l)) ?? { rev: 0, cost: 0 }; o.rev += l.revenue; o.cost += l.cost; m.set(key(l), o); }); return [...m].map(([label, o]) => ({ label, value: o.rev - o.cost, sub: `${money(o.rev)} sold · ${o.rev ? pc(((o.rev - o.cost) / o.rev) * 100) : '-'}`, rev: o.rev, cost: o.cost })).sort((a, b) => b.value - a.value); };
  const byCat = grp((l) => `${emojiFor(l.cat)} ${l.cat}`); const byTier = grp((l) => TIER_NAMES[l.e.b.tier]); const byProd = grp((l) => l.name);
  const thin = byProd.filter((p) => p.rev > 0 && (p.rev - p.cost) / p.rev < 0.1).sort((a, b) => (a.value / a.rev) - (b.value / b.rev));
  const below = lines.filter((l) => l.below).sort((a, b) => a.profit - b.profit);
  const rets = d.returns.filter((r) => dk(r.date) >= from && dk(r.date) <= to); const dmg = rets.filter((r) => r.kind === 'damage').reduce((t, r) => t + r.lines.reduce((a, l) => a + l.qty * (pm.get(l.pid)?.pp ?? l.pp), 0), 0);
  const st = (id: string) => d.staff.find((s) => s.id === id)?.name;
  const Line = ({ k, v, strong, sub, minus }: { k: string; v: number; strong?: boolean; sub?: string; minus?: boolean }) => <div className={`flex items-baseline justify-between py-2.5 ${strong ? 'font-display text-xl font-semibold' : 'text-[15px]'}`}><span>{k}{sub && <span className="ml-2 text-xs font-normal text-steel">{sub}</span>}</span><span className="tabular-nums">{minus ? '−' : ''}{strong ? <PL v={v} /> : money(Math.abs(v))}</span></div>;
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-5">
        <Panel title="Profit and loss statement" sub={`${fmtDate(from)} to ${fmtDate(to)}`} className="lg:col-span-3">
          <div className="divide-y divide-line">
            <Line k="Sales billed" v={tot.gross} sub={`${tot.bills} bills`} /><Line k="Refunded to customers" v={tot.refunds} minus sub={`${rets.length} returns`} />
            <Line k="Net sales" v={tot.net} strong />
            <Line k="Cost of goods sold" v={tot.cost} minus sub="latest purchase price" /><Line k="Gross profit" v={tot.profit} strong sub={pc(margin(tot))} />
            <Line k="Staff salaries for these days" v={tot.salary} minus sub="monthly salary spread over the month" /><Line k="Profit after salaries" v={tot.profit - tot.salary} strong />
          </div>
          <p className="mt-3 rounded-xl bg-paper px-4 py-3 text-xs text-steel">Rent, electricity, transport and other running costs are not recorded in this system, so they are not taken off. Old sales are re-costed at today's purchase price, so profit moves when a vendor's price changes.</p>
        </Panel>
        <Panel title="Returns" className="lg:col-span-2" sub="In this period">
          <div className="space-y-3 text-[15px]"><div className="flex justify-between"><span>Sales returns</span><b>{money(rets.filter((r) => r.kind === 'sales').reduce((t, r) => t + r.refundCash + r.refundOnline, 0))}</b></div>
            <div className="flex justify-between"><span>Damage returns</span><b>{money(rets.filter((r) => r.kind === 'damage').reduce((t, r) => t + r.refundCash + r.refundOnline, 0))}</b></div>
            <div className="flex justify-between text-blush-fg"><span>Loss from damaged goods</span><b>{money(dmg)}</b></div></div>
          <p className="mt-3 text-xs text-steel">A sales return puts the goods back in stock, so its cost is taken back out. Damaged goods are not restocked, so their cost stays as a loss.</p>
        </Panel>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Profit by product category" sub="Before returns"><BarList rows={byCat} /></Panel>
        <Panel title="Profit by customer category"><BarList rows={byTier} /></Panel>
        <Panel title="Most profitable products"><BarList rows={byProd} /></Panel>
        <Panel title="Thin margins" sub="Products earning under 10% in this period"><BarList rows={thin.map((p) => ({ label: p.label, value: p.value, sub: p.sub }))} fmt={(n) => (n < 0 ? '−' : '') + money(Math.abs(n))} empty="No product is under 10% margin" /></Panel>
      </div>
      <Panel title="Sold below the latest purchase price" sub="Each of these lost money at today's cost. Review the selling price or the vendor price.">
        <Table csv="below-cost-sales" rows={below} empty="Nothing was sold below cost" cols={[
          { h: 'Bill', v: (l) => <b>{l.e.b.no}</b>, csv: (l) => l.e.b.no }, { h: 'Date', v: (l) => fmtDate(l.e.b.date) }, { h: 'Salesman', v: (l) => st(l.e.b.staffId) }, { h: 'Product', v: (l) => l.name }, { h: 'Qty', v: (l) => l.qty, right: true },
          { h: 'Sold at', v: (l) => money(l.price), csv: (l) => l.price, right: true }, { h: 'Latest cost', v: (l) => money(l.unitCost), csv: (l) => l.unitCost, right: true }, { h: 'Loss', v: (l) => <PL v={l.profit} />, csv: (l) => Math.round(l.profit), right: true }]} />
      </Panel>
    </div>
  );
}

/* ---------------- Salesmen ---------------- */
function People({ en, d, inR, setWho, go }: Ctx) {
  const people = d.staff.filter((s) => s.role === 'salesman'); const from = '', _ = from; void _;
  const cards = people.map((s) => {
    const mine = en.filter((e) => e.b.staffId === s.id && inR(e)); const sales = mine.filter((e) => e.b.kind === 'quotation'); const ests = mine.filter((e) => e.b.kind === 'estimate');
    const rets = d.returns.filter((r) => d.bills.find((b) => b.id === r.billId)?.staffId === s.id && en.some((e) => e.b.id === r.billId) && inR({ day: dk(r.date) } as BillEx));
    const gross = sales.reduce((t, e) => t + e.b.total, 0); const refunds = rets.reduce((t, r) => t + r.refundCash + r.refundOnline, 0); const cost = sales.reduce((t, e) => t + e.cost, 0);
    const retCost = rets.filter((r) => r.kind === 'sales').reduce((t, r) => t + r.lines.reduce((a, l) => a + l.qty * l.pp, 0), 0);
    const prod = new Map<string, number>(); sales.forEach((e) => e.lines.forEach((l) => prod.set(l.name, (prod.get(l.name) ?? 0) + l.revenue)));
    return { s, bills: sales.length, net: gross - refunds, profit: gross - refunds - cost + retCost, pts: sales.reduce((t, e) => t + e.b.points, 0) - rets.reduce((t, r) => t + r.pointsReversed, 0), ests: ests.length, conv: ests.filter((e) => e.b.status === 'converted').length, below: sales.reduce((t, e) => t + e.below, 0), top: [...prod].sort((a, b) => b[1] - a[1]).slice(0, 3) };
  }).sort((a, b) => b.net - a.net); const max = Math.max(...cards.map((c) => c.net), 1);
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cards.map((c, i) => (
        <div key={c.s.id} className="rounded-[22px] border border-line bg-white p-5">
          <div className="flex items-center gap-3"><Avatar staff={d.staff} id={c.s.id} size="lg" /><div className="flex-1"><div className="font-display text-xl font-semibold leading-6">{c.s.name}</div><div className="text-xs text-steel">#{i + 1} by sales · {c.pts} points</div></div></div>
          <div className="mt-4 flex items-end justify-between"><div><div className="text-xs text-steel">Net sales</div><div className="font-display text-3xl font-semibold"><Rupee v={c.net} /></div></div><div className="text-right"><div className="text-xs text-steel">Gross profit</div><div className="font-display text-xl font-semibold"><PL v={c.profit} /></div></div></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper"><GrowBar pct={(c.net / max) * 100} color="#B8892B" delay={i * 60} /></div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs"><Pill tone="sky">{c.bills} bills</Pill><Pill tone="butter">{c.ests} estimates, {c.conv} converted</Pill>{c.below > 0 && <Pill tone="blush">{c.below} below cost</Pill>}</div>
          {c.top.length > 0 && <div className="mt-3 text-sm text-steel">Sold most: {c.top.map((t) => t[0]).join(', ')}</div>}
          <button onClick={() => { setWho(c.s.id); go('bills'); }} className="mt-4 w-full rounded-xl border border-line py-2 text-sm font-medium hover:bg-paper">See {c.s.name}'s bills</button>
        </div>))}
    </div>
  );
}