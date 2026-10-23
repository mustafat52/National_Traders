'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '@/lib/store';
import { dk, fmtTime, isExpiredEstimate, isLow, mk, money, stockTotal } from '@/lib/rules';
import { salesOn, staffPoints, vendorAging, vendorBalance } from '@/lib/selectors';
import { LOCS, Staff } from '@/lib/types';
import { CountUp, GrowBar } from '@/components/CountUp';

/* paint-chip tints used for people, in a fixed order */
const CHIPS = [
  { bg: '#F3E7C6', fg: '#5B430E' }, { bg: '#F8D9B0', fg: '#86440A' }, { bg: '#E1E7EE', fg: '#33506B' },
  { bg: '#E8E3EC', fg: '#574767' }, { bg: '#F6DDD7', fg: '#9A3524' }, { bg: '#EFE6CF', fg: '#6B5314' },
];
const short = (n: number) => (n >= 1e7 ? (n / 1e7).toFixed(2) + ' Cr' : n >= 1e5 ? (n / 1e5).toFixed(1) + ' L' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(Math.round(n)));
const hourLabel = (h: number) => `${h % 12 || 12} ${h < 12 ? 'am' : 'pm'}`;
const card = 'rounded-[22px] border border-line bg-panel p-6';
const title = 'font-display text-[22px] font-semibold tracking-tight';

const Rupee = ({ v, className = '', animate = false, delay = 0 }: { v: number; className?: string; animate?: boolean; delay?: number }) => (
  <span className={className}><span className="mr-0.5 font-sans font-normal opacity-60">₹</span>{animate ? <CountUp value={v} delay={delay} /> : <span style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.round(v).toLocaleString('en-IN')}</span>}</span>
);
const Chip = ({ staff, id }: { staff: Staff[]; id: string }) => {
  const i = staff.findIndex((s) => s.id === id); const c = CHIPS[i % CHIPS.length];
  return <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] font-display text-base font-bold" style={{ background: c.bg, color: c.fg }}>{staff[i]?.name[0]}</span>;
};

