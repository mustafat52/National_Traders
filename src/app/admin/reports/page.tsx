'use client';
import { useMemo, useState } from 'react';
import { useStore, useProductMap } from '@/lib/store';
import { LOCS, TIER_NAMES } from '@/lib/types';
import { dk, fmtDate, isExpiredEstimate, isLow, money, stockTotal } from '@/lib/rules';
import { vendorAging, vendorBalance } from '@/lib/selectors';
import { computePay, dayState, hm, monthLabel, monthsInRange, rangeKeys, workedMinutes } from '@/lib/payroll';
import { emojiFor } from '@/lib/categories';
import { AgeBar, AGE } from '@/components/AgeBar';
import { Avatar, Seg, Title } from '@/components/StaffBits';
import { BarList, Kpi, Panel, Pill, RangeBar, Table, Tone, Trend, pctDelta } from '@/components/ReportBits';

const TABS = [['sales', '📈 Sales'], ['billing', '🧾 Billing'], ['purchase', '🚚 Purchases'], ['stock', '📦 Stock'], ['attendance', '🕘 Attendance'], ['payroll', '💰 Payroll']] as const;
type Tab = (typeof TABS)[number][0];
type Group = { label: string; value: number; sub?: string };
const group = <T,>(rows: T[], key: (r: T) => string, val: (r: T) => number, sub?: (n: number, v: number) => string): Group[] => {
  const m = new Map<string, { n: number; v: number }>(); rows.forEach((r) => { const k = key(r); const o = m.get(k) ?? { n: 0, v: 0 }; o.n++; o.v += val(r); m.set(k, o); });
  return [...m].map(([label, o]) => ({ label, value: o.v, sub: sub?.(o.n, o.v) })).sort((a, b) => b.value - a.value);
};
const dayShift = (k: string, n: number) => { const x = new Date(k + 'T12:00:00'); x.setDate(x.getDate() + n); return dk(x); };
const daysBetween = (a: string, b: string) => Math.round((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 86400000);

export default function Reports() {
  const d = useStore(); const pm = useProductMap(); const today = dk(new Date());
  const [tab, setTab] = useState<Tab>('sales');
  const [from, setFrom] = useState(dayShift(today, -29)); const [to, setTo] = useState(today);
  const n = daysBetween(from, to) + 1; const pFrom = dayShift(from, -n); const pTo = dayShift(from, -1);
  const sm = (id: string) => d.staff.find((s) => s.id === id)?.name ?? '';
  const salesmen = d.staff.filter((s) => s.role === 'salesman');

  const stats = (a: string, b: string) => {
    const bills = d.bills.filter((x) => dk(x.date) >= a && dk(x.date) <= b); const sales = bills.filter((x) => x.kind === 'quotation');
    const rets = d.returns.filter((x) => dk(x.date) >= a && dk(x.date) <= b);
    const gross = sales.reduce((t, x) => t + x.total, 0); const refunds = rets.reduce((t, x) => t + x.refundCash + x.refundOnline, 0);
    return { bills, sales, rets, gross, refunds, net: gross - refunds };
  };
  const cur = useMemo(() => stats(from, to), [d.bills, d.returns, from, to]); // eslint-disable-line react-hooks/exhaustive-deps
  const prev = useMemo(() => stats(pFrom, pTo), [d.bills, d.returns, pFrom, pTo]); // eslint-disable-line react-hooks/exhaustive-deps
  const { bills, sales, rets, gross, refunds, net } = cur;
  const inR = (x: string) => dk(x) >= from && dk(x) <= to;

  const trend = useMemo(() => {
    const monthly = n > 92; const m = new Map<string, number>();
    for (let i = 0; i < n; i++) { const k = dayShift(from, i); m.set(monthly ? k.slice(0, 7) : k, 0); }
    sales.forEach((b) => { const k = monthly ? dk(b.date).slice(0, 7) : dk(b.date); m.set(k, (m.get(k) ?? 0) + b.total); });
    rets.forEach((r) => { const k = monthly ? dk(r.date).slice(0, 7) : dk(r.date); m.set(k, (m.get(k) ?? 0) - r.refundCash - r.refundOnline); });
    return [...m].map(([k, v]) => ({ label: monthly ? monthLabel(k).slice(0, 3) + ' ' + k.slice(2, 4) : new Date(k + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), v }));
  }, [sales, rets, from, n]);

  return (
    <div className="mx-auto max-w-[1380px]">
      <Title title="Reports" sub="Pick a period, then a report. Every table can be exported. Stock levels always show right now." />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">{TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-2xl px-4 py-2.5 text-[15px] font-medium transition ${tab === k ? 'bg-sage-bg text-sage-fg ring-2 ring-brand' : 'border border-line bg-white text-steel hover:text-ink'}`}>{l}</button>)}</div>
      </div>
      {tab !== 'stock' && <div className="mb-5"><RangeBar from={from} to={to} set={(a, b) => { setFrom(a); setTo(b); }} /></div>}

      {tab === 'sales' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Net sales" value={net} tone="sage" delta={pctDelta(net, prev.net)} sub="after refunds" />
            <Kpi label="Bills" value={sales.length} kind="num" tone="sky" delta={pctDelta(sales.length, prev.sales.length)} sub={sales.length ? `average ${money(gross / sales.length)}` : ''} />
            <Kpi label="Refunded to customers" value={refunds} tone="blush" sub={`${rets.length} return${rets.length === 1 ? '' : 's'}`} />
            <Kpi label="Cash received" value={sales.reduce((t, b) => t + b.cash, 0)} tone="butter" sub={`online ${money(sales.reduce((t, b) => t + b.online, 0))}`} />
          </div>
          <Panel title="Sales over time" sub="Daily sales minus refunds"><Trend data={trend} /></Panel>
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Who sold" sub="Value and points earned"><BarList rows={group(sales, (b) => sm(b.staffId), (b) => b.total, (c) => `${c} bills`).map((r) => { const s = salesmen.find((x) => x.name === r.label); const pts = sales.filter((b) => b.staffId === s?.id).reduce((t, b) => t + b.points, 0) - rets.filter((x) => d.bills.find((b) => b.id === x.billId)?.staffId === s?.id).reduce((t, x) => t + x.pointsReversed, 0); return { ...r, sub: `${r.sub} · ${pts} pts` }; })} /></Panel>
            <Panel title="Customer categories"><BarList rows={group(sales, (b) => TIER_NAMES[b.tier], (b) => b.total, (c) => `${c} bills`)} /></Panel>
            <Panel title="Product categories"><BarList rows={group(sales.flatMap((b) => b.lines), (l) => `${emojiFor(pm.get(l.pid)?.cat ?? '')} ${pm.get(l.pid)?.cat ?? ''}`, (l) => l.qty * l.price)} /></Panel>
            <Panel title="Top products"><BarList rows={group(sales.flatMap((b) => b.lines), (l) => pm.get(l.pid)?.name ?? '', (l) => l.qty * l.price, (c) => `${c} sold`)} /></Panel>
          </div>
        </div>
      )}

      {tab === 'billing' && <Billing bills={bills} />}

      {tab === 'purchase' && <Purchase from={from} to={to} inR={inR} prevTotal={d.purchases.filter((p) => dk(p.date) >= pFrom && dk(p.date) <= pTo).reduce((t, p) => t + p.total, 0)} />}

      {tab === 'stock' && <Stock from={from} to={to} set={(a, b) => { setFrom(a); setTo(b); }} inR={inR} />}

      {tab === 'attendance' && <Attendance from={from} to={to} today={today} />}

      {tab === 'payroll' && <Payroll from={from} to={to} />}
    </div>
  );
}

