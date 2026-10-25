'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronDown, Download, PackagePlus, Receipt, Store, Truck, X } from 'lucide-react';
import { useStore, useProductMap } from '@/lib/store';
import { LOCS, LOC_COLORS, LOC_TINTS, Product, StockIn as StockInRec, TIER_NAMES } from '@/lib/types';
import { download, fmtDate, money, toCsv } from '@/lib/rules';
import { vendorBalance } from '@/lib/selectors';
import { timeAgo } from '@/lib/time';
import { CountUp } from '@/components/CountUp';
import { EmojiTile, ProductSearch, productPath } from '@/components/ProductSearch';
import { Rupee } from '@/components/Rupee';
import { Stepper } from '@/components/Stepper';
import { Scanner } from '@/components/ui';

const LOCC = LOC_COLORS;
const LOC_TINT = LOC_TINTS;
const card = 'rounded-[22px] border border-line bg-panel';
interface L { pid: string; qty: number[] }
type Source = 'vendor' | 'none';

export default function StockIn() {
  const d = useStore(); const { addStockIn, stockIns, staff, vendors } = d; const pm = useProductMap();
  const [source, setSource] = useState<Source>('vendor');
  const [vendorId, setVendorId] = useState(''); const [billNo, setBillNo] = useState('');
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [note, setNote] = useState(''); const [lines, setLines] = useState<L[]>([]);
  const [done, setDone] = useState<null | { no: string; units: number; products: number; owed?: { vendor: string; amount: number; billNo: string } }>(null);
  const [err, setErr] = useState(''); const [scan, setScan] = useState(false); const [focusId, setFocusId] = useState('');

  const add = (p: Product) => {
    setDone(null); setErr('');
    setLines((ls) => (ls.some((x) => x.pid === p.id) ? ls : [...ls, { pid: p.id, qty: LOCS.map(() => 0) }]));
    setPrices((pr) => (pr[p.id] ? pr : { ...pr, [p.id]: p.pp }));
    setFocusId(p.id);
  };
  useEffect(() => { // opened from a product page (?product=<id>) or from a vendor page (?vendor=<id>)
    const q = new URLSearchParams(window.location.search);
    const v = q.get('vendor'); if (v && useStore.getState().vendors.some((x) => x.id === v)) { setSource('vendor'); setVendorId(v); }
    const id = q.get('product'); const p = id ? useStore.getState().products.find((x) => x.id === id) : null; if (p) add(p);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (focusId) { document.getElementById(`qty-${focusId}-0`)?.focus(); setFocusId(''); } }, [focusId, lines]);

  const setQ = (i: number, k: number, v: number) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, qty: l.qty.map((q, m) => (m === k ? v : q)) } : l)));
  const moveAll = (i: number, k: number) => setLines((ls) => ls.map((l, j) => { if (j !== i) return l; const t = l.qty.reduce((a, b) => a + b, 0); return { ...l, qty: LOCS.map((_, m) => (m === k ? t : 0)) }; }));
  const splitEven = (i: number) => setLines((ls) => ls.map((l, j) => { if (j !== i) return l; const t = l.qty.reduce((a, b) => a + b, 0); const n = LOCS.length; const base = Math.floor(t / n); return { ...l, qty: LOCS.map((_, m) => (m === 0 ? t - (n - 1) * base : base)) }; }));

  const byLoc = useMemo(() => LOCS.map((_, k) => lines.reduce((a, l) => a + (l.qty[k] || 0), 0)), [lines]);
  const units = byLoc.reduce((a, b) => a + b, 0);
  const counted = lines.filter((l) => l.qty.some((q) => q > 0)).length;
  const billTotal = lines.reduce((a, l) => a + (prices[l.pid] || 0) * l.qty.reduce((x, y) => x + y, 0), 0);
  const vendor = vendors.find((v) => v.id === vendorId);
  const owedNow = vendor ? vendorBalance(d, vendor.id) : 0;
  const vendorMode = source === 'vendor';

  const save = () => {
    try {
      addStockIn(note, lines, vendorMode ? { vendorId, billNo, prices } : undefined);
      const s = useStore.getState();
      setDone({ no: s.stockIns[0].no, units, products: counted, owed: vendorMode && vendor ? { vendor: vendor.name, amount: billTotal, billNo: billNo.trim() } : undefined });
      setLines([]); setNote(''); setBillNo(''); setPrices({}); setErr('');
    } catch (e) { setErr((e as Error).message); }
  };
  const exportCsv = () => download('stock-in-history.csv', toCsv([['No.', 'Date', 'Vendor', 'Vendor bill', 'Note', 'Product', 'SKU', ...LOCS, 'Price'],
    ...stockIns.flatMap((r) => { const pu = d.purchases.find((x) => x.id === r.purchaseId); const vn = vendors.find((v) => v.id === pu?.vendorId)?.name ?? '';
      return r.lines.map((l) => [r.no, new Date(r.date).toLocaleString('en-IN'), vn, pu?.billNo ?? '', r.note, pm.get(l.pid)?.name ?? l.pid, pm.get(l.pid)?.sku ?? '', ...LOCS.map((_, k) => l.qty[k] || 0), pu?.lines.find((x) => x.pid === l.pid)?.price ?? '']); })]));

  const pill = (on: boolean) => `flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${on ? 'bg-white text-sage-fg shadow-sm' : 'text-steel hover:text-ink'}`;

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="mb-6">
        <h1 className="font-display text-[40px] font-semibold leading-none tracking-tight">Stock In</h1>
        <p className="mt-1 text-steel">Record goods that just arrived, then choose where each product goes. Add the vendor bill if there is one.</p>
      </div>

      {done && (
        <div className="fade-up mb-5 flex flex-wrap items-center gap-3 rounded-2xl bg-sage-bg px-5 py-4 text-sage-fg">
          <CheckCircle2 className="h-6 w-6 shrink-0" />
          <div className="flex-1"><b>{done.no} saved.</b> {done.units.toLocaleString('en-IN')} units across {done.products} {done.products === 1 ? 'product' : 'products'} are now in stock.
            {done.owed && <> Bill {done.owed.billNo}: <b>{money(done.owed.amount)}</b> added to what you owe {done.owed.vendor}.</>}</div>
          <button onClick={() => setDone(null)} aria-label="Dismiss"><X className="h-5 w-5" /></button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* what arrived */}
        <div className="space-y-4 lg:col-span-8">
          <div className={`${card} p-5`}>
            <div className="mb-3 font-display text-[22px] font-semibold tracking-tight">What arrived?</div>
            <ProductSearch onPick={add} onScan={() => setScan(true)} placeholder="Search a product to add it to this delivery" autoFocus />
          </div>

          {lines.length === 0 && (
            <div className="flex flex-col items-center rounded-[22px] border-2 border-dashed border-line px-6 py-14 text-center">
              <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-sage-bg text-sage-fg"><PackagePlus className="h-8 w-8" /></div>
              <div className="font-display text-xl font-semibold">Nothing added yet</div>
              <p className="mt-1 max-w-sm text-sm text-steel">Search or scan the products from the delivery. You can add several, then save them together as one entry.</p>
            </div>
          )}

          {lines.map((l, i) => {
            const p = pm.get(l.pid)!; const tot = l.qty.reduce((a, b) => a + b, 0);
            const price = prices[l.pid] || 0; const diff = price - p.pp;
            return (
              <div key={l.pid} className={`${card} fade-up p-5`}>
                <div className="flex items-start gap-3">
                  <EmojiTile cat={p.cat} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-xl font-semibold leading-tight">{p.name}</div>
                    <div className="truncate text-xs text-steel">{productPath(p)}</div>
                    <div className="mt-1 text-xs text-steel">Now in stock: {LOCS.map((n, k) => <span key={n} className="mr-2">{n.replace('Main ', '')} <b className="text-ink">{p.stock[k] ?? 0}</b></span>)}</div>
                  </div>
                  <button aria-label="Remove" className="rounded-lg p-1.5 text-steel hover:bg-paper" onClick={() => setLines(lines.filter((_, j) => j !== i))}><X className="h-5 w-5" /></button>
                </div>

                {p.shopOnly ? (
                  <div className="mt-4 flex flex-wrap items-center gap-4 rounded-2xl bg-sage-bg/60 p-4">
                    <div><div className="mb-1 text-xs font-medium text-sage-fg">Quantity received</div><Stepper id={`qty-${p.id}-0`} value={l.qty[0]} onChange={(v) => setQ(i, 0, v)} /></div>
                    <div className="flex items-center gap-2 text-sm text-sage-fg"><Store className="h-5 w-5" />Direct-to-shop product: goes to the Main Shop automatically</div>
                  </div>
                ) : (
                  <>
                    <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
                      {LOCS.map((n, k) => (
                        <div key={n} className={`rounded-2xl p-3.5 ${LOC_TINT[k]}`}>
                          <div className="mb-2 text-sm font-medium">{n}</div>
                          <Stepper id={`qty-${p.id}-${k}`} value={l.qty[k]} onChange={(v) => setQ(i, k, v)} />
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                      <span className="mr-1 text-steel">Total <b className="text-ink">{tot.toLocaleString('en-IN')}</b> {p.unit}. Put it all in:</span>
                      {LOCS.map((n, k) => <button key={n} type="button" disabled={tot === 0} onClick={() => moveAll(i, k)} className="rounded-full border border-line bg-white px-3 py-1 hover:bg-paper disabled:opacity-40">{n}</button>)}
                      <button type="button" disabled={tot === 0} onClick={() => splitEven(i)} className="rounded-full border border-line bg-white px-3 py-1 hover:bg-paper disabled:opacity-40">Split evenly</button>
                    </div>
                  </>
                )}

                {p.packs && p.packs.length > 0 && <PackAdd p={p} onAdd={(k, n) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, qty: x.qty.map((q, m) => (m === k ? (q || 0) + n : q)) } : x)))} />}

                {vendorMode && (
                  <div className="mt-4 rounded-2xl bg-paper p-4">
                    <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
                      <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-steel">Price on the vendor bill, per {p.unit}</span>
                        <span className="relative block"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-steel">₹</span>
                          <input type="number" min={0} inputMode="decimal" className="!w-36 !pl-7" value={prices[l.pid] ?? ''} onChange={(e) => setPrices({ ...prices, [l.pid]: +e.target.value })} /></span></label>
                      <div className="text-sm text-steel">Line amount <Rupee v={price * tot} className="font-display text-xl font-semibold text-ink" /></div>
                    </div>
                    {diff !== 0 && price > 0 && (
                      <div className="mt-3 rounded-xl bg-butter-bg px-3 py-2 text-xs text-butter-fg">
                        Last price was {money(p.pp)}, now {diff > 0 ? 'up' : 'down'} {money(Math.abs(diff))} ({Math.round((Math.abs(diff) / p.pp) * 100)}%). Margin on the new cost: {TIER_NAMES.map((t, k) => `${t.slice(-1)} ${Math.round(((p.prices[k] - price) / price) * 100)}%`).join(', ')}. You can review selling prices on the product page.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* this delivery */}
        <aside className="lg:col-span-4">
          <div className={`${card} p-5 lg:sticky lg:top-6`}>
            <div className="font-display text-[22px] font-semibold tracking-tight">This delivery</div>

            <div className="mt-3 flex gap-1 rounded-2xl bg-paper p-1" role="tablist" aria-label="Where did this delivery come from">
              <button role="tab" aria-selected={vendorMode} className={pill(vendorMode)} onClick={() => setSource('vendor')}><Truck className="h-4 w-4" />From a vendor</button>
              <button role="tab" aria-selected={!vendorMode} className={pill(!vendorMode)} onClick={() => setSource('none')}>No vendor bill</button>
            </div>

            {vendorMode ? (
              <div className="mt-3 space-y-3">
                <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-steel">Vendor</span>
                  <select className="w-full" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
                    <option value="">Choose a vendor</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select></label>
                <label className="block text-sm"><span className="mb-1 block text-xs font-medium text-steel">Vendor bill number</span>
                  <input className="w-full" value={billNo} onChange={(e) => setBillNo(e.target.value)} placeholder="As printed on their bill" /></label>
              </div>
            ) : (
              <p className="mt-3 rounded-xl bg-paper px-3 py-2.5 text-xs text-steel">For opening stock, goods moved in from elsewhere, or stock found in a count. Nothing is added to what you owe a vendor.</p>
            )}

            <div className="mt-4 flex items-baseline gap-2"><span className="font-display text-[56px] font-semibold leading-none"><CountUp value={units} duration={600} /></span><span className="text-steel">units, {counted} {counted === 1 ? 'product' : 'products'}</span></div>
            <div className="mt-4 flex h-3 gap-1 overflow-hidden rounded-full bg-paper">{byLoc.map((q, k) => (q > 0 ? <div key={k} className="rounded-full transition-all duration-500" style={{ width: `${(q / units) * 100}%`, background: LOCC[k] }} /> : null))}</div>
            <ul className="mt-3 space-y-2 text-sm">
              {LOCS.map((n, k) => <li key={n} className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-full" style={{ background: LOCC[k] }} /><span className="flex-1 text-steel">{n}</span><b className="font-display text-lg"><CountUp value={byLoc[k]} duration={500} /></b></li>)}
            </ul>

            {vendorMode && (
              <div className="mt-4 rounded-2xl bg-sage-bg/70 p-4 text-sage-fg">
                <div className="text-xs font-medium">Bill total</div>
                <Rupee v={billTotal} animate className="font-display text-[34px] font-semibold leading-tight" />
                {vendor && <div className="mt-1 text-xs">You owe {vendor.name} {owedNow < 0 ? <>nothing, they hold an advance of <b>{money(-owedNow)}</b></> : <><b>{money(owedNow)}</b> now, <b>{money(owedNow + billTotal)}</b> after this bill</>}.</div>}
              </div>
            )}

            <label className="mt-4 block text-sm"><span className="mb-1 block text-xs font-medium text-steel">Note (optional)</span>
              <input className="w-full" value={note} onChange={(e) => setNote(e.target.value)} placeholder={vendorMode ? 'For example, truck number or who received it' : 'Where did it come from?'} /></label>
            {err && <div className="mt-3 rounded-xl bg-blush-bg px-3 py-2 text-sm text-blush-fg">{err}</div>}
            <button disabled={units <= 0} onClick={save} className="mt-4 w-full rounded-2xl bg-brand py-3.5 font-semibold text-white transition hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-40">
              {units <= 0 ? 'Enter a quantity to save' : vendorMode ? `Save ${units.toLocaleString('en-IN')} units and the bill` : `Save ${units.toLocaleString('en-IN')} units to stock`}
            </button>
            <p className="mt-3 text-xs text-steel">{vendorMode ? 'Stock goes up now. The bill amount is added to what you owe the vendor, and each product\u2019s last purchase price is updated.' : 'This only adds stock.'}</p>
          </div>
        </aside>
      </div>

      {/* history */}
      <div className="mb-3 mt-10 flex items-center justify-between">
        <h2 className="font-display text-[22px] font-semibold tracking-tight">Recent deliveries</h2>
        {stockIns.length > 0 && <button onClick={exportCsv} className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 text-sm font-medium hover:bg-paper"><Download className="h-4 w-4" />Export CSV</button>}
      </div>
      {stockIns.length === 0 && <div className={`${card} p-6 text-steel`}>No deliveries recorded yet. The first one you save will appear here.</div>}
      <div className="space-y-3">{stockIns.slice(0, 15).map((r) => <Entry key={r.id} r={r} by={staff.find((s) => s.id === r.by)?.name ?? ''} />)}</div>
      {stockIns.length > 15 && <p className="mt-3 text-sm text-steel">Showing the latest 15 of {stockIns.length}. Export to see all of them.</p>}
      {scan && <Scanner onClose={() => setScan(false)} onScan={(t) => { const p = useStore.getState().products.find((x) => x.sku === t); setScan(false); if (p) add(p); else setErr(`Unknown QR code: ${t}`); }} />}
    </div>
  );
}

function Entry({ r, by }: { r: StockInRec; by: string }) {
  const [open, setOpen] = useState(false); const pm = useProductMap();
  const { purchases, vendors } = useStore();
  const pu = r.purchaseId ? purchases.find((x) => x.id === r.purchaseId) : undefined; const vn = pu ? vendors.find((v) => v.id === pu.vendorId) : undefined;
  const tot = LOCS.map((_, k) => r.lines.reduce((a, l) => a + (l.qty[k] || 0), 0)); const units = tot.reduce((a, b) => a + b, 0);
  return (
    <div className={`${card} overflow-hidden`}>
      <button className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 p-4 text-left" onClick={() => setOpen(!open)}>
        <div className="min-w-[10rem]"><div className="font-display text-lg font-semibold">{r.no}</div><div className="text-xs text-steel">{timeAgo(r.date)}{by && `, by ${by}`}</div></div>
        <div className="min-w-0 flex-1 text-sm text-steel">
          {pu && vn ? <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-butter-bg px-2.5 py-0.5 text-xs font-medium text-butter-fg"><Receipt className="h-3.5 w-3.5" />{vn.name}, bill {pu.billNo}, {money(pu.total)}</span> : <span className="mr-2">{r.note || 'No vendor bill'}</span>}
          <span className="text-ink">{r.lines.length} {r.lines.length === 1 ? 'product' : 'products'}, {units.toLocaleString('en-IN')} units</span></div>
        <div className="flex gap-1.5 text-xs">{LOCS.map((n, k) => (tot[k] > 0 ? <span key={n} className={`rounded-full px-2.5 py-1 font-medium ${LOC_TINT[k]}`}>{n.replace('Main ', '')} {tot[k]}</span> : null))}</div>
        <ChevronDown className={`h-5 w-5 text-steel transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className="divide-y divide-line border-t border-line bg-paper/40 px-4">
          {pu && vn && <li className="flex flex-wrap items-center gap-2 py-2.5 text-sm text-steel">{fmtDate(pu.date)}. <Link href={`/admin/vendors/${vn.id}`} className="font-medium text-brand underline-offset-4 hover:underline">Open {vn.name}</Link>{r.note && <span>Note: {r.note}</span>}</li>}
          {r.lines.map((l) => { const p = pm.get(l.pid); const pr = pu?.lines.find((x) => x.pid === l.pid)?.price; return (
            <li key={l.pid} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
              {p && <EmojiTile cat={p.cat} size={32} />}<span className="min-w-0 flex-1 truncate font-medium">{p?.name ?? l.pid}</span>
              {pr !== undefined && <span className="text-xs text-steel">{money(pr)} each</span>}
              <span className="flex gap-1.5 text-xs">{LOCS.map((n, k) => ((l.qty[k] || 0) > 0 ? <span key={n} className={`rounded-full px-2.5 py-0.5 font-medium ${LOC_TINT[k]}`}>{n.replace('Main ', '')} {l.qty[k]}</span> : null))}</span>
            </li>); })}
        </ul>
      )}
    </div>
  );
}
/** Received in boxes or dozens? Type how many and pick the pack; the pieces are worked out and added to the chosen place. */
function PackAdd({ p, onAdd }: { p: Product; onAdd: (loc: number, units: number) => void }) {
  const packs = p.packs ?? []; const [n, setN] = useState(1); const [pk, setPk] = useState(0); const [loc, setLoc] = useState(0);
  const per = packs[Math.min(pk, packs.length - 1)]?.per ?? 1;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-paper px-3.5 py-2.5 text-sm">
      <span className="text-steel">Received in packs?</span>
      <input type="number" min={1} aria-label="Number of packs" className="!w-20 !py-1.5 text-center" value={n || ''} onChange={(e) => setN(Math.max(0, Math.round(+e.target.value)))} />
      <select aria-label="Pack" className="!py-1.5" value={pk} onChange={(e) => setPk(+e.target.value)}>{packs.map((k, i) => <option key={k.name} value={i}>{k.name} ({k.per} {p.unit})</option>)}</select>
      <b className="text-ink">= {(n * per).toLocaleString('en-IN')} {p.unit}</b>
      <span className="text-steel">into</span>
      <select aria-label="Place" className="!py-1.5" value={p.shopOnly ? 0 : loc} disabled={!!p.shopOnly} onChange={(e) => setLoc(+e.target.value)}>{LOCS.map((l, i) => <option key={l} value={i}>{l}</option>)}</select>
      <button type="button" disabled={n < 1} onClick={() => onAdd(p.shopOnly ? 0 : loc, n * per)} className="rounded-xl bg-black px-3 py-1.5 font-semibold text-gold-light disabled:opacity-40">Add</button>
    </div>
  );
}