export default function Dashboard() {
  const d = useStore();
  const now = new Date(); const today = dk(now);
  const [month, setMonth] = useState(mk(now));

  /* ---------- today ---------- */
  const todayBills = useMemo(() => d.bills.filter((b) => b.kind === 'quotation' && dk(b.date) === today), [d.bills, today]);
  const soldToday = salesOn(d, today);
  const yesterday = dk(new Date(now.getTime() - 86400000));
  const hours = useMemo(() => { const b: number[] = Array(12).fill(0); todayBills.forEach((x) => { b[Math.min(11, Math.max(0, new Date(x.date).getHours() - 9))] += x.total; }); return b; }, [todayBills]);
  const maxHour = Math.max(...hours, 1); const peak = hours.indexOf(Math.max(...hours));
  const cashToday = todayBills.reduce((a, b) => a + b.cash, 0); const onlineToday = todayBills.reduce((a, b) => a + b.online, 0);
  const grossToday = todayBills.reduce((a, b) => a + b.total, 0);

  /* ---------- needs attention ---------- */
  const low = useMemo(() => d.products.filter(isLow), [d.products]);
  const soldOut = low.filter((p) => stockTotal(p) === 0).length;
  const aging = useMemo(() => d.vendors.map((v) => ({ v, a: vendorAging(d, v.id), bal: vendorBalance(d, v.id) })), [d.vendors, d.purchases, d.payments]); // eslint-disable-line react-hooks/exhaustive-deps
  const overdue = aging.reduce((a, x) => a + x.a[2], 0); const overdueVendors = aging.filter((x) => x.a[2] > 0).length;
  const payable = aging.reduce((a, x) => a + x.bal, 0);
  const pendingLeaves = d.leaves.filter((l) => l.status === 'pending').length;
  const expiring = d.bills.filter((b) => b.kind === 'estimate' && b.status === 'open' && !isExpiredEstimate(b) && b.validUntil && new Date(b.validUntil).getTime() - now.getTime() < 2 * 86400000).length;
  const attention = [
    { n: low.length, text: 'items are at or below their minimum', sub: soldOut ? `${soldOut} are sold out completely` : 'none are sold out', href: '/admin/lowstock', act: 'Review stock', t: 'bg-butter-bg text-butter-fg' },
    { n: overdueVendors, text: overdueVendors === 1 ? 'vendor is owed for over 60 days' : 'vendors are owed for over 60 days', sub: overdue ? `${money(overdue)} outstanding` : '', href: '/admin/vendors', act: 'Open payables', t: 'bg-blush-bg text-blush-fg' },
    { n: pendingLeaves, text: pendingLeaves === 1 ? 'leave request is waiting' : 'leave requests are waiting', sub: 'Staff are waiting for a yes or no', href: '/admin/leaves', act: 'Decide', t: 'bg-sky-bg text-sky-fg' },
    { n: expiring, text: expiring === 1 ? 'estimate expires within 2 days' : 'estimates expire within 2 days', sub: 'A call now can turn them into sales', href: '/admin/estimates', act: 'Convert', t: 'bg-lilac-bg text-lilac-fg' },
  ].filter((a) => a.n > 0);

  /* ---------- 14 day comparison ---------- */
  const trend = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const x = new Date(); x.setDate(x.getDate() - (13 - i)); const p = new Date(x); p.setDate(p.getDate() - 14);
    return { day: x.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), now: salesOn(d, dk(x)), before: salesOn(d, dk(p)) };
  }), [d.bills, d.returns]); // eslint-disable-line react-hooks/exhaustive-deps
  const sumNow = trend.reduce((a, t) => a + t.now, 0); const sumBefore = trend.reduce((a, t) => a + t.before, 0);
  const change = sumBefore ? Math.round(((sumNow - sumBefore) / sumBefore) * 100) : 0;

  /* ---------- leaderboard ---------- */
  const months = Array.from({ length: 6 }, (_, i) => { const x = new Date(); x.setDate(1); x.setMonth(x.getMonth() - i); return mk(x); });
  const board = d.staff.filter((s) => s.role === 'salesman').map((s) => ({ s, pts: staffPoints(d, s.id, month), sales: d.bills.filter((b) => b.kind === 'quotation' && b.staffId === s.id && mk(b.date) === month).reduce((a, b) => a + b.total, 0) })).sort((a, b) => b.pts - a.pts);
  const topPts = Math.max(1, board[0]?.pts ?? 1);

  /* ---------- stock + people ---------- */
  const where = useMemo(() => LOCS.map((name, i) => ({ name, units: d.products.reduce((a, p) => a + p.stock[i], 0), cost: d.products.reduce((a, p) => a + p.stock[i] * p.pp, 0) })), [d.products]);
  const totalUnits = Math.max(1, where.reduce((a, w) => a + w.units, 0)); const LOCC = ['#B8892B', '#8FA05E', '#EAD9A3'];
  const running = useMemo(() => low.filter((p) => stockTotal(p) > 0).sort((a, b) => stockTotal(a) / Math.max(1, a.min) - stockTotal(b) / Math.max(1, b.min)).slice(0, 6), [low]);
  const floor = d.attendance.filter((a) => a.date === today && !a.out && !a.gaps.some((g) => !g.back)).map((a) => ({ a, onBreak: a.breaks.some((b) => !b.e) }));
  const salesmen = d.staff.filter((s) => s.role === 'salesman');
  const bucket = [aging.reduce((a, x) => a + x.a[0], 0), aging.reduce((a, x) => a + x.a[1], 0), overdue]; const bucketTotal = Math.max(1, bucket.reduce((a, b) => a + b, 0));
  const AGEC = ['#8FA05E', '#E08A3C', '#D9705F'];
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="mx-auto max-w-[1380px]">
      {/* header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="text-[15px] text-steel">{greeting}</div>
          <h1 className="font-display text-[44px] font-semibold leading-[1.05] tracking-tight">{now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</h1>
        </div>
        <div className="w-full sm:w-auto sm:max-w-xl">
          <div className="mb-2 text-sm text-steel sm:text-right">{floor.length ? `${floor.length} of ${salesmen.length} salesmen are in the shop` : 'Nobody has clocked in yet'}</div>
          <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:justify-end sm:overflow-visible sm:pb-0">
            {floor.map(({ a, onBreak }) => (
              <div key={a.id} className="flex shrink-0 items-center gap-2 rounded-xl border border-line bg-panel py-1 pl-1 pr-3 text-sm">
                <Chip staff={d.staff} id={a.staffId} /><span className="font-medium">{d.staff.find((s) => s.id === a.staffId)?.name}</span>
                <span className="text-steel">{onBreak ? 'on break' : fmtTime(a.in)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* hero: the day's takings, on a soft sage panel */}
        <section className="flex flex-col rounded-[28px] bg-sage-bg p-7 text-sage-fg sm:p-9 lg:col-span-7">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="font-display text-2xl font-semibold tracking-tight">Sold today</div>
            <div className="text-sm">Yesterday finished at <Rupee v={salesOn(d, yesterday)} className="font-semibold" /></div>
          </div>
          <div className="mt-2 whitespace-nowrap font-display text-[50px] font-semibold leading-none tracking-[-0.03em] text-[#3B2B07] sm:text-[92px] xl:text-[108px]">
            <Rupee v={soldToday} animate className="[&>span:first-child]:mr-1.5 [&>span:first-child]:align-top [&>span:first-child]:text-[0.42em]" />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[15px]">
            <span className="rounded-full bg-white/60 px-3 py-1 font-medium">{todayBills.length} {todayBills.length === 1 ? 'bill' : 'bills'}{todayBills.length > 0 && <>, <Rupee v={grossToday / todayBills.length} /> average</>}</span>
            <span className="rounded-full bg-white/60 px-3 py-1">Cash <Rupee v={cashToday} className="font-medium" /></span>
            <span className="rounded-full bg-white/60 px-3 py-1">Online <Rupee v={onlineToday} className="font-medium" /></span>
          </div>
          <div className="mt-8 flex min-h-[8rem] flex-1 items-end gap-2" aria-label="Sales by hour today">
            {hours.map((v, i) => (
              <div key={i} className="flex h-full flex-1 flex-col justify-end" title={`${hourLabel(i + 9)}: ${money(v)}`}>
                <div className="rise rounded-t-lg" style={{ height: `${Math.max(3, (v / maxHour) * 100)}%`, background: i === peak && v > 0 ? '#5B430E' : '#D7B96B', opacity: v ? 1 : 0.5, animationDelay: `${i * 55}ms` }} />
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2 text-[11px] sm:text-xs">{hours.map((_, i) => <div key={i} className="flex-1 whitespace-nowrap text-center">{i % 2 === 1 ? hourLabel(i + 9) : ''}</div>)}</div>
          {grossToday > 0 && <div className="mt-3 text-sm">Busiest hour so far was {hourLabel(peak + 9)}, with <Rupee v={hours[peak]} className="font-semibold" /></div>}
        </section>

        {/* needs attention: stacked paint chips */}
        <section className="lg:col-span-5">
          <h2 className={`${title} mb-3 px-1`}>Needs your attention</h2>
          {attention.length === 0 && <p className="px-1 text-steel">Nothing is waiting for you. Stock, payables and requests are all in order.</p>}
          <div className="space-y-3">
            {attention.map((a, i) => (
              <div key={a.href + a.text} className={`flex items-start gap-4 rounded-[20px] px-5 py-4 ${a.t}`}>
                <div className="min-w-[92px] shrink-0 font-display text-[42px] font-semibold leading-none"><CountUp value={a.n} delay={200 + i * 140} /></div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium leading-snug">{a.text}</div>
                  {a.sub && <div className="text-sm opacity-80">{a.sub}</div>}
                  <Link href={a.href} className="mt-2 inline-block rounded-full border border-current/30 bg-white/55 px-3.5 py-1 text-sm font-semibold hover:bg-white/90">{a.act}</Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 14 day comparison */}
        <section className={`${card} flex flex-col lg:col-span-7`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className={title}>The last 14 days</h2>
            <div className="text-sm text-steel"><b className="text-ink"><Rupee v={sumNow} /></b> sold, {change >= 0 ? 'up' : 'down'} {Math.abs(change)}% on the 14 days before</div>
          </div>
          <div className="mb-1 mt-1 flex gap-5 text-xs text-steel">
            <span className="flex items-center gap-1.5"><i className="inline-block h-0.5 w-5 bg-brand" />These 14 days</span>
            <span className="flex items-center gap-1.5"><i className="inline-block h-0 w-5 border-t-2 border-dashed border-steel/50" />The 14 days before</span>
          </div>
          <div className="relative min-h-[15rem] flex-1"><div className="absolute inset-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 5" vertical={false} stroke="#E7DFCC" />
                <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} interval={1} stroke="#6E6657" />
                <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={short} stroke="#6E6657" width={48} />
                <Tooltip formatter={(v: number) => money(v)} contentStyle={{ borderRadius: 12, border: '1px solid #E7DFCC', fontSize: 13 }} />
                <Area type="monotone" dataKey="before" name="Before" stroke="#6E6657" strokeOpacity={0.55} strokeDasharray="5 4" strokeWidth={1.5} fill="none" animationDuration={1200} />
                <Area type="monotone" dataKey="now" name="Sold" stroke="#B8892B" strokeWidth={2.75} fill="#B8892B" fillOpacity={0.1} animationDuration={1200} />
              </AreaChart>
            </ResponsiveContainer>
          </div></div>
        </section>

        {/* leaderboard */}
        <section className={`${card} lg:col-span-5`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className={title}>Who is selling</h2>
            <select className="!py-1 text-sm" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Month">{months.map((m) => <option key={m} value={m}>{new Date(m + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</option>)}</select>
          </div>
          <ol className="mt-4 space-y-4">
            {board.map((b, i) => (
              <li key={b.s.id} className="flex items-center gap-3">
                <span className="w-4 text-sm text-steel">{i + 1}</span><Chip staff={d.staff} id={b.s.id} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2"><span className="font-medium">{b.s.name}</span><span className="font-display text-xl font-semibold"><CountUp value={b.pts} delay={300 + i * 90} /> <span className="font-sans text-xs font-normal text-steel">points</span></span></div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-paper"><GrowBar pct={(b.pts / topPts) * 100} color={i === 0 ? '#B8892B' : '#D7B96B'} delay={i * 90} /></div>
                  <div className="mt-0.5 text-xs text-steel">{money(b.sales)} sold</div>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-steel">Salesmen see their points but never the sale values.</p>
        </section>

        {/* where the stock sits */}
        <section className={`${card} lg:col-span-4`}>
          <h2 className={title}>Where the stock sits</h2>
          <div className="mt-5 flex h-4 gap-1 overflow-hidden rounded-full">{where.map((w, i) => <div key={w.name} className="rounded-full" style={{ width: `${(w.units / totalUnits) * 100}%`, background: LOCC[i] }} />)}</div>
          <ul className="mt-5 space-y-4">
            {where.map((w, i) => (
              <li key={w.name} className="flex items-center gap-3">
                <i className="h-3 w-3 shrink-0 rounded-full" style={{ background: LOCC[i] }} />
                <span className="flex-1 font-medium">{w.name}</span>
                <span className="text-right"><span className="font-display text-xl font-semibold"><CountUp value={w.units} delay={300 + i * 120} /></span> <span className="text-xs text-steel">units</span><div className="text-xs text-steel">{money(w.cost)} at cost</div></span>
              </li>
            ))}
          </ul>
        </section>

        {/* running low */}
        <section className={`${card} lg:col-span-4`}>
          <div className="flex items-baseline justify-between"><h2 className={title}>Running low</h2><Link href="/admin/lowstock" className="text-sm font-medium text-brand underline underline-offset-4">All {low.length}</Link></div>
          <ul className="mt-4 space-y-3.5">
            {running.map((p) => {
              const ratio = Math.min(1, stockTotal(p) / Math.max(1, p.min));
              return (
                <li key={p.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <Link href={`/admin/products/${p.id}`} className="truncate text-[15px] font-medium hover:underline">{p.name}</Link>
                    <span className="shrink-0 text-sm tabular-nums"><b>{stockTotal(p)}</b><span className="text-steel"> of {p.min}</span></span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-paper"><GrowBar pct={ratio * 100} color={ratio < 0.35 ? '#D9705F' : '#E08A3C'} /></div>
                  <div className="mt-0.5 text-xs text-steel">{LOCS.map((n, i) => (p.stock[i] > 0 ? `${n} ${p.stock[i]}` : '')).filter(Boolean).join(', ')}</div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* owed to vendors */}
        <section className={`${card} lg:col-span-4`}>
          <div className="flex items-baseline justify-between"><h2 className={title}>Owed to vendors</h2><Link href="/admin/vendors" className="text-sm font-medium text-brand underline underline-offset-4">All vendors</Link></div>
          <div className="mt-3 font-display text-[44px] font-semibold leading-none tracking-tight"><Rupee v={payable} animate delay={250} className="[&>span:first-child]:align-top [&>span:first-child]:text-[0.5em]" /></div>
          <div className="mt-5 flex h-3 gap-1 overflow-hidden rounded-full">{bucket.map((b, i) => <div key={i} className="rounded-full" style={{ width: `${(b / bucketTotal) * 100}%`, background: AGEC[i] }} />)}</div>
          <ul className="mt-3 space-y-1.5 text-sm">
            {['Under 30 days', '30 to 60 days', 'Over 60 days'].map((l, i) => <li key={l} className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ background: AGEC[i] }} /><span className="flex-1 text-steel">{l}</span><Rupee v={bucket[i]} className="font-medium" /></li>)}
          </ul>
          <div className="mt-4 border-t border-line pt-3 text-sm">
            <div className="mb-1 text-steel">Biggest balances</div>
            {[...aging].sort((a, b) => b.bal - a.bal).slice(0, 3).map((x) => <Link key={x.v.id} href={`/admin/vendors/${x.v.id}`} className="flex justify-between py-0.5 hover:underline"><span>{x.v.name}</span><Rupee v={x.bal} /></Link>)}
          </div>
        </section>
      </div>
    </div>
  );
}