'use client';
import { useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useStore, useProductMap } from '@/lib/store';
import { LOCS } from '@/lib/types';
import { fmtDate, money } from '@/lib/rules';
import { returnedQty } from '@/lib/selectors';
import { Badge, Btn, Card, cx } from '@/components/ui';

export default function Returns() {
  const d = useStore(); const pm = useProductMap(); const me = d.session!.staffId;
  const [q, setQ] = useState(''); const [billId, setBillId] = useState(''); const [kind, setKind] = useState<'sales' | 'damage'>('sales');
  const [qty, setQty] = useState<Record<string, number>>({}); const [loc, setLoc] = useState(0); const [mode, setMode] = useState<'cash' | 'online' | 'split'>('cash'); const [cashPart, setCashPart] = useState(0);
  const [msg, setMsg] = useState('');
  const found = useMemo(() => { const t = q.trim().toLowerCase(); if (t.length < 3) return []; return d.bills.filter((b) => b.kind === 'quotation' && (b.no.toLowerCase().includes(t) || (d.customers.find((c) => c.id === b.customerId)?.phone ?? '').includes(t))).slice(0, 6); }, [q, d.bills, d.customers]);
  const bill = d.bills.find((b) => b.id === billId);
  const amount = bill ? bill.lines.reduce((a, l) => a + (qty[l.pid] || 0) * l.price, 0) : 0;
  const submit = () => {
    try {
      d.processReturn({ kind, billId, staffId: me, lines: bill!.lines.map((l) => ({ pid: l.pid, qty: qty[l.pid] || 0, loc })), cash: mode === 'cash' ? amount : mode === 'online' ? 0 : cashPart, online: mode === 'cash' ? 0 : mode === 'online' ? amount : amount - cashPart });
      setMsg(`${kind === 'sales' ? 'Sales' : 'Damage'} return recorded. Refund ${money(amount)}.`); setBillId(''); setQty({}); setQ('');
    } catch (e) { alert((e as Error).message); }
  };
  if (msg) return <div className="mt-8 space-y-4 text-center"><CheckCircle2 className="mx-auto h-14 w-14 text-emerald-500" /><div className="text-lg font-bold">{msg}</div><Btn onClick={() => setMsg('')}>New return</Btn></div>;
  return (
    <div className="space-y-4 pb-6">
      <Card className="space-y-2"><div className="text-sm font-semibold">Find the original bill</div><input className="w-full" placeholder="Bill number (QUO-0012) or customer phone" value={q} onChange={(e) => { setQ(e.target.value); setBillId(''); }} />
        {!billId && found.map((b) => <button key={b.id} className="block w-full rounded-lg border border-slate-200 p-2 text-left text-sm hover:bg-brand-soft" onClick={() => { setBillId(b.id); setQty({}); }}><b>{b.no}</b> · {fmtDate(b.date)} · {d.customers.find((c) => c.id === b.customerId)?.phone}</button>)}</Card>
      {bill && <>
        <Card className="space-y-2"><div className="text-sm font-semibold">Return type</div>
          <div className="grid grid-cols-2 gap-2">{([['sales', 'Sales return'], ['damage', 'Damage return']] as const).map(([k, l]) => <button key={k} onClick={() => setKind(k)} className={cx('rounded-lg border py-2 text-sm font-medium', kind === k ? 'border-brand bg-brand text-white' : 'border-slate-300')}>{l}</button>)}</div>
          <p className="text-xs text-slate-500">{kind === 'sales' ? 'Item goes back into inventory at the location you choose.' : 'Item is NOT added back. It is recorded under Damaged Stock at its purchase price.'}</p>
          {kind === 'sales' && <select className="w-full" value={loc} onChange={(e) => setLoc(+e.target.value)}>{LOCS.map((l, i) => <option key={l} value={i}>Return stock to: {l}</option>)}</select>}</Card>
        <Card className="space-y-3"><div className="text-sm font-semibold">Items on {bill.no}</div>
          {bill.lines.map((l) => { const left = l.qty - returnedQty(d, bill.id, l.pid); return <div key={l.pid} className="flex items-center justify-between gap-2 text-sm"><div><div className="font-medium">{pm.get(l.pid)?.name}</div><div className="text-xs text-slate-500">{money(l.price)} · returnable {left}</div></div>
            <input type="number" min={0} max={left} disabled={left === 0} className="w-16 text-center" value={qty[l.pid] || ''} placeholder="0" onChange={(e) => setQty({ ...qty, [l.pid]: Math.min(left, Math.max(0, +e.target.value)) })} /></div>; })}</Card>
        <Card className="space-y-2"><div className="flex items-center justify-between"><span className="text-sm font-semibold">Refund</span><Badge tone="blue">{money(amount)}</Badge></div>
          <div className="grid grid-cols-3 gap-2">{(['cash', 'online', 'split'] as const).map((m) => <button key={m} onClick={() => setMode(m)} className={cx('rounded-lg border py-2 text-sm capitalize', mode === m ? 'border-brand bg-brand text-white' : 'border-slate-300')}>{m}</button>)}</div>
          {mode === 'split' && <input type="number" className="w-full" placeholder="Cash part (rest online)" value={cashPart || ''} onChange={(e) => setCashPart(Math.min(amount, +e.target.value))} />}
          <Btn className="w-full" disabled={amount <= 0 || (mode === 'split' && (cashPart <= 0 || cashPart >= amount))} onClick={submit}>Confirm return & refund</Btn></Card>
      </>}
    </div>
  );
}
