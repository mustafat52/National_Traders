'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, MessageCircle, Minus, Plus, Trash2 } from 'lucide-react';
import { useStore, useProductMap } from '@/lib/store';
import { LOCS, Product, TIER_NAMES } from '@/lib/types';
import { autoAlloc, fmtDate, money, needsPicker, repeatHit, stockTotal } from '@/lib/rules';
import { Badge, Btn, Card, ProductPicker, Scanner, cx } from '@/components/ui';

interface L { pid: string; qty: number; alloc: number[] }

export default function NewBill() {
  const d = useStore(); const pm = useProductMap(); const router = useRouter(); const me = d.session!.staffId;
  const [phone, setPhone] = useState(''); const [tier, setTier] = useState<number | null>(null);
  const [lines, setLines] = useState<L[]>([]); const [scan, setScan] = useState(false);
  const [pay, setPay] = useState(false); const [mode, setMode] = useState<'cash' | 'online' | 'split'>('cash'); const [cashPart, setCashPart] = useState(0);
  const [done, setDone] = useState<{ no: string; kind: string; total: number; points: number; code: string } | null>(null);
  const [fromEst, setFromEst] = useState<string | undefined>(); const [notes, setNotes] = useState<string[]>([]);
  const valid = /^\d{10}$/.test(phone);
  const cust = valid ? d.customers.find((c) => c.phone === phone) : undefined;
  const t = tier ?? cust?.tier ?? null;
  const price = (pid: string) => pm.get(pid)!.prices[t ?? 0];
  const total = lines.reduce((a, l) => a + l.qty * price(l.pid), 0);

  // Converting a saved estimate: load its items with prices refreshed to today's price list.
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return; loaded.current = true;
    const c = useStore.getState().convert; if (!c) return;
    const est = useStore.getState().bills.find((b) => b.id === c.estimateId); useStore.getState().startConvert(null); if (!est) return;
    const cu = useStore.getState().customers.find((x) => x.id === est.customerId)!;
    setPhone(cu.phone); setTier(est.tier); setFromEst(est.id);
    const ns: string[] = []; const ls: L[] = [];
    est.lines.forEach((l) => { const p = pm.get(l.pid)!; const now = p.prices[est.tier];
      if (now !== l.price) ns.push(`${p.name}: estimate price ${money(l.price)} → today ${money(now)}`);
      ls.push({ pid: l.pid, qty: l.qty, alloc: autoAlloc(p, l.qty) }); });
    setLines(ls); setNotes(ns);
  }, [pm]);

  const add = (p: Product) => setLines((ls) => ls.some((x) => x.pid === p.id) ? ls : [...ls, { pid: p.id, qty: 1, alloc: autoAlloc(p, 1) }]);
  const setQty = (pid: string, q: number) => setLines((ls) => ls.map((l) => (l.pid === pid ? { ...l, qty: Math.max(1, q), alloc: autoAlloc(pm.get(pid)!, Math.max(1, q)) } : l)));
  const setAlloc = (pid: string, i: number, v: number) => setLines((ls) => ls.map((l) => (l.pid === pid ? { ...l, alloc: l.alloc.map((a, j) => (j === i ? Math.max(0, v) : a)) } : l)));
  const shortage = lines.some((l) => l.qty > stockTotal(pm.get(l.pid)!));
  const allocBad = lines.some((l) => l.alloc.reduce((a, b) => a + b, 0) !== l.qty);
  const ready = valid && t !== null && lines.length > 0;

  const save = (kind: 'estimate' | 'quotation') => {
    try {
      const cid = d.upsertCustomer(phone, t!);
      const online = mode === 'cash' ? 0 : mode === 'online' ? total : total - cashPart;
      const cash = kind === 'estimate' ? 0 : mode === 'cash' ? total : mode === 'online' ? 0 : cashPart;
      const b = d.saveBill(kind, { staffId: me, customerId: cid, tier: t!, fromEstimate: fromEst, cash, online: kind === 'estimate' ? 0 : online,
        lines: lines.map((l) => ({ pid: l.pid, qty: l.qty, price: price(l.pid), alloc: kind === 'quotation' ? l.alloc : [0, 0, 0] })) });
      setPay(false); setDone({ no: b.no, kind: b.kind, total: b.total, points: b.points, code: b.code });
    } catch (e) { alert((e as Error).message); }
  };

  if (done) {
    const link = `${window.location.origin}/bill/${done.code}`;
    const msg = `Hello, your ${done.kind === 'estimate' ? 'estimate' : 'bill'} ${done.no} from National Traders: ${link}`;
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto mt-6 h-14 w-14 text-emerald-500" />
        <div className="text-xl font-bold">{done.kind === 'estimate' ? 'Estimate saved' : 'Payment recorded · Sale complete'}</div>
        <Card><div className="text-sm text-slate-500">{done.no}</div><div className="text-3xl font-bold text-brand">{money(done.total)}</div>
          {done.kind === 'quotation' && <div className="mt-1 text-sm text-emerald-700">You earned {done.points} points. Stock updated.</div>}
          <p className="mt-2 text-xs text-slate-400">The amount is shown only now. Your history will show points only.</p></Card>
        <a href={`https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 font-medium text-white"><MessageCircle className="h-5 w-5" />Send on WhatsApp</a>
        <a href={link} target="_blank" rel="noreferrer" className="block text-sm text-brand underline">Preview customer bill page</a>
        <Btn variant="outline" className="w-full" onClick={() => router.push('/staff')}>Done</Btn>
        <Btn className="w-full" onClick={() => { setDone(null); setPhone(''); setTier(null); setLines([]); setFromEst(undefined); setNotes([]); }}>Start new bill</Btn>
      </div>
    );
  }
  return (
    <div className="space-y-4 pb-28">
      <Card className="space-y-3">
        <div className="text-sm font-semibold">1. Customer</div>
        <input inputMode="numeric" maxLength={10} className="w-full text-lg tracking-wider" placeholder="Customer phone (10 digits)" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} />
        {valid && (cust ? <div className="rounded-lg bg-sky-50 p-2 text-sm text-sky-800">Returning customer{cust.name ? `: ${cust.name}` : ''}. Saved category pre-selected.</div> : <div className="rounded-lg bg-slate-100 p-2 text-sm">New customer. Choose a category below.</div>)}
        <div className="grid grid-cols-4 gap-2">{TIER_NAMES.map((n, i) => <button key={n} onClick={() => setTier(i)} className={cx('rounded-lg border py-2 text-sm font-semibold', t === i ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white')}>{n.slice(-1)}</button>)}</div>
        <p className="text-xs text-slate-400">Category decides the price list. The customer does not see this screen.</p>
      </Card>
      {notes.length > 0 && <Card className="border-amber-300 bg-amber-50 text-xs text-amber-900"><b>Prices refreshed from the estimate:</b>{notes.map((n) => <div key={n}>{n}</div>)}</Card>}
      <Card className="space-y-3">
        <div className="text-sm font-semibold">2. Items</div>
        <ProductPicker onPick={add} onScan={() => setScan(true)} />
        <Btn variant="ghost" className="w-full !py-1 text-xs text-slate-500" onClick={() => { const c = d.products.filter((p) => stockTotal(p) > 5); add(c[Math.floor(Math.random() * c.length)]); }}>Demo scan (adds a random product)</Btn>
        {lines.map((l) => {
          const p = pm.get(l.pid)!; const rep = cust ? repeatHit(d.bills, cust.id, p.id, d.settings.repeatDays) : null; const multi = needsPicker(p);
          return (
            <div key={l.pid} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-2"><div><div className="text-sm font-semibold">{p.name}</div><div className="text-xs text-slate-500">{money(price(l.pid))} / {p.unit} · stock {stockTotal(p)}</div></div>
                <button onClick={() => setLines(lines.filter((x) => x.pid !== l.pid))}><Trash2 className="h-4 w-4 text-red-500" /></button></div>
              {rep && <div className="mt-2 flex gap-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900"><AlertTriangle className="h-4 w-4 shrink-0" /><span>Bought by this customer on <b>{fmtDate(rep.date)}</b> at <b>{money(rep.price)}</b> ({rep.qty} {p.unit}).</span></div>}
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2"><Btn variant="outline" className="!p-1.5" onClick={() => setQty(l.pid, l.qty - 1)}><Minus className="h-4 w-4" /></Btn>
                  <input type="number" className="w-16 text-center" value={l.qty} onChange={(e) => setQty(l.pid, +e.target.value || 1)} /><Btn variant="outline" className="!p-1.5" onClick={() => setQty(l.pid, l.qty + 1)}><Plus className="h-4 w-4" /></Btn></div>
                <div className="font-semibold">{money(l.qty * price(l.pid))}</div>
              </div>
              {l.qty > stockTotal(p) && <div className="mt-2 text-xs font-medium text-red-600">Not enough stock (only {stockTotal(p)} available)</div>}
              {multi ? (
                <div className="mt-2 rounded-lg bg-brand-soft p-2"><div className="mb-1 text-xs font-semibold text-brand">Dispatch from (stock in several places)</div>
                  <div className="grid grid-cols-3 gap-2">{LOCS.map((n, i) => <label key={n} className="text-center text-[11px] text-slate-600">{n}<span className="block text-slate-400">avail {p.stock[i]}</span>
                    <input type="number" min={0} max={p.stock[i]} disabled={p.stock[i] === 0} className="mt-0.5 w-full text-center" value={l.alloc[i]} onChange={(e) => setAlloc(l.pid, i, +e.target.value)} /></label>)}</div>
                  {l.alloc.reduce((a, b) => a + b, 0) !== l.qty && <div className="mt-1 text-xs text-red-600">Quantities must add up to {l.qty}</div>}</div>
              ) : <div className="mt-2 text-xs text-slate-500">Dispatch: {LOCS[p.stock.findIndex((s) => s > 0)] ?? '-'} (automatic)</div>}
            </div>
          );
        })}
      </Card>
      <div className="fixed bottom-14 left-1/2 z-20 w-full max-w-md -translate-x-1/2 border-t border-slate-200 bg-white p-3">
        <div className="mb-2 flex items-center justify-between"><span className="text-sm text-slate-500">Total {t === null && <Badge tone="amber">pick category</Badge>}</span><b className="text-xl text-brand">{money(total)}</b></div>
        <div className="grid grid-cols-2 gap-2"><Btn variant="outline" disabled={!ready} onClick={() => save('estimate')}>Save estimate</Btn><Btn disabled={!ready || shortage || allocBad} onClick={() => { setCashPart(0); setMode('cash'); setPay(true); }}>Take payment</Btn></div>
      </div>
      {pay && <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50"><div className="w-full max-w-md space-y-3 rounded-t-2xl bg-white p-5">
        <div className="text-lg font-bold">Payment · {money(total)}</div>
        <div className="grid grid-cols-3 gap-2">{(['cash', 'online', 'split'] as const).map((m) => <button key={m} onClick={() => setMode(m)} className={cx('rounded-lg border py-2 text-sm font-medium capitalize', mode === m ? 'border-brand bg-brand text-white' : 'border-slate-300')}>{m}</button>)}</div>
        {mode === 'split' && <div className="grid grid-cols-2 gap-2 text-sm"><label>Cash<input type="number" className="mt-1 w-full" value={cashPart || ''} onChange={(e) => setCashPart(Math.min(total, +e.target.value))} /></label><label>Online<input disabled className="mt-1 w-full bg-slate-100" value={total - cashPart} /></label></div>}
        <p className="text-xs text-slate-500">The sale is approved and stock is reduced only when you confirm that payment has arrived.</p>
        <div className="grid grid-cols-2 gap-2"><Btn variant="outline" onClick={() => setPay(false)}>Cancel</Btn><Btn disabled={mode === 'split' && (cashPart <= 0 || cashPart >= total)} onClick={() => save('quotation')}>Payment received</Btn></div>
      </div></div>}
      {scan && <Scanner onClose={() => setScan(false)} onScan={(txt) => { const p = d.products.find((x) => x.sku === txt); setScan(false); if (p) add(p); else alert('Unknown QR: ' + txt); }} />}
    </div>
  );
}