/* ---------------- Billing ---------------- */
function Billing({ bills }: { bills: ReturnType<typeof useStore.getState>['bills'] }) {
  const d = useStore(); const [f, setF] = useState<'all' | 'paid' | 'open' | 'converted' | 'expired'>('all');
  const status = (b: (typeof bills)[number]) => (b.kind === 'quotation' ? 'paid' : b.status === 'converted' ? 'converted' : isExpiredEstimate(b) ? 'expired' : 'open');
  const tone: Record<string, Tone> = { paid: 'sage', converted: 'sky', open: 'butter', expired: 'blush' };
  const label: Record<string, string> = { paid: 'Paid sale', converted: 'Became a sale', open: 'Open estimate', expired: 'Expired' };
  const est = bills.filter((b) => b.kind === 'estimate'); const conv = est.filter((b) => b.status === 'converted');
  const rows = bills.filter((b) => f === 'all' || status(b) === f);
  const mode = (b: (typeof bills)[number]) => (b.kind === 'estimate' ? '-' : b.cash && b.online ? 'Split' : b.online ? 'Online' : 'Cash');
  const paid = bills.filter((b) => b.kind === 'quotation');
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Paid sales" value={paid.length} kind="num" tone="sage" sub={money(paid.reduce((t, b) => t + b.total, 0))} />
        <Kpi label="Estimates given" value={est.length} kind="num" tone="butter" sub={money(est.reduce((t, b) => t + b.total, 0))} />
        <Kpi label="Estimates that became sales" value={est.length ? (conv.length / est.length) * 100 : 0} kind="pct" tone="sky" sub={`${conv.length} of ${est.length}`} />
        <Kpi label="Expired, never bought" value={est.filter((b) => status(b) === 'expired').length} kind="num" tone="blush" sub="worth a follow-up call" />
      </div>
      <Panel title="All bills" action={<Seg value={f} onChange={setF} options={[['all', 'All'], ['paid', 'Paid'], ['open', 'Open'], ['converted', 'Converted'], ['expired', 'Expired']]} />}>
        <Table csv="billing-report" rows={rows} search={(b, q) => b.no.toLowerCase().includes(q) || (d.customers.find((c) => c.id === b.customerId)?.phone ?? '').includes(q) || d.staff.find((s) => s.id === b.staffId)?.name.toLowerCase().includes(q) === true} cols={[
          { h: 'Bill', v: (b) => <b>{b.no}</b>, csv: (b) => b.no }, { h: 'Status', v: (b) => <Pill tone={tone[status(b)]}>{label[status(b)]}</Pill>, csv: (b) => label[status(b)] },
          { h: 'Date', v: (b) => fmtDate(b.date) }, { h: 'Salesman', v: (b) => d.staff.find((s) => s.id === b.staffId)?.name }, { h: 'Customer', v: (b) => d.customers.find((c) => c.id === b.customerId)?.phone },
          { h: 'Category', v: (b) => TIER_NAMES[b.tier] }, { h: 'Paid by', v: mode }, { h: 'Points', v: (b) => b.points || '-', csv: (b) => b.points, right: true }, { h: 'Total', v: (b) => money(b.total), csv: (b) => b.total, right: true },
        ]} />
      </Panel>
    </div>
  );
}

