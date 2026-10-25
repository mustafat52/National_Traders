'use client';
import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Hammer, MessageCircle, Plus, Search, Trash2, X } from 'lucide-react';
import { useStore, useProductMap, Draft } from '@/lib/store';
import { LOCS, Product, TIER_NAMES } from '@/lib/types';
import { autoAlloc, fmtDate, money, needsPicker, packBreakdown, qtyText, repeatHit, stockTotal } from '@/lib/rules';
import { Scanner } from '@/components/ui';
import { ProductSearch, EmojiTile, productPath } from '@/components/ProductSearch';
import { Stepper } from '@/components/Stepper';

const card = 'rounded-[22px] border border-line bg-white p-4';

/** The staff home screen: the billing counter. Several bills can be open at once; tabs switch between them. */
export default function Counter() {
  const d = useStore(); const pm = useProductMap(); const me = d.session!.staffId;
  const mine = d.drafts.filter((x) => x.staffId === me); const active = mine.find((x) => x.id === d.activeDraft);
  useEffect(() => {
    const s = useStore.getState(); const list = s.drafts.filter((x) => x.staffId === me);
    if (!list.length) s.newDraft(); else if (!list.some((x) => x.id === s.activeDraft)) s.setActiveDraft(list[0].id);
  }, [mine.length, d.activeDraft, me]);
  const totalOf = (x: Draft) => x.lines.reduce((t, l) => t + l.qty * (pm.get(l.pid)?.prices[x.tier ?? d.customers.find((c) => c.phone === x.phone)?.tier ?? 0] ?? 0), 0);
  return (
    <div className="space-y-3">
      <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 pb-1" role="tablist" aria-label="Open bills">
        {mine.map((x, i) => {
          const on = x.id === active?.id; const label = /^\d{10}$/.test(x.phone) ? `…${x.phone.slice(-4)}` : `Bill ${i + 1}`;
          return (
            <button key={x.id} role="tab" aria-selected={on} onClick={() => d.setActiveDraft(x.id)} className={`shrink-0 rounded-2xl px-4 py-2 text-left transition ${on ? 'bg-black text-white ring-2 ring-gold-light' : 'border border-line bg-white text-ink'}`}>
              <div className="flex items-center gap-1.5 text-sm font-semibold">{x.result && <CheckCircle2 className="h-4 w-4 text-good" />}{label}</div>
              <div className={`text-xs ${on ? 'text-gold-light' : 'text-steel'}`}>{x.result ? 'done' : x.lines.length ? `${x.lines.length} item${x.lines.length > 1 ? 's' : ''} · ${money(totalOf(x))}` : 'empty'}</div>
            </button>);
        })}
        <button onClick={() => d.newDraft()} className="flex shrink-0 items-center gap-1.5 rounded-2xl border-2 border-dashed border-gold px-4 py-2 text-sm font-semibold text-gold-deep"><Plus className="h-4 w-4" />New bill</button>
      </div>
      {mine.length > 1 && <p className="px-1 text-xs text-steel">{mine.filter((x) => !x.result).length} bills open. Tap a tab to switch; nothing is lost.</p>}
      {active && <Bill key={active.id} draft={active} pm={pm} />}
    </div>
  );
}

