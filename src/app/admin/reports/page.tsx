'use client';
import { useMemo, useState } from 'react';
import { useStore, useProductMap } from '@/lib/store';
import { LOCS, TIER_NAMES } from '@/lib/types';
import { dk, fmtDate, isLow, money, stockTotal } from '@/lib/rules';
import { staffPoints, vendorAging, vendorBalance } from '@/lib/selectors';
import { Btn, Col, DataTable, PageTitle, Stat, cx } from '@/components/ui';

const TABS = ['Billing', 'Attendance', 'Sales', 'Purchase', 'Stock'] as const;
export default function Reports() {
  const d = useStore(); const pm = useProductMap();
  const [tab, setTab] = useState<(typeof TABS)[number]>('Billing');
  const [from, setFrom] = useState(dk(new Date(Date.now() - 29 * 86400000))); const [to, setTo] = useState(dk(new Date()));
  const [stockLow, setStockLow] = useState(false);
  const inRange = (x: string) => dk(x) >= from && dk(x) <= to;
  const sm = (id: string) => d.staff.find((s) => s.id === id)?.name ?? '';
  const cust = (id: string) => d.customers.find((c) => c.id === id)?.phone ?? '';
  const bills = useMemo(() => d.bills.filter((b) => inRange(b.date)), [d.bills, from, to]); // eslint-disable-line react-hooks/exhaustive-deps
  const sales = bills.filter((b) => b.kind === 'quotation');
  const rets = d.returns.filter((r) => inRange(r.date));
  const group = <T,>(rows: T[], key: (r: T) => string, val: (r: T) => number) => { const m = new Map<string, { n: number; v: number }>(); rows.forEach((r) => { const k = key(r); const o = m.get(k) ?? { n: 0, v: 0 }; o.n++; o.v += val(r); m.set(k, o); }); return [...m].map(([k, o]) => ({ k, ...o })).sort((a, b) => b.v - a.v); };
  const grp: Col<{ k: string; n: number; v: number }>[] = [{ h: 'Name', v: (r) => r.k }, { h: 'Bills', v: (r) => r.n, right: true }, { h: 'Value', v: (r) => money(r.v), csv: (r) => r.v, right: true }];
  const attendance = useMemo(() => d.staff.filter((s) => s.role === 'salesman').map((s) => {
    const rows = d.attendance.filter((a) => a.staffId === s.id && inRange(a.date)); let mins = 0, brk = 0, late = 0, gaps = 0;
    rows.forEach((a) => { mins += ((a.out ? new Date(a.out).getTime() : new Date(a.in).getTime()) - new Date(a.in).getTime()) / 60000; a.breaks.forEach((b) => { if (b.e) brk += (new Date(b.e).getTime() - new Date(b.s).getTime()) / 60000; });
      const t = new Date(a.in); if (t.getHours() * 60 + t.getMinutes() > (+d.settings.lateAfter.split(':')[0]) * 60 + (+d.settings.lateAfter.split(':')[1] || 0)) late++; gaps += a.gaps.length; });
    const leaveDays = d.leaves.filter((l) => l.staffId === s.id && l.status === 'approved' && l.from <= to && l.to >= from).length;
    return { name: s.name, days: rows.length, hours: Math.round((mins - brk) / 6) / 10, brk: Math.round(brk), late, gaps, leaveDays };
  }), [d.attendance, d.staff, d.leaves, from, to]); // eslint-disable-line react-hooks/exhaustive-deps
  const stockRows = useMemo(() => d.products.filter((p) => !stockLow || isLow(p)), [d.products, stockLow]);
  const damaged = rets.length ? d.returns.filter((r) => r.kind === 'damage').flatMap((r) => r.lines.map((l) => ({ ...l, date: r.date, no: r.no }))) : [];
  return (
    <>
      <PageTitle title="Reports" sub="Billing · Attendance · Sales · Purchase · Stock" />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={cx('rounded-full px-4 py-1.5 text-sm font-medium', tab === t ? 'bg-brand text-white' : 'bg-white hover:bg-slate-100')}>{t}</button>)}
        {tab !== 'Stock' && <span className="ml-auto flex items-center gap-1 text-sm">From <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /> to <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></span>}
      </div>

      {tab === 'Billing' && <DataTable csv="billing-report" pageSize={30} rows={bills} cols={[
        { h: 'Bill', v: (b) => b.no }, { h: 'Type', v: (b) => b.kind.toUpperCase() }, { h: 'Date', v: (b) => fmtDate(b.date) }, { h: 'Salesman', v: (b) => sm(b.staffId) }, { h: 'Customer', v: (b) => cust(b.customerId) },
        { h: 'Category', v: (b) => TIER_NAMES[b.tier] }, { h: 'Total', v: (b) => money(b.total), csv: (b) => b.total, right: true },
        { h: 'Cash', v: (b) => money(b.cash), csv: (b) => b.cash, right: true }, { h: 'Online', v: (b) => money(b.online), csv: (b) => b.online, right: true }, { h: 'Points', v: (b) => b.points, right: true }, { h: 'Status', v: (b) => b.status },
      ]} />}

      {tab === 'Attendance' && <DataTable csv="attendance-report" rows={attendance} cols={[
        { h: 'Staff', v: (r) => r.name }, { h: 'Days present', v: (r) => r.days, right: true }, { h: 'Working hours', v: (r) => r.hours, right: true }, { h: 'Break (min)', v: (r) => r.brk, right: true },
        { h: 'Late arrivals', v: (r) => r.late, right: true }, { h: 'Left-shop events', v: (r) => r.gaps, right: true }, { h: 'Approved leaves', v: (r) => r.leaveDays, right: true },
      ]} />}

      {tab === 'Sales' && <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Gross sales" value={money(sales.reduce((a, b) => a + b.total, 0))} sub={`${sales.length} bills`} />
          <Stat label="Returns refunded" value={money(rets.reduce((a, r) => a + r.refundCash + r.refundOnline, 0))} sub={`${rets.length} returns`} />
          <Stat label="Net sales" value={money(sales.reduce((a, b) => a + b.total, 0) - rets.reduce((a, r) => a + r.refundCash + r.refundOnline, 0))} />
          <Stat label="Cash / Online" value={`${money(sales.reduce((a, b) => a + b.cash, 0))} / ${money(sales.reduce((a, b) => a + b.online, 0))}`} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div><div className="mb-1 text-sm font-semibold">By salesman (with points)</div><DataTable csv="sales-by-salesman" rows={group(sales, (b) => sm(b.staffId), (b) => b.total)} cols={[...grp, { h: 'Points (month)', v: (r) => { const s = d.staff.find((x) => x.name === r.k); return s ? staffPoints(d, s.id, to.slice(0, 7)) : ''; }, right: true }]} /></div>
          <div><div className="mb-1 text-sm font-semibold">By customer category</div><DataTable csv="sales-by-category" rows={group(sales, (b) => TIER_NAMES[b.tier], (b) => b.total)} cols={grp} /></div>
          <div><div className="mb-1 text-sm font-semibold">By product category</div><DataTable csv="sales-by-product-category" pageSize={10} rows={group(sales.flatMap((b) => b.lines), (l) => pm.get(l.pid)?.cat ?? '', (l) => l.qty * l.price)} cols={grp} /></div>
          <div><div className="mb-1 text-sm font-semibold">Top products</div><DataTable csv="top-products" pageSize={10} rows={group(sales.flatMap((b) => b.lines), (l) => pm.get(l.pid)?.name ?? '', (l) => l.qty * l.price)} cols={grp} /></div>
        </div>
      </div>}

      {tab === 'Purchase' && <div className="space-y-5">
        <DataTable csv="purchase-report" rows={d.purchases.filter((p) => inRange(p.date))} cols={[
          { h: 'No.', v: (p) => p.no }, { h: 'Date', v: (p) => fmtDate(p.date) }, { h: 'Vendor', v: (p) => d.vendors.find((v) => v.id === p.vendorId)?.name }, { h: 'Items', v: (p) => p.lines.length, right: true }, { h: 'Total', v: (p) => money(p.total), csv: (p) => p.total, right: true },
        ]} />
        <div className="text-sm font-semibold">Vendor payables (current)</div>
        <DataTable csv="vendor-payables" rows={d.vendors} cols={[{ h: 'Vendor', v: (v) => v.name }, { h: 'Owed', v: (v) => money(vendorBalance(d, v.id)), csv: (v) => vendorBalance(d, v.id), right: true }, { h: '0–30', v: (v) => money(vendorAging(d, v.id)[0]), right: true }, { h: '30–60', v: (v) => money(vendorAging(d, v.id)[1]), right: true }, { h: '60+', v: (v) => money(vendorAging(d, v.id)[2]), right: true }]} />
      </div>}

      {tab === 'Stock' && <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {LOCS.map((l, i) => <Stat key={l} label={`${l} · units`} value={d.products.reduce((a, p) => a + p.stock[i], 0).toLocaleString('en-IN')} sub={`at cost ${money(d.products.reduce((a, p) => a + p.stock[i] * p.pp, 0))}`} />)}
          <Stat label="Low-stock items" value={d.products.filter(isLow).length} />
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={stockLow} onChange={(e) => setStockLow(e.target.checked)} />Show only low stock</label>
        <DataTable csv="stock-report" pageSize={30} rows={stockRows} cols={[{ h: 'SKU', v: (p) => p.sku }, { h: 'Product', v: (p) => p.name }, { h: 'Category', v: (p) => p.cat }, { h: 'Shop', v: (p) => p.stock[0], right: true }, { h: 'G1', v: (p) => p.stock[1], right: true }, { h: 'G2', v: (p) => p.stock[2], right: true }, { h: 'Total', v: (p) => stockTotal(p), right: true }, { h: 'Value at cost', v: (p) => money(stockTotal(p) * p.pp), csv: (p) => stockTotal(p) * p.pp, right: true }]} />
        <div className="text-sm font-semibold">Damaged stock (not added back to inventory)</div>
        <DataTable csv="damaged-stock" empty="No damaged returns yet" rows={d.returns.filter((r) => r.kind === 'damage').flatMap((r) => r.lines.map((l) => ({ ...l, date: r.date, no: r.no })))} cols={[{ h: 'Return', v: (l) => l.no }, { h: 'Date', v: (l) => fmtDate(l.date) }, { h: 'Product', v: (l) => pm.get(l.pid)?.name }, { h: 'Qty', v: (l) => l.qty, right: true }, { h: 'Purchase price', v: (l) => money(l.pp), csv: (l) => l.pp, right: true }, { h: 'Loss at cost', v: (l) => money(l.pp * l.qty), csv: (l) => l.pp * l.qty, right: true }]} />
      </div>}
      <span className="hidden"><Btn>x</Btn>{damaged.length}</span>
    </>
  );
}