/* ---------------- Purchase ---------------- */
function Purchase({ from, to, inR, prevTotal }: { from: string; to: string; inR: (x: string) => boolean; prevTotal: number }) {
  const d = useStore(); const vname = (id: string) => d.vendors.find((v) => v.id === id)?.name ?? '';
  const ps = d.purchases.filter((p) => inR(p.date)); const total = ps.reduce((t, p) => t + p.total, 0); const paid = d.payments.filter((p) => inR(p.date)).reduce((t, p) => t + p.amount, 0);
  const aging = d.vendors.map((v) => ({ v, a: vendorAging(d, v.id), bal: vendorBalance(d, v.id) })).filter((x) => x.bal > 0).sort((a, b) => b.bal - a.bal);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Bought in this period" value={total} tone="sage" delta={pctDelta(total, prevTotal)} sub={`${ps.length} bills`} />
        <Kpi label="Paid to vendors" value={paid} tone="sky" sub="in this period" />
        <Kpi label="Owed to vendors now" value={aging.reduce((t, x) => t + x.bal, 0)} tone="butter" sub={`${aging.length} vendors`} />
        <Kpi label="Owed over 60 days" value={aging.reduce((t, x) => t + x.a[2], 0)} tone="blush" sub="pay these first" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Bought from" sub={`${fmtDate(from)} to ${fmtDate(to)}`}><BarList rows={group(ps, (p) => vname(p.vendorId), (p) => p.total, (c) => `${c} bills`)} /></Panel>
        <Panel title="Who we owe" sub="Right now, by how old the bill is">
          <div className="mb-3 flex flex-wrap gap-2 text-xs">{AGE.map((a) => <span key={a.label} className={`rounded-full px-2.5 py-1 ${a.chip}`}>{a.label}</span>)}</div>
          <ul className="max-h-80 space-y-3.5 overflow-y-auto pr-1">{aging.map((x) => <li key={x.v.id}><div className="mb-1 flex justify-between text-sm"><span className="font-medium">{x.v.name}</span><span className="tabular-nums">{money(x.bal)}</span></div><AgeBar ag={x.a} /></li>)}
            {!aging.length && <li className="py-6 text-center text-sm text-steel">Nothing is owed to any vendor.</li>}</ul>
        </Panel>
      </div>
      <Panel title="Purchase bills">
        <Table csv="purchase-report" rows={ps} search={(p, q) => p.no.toLowerCase().includes(q) || p.billNo.toLowerCase().includes(q) || vname(p.vendorId).toLowerCase().includes(q)} cols={[
          { h: 'No.', v: (p) => <b>{p.no}</b>, csv: (p) => p.no }, { h: 'Date', v: (p) => fmtDate(p.date) }, { h: 'Vendor', v: (p) => vname(p.vendorId) }, { h: 'Vendor bill', v: (p) => p.billNo },
          { h: 'Items', v: (p) => p.lines.length, right: true }, { h: 'Units', v: (p) => p.lines.reduce((t, l) => t + l.qty.reduce((a, b) => a + b, 0), 0), right: true }, { h: 'Total', v: (p) => money(p.total), csv: (p) => p.total, right: true },
        ]} />
      </Panel>
    </div>
  );
}

