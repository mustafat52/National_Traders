'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, MessageCircle } from 'lucide-react';
import { useStore, useProductMap } from '@/lib/store';
import { LOCS, TIER_NAMES } from '@/lib/types';
import { autoAlloc, calcPoints, fmtDate, isExpiredEstimate, money, needsPicker, packBreakdown, qtyText, stockTotal } from '@/lib/rules';
import { timeAgo } from '@/lib/time';
import { errText } from '@/components/StaffBits';
import { useScreenKeys } from '@/lib/hotkeys';
import { KBtn, ScreenHead } from '@/components/grid/Screen';
import { Field, Panel } from '@/components/grid/Panel';
import { toast } from '@/components/grid/Toast';

type Choice = 'est' | 'now' | 'custom';
const th = 'px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-steel';

/** Sale voucher: one estimate, laid out like a voucher. Check the items and prices, take the payment, and it becomes a sale. */
export default function Convert() {
  const { id } = useParams<{ id: string }>(); const router = useRouter(); const d = useStore(); const pm = useProductMap();
  const est = d.bills.find((b) => b.id === id && b.kind === 'estimate');
  const [choice, setChoice] = useState<Record<string, Choice>>({}); const [custom, setCustom] = useState<Record<string, string>>({});
  const [skip, setSkip] = useState<Record<string, boolean>>({}); const [alloc, setAlloc] = useState<Record<string, number[]>>({});
  const [mode, setMode] = useState<'cash' | 'online' | 'split'>('cash'); const [cashPart, setCashPart] = useState(0);
  const [trTick, setTrTick] = useState<boolean | null>(null);
  const [err, setErr] = useState<string | null>(null); const [done, setDone] = useState<{ no: string; total: number; points: number; code: string } | null>(null);
  const allocOf = (pid: string, qty: number) => alloc[pid] ?? autoAlloc(pm.get(pid)!, qty);

  const rows = useMemo(() => (est?.lines ?? []).map((l) => {
    const p = pm.get(l.pid)!; const now = p.prices[est!.tier]; const changed = now !== l.price; const c: Choice | undefined = changed ? choice[l.pid] : 'est';
    const price = c === 'now' ? now : c === 'custom' ? +(custom[l.pid] || 0) : l.price;
    return { l, p, now, changed, c, price, on: !skip[l.pid] };
  }), [est, pm, choice, custom, skip]);
  const kept = rows.filter((r) => r.on); const trAmt = est ? (est.transport || d.settings.transport || 0) : 0; const trOn = trTick ?? (!!est?.transport); const trCharge = trOn ? Math.round(trAmt) : 0; const goods = kept.reduce((t, r) => t + r.l.qty * r.price, 0); const total = goods + trCharge; const cost = kept.reduce((t, r) => t + r.l.qty * r.p.pp, 0);
  const unresolved = kept.filter((r) => r.changed && !r.c).length; const badPrice = kept.some((r) => !(r.price > 0));
  const stockBad = kept.some((r) => r.l.qty > stockTotal(r.p)); const allocBad = kept.some((r) => allocOf(r.l.pid, r.l.qty).reduce((a, b) => a + b, 0) !== r.l.qty);
  const payBad = mode === 'split' && (cashPart <= 0 || cashPart >= total);
  const blocker = !est ? '' : est.status !== 'open' ? 'This estimate is already converted.' : !kept.length ? 'Keep at least one item.' : unresolved ? `Choose a price for ${unresolved} changed item${unresolved > 1 ? 's' : ''}.` : badPrice ? 'Every price must be more than zero.' : stockBad ? 'Not enough stock for one item.' : allocBad ? 'Dispatch quantities must add up.' : payBad ? 'Enter the cash part of the split.' : '';

  const convert = () => {
    if (!est) return; if (blocker) { toast(blocker, 'bad'); return; }
    try {
      const online = mode === 'cash' ? 0 : mode === 'online' ? total : total - cashPart; const cash = mode === 'cash' ? total : mode === 'online' ? 0 : cashPart;
      const b = d.convertEstimate(est.id, kept.map((r) => ({ pid: r.l.pid, price: r.price, alloc: allocOf(r.l.pid, r.l.qty) })), cash, online, trCharge);
      setDone({ no: b.no, total: b.total, points: b.points, code: b.code });
    } catch (e) { setErr(errText(e)); }
  };
  useScreenKeys([{ key: 'F2', label: 'Convert to sale', run: () => { if (!done) convert(); } }, { key: 'Esc', label: 'Back', run: () => router.push('/admin/estimates'), typing: true }]);

  if (!est) return <div><Link href="/admin/estimates" className="text-[13px] underline">Back to estimates</Link><p className="mt-4 text-[13px] text-steel">Estimate not found.</p></div>;
  const staff = d.staff.find((s) => s.id === est.staffId); const cu = d.customers.find((c) => c.id === est.customerId); const exp = isExpiredEstimate(est);
  const changedN = rows.filter((r) => r.changed).length; const pts = calcPoints(goods, d.settings.pointsPer1000);

  if (done) {
    const link = `${window.location.origin}/bill/${done.code}`; const msg = `Hello, your bill ${done.no} from National Traders: ${link}`;
    return (
      <div className="max-w-xl">
        <ScreenHead title="Sale saved" hint={`${est.no} became ${done.no}`}><KBtn primary onClick={() => router.push('/admin/estimates')} k="Esc">Back to estimates</KBtn></ScreenHead>
        <Panel title="Sale">
          <Field label="Sale no"><b className="font-mono">{done.no}</b></Field><Field label="Amount"><b className="text-[16px]">{money(done.total)}</b></Field>
          <Field label="Points">{done.points} points added to {staff?.name}, who made the estimate</Field><Field label="Stock">Updated</Field>
        </Panel>
        <div className="mt-3 flex flex-wrap gap-2 text-[13px]">
          <a href={`https://wa.me/91${cu?.phone}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 font-medium text-white"><MessageCircle className="h-4 w-4" />Send bill on WhatsApp</a>
          <a href={link} target="_blank" rel="noreferrer" className="rounded-md border border-line bg-white px-4 py-2 font-medium">View bill</a>
        </div>
      </div>
    );
  }

  const mini = 'rounded border px-2 py-1 text-[12px] font-medium';
  return (
    <div className="max-w-6xl">
      <ScreenHead title={`Sale: from ${est.no}`} hint="Check the items and prices, take the payment, then press F2. Esc to quit.">
        <KBtn onClick={() => router.push('/admin/estimates')} k="Esc"><ChevronLeft className="h-4 w-4" />Back</KBtn><KBtn primary onClick={convert} k="F2">Convert to sale</KBtn>
      </ScreenHead>

      {err && <p className="mb-3 flex items-center justify-between rounded-md bg-blush-bg px-3 py-2 text-[13px] text-blush-fg">{err}<button className="underline" onClick={() => setErr(null)}>Close</button></p>}
      {est.status !== 'open' && <p className="mb-3 rounded-md bg-blush-bg px-3 py-2 text-[13px] text-blush-fg">This estimate is already converted, so it cannot be converted again.</p>}
      {est.status === 'open' && (changedN > 0
        ? <p className="mb-3 rounded-md bg-butter-bg px-3 py-2 text-[13px] text-butter-fg"><b>{changedN} of {rows.length} prices have changed since this estimate was made.</b> For each marked line, choose the price that goes on the final bill.</p>
        : <p className="mb-3 rounded-md bg-sage-bg px-3 py-2 text-[13px] text-sage-fg">No price has changed since this estimate was made.</p>)}
      {exp && est.status === 'open' && <p className="mb-3 rounded-md bg-blush-bg px-3 py-2 text-[13px] text-blush-fg">This estimate is past its validity. You can still convert it, but check the prices.</p>}

      <div className="mb-3 grid gap-3 lg:grid-cols-2">
        <Panel title="Voucher">
          <Field label="Voucher type">Sale, from estimate</Field>
          <Field label="Estimate no"><b className="font-mono">{est.no}</b></Field>
          <Field label="Made">{fmtDate(est.date)} ({timeAgo(est.date)})</Field>
          <Field label="Valid until">{est.validUntil ? fmtDate(est.validUntil) : '—'}{exp ? <span className="ml-2 text-blush-fg">expired</span> : null}</Field>
          <Field label="Salesman">{staff?.name}</Field>
        </Panel>
        <Panel title="Customer">
          <Field label="Phone"><span className="font-mono">{cu?.phone ?? '—'}</span></Field>
          <Field label="Name">{cu?.name || '—'}</Field>
          <Field label="Price list">{TIER_NAMES[est.tier]}</Field>
          <Field label="Points">{pts} will go to {staff?.name}</Field>
        </Panel>
      </div>

      <div className="overflow-x-auto rounded-md border border-line bg-white">
        <table className="w-full min-w-[860px] border-collapse text-[13px]">
          <thead className="bg-paper"><tr className="border-b border-line text-left"><th className={th + ' w-8'}>#</th><th className={th}>Item</th><th className={th + ' text-right'}>Qty</th><th className={th + ' text-right'}>In stock</th><th className={th + ' text-right'}>Quoted</th><th className={th + ' text-right'}>Today</th><th className={th}>Sale price</th><th className={th + ' text-right'}>Amount</th><th className={th + ' text-center'}>Not taking</th></tr></thead>
          <tbody>{rows.map(({ l, p, now, changed, c, price, on }, i) => {
            const al = allocOf(l.pid, l.qty); const profit = l.qty * (price - p.pp);
            return (
              <tr key={l.pid} className={`border-b border-line/70 align-top ${!on ? 'bg-paper text-steel opacity-60' : changed ? 'bg-butter-bg/30' : ''}`}>
                <td className="px-2.5 py-2 text-steel">{i + 1}</td>
                <td className="px-2.5 py-2"><div className="font-medium">{p.name}</div><div className="text-[11.5px] text-steel"><span className="font-mono">{p.sku}</span> · {p.cat}{p.sub ? ' › ' + p.sub : ''}</div>
                  {on && l.qty > stockTotal(p) && <div className="mt-0.5 text-[12px] font-medium text-blush-fg">Only {stockTotal(p)} in stock, {l.qty} needed.</div>}
                  {on && (needsPicker(p) ? (
                    <div className="mt-1.5 rounded bg-paper px-2 py-1.5"><div className="mb-1 text-[11.5px] font-medium text-steel">Send from (stock is in several places)</div>
                      <div className="flex flex-wrap gap-2">{LOCS.map((n, j) => <label key={n} className="text-[11.5px] text-steel">{n} <span>({p.stock[j]})</span>
                        <input type="number" min={0} max={p.stock[j]} disabled={p.stock[j] === 0} value={al[j]} aria-label={`Send ${p.name} from ${n}`} onChange={(e) => setAlloc({ ...alloc, [l.pid]: al.map((a, k) => (k === j ? Math.max(0, +e.target.value) : a)) })} className="ml-1 !w-16 !rounded !px-1.5 !py-0.5 text-center text-[12.5px] text-ink" /></label>)}</div>
                      {al.reduce((a, b) => a + b, 0) !== l.qty && <div className="mt-1 text-[11.5px] text-blush-fg">Must add up to {l.qty}</div>}</div>
                  ) : <div className="mt-0.5 text-[11.5px] text-steel">Sent from {LOCS[p.stock.findIndex((s) => s > 0)] ?? '—'}</div>)}
                </td>
                <td className="px-2.5 py-2 text-right tabular-nums">{qtyText(l.qty, p.unit, l.pack)}</td>
                <td className="px-2.5 py-2 text-right tabular-nums">{packBreakdown(stockTotal(p), p.unit, p.packs)}</td>
                <td className="px-2.5 py-2 text-right tabular-nums">{money(l.price)}</td>
                <td className={`px-2.5 py-2 text-right tabular-nums ${changed ? 'font-semibold' : ''}`}>{money(now)}{changed && <div className={`text-[11px] font-medium ${now > l.price ? 'text-blush-fg' : 'text-good'}`}>{now > l.price ? '▲' : '▼'} {money(Math.abs(now - l.price))}</div>}</td>
                <td className="px-2.5 py-2">{!on ? <span className="text-steel">—</span> : changed ? (
                  <div className="space-y-1">
                    <div className="flex gap-1">{([['est', 'Quoted'], ['now', 'Today']] as const).map(([k, t]) => <button key={k} type="button" aria-pressed={c === k} onClick={() => setChoice({ ...choice, [l.pid]: k })} className={`${mini} ${c === k ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:bg-paper'}`}>{t}</button>)}</div>
                    <input type="number" inputMode="numeric" placeholder="Other price" aria-label={`Another price for ${p.name}`} value={custom[l.pid] ?? ''} onFocus={() => setChoice({ ...choice, [l.pid]: 'custom' })} onChange={(e) => { setCustom({ ...custom, [l.pid]: e.target.value }); setChoice({ ...choice, [l.pid]: 'custom' }); }} className={`!w-28 !rounded !px-2 !py-1 text-right text-[12.5px] ${c === 'custom' ? '!border-ink' : ''}`} />
                    {!c && <div className="text-[11.5px] font-medium text-butter-fg">Choose a price</div>}
                  </div>) : <span className="tabular-nums">{money(l.price)} <span className="text-[11.5px] text-steel">(unchanged)</span></span>}</td>
                <td className="px-2.5 py-2 text-right tabular-nums"><div className="font-semibold">{on && price > 0 ? money(l.qty * price) : '—'}</div>{on && price > 0 && profit < 0 && <div className="text-[11px] font-medium text-blush-fg">loses {money(-profit)}</div>}</td>
                <td className="px-2.5 py-2 text-center"><input type="checkbox" aria-label={`Customer is not taking ${p.name}`} checked={!on} onChange={(e) => setSkip({ ...skip, [l.pid]: e.target.checked })} className="!h-4 !w-4" /></td>
              </tr>);
          })}</tbody>
          <tfoot>{trCharge > 0 && <tr className="bg-paper"><td colSpan={7} className="px-2.5 py-1.5 text-right text-[12px] font-semibold uppercase tracking-wide text-steel">Transport charges</td><td className="px-2.5 py-1.5 text-right tabular-nums">{money(trCharge)}</td><td /></tr>}<tr className="bg-paper"><td colSpan={7} className="px-2.5 py-2 text-right text-[12px] font-semibold uppercase tracking-wide text-steel">Bill total{total !== est.total ? ` (estimate said ${money(est.total)})` : ''}</td><td className="px-2.5 py-2 text-right text-[16px] font-semibold tabular-nums">{money(total)}</td><td /></tr></tfoot>
        </table>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Panel title="Payment">
          <div className="flex flex-wrap items-center gap-2 py-1.5">{(['cash', 'online', 'split'] as const).map((m) => <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={`rounded border px-3 py-1 text-[13px] font-medium capitalize ${mode === m ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:bg-paper'}`}>{m}</button>)}
            {mode === 'split' && <span className="flex items-center gap-2 text-[13px]">Cash <input type="number" aria-label="Cash part" className="!w-28 !rounded !px-2 !py-1" value={cashPart || ''} onChange={(e) => setCashPart(Math.min(total, +e.target.value))} /> Online <b>{money(total - cashPart)}</b></span>}</div>
          <p className="pb-1 text-[11.5px] text-steel">Stock is reduced and points are credited when you convert. A converted estimate cannot be converted again.</p>
        </Panel>
        <Panel title="Totals">
          {trAmt > 0 && <Field label="Transport"><label className="flex items-center gap-2"><input type="checkbox" aria-label="Add transport charge" className="!h-4 !w-4" checked={trOn} onChange={(e) => setTrTick(e.target.checked)} />Add transport charge {money(trAmt)}</label></Field>}
          <Field label="Bill total"><b className="text-[16px]">{money(total)}</b></Field>
          <Field label="Profit">At latest purchase prices: <b className={goods - cost < 0 ? 'text-blush-fg' : 'text-good'}>{money(goods - cost)}</b></Field>
          <Field label="Points">{pts} to {staff?.name}</Field>
          {blocker && est.status === 'open' && <p className="py-1.5 text-[12.5px] font-medium text-butter-fg">{blocker}</p>}
        </Panel>
      </div>
    </div>
  );
}