function Bill({ draft, pm }: { draft: Draft; pm: Map<string, Product> }) {
  const d = useStore(); const me = d.session!.staffId; const [scan, setScan] = useState(false); const [pay, setPay] = useState(false);
  const [mode, setMode] = useState<'cash' | 'online' | 'split'>('cash'); const [cashPart, setCashPart] = useState(0); const [err, setErr] = useState(''); const [edit, setEdit] = useState(false); const [kOpen, setKOpen] = useState(false);
  const search = useRef<HTMLDivElement>(null);
  const valid = /^\d{10}$/.test(draft.phone); const cust = valid ? d.customers.find((c) => c.phone === draft.phone) : undefined;
  const t = draft.tier ?? cust?.tier ?? null; const ready = valid && t !== null;
  const price = (pid: string) => pm.get(pid)!.prices[t ?? 0]; const lines = draft.lines;
  const total = lines.reduce((a, l) => a + l.qty * price(l.pid), 0);
  const patch = (p: Partial<Draft>) => d.patchDraft(draft.id, p);
  const setLines = (ls: Draft['lines']) => patch({ lines: ls });

  const add = (p: Product) => { setErr(''); setLines(lines.some((x) => x.pid === p.id) ? lines.map((l) => (l.pid === p.id ? { ...l, qty: l.qty + (l.pack?.per ?? 1), alloc: autoAlloc(p, l.qty + (l.pack?.per ?? 1)) } : l)) : [...lines, { pid: p.id, qty: 1, alloc: autoAlloc(p, 1) }]); };
  const setQty = (pid: string, q: number) => { const n = Math.max(1, q); setLines(lines.map((l) => (l.pid === pid ? { ...l, qty: n, alloc: autoAlloc(pm.get(pid)!, n) } : l))); };
  /** Count in a pack (Dozen, Box…) or in single pieces. The stock and the bill always work in pieces: 3 Dozen is 36. */
  const setPack = (pid: string, pack?: { name: string; per: number }) => setLines(lines.map((l) => (l.pid === pid ? { ...l, pack, qty: pack?.per ?? 1, alloc: autoAlloc(pm.get(pid)!, pack?.per ?? 1) } : l)));
  const setCount = (pid: string, n: number) => { const l = lines.find((x) => x.pid === pid)!; setQty(pid, Math.max(1, n) * (l.pack?.per ?? 1)); };
  const setAlloc = (pid: string, i: number, v: number) => setLines(lines.map((l) => (l.pid === pid ? { ...l, alloc: l.alloc.map((a, j) => (j === i ? Math.max(0, v) : a)) } : l)));
  const shortage = lines.some((l) => l.qty > stockTotal(pm.get(l.pid)!)); const allocBad = lines.some((l) => l.alloc.reduce((a, b) => a + b, 0) !== l.qty);
  const canBill = ready && lines.length > 0;
  const carp = draft.carpenterId ? d.carpenters.find((c) => c.id === draft.carpenterId) : undefined;
  // a returning customer who usually comes with a carpenter: suggest the same one
  const usual = cust && draft.carpenterId === undefined ? d.carpenters.find((c) => c.active && c.id === d.bills.find((b) => b.customerId === cust.id && b.referredBy)?.referredBy) : undefined;

  const save = (kind: 'estimate' | 'quotation') => {
    try {
      const cid = d.upsertCustomer(draft.phone, t!);
      const online = mode === 'cash' ? 0 : mode === 'online' ? total : total - cashPart; const cash = mode === 'cash' ? total : mode === 'online' ? 0 : cashPart;
      const b = d.saveBill(kind, { referredBy: draft.carpenterId || undefined, needsCarpenter: draft.needsCarpenter, staffId: me, customerId: cid, tier: t!, cash: kind === 'estimate' ? 0 : cash, online: kind === 'estimate' ? 0 : online,
        lines: lines.map((l) => ({ pid: l.pid, qty: l.qty, price: price(l.pid), alloc: kind === 'quotation' ? l.alloc : LOCS.map(() => 0), pack: l.pack })) });
      setPay(false); setErr(''); patch({ result: { no: b.no, kind: b.kind, total: b.total, points: b.points, code: b.code, carpenter: carp?.name, needsCarpenter: !!draft.needsCarpenter } });
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save'); }
  };

  if (draft.result) {
    const r = draft.result; const link = `${window.location.origin}/bill/${r.code}`;
    const msg = `Hello, your ${r.kind === 'estimate' ? 'estimate' : 'bill'} ${r.no} from National Traders: ${link}`;
    return (
      <div className="space-y-3 text-center">
        <CheckCircle2 className="mx-auto mt-4 h-14 w-14 text-good" />
        <div className="font-display text-2xl font-semibold">{r.kind === 'estimate' ? 'Estimate saved' : 'Sale complete'}</div>
        <div className={card}><div className="text-sm text-steel">{r.no}</div><div className="font-display text-4xl font-semibold">{money(r.total)}</div>
          {r.kind === 'quotation' ? <div className="mt-2 rounded-xl bg-sage-bg px-3 py-2 text-sm text-sage-fg">You earned <b>{r.points} points</b>. Stock updated.</div> : <div className="mt-2 rounded-xl bg-butter-bg px-3 py-2 text-sm text-butter-fg">The owner will convert this estimate to a sale. Your points are added then.</div>}
          {(r.carpenter || r.needsCarpenter) && <div className="mt-2 rounded-xl bg-paper px-3 py-2 text-sm">{r.carpenter && <div>Carpenter: <b>{r.carpenter}</b></div>}{r.needsCarpenter && <div className="text-steel">Carpenter requested. The owner will assign one.</div>}</div>}
          <p className="mt-2 text-xs text-steel">The amount is shown only now. Your history shows points only.</p></div>
        <a href={`https://wa.me/91${draft.phone}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 font-semibold text-white"><MessageCircle className="h-5 w-5" />Send on WhatsApp</a>
        <a href={link} target="_blank" rel="noreferrer" className="block text-sm text-steel underline">Preview the customer's bill</a>
        <div className="grid grid-cols-2 gap-2"><button onClick={() => d.closeDraft(draft.id)} className="rounded-2xl border border-line bg-white py-3 font-medium">Close this bill</button><button onClick={() => d.newDraft()} className="rounded-2xl bg-black py-3 font-semibold text-gold-light">Next customer</button></div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-32">
      {/* 1. customer */}
      {ready && !edit ? (
        <div className={`${card} flex items-center justify-between !py-3`}>
          <div><div className="font-display text-lg font-semibold leading-5">{draft.phone}</div><div className="text-xs text-steel">{cust ? `Returning customer${cust.name ? ': ' + cust.name : ''}` : 'New customer'} · {TIER_NAMES[t!]}</div></div>
          <button onClick={() => setEdit(true)} className="rounded-xl bg-paper px-3 py-1.5 text-sm font-medium">Change</button>
        </div>
      ) : (
        <div className={`${card} space-y-3`}>
          <div className="font-display text-lg font-semibold">Who is the customer?</div>
          <input inputMode="numeric" maxLength={10} autoFocus className="w-full !rounded-2xl !py-3 text-xl tracking-wider" placeholder="10 digit phone number" value={draft.phone} onChange={(e) => patch({ phone: e.target.value.replace(/\D/g, '') })} />
          {valid && (cust ? <div className="rounded-xl bg-sky-bg px-3 py-2 text-sm text-sky-fg">Returning customer{cust.name ? `: ${cust.name}` : ''}. Their saved category is selected.</div> : <div className="rounded-xl bg-paper px-3 py-2 text-sm text-steel">New customer. Choose a price category.</div>)}
          <div className="grid grid-cols-4 gap-2">{TIER_NAMES.map((n, i) => <button key={n} onClick={() => patch({ tier: i })} className={`rounded-2xl border py-3 text-lg font-semibold ${t === i ? 'border-black bg-black text-gold-light' : 'border-line bg-white'}`}>{n.slice(-1)}</button>)}</div>
          <p className="text-xs text-steel">The category decides the price list. The customer does not see this screen.</p>
          {ready && <button onClick={() => setEdit(false)} className="w-full rounded-2xl bg-black py-3 font-semibold text-gold-light">Done</button>}
        </div>
      )}

      {/* carpenter (optional) */}
      {ready && (
        <div className={`${card} !py-3`}>
          <div className="flex items-center gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${carp ? 'bg-black text-gold-light' : 'bg-paper text-steel'}`}><Hammer className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-xs text-steel">Brought by a carpenter?</div>
              <div className="truncate font-semibold">{carp ? carp.name : 'No carpenter'}</div>
              {carp && <div className="truncate text-xs text-steel">{carp.area} · {carp.skill}</div>}
            </div>
            {carp ? <button onClick={() => patch({ carpenterId: null })} aria-label="Remove carpenter" className="rounded-xl p-2 text-steel hover:bg-paper"><X className="h-4 w-4" /></button> : null}
            <button onClick={() => setKOpen(true)} className="rounded-xl bg-paper px-3 py-1.5 text-sm font-medium">{carp ? 'Change' : 'Choose'}</button>
          </div>
          {usual && !carp && <button onClick={() => patch({ carpenterId: usual.id })} className="mt-2 flex w-full items-center justify-between rounded-xl bg-butter-bg px-3 py-2 text-left text-sm text-butter-fg"><span>This customer usually comes with <b>{usual.name}</b></span><b>Use</b></button>}
          <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-xl bg-paper px-3 py-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-black" checked={!!draft.needsCarpenter} onChange={(e) => patch({ needsCarpenter: e.target.checked })} />Customer needs a carpenter from us <span className="text-xs text-steel">(owner will assign one)</span></label>
        </div>
      )}

      {/* 2. items */}
      {ready && (
        <div ref={search} className={`${card} space-y-3`}>
          <ProductSearch onPick={add} onScan={() => setScan(true)} placeholder="Search or scan an item" autoFocus={!lines.length} />
          {!lines.length && <button onClick={() => { const c = d.products.filter((p) => stockTotal(p) > 5); add(c[Math.floor(Math.random() * c.length)]); }} className="w-full text-xs text-steel underline">Demo scan: add a random product</button>}
        </div>
      )}
      {lines.map((l) => {
        const p = pm.get(l.pid)!; const rep = cust ? repeatHit(d.bills, cust.id, p.id, d.settings.repeatDays) : null;
        return (
          <div key={l.pid} className={card}>
            <div className="flex items-start gap-3">
              <EmojiTile cat={p.cat} /><div className="min-w-0 flex-1"><div className="font-medium leading-5">{p.name}</div><div className="truncate text-xs text-steel">{productPath(p)}</div><div className="text-xs text-steel">{money(price(l.pid))} per {p.unit} · stock {packBreakdown(stockTotal(p), p.unit, p.packs)}</div></div>
              <button onClick={() => setLines(lines.filter((x) => x.pid !== l.pid))} aria-label={`Remove ${p.name}`} className="rounded-xl p-2 text-steel hover:bg-blush-bg hover:text-blush-fg"><Trash2 className="h-4 w-4" /></button>
            </div>
            {rep && <div className="mt-2 flex gap-2 rounded-xl bg-butter-bg px-3 py-2 text-xs text-butter-fg"><AlertTriangle className="h-4 w-4 shrink-0" /><span>Bought by this customer on <b>{fmtDate(rep.date)}</b> at <b>{money(rep.price)}</b> ({rep.qty} {p.unit}).</span></div>}
            <div className="mt-3 flex items-center justify-between"><Stepper value={l.qty / (l.pack?.per ?? 1)} min={1} onChange={(n) => setCount(l.pid, n)} /><div className="font-display text-xl font-semibold">{money(l.qty * price(l.pid))}</div></div>
            {p.packs && p.packs.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm" role="group" aria-label="Count in">
                <span className="text-xs text-steel">Count in</span>
                {[undefined, ...p.packs].map((k) => { const on = (k?.name ?? '') === (l.pack?.name ?? ''); return (
                  <button key={k?.name ?? 'base'} onClick={() => setPack(l.pid, k)} className={`rounded-full px-3 py-1 font-medium ${on ? 'bg-black text-gold-light' : 'border border-line bg-white'}`}>{k ? `${k.name} (${k.per})` : p.unit}</button>); })}
                {l.pack && <span className="ml-auto text-xs font-semibold text-ink">= {qtyText(l.qty, p.unit)}</span>}
              </div>)}
            {l.qty > stockTotal(p) && <div className="mt-2 text-sm font-medium text-blush-fg">Not enough stock (only {packBreakdown(stockTotal(p), p.unit, p.packs)})</div>}
            {needsPicker(p) ? (
              <div className="mt-3 rounded-2xl bg-sage-bg/60 p-3"><div className="mb-2 text-xs font-semibold text-sage-fg">Take from (stock is in several places)</div>
                <div className="grid grid-cols-3 gap-2">{LOCS.map((n, i) => <label key={n} className="text-center text-[11px] text-steel">{n}<span className="block">has {p.stock[i]}</span>
                  <input type="number" inputMode="numeric" min={0} max={p.stock[i]} disabled={p.stock[i] === 0} className="mt-0.5 w-full text-center" value={l.alloc[i]} onChange={(e) => setAlloc(l.pid, i, +e.target.value)} /></label>)}</div>
                {l.alloc.reduce((a, b) => a + b, 0) !== l.qty && <div className="mt-1 text-xs text-blush-fg">The three must add up to {l.qty}</div>}</div>
            ) : <div className="mt-2 text-xs text-steel">Taken from {LOCS[pm.get(l.pid)!.stock.findIndex((s) => s > 0)] ?? '-'} automatically</div>}
          </div>);
      })}
      {ready && !lines.length && <div className="rounded-[22px] border-2 border-dashed border-line px-6 py-10 text-center text-sm text-steel"><div className="mb-1 text-3xl">🛒</div>Scan a QR code or search to add the first item.</div>}
      {mine1(d, draft.staffId) > 1 || lines.length > 0 ? <button onClick={() => { if (!lines.length || confirm('Discard this bill?')) d.closeDraft(draft.id); }} className="mx-auto flex items-center gap-1.5 text-xs text-steel"><X className="h-3.5 w-3.5" />Discard this bill</button> : null}

      {/* 3. total and actions */}
      {canBill && (
        <div className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 border-t border-line bg-white/95 p-3 backdrop-blur">
          {err && !pay && <p role="alert" className="mb-2 rounded-xl bg-blush-bg px-3 py-2 text-sm text-blush-fg">{err}</p>}
          <div className="mb-2 flex items-end justify-between"><span className="text-sm text-steel">{lines.length} item{lines.length > 1 ? 's' : ''} · Total</span><b className="font-display text-3xl">{money(total)}</b></div>
          <div className="grid grid-cols-2 gap-2"><button disabled={!lines.length} onClick={() => save('estimate')} className="rounded-2xl border border-black py-3 font-semibold disabled:opacity-40">Save estimate</button>
            <button disabled={!lines.length || shortage || allocBad} onClick={() => { setCashPart(0); setMode('cash'); setErr(''); setPay(true); }} className="rounded-2xl bg-black py-3 font-semibold text-gold-light disabled:opacity-40">Take payment</button></div>
        </div>
      )}
      {pay && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60"><div className="w-full max-w-md space-y-3 rounded-t-3xl bg-white p-5">
          <div className="font-display text-2xl font-semibold">Payment · {money(total)}</div>
          <div className="grid grid-cols-3 gap-2">{(['cash', 'online', 'split'] as const).map((m) => <button key={m} onClick={() => setMode(m)} className={`rounded-2xl border py-3 text-sm font-semibold capitalize ${mode === m ? 'border-black bg-black text-gold-light' : 'border-line'}`}>{m}</button>)}</div>
          {mode === 'split' && <div className="grid grid-cols-2 gap-2 text-sm"><label className="text-steel">Cash<input type="number" inputMode="numeric" className="mt-1 w-full" value={cashPart || ''} onChange={(e) => setCashPart(Math.min(total, +e.target.value))} /></label><label className="text-steel">Online<input disabled className="mt-1 w-full !bg-paper" value={total - cashPart} /></label></div>}
          {err && <p role="alert" className="rounded-xl bg-blush-bg px-3 py-2 text-sm text-blush-fg">{err}</p>}
          <p className="text-xs text-steel">The sale is approved and stock is reduced only when you confirm the payment has arrived.</p>
          <div className="grid grid-cols-2 gap-2"><button onClick={() => setPay(false)} className="rounded-2xl border border-line py-3 font-medium">Cancel</button><button disabled={mode === 'split' && (cashPart <= 0 || cashPart >= total)} onClick={() => save('quotation')} className="rounded-2xl bg-black py-3 font-semibold text-gold-light disabled:opacity-40">Payment received</button></div>
        </div></div>
      )}
      {kOpen && <CarpenterSheet onClose={() => setKOpen(false)} onPick={(id) => { patch({ carpenterId: id }); setKOpen(false); }} />}
      {scan && <Scanner onClose={() => setScan(false)} onScan={(txt) => { const p = d.products.find((x) => x.sku === txt); setScan(false); if (p) add(p); else setErr('Unknown QR code: ' + txt); }} />}
    </div>
  );
}
const mine1 = (d: { drafts: Draft[] }, staffId: string) => d.drafts.filter((x) => x.staffId === staffId).length;