/* ---------------- Stock ---------------- */
function Stock({ from, to, set, inR }: { from: string; to: string; set: (a: string, b: string) => void; inR: (x: string) => boolean }) {
  const d = useStore(); const pm = useProductMap(); const [low, setLow] = useState<'all' | 'low'>('all');
  const val = (p: (typeof d.products)[number]) => stockTotal(p) * p.pp;
  const totalVal = d.products.reduce((t, p) => t + val(p), 0); const units = d.products.reduce((t, p) => t + stockTotal(p), 0);
  const lows = d.products.filter(isLow); const rows = useMemo(() => d.products.filter((p) => low === 'all' || isLow(p)), [d.products, low]);
  const damaged = d.returns.filter((r) => r.kind === 'damage').flatMap((r) => r.lines.map((l) => ({ ...l, date: r.date, no: r.no })));
  const dmgIn = damaged.filter((l) => inR(l.date)); const locVal = LOCS.map((_, i) => d.products.reduce((t, p) => t + p.stock[i] * p.pp, 0));
  const catVal = group(d.products, (p) => `${emojiFor(p.cat)} ${p.cat}`, val);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Stock value at cost" value={totalVal} tone="sage" sub={`${d.products.length.toLocaleString('en-IN')} products`} />
        <Kpi label="Units in stock" value={units} kind="num" tone="sky" />
        <Kpi label="At or below minimum" value={lows.length} kind="num" tone="butter" sub={`${lows.filter((p) => stockTotal(p) === 0).length} sold out`} />
        <Kpi label="Damaged stock loss" value={damaged.reduce((t, l) => t + l.pp * l.qty, 0)} tone="blush" sub="all time, not added back" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Where the stock sits" sub="Value at cost"><BarList rows={LOCS.map((l, i) => ({ label: l, value: locVal[i], sub: `${d.products.reduce((t, p) => t + p.stock[i], 0).toLocaleString('en-IN')} units` }))} /></Panel>
        <Panel title="Biggest categories" sub="Value at cost"><BarList rows={catVal} /></Panel>
      </div>
      <Panel title="What moved" sub="Choose the period for deliveries, transfers, corrections and damage" action={<div className="scale-95"><RangeBarLite from={from} to={to} set={set} /></div>}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Units received" value={d.stockIns.filter((s) => inR(s.date)).reduce((t, s) => t + s.lines.reduce((a, l) => a + l.qty.reduce((x, y) => x + y, 0), 0), 0)} kind="num" tone="sage" sub={`${d.stockIns.filter((s) => inR(s.date)).length} deliveries`} />
          <Kpi label="Transfers" value={d.transfers.filter((t) => inR(t.date)).length} kind="num" tone="sky" sub={`${d.transfers.filter((t) => inR(t.date)).reduce((a, t) => a + t.qty, 0)} units moved`} />
          <Kpi label="Count corrections" value={d.adjustments.filter((a) => inR(a.date)).length} kind="num" tone="lilac" />
          <Kpi label="Damaged in period" value={dmgIn.reduce((t, l) => t + l.pp * l.qty, 0)} tone="blush" sub={`${dmgIn.length} lines`} />
        </div>
      </Panel>
      <Panel title="Every product" sub="Stock by location, as of now" action={<Seg value={low} onChange={setLow} options={[['all', 'All'], ['low', 'Low stock only']]} />}>
        <Table csv="stock-report" rows={rows} pageSize={15} search={(p, q) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q)} cols={[
          { h: 'SKU', v: (p) => p.sku }, { h: 'Product', v: (p) => <span>{p.name}{p.shopOnly && <span className="ml-2 text-xs text-steel">shop only</span>}</span>, csv: (p) => p.name }, { h: 'Category', v: (p) => `${emojiFor(p.cat)} ${p.cat}`, csv: (p) => p.cat },
          { h: 'Shop', v: (p) => p.stock[0], right: true }, { h: 'Godown 1', v: (p) => p.stock[1], right: true }, { h: 'Godown 2', v: (p) => p.stock[2], right: true },
          { h: 'Total', v: (p) => <span className={isLow(p) ? 'font-semibold text-blush-fg' : ''}>{stockTotal(p)}</span>, csv: (p) => stockTotal(p), right: true }, { h: 'Minimum', v: (p) => p.min, right: true }, { h: 'Value at cost', v: (p) => money(val(p)), csv: val, right: true },
        ]} />
      </Panel>
      <Panel title="Damaged stock" sub="Returned damaged by customers. Not added back to inventory; shown at purchase price.">
        <Table csv="damaged-stock" empty="No damaged returns yet" rows={damaged} cols={[{ h: 'Return', v: (l) => l.no }, { h: 'Date', v: (l) => fmtDate(l.date) }, { h: 'Product', v: (l) => pm.get(l.pid)?.name }, { h: 'Qty', v: (l) => l.qty, right: true }, { h: 'Purchase price', v: (l) => money(l.pp), csv: (l) => l.pp, right: true }, { h: 'Loss', v: (l) => money(l.pp * l.qty), csv: (l) => l.pp * l.qty, right: true }]} />
      </Panel>
    </div>
  );
}
function RangeBarLite({ from, to, set }: { from: string; to: string; set: (a: string, b: string) => void }) { return <RangeBar from={from} to={to} set={set} />; }

