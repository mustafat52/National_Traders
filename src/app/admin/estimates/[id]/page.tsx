'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CheckCircle2, MessageCircle } from 'lucide-react';
import { useStore, useProductMap } from '@/lib/store';
import { LOCS, TIER_NAMES } from '@/lib/types';
import { autoAlloc, calcPoints, fmtDate, isExpiredEstimate, money, needsPicker, stockTotal } from '@/lib/rules';
import { timeAgo } from '@/lib/time';
import { emojiFor } from '@/lib/categories';
import { Avatar, Banner, card, errText } from '@/components/StaffBits';
import { Pill } from '@/components/ReportBits';
import { Rupee } from '@/components/Rupee';

type Choice = 'est' | 'now' | 'custom';
export default function Convert() {
  const { id } = useParams<{ id: string }>(); const d = useStore(); const pm = useProductMap();
  const est = d.bills.find((b) => b.id === id && b.kind === 'estimate');
  const [choice, setChoice] = useState<Record<string, Choice>>({}); const [custom, setCustom] = useState<Record<string, string>>({});
  const [skip, setSkip] = useState<Record<string, boolean>>({}); const [alloc, setAlloc] = useState<Record<string, number[]>>({});
  const [mode, setMode] = useState<'cash' | 'online' | 'split'>('cash'); const [cashPart, setCashPart] = useState(0);
  const [err, setErr] = useState<string | null>(null); const [done, setDone] = useState<{ no: string; total: number; points: number; code: string } | null>(null);
  const allocOf = (pid: string, qty: number) => alloc[pid] ?? autoAlloc(pm.get(pid)!, qty);

  const rows = useMemo(() => (est?.lines ?? []).map((l) => {
    const p = pm.get(l.pid)!; const now = p.prices[est!.tier]; const changed = now !== l.price; const c: Choice | undefined = changed ? choice[l.pid] : 'est';
    const price = c === 'now' ? now : c === 'custom' ? +(custom[l.pid] || 0) : l.price;
    return { l, p, now, changed, c, price, on: !skip[l.pid] };
  }), [est, pm, choice, custom, skip]);
  if (!est) return <div className="mx-auto max-w-xl"><Link href="/admin/estimates" className="text-sm text-steel underline">Back to estimates</Link><p className="mt-6 text-steel">Estimate not found.</p></div>;

  const kept = rows.filter((r) => r.on); const total = kept.reduce((t, r) => t + r.l.qty * r.price, 0); const cost = kept.reduce((t, r) => t + r.l.qty * r.p.pp, 0);
  const unresolved = kept.filter((r) => r.changed && !r.c).length; const badPrice = kept.some((r) => !(r.price > 0));
  const stockBad = kept.some((r) => r.l.qty > stockTotal(r.p)); const allocBad = kept.some((r) => allocOf(r.l.pid, r.l.qty).reduce((a, b) => a + b, 0) !== r.l.qty);
  const payBad = mode === 'split' && (cashPart <= 0 || cashPart >= total); const staff = d.staff.find((s) => s.id === est.staffId); const cu = d.customers.find((c) => c.id === est.customerId);
  const exp = isExpiredEstimate(est); const changedN = rows.filter((r) => r.changed).length; const pts = calcPoints(total, d.settings.pointsPer1000);
  const blocker = est.status !== 'open' ? 'This estimate is already converted.' : !kept.length ? 'Keep at least one item.' : unresolved ? `Choose a price for ${unresolved} changed item${unresolved > 1 ? 's' : ''}.` : badPrice ? 'Every price must be more than zero.' : stockBad ? 'Not enough stock for one item.' : allocBad ? 'Dispatch quantities must add up.' : payBad ? 'Enter the cash part of the split.' : '';

  const convert = () => {
    try {
      const online = mode === 'cash' ? 0 : mode === 'online' ? total : total - cashPart; const cash = mode === 'cash' ? total : mode === 'online' ? 0 : cashPart;
      const b = d.convertEstimate(est.id, kept.map((r) => ({ pid: r.l.pid, price: r.price, alloc: allocOf(r.l.pid, r.l.qty) })), cash, online);
      setDone({ no: b.no, total: b.total, points: b.points, code: b.code });
    } catch (e) { setErr(errText(e)); }
  };

  if (done) {
    const link = `${window.location.origin}/bill/${done.code}`; const msg = `Hello, your bill ${done.no} from National Traders: ${link}`;
    return (
      <div className="mx-auto max-w-xl space-y-4 pt-8 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-brand" />
        <h1 className="font-display text-3xl font-semibold">Converted to a sale</h1>
        <div className={`${card} p-6`}><div className="text-sm text-steel">{est.no} became {done.no}</div><div className="font-display text-5xl font-semibold text-brand"><Rupee v={done.total} /></div>
          <p className="mt-3 rounded-xl bg-sage-bg px-4 py-3 text-sm text-sage-fg"><b>{done.points} points</b> were added to {staff?.name}, who made the estimate. Stock has been updated.</p></div>
        <a href={`https://wa.me/91${cu?.phone}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-medium text-white"><MessageCircle className="h-5 w-5" />Send bill on WhatsApp</a>
        <div className="flex justify-center gap-3 text-sm"><Link href="/admin/estimates" className="rounded-xl border border-line bg-white px-5 py-2.5 font-medium">Back to estimates</Link><a href={link} target="_blank" rel="noreferrer" className="rounded-xl border border-line bg-white px-5 py-2.5 font-medium">View bill</a></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <Link href="/admin/estimates" className="mb-3 inline-flex items-center gap-1.5 text-sm text-steel hover:text-ink"><ArrowLeft className="h-4 w-4" />All estimates</Link>
      <div className="mb-5 flex flex-wrap items-center gap-4">
        <Avatar staff={d.staff} id={est.staffId} size="lg" />
        <div className="flex-1"><h1 className="font-display text-[34px] font-semibold leading-none">{est.no}</h1>
          <p className="mt-1 text-steel">Made by <b className="text-ink">{staff?.name}</b> · {timeAgo(est.date)} on {fmtDate(est.date)} · {cu?.phone} · {TIER_NAMES[est.tier]}</p></div>
        {exp ? <Pill tone="blush">Expired on {fmtDate(est.validUntil!)}</Pill> : <Pill tone="sage">Valid until {fmtDate(est.validUntil!)}</Pill>}
      </div>
      {est.status !== 'open' && <Banner msg={{ ok: false, text: 'This estimate is already converted, so it cannot be converted again.' }} />}
      {est.status === 'open' && (changedN > 0
        ? <div className="mb-4 flex items-start gap-3 rounded-2xl bg-butter-bg px-5 py-4 text-butter-fg"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div><b>{changedN} of {rows.length} prices have changed since this estimate was made.</b> They are marked below. Choose, for each one, the price that goes on the final bill.</div></div>
        : <div className="mb-4 rounded-2xl bg-sage-bg px-5 py-3 text-sm text-sage-fg">No price has changed since this estimate was made.</div>)}
      {exp && <div className="mb-4 rounded-2xl bg-blush-bg px-5 py-3 text-sm text-blush-fg">This estimate is past its validity. You can still convert it, but the customer was quoted a while ago, so check the prices.</div>}
      <Banner msg={err ? { ok: false, text: err } : null} onClose={() => setErr(null)} />

      <div className="space-y-4">{rows.map(({ l, p, now, changed, c, price, on }) => {
        const diff = now - l.price; const al = allocOf(l.pid, l.qty); const profit = l.qty * (price - p.pp);
        return (
          <div key={l.pid} className={`rounded-[22px] border p-5 ${!on ? 'border-line bg-paper opacity-60' : changed ? 'border-butter-fg/40 bg-white ring-2 ring-butter-bg' : 'border-line bg-white'}`}>
            <div className="flex flex-wrap items-start gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-paper text-xl">{emojiFor(p.cat)}</span>
              <div className="min-w-0 flex-1"><div className="font-display text-lg font-semibold leading-6">{p.name}</div><div className="text-sm text-steel">{l.qty} {p.unit} · {p.sku} · in stock {stockTotal(p)} ({p.stock.join(' / ')})</div></div>
              <label className="flex items-center gap-2 text-sm text-steel"><input type="checkbox" checked={!on} onChange={(e) => setSkip({ ...skip, [l.pid]: e.target.checked })} className="!h-4 !w-4" />Customer is not taking this</label>
            </div>
            {on && (<>
              {changed ? (
                <div className="mt-4">
                  <div className="mb-2 flex items-center gap-2 text-sm"><Pill tone={diff > 0 ? 'blush' : 'sage'}>{diff > 0 ? 'Price went up' : 'Price came down'}</Pill><span className="text-steel">by {money(Math.abs(diff))} ({Math.abs(Math.round((diff / l.price) * 100))}%) since {fmtDate(est.date)}</span></div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {([['est', 'Keep estimate price', l.price, `quoted ${fmtDate(est.date)}`], ['now', "Use today's price", now, 'current price list']] as const).map(([k, t, v, sub]) => (
                      <button key={k} onClick={() => setChoice({ ...choice, [l.pid]: k })} className={`rounded-2xl border-2 p-3 text-left transition ${c === k ? 'border-brand bg-sage-bg' : 'border-line hover:bg-paper'}`}><div className="text-xs text-steel">{t}</div><div className="font-display text-2xl font-semibold"><Rupee v={v} /></div><div className="text-xs text-steel">{sub}</div></button>))}
                    <div className={`rounded-2xl border-2 p-3 transition ${c === 'custom' ? 'border-brand bg-sage-bg' : 'border-line'}`}><div className="text-xs text-steel">Another price</div>
                      <input type="number" inputMode="numeric" placeholder="Type a price" value={custom[l.pid] ?? ''} onFocus={() => setChoice({ ...choice, [l.pid]: 'custom' })} onChange={(e) => { setCustom({ ...custom, [l.pid]: e.target.value }); setChoice({ ...choice, [l.pid]: 'custom' }); }} className="mt-1 w-full !rounded-xl" aria-label="Another price" /></div>
                  </div>
                  {!c && <p className="mt-2 text-sm font-medium text-butter-fg">Choose a price to continue.</p>}
                </div>
              ) : <p className="mt-3 text-sm text-steel">Price unchanged at <b className="text-ink">{money(l.price)}</b>.</p>}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-steel">Latest purchase price {money(p.pp)} · {price > 0 ? (profit < 0 ? <b className="text-blush-fg">this line loses {money(-profit)}</b> : <>earns <b className="text-sage-fg">{money(profit)}</b> ({Math.round((profit / (l.qty * price)) * 100)}%)</>) : 'enter a price'}</span>
                <span className="font-display text-xl font-semibold"><Rupee v={l.qty * price} /></span>
              </div>
              {l.qty > stockTotal(p) && <p className="mt-2 text-sm font-medium text-blush-fg">Only {stockTotal(p)} in stock, {l.qty} needed.</p>}
              {needsPicker(p) ? (
                <div className="mt-3 rounded-2xl bg-sage-bg/60 p-3"><div className="mb-2 text-sm font-medium text-sage-fg">Send from (this item is in several places)</div>
                  <div className="grid grid-cols-3 gap-2">{LOCS.map((n, i) => <label key={n} className="text-center text-xs text-steel">{n}<span className="block">available {p.stock[i]}</span>
                    <input type="number" min={0} max={p.stock[i]} disabled={p.stock[i] === 0} value={al[i]} onChange={(e) => setAlloc({ ...alloc, [l.pid]: al.map((a, j) => (j === i ? Math.max(0, +e.target.value) : a)) })} className="mt-1 w-full text-center" /></label>)}</div>
                  {al.reduce((a, b) => a + b, 0) !== l.qty && <p className="mt-1 text-xs text-blush-fg">Must add up to {l.qty}</p>}</div>
              ) : <p className="mt-2 text-xs text-steel">Sent from {LOCS[p.stock.findIndex((s) => s > 0)] ?? '-'} automatically.</p>}
            </>)}
          </div>);
      })}</div>

      <div className={`${card} mt-5 p-5`}>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-sm text-steel">Final bill total {total !== est.total && <span>(estimate said {money(est.total)})</span>}</div><div className="font-display text-4xl font-semibold text-brand"><Rupee v={total} /></div>
          <div className="text-sm text-steel">Profit at latest purchase prices: <b className={total - cost < 0 ? 'text-blush-fg' : 'text-sage-fg'}>{money(total - cost)}</b></div></div>
          <div className="rounded-2xl bg-sage-bg px-4 py-3 text-sm text-sage-fg"><b>{pts} points</b> will go to {staff?.name}</div></div>
        <div className="mt-4 text-sm font-medium">How did the customer pay?</div>
        <div className="mt-2 flex flex-wrap items-center gap-2">{(['cash', 'online', 'split'] as const).map((m) => <button key={m} onClick={() => setMode(m)} className={`rounded-xl border px-5 py-2 text-sm font-medium capitalize ${mode === m ? 'border-brand bg-brand text-white' : 'border-line bg-white'}`}>{m}</button>)}
          {mode === 'split' && <span className="flex items-center gap-2 text-sm">Cash <input type="number" className="w-28" value={cashPart || ''} onChange={(e) => setCashPart(Math.min(total, +e.target.value))} /> Online <b>{money(total - cashPart)}</b></span>}</div>
        <div className="mt-4 flex flex-wrap items-center gap-3"><button disabled={!!blocker} onClick={convert} className="rounded-xl bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-light disabled:opacity-50">Payment received: convert to sale</button>
          {blocker && est.status === 'open' && <span className="text-sm text-butter-fg">{blocker}</span>}</div>
        <p className="mt-3 text-xs text-steel">Stock is reduced and points are credited when you convert. A converted estimate cannot be converted again.</p>
      </div>
    </div>
  );
}