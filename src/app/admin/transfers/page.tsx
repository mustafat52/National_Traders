'use client';
import { useEffect, useState } from 'react';
import { ArrowDown, ArrowRight, CheckCircle2, RefreshCw, X } from 'lucide-react';
import { useStore, useProductMap } from '@/lib/store';
import { LOCS, Product } from '@/lib/types';
import { timeAgo } from '@/lib/time';
import { EmojiTile, ProductSearch, productPath } from '@/components/ProductSearch';
import { Stepper } from '@/components/Stepper';
import { Scanner } from '@/components/ui';

const card = 'rounded-[22px] border border-line bg-panel';

export default function Transfers() {
  const { transfer, transfers, staff } = useStore(); const pm = useProductMap();
  const [pid, setPid] = useState<string | null>(null);
  const [from, setFrom] = useState(1); const [to, setTo] = useState(0); const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [scan, setScan] = useState(false);
  const p = pid ? pm.get(pid) ?? null : null;
  const avail = p ? p.stock[from] : 0;

  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(''), 6000); return () => clearTimeout(t); }, [msg]);

  const pick = (x: Product) => {
    const best = x.stock.indexOf(Math.max(...x.stock));
    setPid(x.id); setFrom(best); setTo(best === 0 ? 1 : 0); setQty(Math.min(1, x.stock[best])); setMsg(''); setErr('');
  };
  const chooseFrom = (i: number) => { if (!p) return; setFrom(i); if (to === i) setTo(i === 0 ? 1 : 0); setQty((q) => Math.min(Math.max(q, 1), p.stock[i])); setErr(''); };

  useEffect(() => { // opened from Low Stock: /admin/transfers?product=<id>
    const id = new URLSearchParams(window.location.search).get('product');
    const x = id ? useStore.getState().products.find((y) => y.id === id) : null; if (x) pick(x);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const problem = !p ? 'Pick a product to begin' : avail <= 0 ? 'There is nothing to move from here' : qty < 1 ? 'Choose how many to move' : qty > avail ? `Only ${avail} available here` : from === to ? 'Choose two different places' : '';
  const valid = !problem;
  const after = p ? p.stock.map((q, i) => (valid ? (i === from ? q - qty : i === to ? q + qty : q) : q)) : [0, 0, 0];

  const go = () => {
    if (!p || !valid) return;
    try { transfer(p.id, from, to, qty); setMsg(`Moved ${qty} ${p.unit} of ${p.name} from ${LOCS[from]} to ${LOCS[to]}.`); setErr(''); setQty(Math.min(1, p.stock[from] - qty)); }
    catch (e) { setErr((e as Error).message); }
  };

  const LocCard = ({ i, role }: { i: number; role: 'from' | 'to' }) => {
    if (!p) return null;
    const selected = role === 'from' ? from === i : to === i;
    const disabled = role === 'from' ? p.stock[i] === 0 : from === i;
    const sel = role === 'from' ? 'border-brand bg-sage-bg' : 'border-sky-fg bg-sky-bg';
    return (
      <button type="button" disabled={disabled} onClick={() => (role === 'from' ? chooseFrom(i) : setTo(i))}
        className={`rounded-2xl border-2 p-4 text-left transition ${selected ? sel : 'border-line bg-white hover:bg-paper'} ${disabled ? 'cursor-not-allowed opacity-45' : ''}`}>
        <div className={`h-4 text-[11px] font-semibold ${role === 'from' ? 'text-sage-fg' : 'text-sky-fg'}`}>{selected ? (role === 'from' ? 'Taking from' : 'Sending to') : ''}</div>
        <div className="font-medium">{LOCS[i]}</div>
        <div className="mt-1 font-display text-3xl font-semibold leading-none">{p.stock[i]}<span className="ml-1.5 font-sans text-xs font-normal text-steel">{p.unit} here</span></div>
      </button>
    );
  };

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="mb-6">
        <h1 className="font-display text-[40px] font-semibold leading-none tracking-tight">Stock Transfers</h1>
        <p className="mt-1 text-steel">Move stock between the shop and the godowns in three quick steps.</p>
      </div>
      {msg && <div className="fade-up mb-5 flex items-center gap-3 rounded-2xl bg-sage-bg px-5 py-4 text-sage-fg"><CheckCircle2 className="h-6 w-6 shrink-0" /><div className="flex-1">{msg}</div><button onClick={() => setMsg('')} aria-label="Dismiss"><X className="h-5 w-5" /></button></div>}

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-7">
          {/* product */}
          <div className={`${card} p-5`}>
            <div className="mb-3 font-display text-[22px] font-semibold tracking-tight">Which product?</div>
            {!p ? <ProductSearch onPick={pick} onScan={() => setScan(true)} placeholder="Search a product to move" autoFocus /> : (
              <div className="flex items-center gap-3 rounded-2xl bg-paper p-3">
                <EmojiTile cat={p.cat} size={48} />
                <div className="min-w-0 flex-1"><div className="font-display text-lg font-semibold leading-tight">{p.name}</div><div className="truncate text-xs text-steel">{productPath(p)}</div></div>
                <button onClick={() => { setPid(null); setErr(''); }} className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-sm font-medium hover:bg-paper"><RefreshCw className="h-4 w-4" />Change</button>
              </div>
            )}
          </div>

          {p && (
            <>
              <div className={`${card} fade-up p-5`}>
                <div className="mb-3 font-display text-[22px] font-semibold tracking-tight">Take it from where?</div>
                <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <LocCard key={i} i={i} role="from" />)}</div>
                <div className="my-4 flex items-center gap-3 text-steel"><span className="h-px flex-1 bg-line" /><ArrowDown className="h-5 w-5" /><span className="h-px flex-1 bg-line" /></div>
                <div className="mb-3 font-display text-[22px] font-semibold tracking-tight">And send it to?</div>
                <div className="grid gap-3 sm:grid-cols-3">{[0, 1, 2].map((i) => <LocCard key={i} i={i} role="to" />)}</div>
                {p.shopOnly && <p className="mt-3 text-xs text-steel">This is a direct-to-shop product. You can still move it, but it normally stays in the Main Shop.</p>}
              </div>

              <div className={`${card} fade-up p-5`}>
                <div className="mb-3 font-display text-[22px] font-semibold tracking-tight">How many?</div>
                <div className="flex flex-wrap items-center gap-5">
                  <Stepper large value={qty} min={0} max={Math.max(avail, 0)} onChange={(v) => { setQty(v); setErr(''); }} />
                  <div className="flex flex-wrap gap-2 text-sm">
                    {[1, 10, 25].filter((n) => n < avail).map((n) => <button key={n} onClick={() => setQty(n)} className="rounded-full border border-line bg-white px-3.5 py-1.5 font-medium hover:bg-paper">{n}</button>)}
                    {avail > 1 && <button onClick={() => setQty(Math.floor(avail / 2))} className="rounded-full border border-line bg-white px-3.5 py-1.5 font-medium hover:bg-paper">Half</button>}
                    {avail > 0 && <button onClick={() => setQty(avail)} className="rounded-full border border-line bg-white px-3.5 py-1.5 font-medium hover:bg-paper">All {avail}</button>}
                  </div>
                </div>
                {avail > 1 && <input type="range" min={1} max={avail} value={Math.min(Math.max(qty, 1), avail)} onChange={(e) => setQty(+e.target.value)} className="mt-4 w-full cursor-pointer !border-0 !bg-transparent !p-0 accent-[#B8892B]" aria-label="Quantity" />}

                <div className="mt-5 text-sm font-medium text-steel">After this move</div>
                <div className="mt-2 grid grid-cols-3 gap-3">
                  {LOCS.map((n, i) => {
                    const delta = valid ? (i === from ? -qty : i === to ? qty : 0) : 0;
                    return (
                      <div key={n} className={`rounded-2xl border p-3 ${delta < 0 ? 'border-blush-bg bg-blush-bg/50' : delta > 0 ? 'border-sage-bg bg-sage-bg/60' : 'border-line bg-white'}`}>
                        <div className="text-xs text-steel">{n}</div>
                        <div className="mt-0.5 flex items-baseline gap-1.5"><span className="font-display text-2xl font-semibold leading-none">{after[i]}</span>
                          {delta !== 0 && <span className={`text-sm font-semibold ${delta < 0 ? 'text-blush-fg' : 'text-sage-fg'}`}>{delta > 0 ? '+' : ''}{delta}</span>}</div>
                        <div className="text-[11px] text-steel">was {p.stock[i]}</div>
                      </div>
                    );
                  })}
                </div>
                {err && <div className="mt-4 rounded-xl bg-blush-bg px-3 py-2 text-sm text-blush-fg">{err}</div>}
                <button disabled={!valid} onClick={go} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 font-semibold text-white transition hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-40">
                  {valid ? <>Move {qty} {p.unit}, {LOCS[from]}<ArrowRight className="h-5 w-5" />{LOCS[to]}</> : problem}
                </button>
              </div>
            </>
          )}
        </div>

        {/* recent moves */}
        <aside className="lg:col-span-5">
          <div className={`${card} p-5`}>
            <div className="mb-3 font-display text-[22px] font-semibold tracking-tight">Recent moves</div>
            {transfers.length === 0 && <p className="text-sm text-steel">No transfers yet. Once you move stock, each move is listed here with who did it and when.</p>}
            <ul className="divide-y divide-line">
              {transfers.slice(0, 12).map((t) => { const x = pm.get(t.pid); return (
                <li key={t.id} className="flex items-start gap-3 py-3">
                  {x && <EmojiTile cat={x.cat} size={36} />}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-medium">{x?.name ?? t.pid}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-steel"><span className="rounded-full bg-paper px-2 py-0.5 font-medium text-ink">{LOCS[t.from]}</span><ArrowRight className="h-3.5 w-3.5" /><span className="rounded-full bg-paper px-2 py-0.5 font-medium text-ink">{LOCS[t.to]}</span></div>
                  </div>
                  <div className="text-right"><div className="font-display text-xl font-semibold leading-none">{t.qty}</div><div className="mt-1 text-[11px] text-steel">{timeAgo(t.date)}{staff.find((s) => s.id === t.by) ? `, ${staff.find((s) => s.id === t.by)!.name.split(' ')[0]}` : ''}</div></div>
                </li>); })}
            </ul>
          </div>
        </aside>
      </div>
      {scan && <Scanner onClose={() => setScan(false)} onScan={(txt) => { const x = useStore.getState().products.find((y) => y.sku === txt); setScan(false); if (x) pick(x); else setErr(`Unknown QR code: ${txt}`); }} />}
    </div>
  );
}