/* ---------------- Attendance ---------------- */
function Attendance({ from, to, today }: { from: string; to: string; today: string }) {
  const d = useStore(); const end = to > today ? today : to; const keys = rangeKeys(from, end, d.settings.weeklyOff);
  const rows = d.staff.filter((s) => s.role === 'salesman').map((s) => {
    const st = keys.map((k) => dayState(d, s, k)); const c = (f: (x: string) => boolean) => st.filter(f).length;
    const att = d.attendance.filter((a) => a.staffId === s.id && a.date >= from && a.date <= to);
    const present = c((x) => x === 'present' || x === 'late'); const absent = c((x) => x === 'absent');
    return { s, present, late: c((x) => x === 'late'), absent, paid: c((x) => x === 'paid-leave'), unpaid: c((x) => x === 'unpaid-leave'), rate: present + absent ? (present / (present + absent)) * 100 : 100,
      mins: att.reduce((t, a) => t + workedMinutes(a), 0), gaps: att.reduce((t, a) => t + a.gaps.length, 0), brk: att.reduce((t, a) => t + a.breaks.reduce((x, b) => x + ((b.e ? new Date(b.e).getTime() : Date.now()) - new Date(b.s).getTime()) / 60000, 0), 0), days: att.length };
  });
  const avg = rows.length ? rows.reduce((t, r) => t + r.rate, 0) / rows.length : 0;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Average attendance" value={avg} kind="pct" tone="sage" sub="of working days" />
        <Kpi label="Late arrivals" value={rows.reduce((t, r) => t + r.late, 0)} kind="num" tone="butter" sub={`after ${d.settings.lateAfter}`} />
        <Kpi label="Absent without leave" value={rows.reduce((t, r) => t + r.absent, 0)} kind="num" tone="blush" sub="days" />
        <Kpi label="Leave days" value={rows.reduce((t, r) => t + r.paid + r.unpaid, 0)} kind="num" tone="sky" sub={`${rows.reduce((t, r) => t + r.paid, 0)} paid, ${rows.reduce((t, r) => t + r.unpaid, 0)} unpaid`} />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => (
          <div key={r.s.id} className="rounded-[22px] border border-line bg-white p-4">
            <div className="flex items-center gap-3"><Avatar staff={d.staff} id={r.s.id} /><div className="flex-1 font-display text-lg font-semibold">{r.s.name}</div><div className="font-display text-2xl font-semibold text-brand">{Math.round(r.rate)}%</div></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper"><div className="grow h-full rounded-full bg-brand" style={{ width: `${r.rate}%` }} /></div>
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs"><Pill tone="sage">Present {r.present}</Pill>{r.late > 0 && <Pill tone="butter">Late {r.late}</Pill>}{r.absent > 0 && <Pill tone="blush">Absent {r.absent}</Pill>}{r.paid > 0 && <Pill tone="sky">Paid leave {r.paid}</Pill>}{r.unpaid > 0 && <Pill tone="lilac">Unpaid leave {r.unpaid}</Pill>}</div>
            <p className="mt-2 text-xs text-steel">{hm(r.mins)} worked · {Math.round(r.brk)} min breaks · left the shop {r.gaps}×</p>
          </div>))}
      </div>
      <Panel title="Details"><Table csv="attendance-report" rows={rows} cols={[
        { h: 'Staff', v: (r) => r.s.name }, { h: 'Days present', v: (r) => r.present, right: true }, { h: 'Attendance', v: (r) => Math.round(r.rate) + '%', right: true }, { h: 'Hours worked', v: (r) => (r.mins / 60).toFixed(1), right: true }, { h: 'Break (min)', v: (r) => Math.round(r.brk), right: true },
        { h: 'Late', v: (r) => r.late, right: true }, { h: 'Absent', v: (r) => r.absent, right: true }, { h: 'Paid leave', v: (r) => r.paid, right: true }, { h: 'Unpaid leave', v: (r) => r.unpaid, right: true }, { h: 'Left shop', v: (r) => r.gaps, right: true },
      ]} /></Panel>
    </div>
  );
}