/** Pick the carpenter who brought the customer. Search by name, area or phone. */
function CarpenterSheet({ onPick, onClose }: { onPick: (id: string) => void; onClose: () => void }) {
  const carpenters = useStore((x) => x.carpenters); const [q, setQ] = useState('');
  const list = carpenters.filter((c) => c.active && `${c.name} ${c.area} ${c.skill} ${c.phone}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-t-3xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><div className="font-display text-xl font-semibold">Which carpenter?</div><button onClick={onClose} aria-label="Close" className="rounded-xl p-2 hover:bg-paper"><X className="h-5 w-5" /></button></div>
        <div className="relative mb-3"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, area or phone" className="w-full !rounded-2xl !py-3 !pl-10" /></div>
        <div className="-mx-1 space-y-2 overflow-y-auto px-1">
          {list.map((c) => <button key={c.id} onClick={() => onPick(c.id)} className="flex w-full items-center gap-3 rounded-2xl border border-line p-3 text-left hover:border-gold"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black font-display text-lg text-gold-light">{c.name[0]}</span><span className="min-w-0 leading-tight"><span className="block font-semibold">{c.name}</span><span className="block truncate text-xs text-steel">{c.area} · {c.skill}</span></span></button>)}
          {!list.length && <p className="py-6 text-center text-sm text-steel">No carpenter found. Ask the owner to add one.</p>}
        </div>
      </div>
    </div>
  );
}