/* ---------------- Payroll ---------------- */
function Payroll({ from, to }: { from: string; to: string }) {
  const d = useStore(); const months = monthsInRange(from, to).slice(-12);
  const rows = months.flatMap((m) => d.staff.filter((s) => s.role === 'salesman').map((s) => ({ s, m, c: computePay(d, s, m) })));
  const net = rows.reduce((t, r) => t + r.c.net, 0); const paid = rows.filter((r) => r.c.payslip).reduce((t, r) => t + r.c.net, 0);
  const cuts = rows.reduce((t, r) => t + r.c.leaveCut + r.c.absentCut + r.c.joinCut, 0);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Net salaries" value={net} tone="sage" sub={`${months.length} month${months.length === 1 ? '' : 's'}`} />
        <Kpi label="Paid out" value={paid} tone="sky" />
        <Kpi label="Still to pay" value={net - paid} tone="butter" />
        <Kpi label="Cut for leave and absence" value={cuts} tone="lilac" />
      </div>
      <Panel title="Cost by month"><BarList rows={months.map((m) => ({ label: monthLabel(m), value: rows.filter((r) => r.m === m).reduce((t, r) => t + r.c.net, 0) })).reverse()} limit={12} /></Panel>
      <Panel title="Salary details" sub="Open Payroll to pay or adjust a month">
        <Table csv="payroll-report" rows={rows} search={(r, q) => r.s.name.toLowerCase().includes(q)} cols={[
          { h: 'Month', v: (r) => monthLabel(r.m) }, { h: 'Staff', v: (r) => r.s.name }, { h: 'Salary', v: (r) => money(r.c.base), csv: (r) => r.c.base, right: true }, { h: 'Present', v: (r) => r.c.present, right: true },
          { h: 'Paid leave', v: (r) => r.c.paidLeave, right: true }, { h: 'Unpaid leave', v: (r) => r.c.unpaidLeave, right: true }, { h: 'Absent', v: (r) => r.c.absent, right: true },
          { h: 'Cut', v: (r) => money(r.c.leaveCut + r.c.absentCut + r.c.joinCut), csv: (r) => r.c.leaveCut + r.c.absentCut + r.c.joinCut, right: true }, { h: 'Bonus', v: (r) => money(r.c.bonus), csv: (r) => r.c.bonus, right: true },
          { h: 'Advance and other', v: (r) => money(r.c.advance + r.c.other), csv: (r) => r.c.advance + r.c.other, right: true }, { h: 'Net pay', v: (r) => <b>{money(r.c.net)}</b>, csv: (r) => r.c.net, right: true },
          { h: 'Status', v: (r) => (r.c.payslip ? <Pill tone="sage">Paid</Pill> : <Pill tone="butter">Not paid</Pill>), csv: (r) => (r.c.payslip ? 'Paid' : 'Not paid') },
        ]} />
      </Panel>
    </div>
  );
}